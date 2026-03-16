const Booking    = require('../models/Booking');
const Service    = require('../models/Service');
const User       = require('../models/User');
const Staff      = require('../models/Staff');
const Attendance = require('../models/Attendance');
const Coupon     = require('../models/Coupon');
const Payment    = require('../models/Payment');
const Salon      = require('../models/Salon');
const { AppError } = require('../middlewares/errorHandler');
const { sendBookingConfirmation, sendBookingCancellation, sendBookingCompleted } = require('../utils/whatsappService');

const HAS_STAFF_MEMBERS = !!require('../models/Booking').schema.path('staffMembers');

// ── IST helpers ────────────────────────────────────────────────────────────
const IST_OFFSET  = 5.5 * 60 * 60 * 1000;
const todayIST    = () => new Date(Date.now() + IST_OFFSET).toISOString().split('T')[0];
const istMidnight = d  => new Date(d + 'T00:00:00.000Z');
const istEndOfDay = d  => new Date(d + 'T23:59:59.999Z');

const addMins = (t, mins) => {
  const [h, m] = t.split(':').map(Number);
  const total   = h * 60 + m + mins;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};
const overlap = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

// ── GET /bookings/staff-availability ─────────────────────────────────────
const getStaffAvailability = async (req, res, next) => {
  try {
    const todayStr = todayIST();
    const dayName  = new Date(todayStr + 'T06:00:00.000Z')
      .toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const staffUsers    = await User.find({ salonId: req.salonId, role: 'staff', isActive: true }, 'name phone');
    const staffProfiles = await Staff.find({ salonId: req.salonId, user: { $in: staffUsers.map(u => u._id) } });

    const windowStart = new Date(todayStr + 'T00:00:00.000Z');
    windowStart.setTime(windowStart.getTime() - IST_OFFSET);
    const windowEnd = new Date(todayStr + 'T23:59:59.999Z');

    const attendances = await Attendance.find({
      salonId: req.salonId,
      staff:   { $in: staffUsers.map(u => u._id) },
      date:    { $gte: windowStart, $lte: windowEnd },
    });

    const staleGuard     = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeBookings = await Booking.find({
      salonId: req.salonId,
      status:  'in-progress',
      staff:   { $in: staffUsers.map(u => u._id) },
      date:    { $gte: staleGuard },
    });

    const busySet = new Set(activeBookings.map(b => b.staff?.toString()).filter(Boolean));
    const absentSet = new Set(
      attendances.filter(a => ['absent', 'leave', 'holiday'].includes(a.status)).map(a => a.staff?.toString())
    );
    const clockedInSet = new Set(
      attendances
        .filter(a => a.sessions?.some(s => s.clockIn && !s.clockOut))
        .map(a => a.staff?.toString())
    );

    const result = staffUsers.map(u => {
      const uid                = u._id.toString();
      const profile            = staffProfiles.find(p => p.user?.toString() === uid);
      const isWeeklyOff        = profile?.schedule?.weeklyOff?.includes(dayName);
      const isExplicitlyAbsent = absentSet.has(uid);
      const isClockedIn        = clockedInSet.has(uid);
      const isBusy             = busySet.has(uid);

      let availability;
      if (isClockedIn)                         availability = isBusy ? 'busy' : 'free';
      else if (isWeeklyOff || isExplicitlyAbsent) availability = 'not-available';
      else if (isBusy)                         availability = 'busy';
      else                                     availability = 'free';

      const activeBooking = activeBookings.find(b => b.staff?.toString() === uid);
      return {
        _id:              u._id,
        name:             u.name,
        phone:            u.phone,
        designation:      profile?.designation || '',
        specializations:  profile?.specializations || [],
        availability,
        currentBookingId: activeBooking?._id || null,
      };
    });

    res.status(200).json({ success: true, staff: result });
  } catch (e) { next(e); }
};

