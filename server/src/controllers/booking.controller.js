const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { AppError } = require('../middlewares/errorHandler');

// Helper: Generate time slots for a day
const generateTimeSlots = (startHour = 9, endHour = 21, intervalMinutes = 30) => {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      slots.push(`${hour}:${minute}`);
    }
  }
  return slots;
};

// Helper: Add minutes to time string
const addMinutesToTime = (timeStr, minutes) => {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const newM = (totalMinutes % 60).toString().padStart(2, '0');
  return `${newH}:${newM}`;
};

// Helper: Check if two time ranges overlap
const timesOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

// Helper: Get max bookings per slot (based on active staff count)
const getMaxPerSlot = async () => {
  const staffCount = await User.countDocuments({ role: 'staff', isActive: true });
  return staffCount > 0 ? staffCount : 3; // Default 3 if no staff registered
};

// GET /api/bookings/available-slots
const getAvailableSlots = async (req, res, next) => {
  try {
    const { date, serviceId, staffId } = req.query;

    if (!date || !serviceId) {
      throw new AppError('Date and service are required', 400);
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const filter = {
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled', 'no-show'] },
    };
    if (staffId) filter.staff = staffId;

    const existingBookings = await Booking.find(filter);
    const maxPerSlot = staffId ? 1 : await getMaxPerSlot();

    const allSlots = generateTimeSlots(9, 21, 30);
    const duration = service.duration;

    const availableSlots = allSlots.filter((slotStart) => {
      const slotEnd = addMinutesToTime(slotStart, duration);

      // Don't allow slots past closing time
      if (slotEnd > '21:00') return false;

      // Don't allow past slots for today
      const now = new Date();
      const bookingDate = new Date(date);
      if (
        bookingDate.toDateString() === now.toDateString() &&
        slotStart <= `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      ) {
        return false;
      }

      // Count overlapping bookings for this slot
      const overlapCount = existingBookings.filter((booking) => {
        return timesOverlap(slotStart, slotEnd, booking.timeSlot.start, booking.timeSlot.end);
      }).length;

      // Allow multiple bookings per slot based on staff count
      return overlapCount < maxPerSlot;
    });

    // Format slots for frontend
    const formattedSlots = availableSlots.map((slot) => {
      const endTime = addMinutesToTime(slot, duration);
      const [h] = slot.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const displayMinute = slot.split(':')[1];

      return {
        start: slot,
        end: endTime,
        display: `${displayHour}:${displayMinute} ${period}`,
      };
    });

    res.status(200).json({
      success: true,
      date,
      service: service.name,
      duration: service.duration,
      slots: formattedSlots,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings — Customer creates booking
const createBooking = async (req, res, next) => {
  try {
    const { serviceId, staffId, date, timeSlot, notes } = req.body;

    if (!serviceId || !date || !timeSlot?.start) {
      throw new AppError('Service, date and time slot are required', 400);
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      throw new AppError('Service not found or inactive', 404);
    }

    const endTime = addMinutesToTime(timeSlot.start, service.duration);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const conflictFilter = {
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled', 'no-show'] },
    };
    if (staffId) conflictFilter.staff = staffId;

    const conflicts = await Booking.find(conflictFilter);
    const maxPerSlot = staffId ? 1 : await getMaxPerSlot();

    const overlapCount = conflicts.filter((b) =>
      timesOverlap(timeSlot.start, endTime, b.timeSlot.start, b.timeSlot.end)
    ).length;

    if (overlapCount >= maxPerSlot) {
      throw new AppError('This time slot is fully booked', 409);
    }

    const totalAmount = service.price;
    const discountAmount = service.discountPrice ? service.price - service.discountPrice : 0;
    const finalAmount = service.discountPrice || service.price;

    const booking = await Booking.create({
      customer: req.user.userId,
      service: serviceId,
      staff: staffId || null,
      date: dayStart,
      timeSlot: { start: timeSlot.start, end: endTime },
      totalAmount,
      discountAmount,
      finalAmount,
      notes: notes || '',
      type: 'online',
      status: 'confirmed',
    });

    await Service.findByIdAndUpdate(serviceId, { $inc: { popularity: 1 } });

    const populated = await Booking.findById(booking._id)
      .populate('service', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: populated,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings/walk-in — Admin creates walk-in booking
const createWalkInBooking = async (req, res, next) => {
  try {
    const { customerName, customerPhone, serviceId, staffId, paymentMethod, notes } = req.body;

    if (!serviceId) {
      throw new AppError('Service is required', 400);
    }

    const service = await Service.findById(serviceId);
    if (!service) throw new AppError('Service not found', 404);

    // Find or create customer
    let customer;
    if (customerPhone) {
      customer = await User.findOne({ phone: customerPhone });
    }
    if (!customer && customerName) {
      customer = await User.create({
        name: customerName,
        email: `walkin_${Date.now()}@glamour.temp`,
        phone: customerPhone || '',
        password: 'walkin_temp_' + Date.now(),
        role: 'customer',
      });
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const endTime = addMinutesToTime(currentTime, service.duration);

    const totalAmount = service.price;
    const discountAmount = service.discountPrice ? service.price - service.discountPrice : 0;
    const finalAmount = service.discountPrice || service.price;

    const booking = await Booking.create({
      customer: customer?._id || req.user.userId,
      service: serviceId,
      staff: staffId || null,
      date: now,
      timeSlot: { start: currentTime, end: endTime },
      totalAmount,
      discountAmount,
      finalAmount,
      notes: notes || '',
      type: 'walk-in',
      status: 'in-progress',
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentMethod ? 'paid' : 'pending',
    });

    await Service.findByIdAndUpdate(serviceId, { $inc: { popularity: 1 } });

    const populated = await Booking.findById(booking._id)
      .populate('service', 'name category duration price')
      .populate('customer', 'name phone')
      .populate('staff', 'name');

    res.status(201).json({
      success: true,
      message: 'Walk-in booking created!',
      booking: populated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings — Get bookings (filtered by role)
const getBookings = async (req, res, next) => {
  try {
    const { status, date, type, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'customer') {
      filter.customer = req.user.userId;
    } else if (req.user.role === 'staff') {
      filter.staff = req.user.userId;
    }

    if (status) filter.status = status;
    if (type) filter.type = type;

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: dayStart, $lte: dayEnd };
    }

    const bookings = await Booking.find(filter)
      .populate('service', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name')
      .sort({ date: -1, 'timeSlot.start': -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      bookings,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/bookings/:id/status — Update booking status
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, paymentMethod, paymentStatus, cancelReason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) throw new AppError('Booking not found', 404);

    if (req.user.role === 'customer') {
      if (booking.customer.toString() !== req.user.userId) {
        throw new AppError('Not authorized', 403);
      }
      if (status !== 'cancelled') {
        throw new AppError('You can only cancel bookings', 403);
      }
    }

    booking.status = status;

    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancelReason = cancelReason || '';
    }

    if (status === 'completed') {
      booking.completedAt = new Date();
    }

    if (paymentMethod) booking.paymentMethod = paymentMethod;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('service', 'name category duration price')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');

    res.status(200).json({
      success: true,
      message: `Booking ${status}`,
      booking: populated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/today/stats — Dashboard stats
const getTodayStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFilter = { date: { $gte: today, $lt: tomorrow } };

    const [total, confirmed, inProgress, completed, cancelled] = await Promise.all([
      Booking.countDocuments(dateFilter),
      Booking.countDocuments({ ...dateFilter, status: 'confirmed' }),
      Booking.countDocuments({ ...dateFilter, status: 'in-progress' }),
      Booking.countDocuments({ ...dateFilter, status: 'completed' }),
      Booking.countDocuments({ ...dateFilter, status: 'cancelled' }),
    ]);

    const revenueResult = await Booking.aggregate([
      {
        $match: {
          ...dateFilter,
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' },
        },
      },
    ]);

    const todayRevenue = revenueResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        total,
        confirmed,
        inProgress,
        completed,
        cancelled,
        todayRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableSlots,
  createBooking,
  createWalkInBooking,
  getBookings,
  updateBookingStatus,
  getTodayStats,
};