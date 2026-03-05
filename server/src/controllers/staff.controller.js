const Staff = require('../models/Staff');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { AppError } = require('../middlewares/errorHandler');

// POST /api/staff — Admin adds new staff member
const addStaff = async (req, res, next) => {
  try {
    const {
      name, email, phone, password, role,
      specializations, designation, salary,
      schedule, bio, joiningDate
    } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email and password are required', 400);
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('A user with this email already exists', 409);
    }

    // Create user account
    const user = await User.create({
      name,
      email,
      phone: phone || '',
      password,
      role: role || 'staff',
    });

    // Create staff profile
    const staffProfile = await Staff.create({
      user: user._id,
      specializations: specializations || [],
      designation: designation || 'junior_stylist',
      salary: salary || { base: 0, commissionEnabled: false, commissionPercent: 0 },
      schedule: schedule || { weeklyOff: ['sunday'], shiftStart: '09:00', shiftEnd: '21:00' },
      bio: bio || '',
      joiningDate: joiningDate || new Date(),
    });

    const populated = await Staff.findById(staffProfile._id).populate('user', 'name email phone role isActive');

    res.status(201).json({
      success: true,
      message: 'Staff member added successfully',
      staff: populated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/staff — Get all staff
const getAllStaff = async (req, res, next) => {
  try {
    const { designation, specialization, available } = req.query;
    const filter = {};

    if (designation) filter.designation = designation;
    if (specialization) filter.specializations = specialization;
    if (available !== undefined) filter.isAvailable = available === 'true';

    const staff = await Staff.find(filter)
      .populate('user', 'name email phone role isActive avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      staff,
      total: staff.length,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/staff/available — Get available staff for booking
const getAvailableStaff = async (req, res, next) => {
  try {
    const { date, serviceCategory } = req.query;

    const filter = { isAvailable: true };
    if (serviceCategory) {
      filter.specializations = serviceCategory;
    }

    // Get day of week
    if (date) {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      filter['schedule.weeklyOff'] = { $ne: dayOfWeek };
    }

    const staff = await Staff.find(filter)
      .populate('user', 'name email phone isActive')
      .sort({ averageRating: -1, totalServicesCompleted: -1 });

    // Filter out inactive users
    const activeStaff = staff.filter((s) => s.user && s.user.isActive);

    res.status(200).json({
      success: true,
      staff: activeStaff,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/staff/:id — Get single staff detail
const getStaffById = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .populate('user', 'name email phone role isActive avatar');

    if (!staff) throw new AppError('Staff not found', 404);

    // Get recent bookings for this staff
    const recentBookings = await Booking.find({ staff: staff.user._id })
      .populate('service', 'name category price')
      .populate('customer', 'name')
      .sort({ date: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      staff,
      recentBookings,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/staff/:id — Update staff profile
const updateStaff = async (req, res, next) => {
  try {
    const {
      name, phone, role,
      specializations, designation, salary,
      schedule, bio, isAvailable
    } = req.body;

    const staff = await Staff.findById(req.params.id);
    if (!staff) throw new AppError('Staff not found', 404);

    // Update user fields
    if (name || phone || role) {
      const updateFields = {};
      if (name) updateFields.name = name;
      if (phone) updateFields.phone = phone;
      if (role) updateFields.role = role;
      await User.findByIdAndUpdate(staff.user, updateFields);
    }

    // Update staff profile fields
    if (specializations) staff.specializations = specializations;
    if (designation) staff.designation = designation;
    if (salary) staff.salary = { ...staff.salary.toObject(), ...salary };
    if (schedule) staff.schedule = { ...staff.schedule.toObject(), ...schedule };
    if (bio !== undefined) staff.bio = bio;
    if (isAvailable !== undefined) staff.isAvailable = isAvailable;

    await staff.save();

    const populated = await Staff.findById(staff._id).populate('user', 'name email phone role isActive');

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      staff: populated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/staff/:id — Deactivate staff
const deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) throw new AppError('Staff not found', 404);

    // Don't delete — deactivate
    await User.findByIdAndUpdate(staff.user, { isActive: false });
    staff.isAvailable = false;
    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Staff member deactivated',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/staff/:id/performance — Staff performance stats
const getStaffPerformance = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('user', 'name');
    if (!staff) throw new AppError('Staff not found', 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's stats
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayBookings, monthBookings, monthRevenue] = await Promise.all([
      Booking.countDocuments({
        staff: staff.user._id,
        date: { $gte: today, $lt: tomorrow },
        status: { $in: ['confirmed', 'in-progress', 'completed'] },
      }),
      Booking.countDocuments({
        staff: staff.user._id,
        date: { $gte: thisMonthStart },
        status: 'completed',
      }),
      Booking.aggregate([
        {
          $match: {
            staff: staff.user._id,
            date: { $gte: thisMonthStart },
            status: 'completed',
            paymentStatus: 'paid',
          },
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      performance: {
        name: staff.user.name,
        todayBookings,
        monthBookings,
        monthRevenue: monthRevenue[0]?.total || 0,
        totalServicesCompleted: staff.totalServicesCompleted,
        totalRevenueGenerated: staff.totalRevenueGenerated,
        averageRating: staff.averageRating,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addStaff,
  getAllStaff,
  getAvailableStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getStaffPerformance,
};