// ── GET /bookings/available-slots ─────────────────────────────────────────
const getAvailableSlots = async (req, res, next) => {
  try {
    const { date, serviceId, staffId } = req.query;
    if (!date || !serviceId) throw new AppError('Date and service required', 400);

    const service = await Service.findOne({ _id: serviceId, salonId: req.salonId });
    if (!service) throw new AppError('Service not found', 404);

    const filter = {
      salonId: req.salonId,
      date:    { $gte: istMidnight(date), $lte: istEndOfDay(date) },
      status:  { $nin: ['cancelled', 'no-show'] },
    };
    if (staffId) filter.staff = staffId;

    const existing   = await Booking.find(filter);
    const maxPerSlot = staffId ? 1 : Math.max(1, await User.countDocuments({ salonId: req.salonId, role: 'staff', isActive: true }));

    const allSlots = [];
    for (let h = 9; h < 21; h++)
      for (let m = 0; m < 60; m += 30)
        allSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);

    const available = allSlots.filter(slotStart => {
      const slotEnd = addMins(slotStart, service.duration);
      if (slotEnd > '21:00') return false;
      const now   = new Date();
      const bDate = new Date(date);
      if (bDate.toDateString() === now.toDateString()) {
        const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        if (slotStart <= nowStr) return false;
      }
      return existing.filter(b => overlap(slotStart, slotEnd, b.timeSlot.start, b.timeSlot.end)).length < maxPerSlot;
    });

    res.status(200).json({
      success: true,
      slots: available.map(s => {
        const end = addMins(s, service.duration);
        const [h] = s.split(':').map(Number);
        const dh  = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return { start: s, end, display: `${dh}:${s.split(':')[1]} ${h >= 12 ? 'PM' : 'AM'}` };
      }),
    });
  } catch (e) { next(e); }
};

// ── POST /bookings ─────────────────────────────────────────────────────────
const createBooking = async (req, res, next) => {
  try {
    const { serviceId, staffId, staffIds, date, timeSlot, notes, couponCode,
            customerId: bodyCustomerId, customerName, customerPhone } = req.body;
    if (!serviceId || !date || !timeSlot?.start) throw new AppError('Service, date, time required', 400);

    const service = await Service.findOne({ _id: serviceId, salonId: req.salonId });
    if (!service || !service.isActive) throw new AppError('Service not found', 404);

    let resolvedCustomerId = req.user.userId;
    if (['admin', 'receptionist'].includes(req.user.role)) {
      if (bodyCustomerId) {
        resolvedCustomerId = bodyCustomerId;
      } else if (customerPhone || customerName) {
        let cust = customerPhone ? await User.findOne({ phone: customerPhone, salonId: req.salonId }) : null;
        if (!cust && customerName) {
          const sPhone = customerPhone && customerPhone.length === 10 ? customerPhone : undefined;
          cust = await User.create({
            name:    customerName.trim(),
            email:   `sched_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@salon.temp`,
            ...(sPhone ? { phone: sPhone } : {}),
            password: 'scheduled_' + Date.now(),
            role:    'customer',
            salonId: req.salonId,
          });
        }
        if (cust) resolvedCustomerId = cust._id;
      }
    }

    const allStaffIds    = staffIds?.length ? staffIds : (staffId ? [staffId] : []);
    const primaryStaffId = allStaffIds[0] || null;

    const endTime  = addMins(timeSlot.start, service.duration);
    const existing = await Booking.find({
      salonId: req.salonId,
      date:    { $gte: istMidnight(date), $lte: istEndOfDay(date) },
      status:  { $nin: ['cancelled', 'no-show'] },
      ...(primaryStaffId ? { staff: primaryStaffId } : {}),
    });
    const max = primaryStaffId ? 1 : Math.max(1, await User.countDocuments({ salonId: req.salonId, role: 'staff', isActive: true }));
    if (existing.filter(b => overlap(timeSlot.start, endTime, b.timeSlot.start, b.timeSlot.end)).length >= max)
      throw new AppError('Slot fully booked', 409);

    let discountAmount = service.discountPrice ? service.price - service.discountPrice : 0;
    let finalAmount    = service.discountPrice || service.price;
    let appliedCoupon  = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true, salonId: req.salonId });
      if (coupon?.isValid().valid && service.price >= (coupon.minOrderAmount || 0)) {
        const disc = coupon.calculateDiscount(service.price);
        discountAmount += disc; finalAmount -= disc;
        appliedCoupon = coupon.code; coupon.usedCount++; await coupon.save();
      }
    }

    const booking = await Booking.create({
      salonId:  req.salonId,
      customer: resolvedCustomerId,
      service:  serviceId,
      staff:    primaryStaffId,
      ...(HAS_STAFF_MEMBERS ? { staffMembers: allStaffIds } : {}),
      date:     istMidnight(date),
      timeSlot: { start: timeSlot.start, end: endTime },
      totalAmount: service.price, discountAmount, finalAmount,
      couponCode:  appliedCoupon,
      notes:       notes || '',
      type:    ['admin', 'receptionist'].includes(req.user.role) ? 'walk-in' : 'online',
      status:  'confirmed',
      paymentStatus: 'pending', paymentMethod: 'none',
    });

    await Service.findByIdAndUpdate(serviceId, { $inc: { popularity: 1 } });

    const pop = await Booking.findById(booking._id)
      .populate('service', 'name category duration price')
      .populate('additionalServices', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');

    // ── WhatsApp: Booking Confirmation ──────────────────────────────────
    try {
      const customer = pop.customer;
      if (customer?.phone) {
        const salon = await Salon.findById(req.salonId).select('name').lean();
        await sendBookingConfirmation({
          phone:        customer.phone,
          customerName: customer.name,
          salonName:    salon?.name || 'Salon',
          serviceName:  pop.service?.name || 'Service',
          staffName:    pop.staff?.name || null,
          date:         pop.date,
          timeSlot:     pop.timeSlot,
          refNo:        pop.refNo,
          amount:       pop.finalAmount,
        });
      }
    } catch (waErr) {
      console.error('[WA] Booking confirmation failed (non-fatal):', waErr.message);
    }

    res.status(201).json({ success: true, message: 'Booking confirmed!', booking: pop });
  } catch (e) {
    console.error('❌ createBooking ERROR:', e.message);
    if (e.errors) console.error('   Validation:', JSON.stringify(e.errors, null, 2));
    next(e);
  }
};

