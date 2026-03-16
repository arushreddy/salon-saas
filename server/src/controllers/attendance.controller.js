const Attendance    = require('../models/Attendance');
const Staff         = require('../models/Staff');
const User          = require('../models/User');
const SalonSettings = require('../models/SalonSettings');
const { AppError }  = require('../middlewares/errorHandler');

const IST    = 5.5 * 60 * 60 * 1000;
const nowIST = () => new Date(Date.now() + IST);

const istDayUTC = (d = new Date()) => {
  const istStr = new Date(d.getTime() + IST).toISOString().split('T')[0];
  return new Date(istStr + 'T00:00:00.000Z');
};

const fmtHM = mins => {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// salonId-aware settings lookup
const getSettings = async (salonId) => {
  try { return await SalonSettings.findOne({ salonId }).lean(); } catch { return null; }
};

const isSalonOpenOnDate = (settings, dateObj) => {
  if (!settings?.weeklySchedule) return true;
  const dayName     = DAY_NAMES[dateObj.getDay()];
  const daySchedule = settings.weeklySchedule[dayName];
  return !daySchedule || daySchedule.isOpen !== false;
};

const isSalonOpenNow = async (salonId) => {
  const settings = await getSettings(salonId);
  if (!settings) return { open: true, reason: '' };

  const todayDate   = istDayUTC();
  const dayName     = DAY_NAMES[todayDate.getDay()];
  const daySchedule = settings.weeklySchedule?.[dayName];

  if (daySchedule && daySchedule.isOpen === false) {
    return { open: false, reason: `Salon is closed on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}s` };
  }

  const ist       = nowIST();
  const openTime  = daySchedule?.open  || settings.operatingHours?.openTime  || '09:00';
  const closeTime = daySchedule?.close || settings.operatingHours?.closeTime || '21:00';
  const nowStr    = `${String(ist.getHours()).padStart(2, '0')}:${String(ist.getMinutes()).padStart(2, '0')}`;

  const [oh, om]  = openTime.split(':').map(Number);
  const earlyMins = Math.max(0, oh * 60 + om - 30);
  const earlyStr  = `${String(Math.floor(earlyMins / 60)).padStart(2, '0')}:${String(earlyMins % 60).padStart(2, '0')}`;

  if (nowStr < earlyStr)  return { open: false, reason: `Salon opens at ${openTime}. Clock-in available from ${earlyStr}.` };
  if (nowStr > closeTime) return { open: false, reason: `Salon closed for today (closed at ${closeTime}).` };

  return { open: true, reason: '' };
};

// Auto-absent backfill — now salonId-aware
const backfillAbsent = async (userId, salonId, startDate, endDate) => {
  const settings = await getSettings(salonId);

  const ist          = nowIST();
  const yesterdayStr = new Date(ist.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterday    = new Date(yesterdayStr + 'T00:00:00.000Z');

  const effectiveEnd = endDate < yesterday ? endDate : yesterday;
  if (startDate > effectiveEnd) return;

  let joiningDate = null;
  try {
    const sp = await Staff.findOne({ user: userId, salonId }).lean();
    if (sp?.joiningDate) joiningDate = new Date(new Date(sp.joiningDate).toISOString().split('T')[0] + 'T00:00:00.000Z');
  } catch {}

  const effectiveStart = joiningDate && joiningDate > startDate ? joiningDate : startDate;
  if (effectiveStart > effectiveEnd) return;

  const existing = await Attendance.find({
    staff: userId, salonId,
    date:  { $gte: effectiveStart, $lte: effectiveEnd },
  }, 'date').lean();

  const existingDates = new Set(existing.map(r => r.date.toISOString().split('T')[0]));

  const toCreate = [];
  const cursor   = new Date(effectiveStart);
  while (cursor <= effectiveEnd) {
    const dateStr  = cursor.toISOString().split('T')[0];
    const salonOpen = isSalonOpenOnDate(settings, cursor);
    if (salonOpen && !existingDates.has(dateStr)) {
      toCreate.push({
        staff: userId, salonId,
        date:  new Date(dateStr + 'T00:00:00.000Z'),
        sessions: [], totalMinutes: 0,
        status: 'absent', markedBy: 'self', notes: 'Auto-marked absent',
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (toCreate.length > 0) {
    try {
      await Attendance.insertMany(toCreate, { ordered: false });
    } catch (e) {
      if (e.code !== 11000 && !e.writeErrors?.every(we => we.err?.code === 11000)) {
        console.error('[backfillAbsent]', e.message);
      }
    }
  }
};

const findTodayAtt = async (userId, salonId) => {
  const today = istDayUTC();
  let att = await Attendance.findOne({ staff: userId, salonId, date: today });
  if (att) return att;

  const istNow      = nowIST();
  const istMidnight = new Date(istNow);
  istMidnight.setHours(0, 0, 0, 0);
  const oldFormat = new Date(istMidnight.getTime() - IST);
  att = await Attendance.findOne({ staff: userId, salonId, date: oldFormat });
  return att || null;
};

// ── POST /api/attendance/clock-in ─────────────────────────────────────────────
const clockIn = async (req, res, next) => {
  try {
    const userId  = req.user.userId;
    const salonId = req.salonId;
    const now     = new Date();

    const salonCheck = await isSalonOpenNow(salonId);
    if (!salonCheck.open) {
      return res.status(400).json({ success: false, message: salonCheck.reason, salonClosed: true });
    }

    let att = await findTodayAtt(userId, salonId);

    if (att && att.sessions.some(s => s.clockIn && !s.clockOut)) {
      return res.status(400).json({ success: false, message: 'Already clocked in — clock out first' });
    }

    let lateBy = 0;
    try {
      const sp = await Staff.findOne({ user: userId, salonId }).lean();
      const [shH, shM] = (sp?.schedule?.shiftStart || '09:00').split(':').map(Number);
      const ist = nowIST();
      lateBy = Math.max(0, ist.getHours() * 60 + ist.getMinutes() - (shH * 60 + shM) - 15);
    } catch (_) {}

    if (!att) {
      att = new Attendance({ staff: userId, salonId, date: istDayUTC(), sessions: [], status: 'absent', markedBy: 'self' });
    }

    const isFirst = att.sessions.length === 0;
    att.sessions.push({ clockIn: now, clockOut: null, note: req.body?.note || '' });
    if (isFirst) { att.status = lateBy > 0 ? 'late' : 'present'; att.lateByMinutes = lateBy; }

    await att.save();
    return res.status(200).json({
      success: true,
      message: `Clocked in${lateBy > 0 ? ` (late by ${fmtHM(lateBy)})` : ''}`,
      attendance: att,
    });
  } catch (e) {
    console.error('[clockIn ERROR]', e.name, '|', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ── POST /api/attendance/clock-out ────────────────────────────────────────────
const clockOut = async (req, res, next) => {
  try {
    const userId  = req.user.userId;
    const salonId = req.salonId;
    const now     = new Date();

    const att = await findTodayAtt(userId, salonId);
    if (!att) return res.status(400).json({ success: false, message: 'No attendance record today — clock in first' });

    const openIdx = att.sessions.findIndex(s => s.clockIn && !s.clockOut);
    if (openIdx === -1) return res.status(400).json({ success: false, message: 'Not currently clocked in' });

    const session = att.sessions[openIdx];
    session.clockOut        = now;
    session.durationMinutes = Math.round((now - session.clockIn) / 60000);
    if (req.body?.note) session.note = req.body.note;

    att.totalMinutes = att.sessions.filter(s => s.clockOut).reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    try {
      const sp = await Staff.findOne({ user: userId, salonId }).lean();
      const [endH, endM] = (sp?.schedule?.shiftEnd || '21:00').split(':').map(Number);
      const ist = nowIST();
      att.overtimeMinutes = Math.max(0, ist.getHours() * 60 + ist.getMinutes() - (endH * 60 + endM));
    } catch (_) { att.overtimeMinutes = 0; }

    if (att.status === 'present' && att.totalMinutes < 4 * 60) att.status = 'half-day';

    att.markModified('sessions');
    await att.save();

    return res.status(200).json({
      success: true,
      message: `Clocked out. Session: ${fmtHM(session.durationMinutes)}. Total today: ${fmtHM(att.totalMinutes)}`,
      attendance: att,
    });
  } catch (e) {
    console.error('[clockOut ERROR]', e.name, '|', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ── GET /api/attendance/my ────────────────────────────────────────────────────
const getMyAttendance = async (req, res, next) => {
  try {
    const SalaryPayment = require('../models/SalaryPayment');
    const userId  = req.user.userId;
    const salonId = req.salonId;
    const n       = nowIST();
    const y       = parseInt(req.query.year  || n.getFullYear());
    const m       = parseInt(req.query.month || n.getMonth() + 1);

    const start = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00.000Z`);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);

    await backfillAbsent(userId, salonId, start, end);

    const records = await Attendance.find({ staff: userId, salonId, date: { $gte: start, $lte: end } }).sort({ date: 1 });

    const monthKey   = `${y}-${String(m).padStart(2, '0')}`;
    const salaryDeds = await SalaryPayment.find({ staff: userId, salonId, type: 'deduction', month: monthKey }, 'amount attendanceDate').lean();
    const dedByDate  = {};
    salaryDeds.forEach(d => {
      if (d.attendanceDate) {
        const ds      = new Date(d.attendanceDate).toISOString().split('T')[0];
        dedByDate[ds] = (dedByDate[ds] || 0) + d.amount;
      }
    });

    const bulkOps = [];
    records.forEach(r => {
      const ds         = r.date.toISOString().split('T')[0];
      const paymentDed = dedByDate[ds] || 0;
      if (paymentDed > 0 && r.deduction !== paymentDed) {
        r.deduction = paymentDed;
        bulkOps.push({ updateOne: { filter: { _id: r._id }, update: { $set: { deduction: paymentDed } } } });
      }
    });
    if (bulkOps.length > 0) await Attendance.bulkWrite(bulkOps).catch(() => {});

    const summary = {
      present:  records.filter(r => r.status === 'present').length,
      late:     records.filter(r => r.status === 'late').length,
      absent:   records.filter(r => r.status === 'absent').length,
      halfDay:  records.filter(r => r.status === 'half-day').length,
      leave:    records.filter(r => r.status === 'leave').length,
      holiday:  records.filter(r => r.status === 'holiday').length,
      totalMinutes:    records.reduce((s, r) => s + (r.totalMinutes    || 0), 0),
      overtimeMinutes: records.reduce((s, r) => s + (r.overtimeMinutes || 0), 0),
    };

    let salaryInfo = null;
    try {
      const sp = await Staff.findOne({ user: userId, salonId }, 'salary').lean();
      if (sp?.salary) salaryInfo = sp.salary;
    } catch {}

    const salonStatus = await isSalonOpenNow(salonId);
    res.status(200).json({
      success: true, records, summary, salaryInfo,
      salonOpen: salonStatus.open, salonMessage: salonStatus.reason,
    });
  } catch (e) { next(e); }
};

// ── GET /api/attendance/today ─────────────────────────────────────────────────
const getTodayAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find({ salonId: req.salonId, date: istDayUTC() })
      .populate('staff', 'name email phone');
    res.status(200).json({ success: true, attendance: records });
  } catch (e) { next(e); }
};

// ── POST /api/attendance/mark ─────────────────────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const { staffId, date, status, notes } = req.body;
    if (!staffId || !status) throw new AppError('staffId and status required', 400);
    const attDate = date ? istDayUTC(new Date(date)) : istDayUTC();
    let att = await Attendance.findOne({ staff: staffId, salonId: req.salonId, date: attDate });
    if (att) {
      att.status = status; att.notes = notes || att.notes; att.markedBy = 'admin';
    } else {
      att = new Attendance({ staff: staffId, salonId: req.salonId, date: attDate, status, notes: notes || '', markedBy: 'admin', sessions: [] });
    }
    await att.save();
    res.status(200).json({ success: true, message: `Attendance marked: ${status}`, attendance: att });
  } catch (e) { next(e); }
};

// ── GET /api/attendance/report ────────────────────────────────────────────────
const getAttendanceReport = async (req, res, next) => {
  try {
    const SalaryPayment = require('../models/SalaryPayment');
    const { staffId, month, year, startDate, endDate } = req.query;
    const n = nowIST();
    const y = parseInt(year  || n.getFullYear());
    const m = parseInt(month || n.getMonth() + 1);

    let start, end;
    if (startDate && endDate) {
      start = istDayUTC(new Date(startDate));
      end   = new Date(endDate + 'T23:59:59.999Z');
    } else {
      start = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00.000Z`);
      end   = new Date(y, m, 0, 23, 59, 59, 999);
    }

    if (staffId) {
      await backfillAbsent(staffId, req.salonId, start, end);
    } else {
      const staffUsers = await User.find({ salonId: req.salonId, role: { $in: ['staff', 'receptionist'] }, isActive: true }, '_id');
      await Promise.all(staffUsers.map(u => backfillAbsent(u._id, req.salonId, start, end)));
    }

    const filter = { salonId: req.salonId, date: { $gte: start, $lte: end } };
    if (staffId) filter.staff = staffId;
    const records = await Attendance.find(filter).populate('staff', 'name email phone').sort({ date: -1, staff: 1 });

    const monthKey  = `${y}-${String(m).padStart(2, '0')}`;
    const dedFilter = { salonId: req.salonId, type: 'deduction', month: monthKey };
    if (staffId) dedFilter.staff = staffId;
    const salaryDeds = await SalaryPayment.find(dedFilter, 'staff amount attendanceDate').lean();

    const dedByStaff  = {};
    const dedByRecord = {};
    salaryDeds.forEach(d => {
      const sid      = d.staff.toString();
      dedByStaff[sid] = (dedByStaff[sid] || 0) + d.amount;
      if (d.attendanceDate) {
        const ds        = new Date(d.attendanceDate).toISOString().split('T')[0];
        const key       = `${sid}_${ds}`;
        dedByRecord[key] = (dedByRecord[key] || 0) + d.amount;
      }
    });

    const bulkOps = [];
    records.forEach(r => {
      const sid        = (r.staff?._id || r.staff)?.toString();
      const ds         = r.date.toISOString().split('T')[0];
      const key        = `${sid}_${ds}`;
      const paymentDed = dedByRecord[key] || 0;
      if (paymentDed > 0 && r.deduction !== paymentDed) {
        r.deduction = paymentDed;
        bulkOps.push({ updateOne: { filter: { _id: r._id }, update: { $set: { deduction: paymentDed } } } });
      }
    });
    if (bulkOps.length > 0) await Attendance.bulkWrite(bulkOps).catch(() => {});

    const staffMap = {};
    records.forEach(r => {
      const sid = r.staff?._id?.toString() || r.staff?.toString();
      if (!staffMap[sid]) staffMap[sid] = { staff: r.staff, present: 0, late: 0, absent: 0, halfDay: 0, leave: 0, holiday: 0, totalMinutes: 0, overtimeMinutes: 0, totalDeductions: 0, records: [] };
      const s = staffMap[sid];
      if (r.status === 'present')  s.present++;
      if (r.status === 'late')     s.late++;
      if (r.status === 'absent')   s.absent++;
      if (r.status === 'half-day') s.halfDay++;
      if (r.status === 'leave')    s.leave++;
      if (r.status === 'holiday')  s.holiday++;
      s.totalMinutes    += r.totalMinutes    || 0;
      s.overtimeMinutes += r.overtimeMinutes || 0;
      s.records.push(r);
    });

    Object.keys(staffMap).forEach(sid => { staffMap[sid].totalDeductions = dedByStaff[sid] || 0; });

    res.status(200).json({ success: true, records, summary: Object.values(staffMap), period: { start, end, month: m, year: y } });
  } catch (e) { next(e); }
};

// ── GET /api/attendance/staff-list ────────────────────────────────────────────
const getStaffList = async (req, res, next) => {
  try {
    const users = await User.find({ salonId: req.salonId, role: { $in: ['staff', 'receptionist'] }, isActive: true }, 'name email phone').sort({ name: 1 });
    const staffProfiles = await Staff.find({ salonId: req.salonId, user: { $in: users.map(u => u._id) } }, 'user salary designation').lean();
    const profileMap    = {};
    staffProfiles.forEach(sp => { profileMap[sp.user.toString()] = sp; });

    const enriched = users.map(u => {
      const profile = profileMap[u._id.toString()];
      return {
        _id:         u._id,
        name:        u.name,
        email:       u.email,
        phone:       u.phone,
        salary:      profile?.salary || { base: 0, commissionEnabled: false, commissionPercent: 0 },
        designation: profile?.designation || '',
      };
    });
    res.status(200).json({ success: true, staff: enriched });
  } catch (e) { next(e); }
};

// ── POST /api/attendance/deduction ───────────────────────────────────────────
const applyDeduction = async (req, res, next) => {
  try {
    const SalaryPayment = require('../models/SalaryPayment');
    const { staffId, date, attendanceId, amount, mode, autoType, reason } = req.body;
    if (!staffId || !amount || amount <= 0)
      return res.status(400).json({ success: false, message: 'staffId and amount are required' });

    const roundAmt     = Math.round(amount);
    const dedDate      = date ? istDayUTC(new Date(date)) : istDayUTC();
    const monthKey     = `${dedDate.getFullYear()}-${String(dedDate.getMonth() + 1).padStart(2, '0')}`;
    const staffProfile = await Staff.findOne({ user: staffId, salonId: req.salonId });
    const baseSalary   = staffProfile?.salary?.base || 0;
    const noteText     = reason || `Attendance deduction — ${mode === 'auto' ? (autoType === 'full' ? 'full day' : 'half day') : 'manual'}`;

    const deduction = await SalaryPayment.create({
      staff:          staffId,
      staffProfile:   staffProfile?._id,
      salonId:        req.salonId,
      type:           'deduction',
      month:          monthKey,
      amount:         roundAmt,
      baseSalary,
      note:           noteText,
      paidBy:         req.user._id,
      paidAt:         new Date(),
      attendanceDate: dedDate,
    });

    let att = null;
    if (attendanceId) att = await Attendance.findOne({ _id: attendanceId, salonId: req.salonId });
    if (!att) att = await Attendance.findOne({ staff: staffId, salonId: req.salonId, date: dedDate });
    if (att) { att.deduction = (att.deduction || 0) + roundAmt; await att.save(); }

    res.status(201).json({
      success: true, deduction, attendance: att,
      message: `Deduction of ₹${roundAmt} applied${att ? ' and saved to attendance record' : ''}`,
    });
  } catch (e) { next(e); }
};

module.exports = { clockIn, clockOut, getMyAttendance, getTodayAttendance, markAttendance, applyDeduction, getAttendanceReport, getStaffList };
