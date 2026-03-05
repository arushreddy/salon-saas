const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const { AppError } = require('../middlewares/errorHandler');

// POST /api/attendance/clock-in
const clockIn = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    let attendance = await Attendance.findOne({ staff: userId, date: today });

    if (attendance && attendance.clockIn) {
      throw new AppError('Already clocked in today', 400);
    }

    // Get staff shift time
    const staffProfile = await Staff.findOne({ user: userId });
    const shiftStart = staffProfile?.schedule?.shiftStart || '09:00';
    const [shiftH, shiftM] = shiftStart.split(':').map(Number);

    // Calculate late
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const shiftMinutes = shiftH * 60 + shiftM;
    const lateBy = Math.max(0, currentMinutes - shiftMinutes - 15); // 15 min grace

    const status = lateBy > 0 ? 'late' : 'present';

    if (attendance) {
      attendance.clockIn = now;
      attendance.status = status;
      attendance.lateByMinutes = lateBy;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        staff: userId,
        date: today,
        clockIn: now,
        status,
        lateByMinutes: lateBy,
        markedBy: 'self',
      });
    }

    res.status(200).json({
      success: true,
      message: `Clocked in at ${now.toLocaleTimeString('en-IN')}${lateBy > 0 ? ` (Late by ${lateBy} min)` : ''}`,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/clock-out
const clockOut = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ staff: userId, date: today });

    if (!attendance || !attendance.clockIn) {
      throw new AppError('You haven\'t clocked in today', 400);
    }
    if (attendance.clockOut) {
      throw new AppError('Already clocked out today', 400);
    }

    attendance.clockOut = now;

    // Calculate total hours
    const diffMs = now - attendance.clockIn;
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    attendance.totalHours = totalHours;

    // Calculate overtime (after shift end)
    const staffProfile = await Staff.findOne({ user: userId });
    const shiftEnd = staffProfile?.schedule?.shiftEnd || '21:00';
    const [endH, endM] = shiftEnd.split(':').map(Number);
    const shiftEndMinutes = endH * 60 + endM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    attendance.overtimeMinutes = Math.max(0, currentMinutes - shiftEndMinutes);

    await attendance.save();

    res.status(200).json({
      success: true,
      message: `Clocked out. Total hours: ${totalHours}h`,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/today — Get today's attendance for all staff
const getTodayAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ date: today })
      .populate('staff', 'name email phone');

    res.status(200).json({
      success: true,
      attendance: records,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/my — Staff's own attendance history
const getMyAttendance = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.userId;

    let startDate, endDate;
    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    }

    const records = await Attendance.find({
      staff: userId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Calculate summary
    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      late: records.filter((r) => r.status === 'late').length,
      absent: records.filter((r) => r.status === 'absent').length,
      halfDay: records.filter((r) => r.status === 'half-day').length,
      holiday: records.filter((r) => r.status === 'holiday').length,
      leave: records.filter((r) => r.status === 'leave').length,
      totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(1),
      overtimeHours: (records.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0) / 60).toFixed(1),
    };

    res.status(200).json({
      success: true,
      records,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/mark — Admin marks attendance
const markAttendance = async (req, res, next) => {
  try {
    const { staffId, date, status, notes } = req.body;

    if (!staffId || !status) {
      throw new AppError('Staff and status are required', 400);
    }

    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ staff: staffId, date: attendanceDate });

    if (attendance) {
      attendance.status = status;
      attendance.notes = notes || '';
      attendance.markedBy = 'admin';
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        staff: staffId,
        date: attendanceDate,
        status,
        notes: notes || '',
        markedBy: 'admin',
        clockIn: status === 'present' || status === 'late' ? new Date() : null,
      });
    }

    res.status(200).json({
      success: true,
      message: `Attendance marked as ${status}`,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getTodayAttendance,
  getMyAttendance,
  markAttendance,
};