// ── POST /bookings/walk-in ─────────────────────────────────────────────────
const createWalkInBooking = async (req, res, next) => {
  try {
    const { customerName, customerPhone, serviceId, serviceIds, staffId, staffIds,
            notes, couponCode, manualDiscountPercent, scheduledDate, scheduledTime } = req.body;

    const allServiceIds = serviceIds?.length ? serviceIds : [serviceId];
    if (!allServiceIds[0]) throw new AppError('Service required', 400);

    const services = await Promise.all(allServiceIds.map(id => Service.findOne({ _id: id, salonId: req.salonId })));
    if (services.some(s => !s)) throw new AppError('One or more services not found', 404);

    const primaryService = services[0];
    const allStaffIds    = staffIds?.length ? staffIds : (staffId ? [staffId] : []);
    const primaryStaffId = allStaffIds[0] || null;

    let customer;
    if (customerPhone) customer = await User.findOne({ phone: customerPhone, salonId: req.salonId });
    if (!customer && customerName) {
      const phone = customerPhone && customerPhone.length === 10 ? customerPhone : undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          customer = await User.create({
            name:    customerName.trim(),
            email:   `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@salon.temp`,
            ...(phone ? { phone } : {}),
            password: 'walkin_' + Date.now(),
            role:    'customer',
            salonId: req.salonId,
          });
          break;
        } catch (e) {
          if (e.code !== 11000 || attempt === 2) throw e;
        }
      }
    }
    if (!customer) customer = { _id: req.user.userId };

    const now           = new Date();
    const curTime       = scheduledTime || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const totalDuration = services.reduce((sum, s) => sum + (s.duration || 0), 0);
    const endTime       = addMins(curTime, totalDuration || primaryService.duration);
    const useDate       = scheduledDate || todayIST();

    let discountAmount = services.reduce((sum, s) => sum + (s.discountPrice ? s.price - s.discountPrice : 0), 0);
    let finalAmount    = services.reduce((sum, s) => sum + (s.discountPrice || s.price), 0);
    const totalAmount  = services.reduce((sum, s) => sum + (s.price || 0), 0);
    let appliedCoupon  = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true, salonId: req.salonId });
      if (coupon?.isValid().valid && finalAmount >= (coupon.minOrderAmount || 0)) {
        const disc = coupon.calculateDiscount(finalAmount);
        discountAmount += disc; finalAmount -= disc;
        appliedCoupon = coupon.code; coupon.usedCount++; await coupon.save();
      }
    }
    if (manualDiscountPercent && Number(manualDiscountPercent) > 0) {
      const pct = Math.min(50, Math.max(0, Number(manualDiscountPercent)));
      const d   = Math.round(finalAmount * pct / 100);
      discountAmount += d; finalAmount -= d;
    }

    const bookingData = {
      salonId:            req.salonId,
      customer:           customer._id || req.user.userId,
      service:            allServiceIds[0],
      additionalServices: allServiceIds.slice(1),
      staff:              primaryStaffId || undefined,
      date:               istMidnight(useDate),
      timeSlot:           { start: curTime, end: endTime },
      totalAmount:        Number(totalAmount) || 0,
      discountAmount:     Number(discountAmount) || 0,
      finalAmount:        Number(finalAmount) || 0,
      notes:              notes || '',
      type:               'walk-in',
      status:             'confirmed',
      paymentStatus:      'pending',
      paymentMethod:      ['cash', 'upi', 'card'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash',
    };
    if (HAS_STAFF_MEMBERS) bookingData.staffMembers = allStaffIds;
    if (Booking.schema.path('couponCode')) bookingData.couponCode = appliedCoupon || '';

    let booking;
    try {
      booking = await Booking.create(bookingData);
    } catch (createErr) {
      console.error('❌ Booking.create FAILED:', createErr.message);
      throw new AppError('Booking save failed: ' + createErr.message, 500);
    }

    await Promise.all(allServiceIds.map(id => Service.findByIdAndUpdate(id, { $inc: { popularity: 1 } })));

    const pop = await Booking.findById(booking._id)
      .populate('service', 'name category duration price discountPrice')
      .populate('additionalServices', 'name category duration price discountPrice')
      .populate('customer', 'name phone')
      .populate('staff', 'name');
    res.status(201).json({ success: true, message: 'Walk-in created!', booking: pop });
  } catch (e) {
    console.error('❌ createWalkInBooking ERROR:', e.message);
    next(e);
  }
};

// ── GET /bookings ──────────────────────────────────────────────────────────
const getBookings = async (req, res, next) => {
  try {
    const { status, date, startDate, endDate, type, refNo, page = 1, limit = 200 } = req.query;
    const filter = { salonId: req.salonId };

    if (req.user.role === 'customer') filter.customer = req.user.userId;
    else if (req.user.role === 'staff') filter.staff = req.user.userId;

    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (refNo)  filter.refNo  = { $regex: refNo.trim(), $options: 'i' };
    if (date) {
      filter.date = { $gte: new Date(date + 'T00:00:00.000Z'), $lte: new Date(date + 'T23:59:59.999Z') };
    } else if (startDate && endDate) {
      filter.date = { $gte: istMidnight(startDate), $lte: istEndOfDay(endDate) };
    }

    const bookings = await Booking.find(filter)
      .populate('service', 'name category duration price discountPrice')
      .populate('additionalServices', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name')
      .sort({ date: 1, 'timeSlot.start': 1 })
      .skip((page - 1) * limit).limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);
    res.status(200).json({ success: true, bookings, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

// ── PATCH /bookings/:id/assign ─────────────────────────────────────────────
const assignStaff = async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!booking) throw new AppError('Booking not found', 404);
    booking.staff = staffId || null;
    await booking.save();
    const pop = await Booking.findById(booking._id)
      .populate('service', 'name category duration price')
      .populate('additionalServices', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');
    res.status(200).json({ success: true, message: 'Staff assigned', booking: pop });
  } catch (e) { next(e); }
};

// ── PATCH /bookings/:id/status ─────────────────────────────────────────────
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, paymentMethod, paymentStatus, cancelReason } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!booking) throw new AppError('Booking not found', 404);

    if (req.user.role === 'staff') {
      if (booking.staff?.toString() !== req.user.userId) throw new AppError('Not your booking', 403);
      if (!['in-progress', 'completed'].includes(status)) throw new AppError('Staff can only start or complete', 403);
    }
    if (req.user.role === 'customer') {
      if (booking.customer.toString() !== req.user.userId) throw new AppError('Not authorized', 403);
      if (status !== 'cancelled') throw new AppError('Customers can only cancel', 403);
    }

    const wasAlreadyCompleted = booking.status === 'completed';
    booking.status = status;
    if (status === 'cancelled') { booking.cancelledAt = new Date(); booking.cancelReason = cancelReason || ''; }
    if (status === 'completed' && !wasAlreadyCompleted) booking.completedAt = new Date();
    if (paymentMethod) booking.paymentMethod = paymentMethod;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    await booking.save();

    if (status === 'completed' && !wasAlreadyCompleted && booking.staff) {
      await Staff.findOneAndUpdate({ user: booking.staff, salonId: req.salonId }, {
        $inc: { totalServicesCompleted: 1, totalRevenueGenerated: booking.finalAmount }
      });
    }

    const pop = await Booking.findById(booking._id)
      .populate('service', 'name category duration price')
      .populate('additionalServices', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');
    res.status(200).json({ success: true, message: `Status updated to ${status}`, booking: pop });
  } catch (e) { next(e); }
};

// ── PATCH /bookings/:id/verify-payment ─────────────────────────────────────
const verifyPaymentDirect = async (req, res, next) => {
  try {
    const { method, notes } = req.body;
    if (!method) throw new AppError('Payment method required', 400);

    const booking = await Booking.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Already paid', booking });
    }

    booking.paymentMethod = method;
    booking.paymentStatus = 'paid';
    await booking.save();

    await Payment.create({
      salonId:     req.salonId,
      booking:     booking._id,
      customer:    booking.customer,
      amount:      booking.finalAmount,
      method, status: 'completed',
      notes:       notes || '',
      collectedBy: req.user.userId,
    }).catch(() => {});

    const pop = await Booking.findById(booking._id)
      .populate('service', 'name category duration price')
      .populate('additionalServices', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');
    res.status(200).json({ success: true, message: 'Payment verified!', booking: pop });
  } catch (e) { next(e); }
};

// ── GET /bookings/today/stats ──────────────────────────────────────────────
const getTodayStats = async (req, res, next) => {
  try {
    const todayStr   = todayIST();
    const dateFilter = { salonId: req.salonId, date: { $gte: istMidnight(todayStr), $lte: istEndOfDay(todayStr) } };

    const [total, confirmed, inProgress, completed, cancelled] = await Promise.all([
      Booking.countDocuments(dateFilter),
      Booking.countDocuments({ ...dateFilter, status: 'confirmed' }),
      Booking.countDocuments({ ...dateFilter, status: 'in-progress' }),
      Booking.countDocuments({ ...dateFilter, status: 'completed' }),
      Booking.countDocuments({ ...dateFilter, status: 'cancelled' }),
    ]);
    const [rev, pending] = await Promise.all([
      Booking.aggregate([{ $match: { ...dateFilter, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
      Booking.aggregate([{ $match: { ...dateFilter, status: 'completed', paymentStatus: { $in: ['pending', 'partial'] } } }, { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } }]),
    ]);

    res.status(200).json({ success: true, stats: {
      total, confirmed, inProgress, completed, cancelled,
      todayRevenue:    rev[0]?.total || 0,
      pendingPayment:  pending[0]?.total || 0,
      pendingPayCount: pending[0]?.count || 0,
    }});
  } catch (e) { next(e); }
};

// ── POST /bookings/:id/refund ──────────────────────────────────────────────
const processRefund = async (req, res, next) => {
  try {
    const CashTransaction = require('../models/CashTransaction');
    const { refundMethod = 'cash', reason = '', amount } = req.body;

    const booking = await Booking.findOne({ _id: req.params.id, salonId: req.salonId })
      .populate('service',  'name')
      .populate('customer', 'name phone');
    if (!booking)                          throw new AppError('Booking not found', 404);
    if (booking.paymentStatus !== 'paid') throw new AppError('Booking must be paid before issuing a refund', 400);

    const refundAmt = Math.round(amount || booking.finalAmount || 0);

    booking.paymentStatus = 'refunded';
    await booking.save();

    await Payment.findOneAndUpdate(
      { booking: booking._id, salonId: req.salonId, status: 'completed' },
      { status: 'refunded', refundAmount: refundAmt, refundReason: reason, refundedAt: new Date() }
    ).catch(() => {});

    if (refundMethod === 'cash') {
      const IST_OFF = 5.5 * 60 * 60 * 1000;
      const nowIST  = new Date(Date.now() + IST_OFF);
      const dateStr = nowIST.toISOString().split('T')[0];
      const timeStr = nowIST.toTimeString().slice(0, 5);
      await CashTransaction.create({
        salonId:   req.salonId,
        type:      'adjustment',
        amount:    refundAmt,
        sign:      '-',
        note:      `Refund — ${booking.customer?.name || 'Customer'} · ${booking.service?.name || 'Service'} · ${booking.refNo || ''}${reason ? ' · ' + reason : ''}`,
        date:      dateStr,
        time:      timeStr,
        createdBy: req.user._id,
      }).catch(() => {});
    }

    if (booking.staff && booking.status === 'completed' && refundAmt > 0) {
      await Staff.findOneAndUpdate(
        { user: booking.staff, salonId: req.salonId },
        { $inc: { totalRevenueGenerated: -refundAmt } }
      ).catch(() => {});
    }

    const pop = await Booking.findById(booking._id)
      .populate('service', 'name category duration price')
      .populate('additionalServices', 'name category duration price discountPrice')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');

    res.status(200).json({ success: true, message: `Refund of ₹${refundAmt} processed via ${refundMethod}`, booking: pop });
  } catch (e) { next(e); }
};

// ── PATCH /bookings/:id/notes ──────────────────────────────────────────────
const patchBookingNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!booking) throw new AppError('Booking not found', 404);
    booking.notes = notes ?? booking.notes;
    await booking.save();
    res.status(200).json({ success: true, message: 'Notes updated', booking });
  } catch (e) { next(e); }
};

module.exports = {
  getStaffAvailability, getAvailableSlots,
  createBooking, createWalkInBooking,
  getBookings, assignStaff, updateBookingStatus, verifyPaymentDirect,
  getTodayStats, processRefund, patchBookingNotes,
};