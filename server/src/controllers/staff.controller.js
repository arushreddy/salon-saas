const Staff         = require('../models/Staff');
const User          = require('../models/User');
const Booking       = require('../models/Booking');
const Attendance    = require('../models/Attendance');
const SalaryPayment = require('../models/SalaryPayment');
const { AppError }  = require('../middlewares/errorHandler');

// ── IST helpers ─────────────────────────────────────────────────────────────
const IST         = 5.5 * 60 * 60 * 1000;
const nowIST      = () => new Date(Date.now() + IST);
const todayISTStr = () => nowIST().toISOString().split('T')[0];
const istMidnight = d  => new Date(d + 'T00:00:00.000Z');

const addCR = s => {
  if (!s) return s;
  const o = s.toObject ? s.toObject() : { ...s };
  o.commissionRate = o.salary?.commissionPercent ?? 0;
  return o;
};
const addCRMany = list => list.map(addCR);

// ── POST /api/staff ──────────────────────────────────────────────────────────
const addStaff = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, specializations, designation, salary, schedule, bio, joiningDate } = req.body;
    if (!name || !email || !password) throw new AppError('Name, email, password required', 400);
    if (await User.findOne({ email, salonId: req.salonId })) throw new AppError('Email already in use', 409);

    const user = await User.create({
      name, email, phone: phone || '', password,
      role: role || 'staff',
      salonId: req.salonId,
    });

    const sp = await Staff.create({
      user:            user._id,
      salonId:         req.salonId,
      specializations: specializations || [],
      designation:     designation || 'junior_stylist',
      salary:          salary || { base: 0, commissionEnabled: false, commissionPercent: 0 },
      schedule:        schedule || { weeklyOff: ['sunday'], shiftStart: '09:00', shiftEnd: '21:00' },
      bio:             bio || '',
      joiningDate:     joiningDate || new Date(),
    });

    const pop = await Staff.findById(sp._id).populate('user', 'name email phone role isActive');
    res.status(201).json({ success: true, message: 'Staff added', staff: pop });
  } catch (e) { next(e); }
};

// ── GET /api/staff ───────────────────────────────────────────────────────────
const getAllStaff = async (req, res, next) => {
  try {
    const f = { salonId: req.salonId };
    if (req.query.designation)    f.designation    = req.query.designation;
    if (req.query.specialization) f.specializations = req.query.specialization;
    if (req.query.available !== undefined) f.isAvailable = req.query.available === 'true';
    const staff = await Staff.find(f).populate('user', 'name email phone role isActive avatar').sort({ createdAt: -1 });
    res.status(200).json({ success: true, staff: addCRMany(staff), total: staff.length });
  } catch (e) { next(e); }
};

// ── GET /api/staff/available ─────────────────────────────────────────────────
const getAvailableStaff = async (req, res, next) => {
  try {
    const f = { salonId: req.salonId, isAvailable: true };
    if (req.query.serviceCategory) f.specializations = req.query.serviceCategory;
    if (req.query.date) {
      const dow = new Date(req.query.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      f['schedule.weeklyOff'] = { $ne: dow };
    }
    const staff = await Staff.find(f).populate('user', 'name email phone isActive').sort({ averageRating: -1, totalServicesCompleted: -1 });
    res.status(200).json({ success: true, staff: staff.filter(s => s.user?.isActive) });
  } catch (e) { next(e); }
};

// ── GET /api/staff/:id ───────────────────────────────────────────────────────
const getStaffById = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, salonId: req.salonId })
      .populate('user', 'name email phone role isActive avatar');
    if (!staff) throw new AppError('Staff not found', 404);
    const recent = await Booking.find({ staff: staff.user._id, salonId: req.salonId })
      .populate('service', 'name category price').populate('customer', 'name').sort({ date: -1 }).limit(10);
    res.status(200).json({ success: true, staff: addCR(staff), recentBookings: recent });
  } catch (e) { next(e); }
};

const getMyProfile = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ user: req.user.userId, salonId: req.salonId })
      .populate('user', 'name email phone role isActive avatar');
    if (!staff) throw new AppError('Staff profile not found', 404);
    res.status(200).json({ success: true, staff: addCR(staff) });
  } catch (e) { next(e); }
};

// ── PUT /api/staff/:id ───────────────────────────────────────────────────────
const updateStaff = async (req, res, next) => {
  try {
    const { name, phone, role, specializations, designation, salary, schedule, bio, isAvailable } = req.body;
    const staff = await Staff.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!staff) throw new AppError('Staff not found', 404);
    const upd = {};
    if (name)  upd.name  = name;
    if (phone) upd.phone = phone;
    if (role)  upd.role  = role;
    if (Object.keys(upd).length) await User.findByIdAndUpdate(staff.user, upd);
    if (specializations) staff.specializations = specializations;
    if (designation)     staff.designation     = designation;
    if (salary)          staff.salary          = { ...staff.salary.toObject(), ...salary };
    if (schedule)        staff.schedule        = { ...staff.schedule.toObject(), ...schedule };
    if (bio !== undefined)          staff.bio         = bio;
    if (isAvailable !== undefined)  staff.isAvailable = isAvailable;
    await staff.save();
    const pop = await Staff.findById(staff._id).populate('user', 'name email phone role isActive');
    res.status(200).json({ success: true, message: 'Staff updated', staff: addCR(pop) });
  } catch (e) { next(e); }
};

// ── PATCH /api/staff/:id ─────────────────────────────────────────────────────
const patchStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!staff) throw new AppError('Staff not found', 404);
    if (req.body.commissionRate !== undefined) {
      const rate = Number(req.body.commissionRate);
      staff.salary.commissionPercent = rate;
      staff.salary.commissionEnabled = rate > 0;
    }
    ['isAvailable', 'bio', 'designation', 'specializations'].forEach(f => {
      if (req.body[f] !== undefined) staff[f] = req.body[f];
    });
    if (req.body.salary)   staff.salary   = { ...staff.salary.toObject(),   ...req.body.salary };
    if (req.body.schedule) staff.schedule = { ...staff.schedule.toObject(), ...req.body.schedule };
    if (req.body.isActive !== undefined) {
      await User.findByIdAndUpdate(staff.user, { isActive: req.body.isActive });
    }
    await staff.save();
    const pop = await Staff.findById(staff._id).populate('user', 'name email phone role isActive');
    res.status(200).json({ success: true, message: 'Staff updated', staff: addCR(pop) });
  } catch (e) { next(e); }
};

// ── DELETE /api/staff/:id ────────────────────────────────────────────────────
const deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!staff) throw new AppError('Staff not found', 404);
    await User.findByIdAndUpdate(staff.user, { isActive: false });
    staff.isAvailable = false;
    await staff.save();
    res.status(200).json({ success: true, message: 'Staff deactivated' });
  } catch (e) { next(e); }
};

// ── GET /api/staff/:id/performance ──────────────────────────────────────────
const getStaffPerformance = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, salonId: req.salonId }).populate('user', 'name');
    if (!staff) throw new AppError('Staff not found', 404);
    const today  = todayISTStr();
    const mStart = istMidnight(today.slice(0, 8) + '01');
    const [todayN, monthN, rev] = await Promise.all([
      Booking.countDocuments({ staff: staff.user._id, salonId: req.salonId, date: { $gte: istMidnight(today), $lt: new Date(today + 'T23:59:59.999Z') }, status: { $in: ['confirmed', 'in-progress', 'completed'] } }),
      Booking.countDocuments({ staff: staff.user._id, salonId: req.salonId, date: { $gte: mStart }, status: 'completed' }),
      Booking.aggregate([{ $match: { staff: staff.user._id, salonId: req.salonId, date: { $gte: mStart }, status: 'completed', paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
    ]);
    res.status(200).json({ success: true, performance: {
      name:                   staff.user.name,
      todayBookings:          todayN,
      monthBookings:          monthN,
      monthRevenue:           rev[0]?.total || 0,
      totalServicesCompleted: staff.totalServicesCompleted,
      totalRevenueGenerated:  staff.totalRevenueGenerated,
      averageRating:          staff.averageRating,
    }});
  } catch (e) { next(e); }
};

// ── POST /api/staff/:id/salary-payment ──────────────────────────────────────
const recordSalaryPayment = async (req, res, next) => {
  try {
    const {
      type, month, amount, note, paymentMethod, referenceNo,
      receiptImage, receiptFileName, commissionAmount, revenueGenerated,
      totalNetPay, baseSalary: bsOverride,
    } = req.body;

    if (!type || !month || amount === undefined) throw new AppError('type, month, amount required', 400);

    const staff = await Staff.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!staff) throw new AppError('Staff not found', 404);

    const record = await SalaryPayment.create({
      staff:             staff.user,
      staffProfile:      staff._id,
      salonId:           req.salonId,
      type, month,
      amount:            Number(amount),
      baseSalary:        bsOverride ?? staff.salary?.base ?? 0,
      commissionEnabled: staff.salary?.commissionEnabled || false,
      commissionPercent: staff.salary?.commissionPercent || 0,
      commissionAmount:  Number(commissionAmount || 0),
      revenueGenerated:  Number(revenueGenerated || 0),
      totalNetPay:       Number(totalNetPay || 0),
      note:              note || '',
      paymentMethod:     paymentMethod || 'cash',
      referenceNo:       referenceNo || '',
      receiptImage:      receiptImage || '',
      receiptFileName:   receiptFileName || '',
      status:            'paid',
      paidBy:            req.user.userId,
      paidAt:            new Date(),
    });

    res.status(201).json({ success: true, message: 'Payment recorded', record });
  } catch (e) { next(e); }
};

// ── GET /api/staff/:id/salary-history ───────────────────────────────────────
const getSalaryHistory = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!staff) throw new AppError('Staff not found', 404);
    const records = await SalaryPayment.find({ staff: staff.user, salonId: req.salonId }).sort({ paidAt: -1 }).limit(60);
    res.status(200).json({ success: true, records });
  } catch (e) { next(e); }
};

// ── GET /api/staff/my/salary ─────────────────────────────────────────────────
const getMySalary = async (req, res, next) => {
  try {
    const { month } = req.query;
    const filter = { staff: req.user.userId, salonId: req.salonId };
    if (month) filter.month = month;
    const records = await SalaryPayment.find(filter).sort({ paidAt: -1 }).limit(60);
    res.status(200).json({ success: true, records });
  } catch (e) { next(e); }
};

// ── GET /api/staff/my/earnings ───────────────────────────────────────────────
const getMyEarnings = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { period = 'month' } = req.query;
    const n = nowIST();

    let startDate;
    if (period === 'today') {
      startDate = istMidnight(n.toISOString().split('T')[0]);
    } else if (period === 'week') {
      const dow = n.getDay(), diff = dow === 0 ? 6 : dow - 1;
      const mon = new Date(n); mon.setDate(n.getDate() - diff);
      startDate = istMidnight(mon.toISOString().split('T')[0]);
    } else if (period === 'month') {
      startDate = istMidnight(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`);
    } else {
      startDate = istMidnight(`${n.getFullYear()}-01-01`);
    }

    const thisMonthStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;

    const [bookings, staffProfile, allSalaryRecords] = await Promise.all([
      Booking.find({ staff: userId, salonId: req.salonId, status: 'completed', date: { $gte: startDate } })
        .populate('service', 'name category price duration')
        .populate('customer', 'name phone')
        .sort({ date: -1 }),
      Staff.findOne({ user: userId, salonId: req.salonId }),
      SalaryPayment.find({ staff: userId, salonId: req.salonId }).sort({ paidAt: -1 }).limit(100),
    ]);

    const commPct     = staffProfile?.salary?.commissionPercent || 0;
    const commEnabled = staffProfile?.salary?.commissionEnabled || false;
    const baseSalary  = staffProfile?.salary?.base || 0;

    const totalRevenue  = bookings.reduce((s, b) => s + (b.finalAmount || 0), 0);
    const totalServices = bookings.length;
    const avgTicket     = totalServices > 0 ? Math.round(totalRevenue / totalServices) : 0;

    const thisMonthStart    = istMidnight(thisMonthStr + '-01');
    const thisMonthBookings = bookings.filter(b => new Date(b.date) >= thisMonthStart);
    const thisMonthRevenue  = thisMonthBookings.reduce((s, b) => s + (b.finalAmount || 0), 0);
    const commissionThisMonth = commEnabled ? Math.round(thisMonthRevenue * commPct / 100) : 0;

    const thisMonthRecords = allSalaryRecords.filter(r => r.month === thisMonthStr);
    const bonusThisMonth   = thisMonthRecords.filter(r => r.type === 'bonus').reduce((s, r) => s + r.amount, 0);
    const deductThisMonth  = thisMonthRecords.filter(r => r.type === 'deduction').reduce((s, r) => s + r.amount, 0);
    const salaryPaid       = thisMonthRecords.filter(r => r.type === 'payment').reduce((s, r) => s + r.amount, 0);
    const advancePaid      = thisMonthRecords.filter(r => r.type === 'advance').reduce((s, r) => s + r.amount, 0);

    const grossSalary = baseSalary + commissionThisMonth + bonusThisMonth;
    const netSalary   = Math.max(0, grossSalary - deductThisMonth);
    const alreadyPaid = salaryPaid + advancePaid;
    const balanceDue  = Math.max(0, netSalary - alreadyPaid);

    const dailyData   = {};
    const monthlyData = {};
    bookings.forEach(b => {
      const d  = new Date(b.date.getTime() + IST);
      const ds = d.toISOString().split('T')[0];
      const ms = ds.slice(0, 7);
      if (!dailyData[ds])   dailyData[ds]   = { revenue: 0, count: 0 };
      if (!monthlyData[ms]) monthlyData[ms] = { revenue: 0, count: 0 };
      dailyData[ds].revenue   += b.finalAmount || 0; dailyData[ds].count++;
      monthlyData[ms].revenue += b.finalAmount || 0; monthlyData[ms].count++;
    });

    const svcMap = {};
    bookings.forEach(b => {
      const k = b.service?.name || 'Unknown';
      if (!svcMap[k]) svcMap[k] = { name: k, revenue: 0, count: 0 };
      svcMap[k].revenue += b.finalAmount || 0; svcMap[k].count++;
    });

    const isStaffSelf = req.user.role === 'staff' || req.user.role === 'receptionist';

    res.status(200).json({
      success: true,
      summary: {
        totalServices,
        ...(isStaffSelf ? {} : { totalRevenue, avgTicket, commissionEarned: commPct > 0 ? Math.round(totalRevenue * commPct / 100) : 0 }),
        commissionPct: commPct, commissionEnabled: commEnabled,
        thisMonth: thisMonthStr, baseSalary,
        commissionThisMonth, bonusThisMonth, deductThisMonth,
        grossSalary, netSalary, alreadyPaid, balanceDue, salaryPaid, advancePaid,
      },
      ...(isStaffSelf ? {} : { dailyData, monthlyData }),
      topServices: Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 5).map(s => isStaffSelf ? { name: s.name, count: s.count } : s),
      recentBookings: bookings.slice(0, 30).map(b => {
        if (isStaffSelf) {
          const obj = b.toObject ? b.toObject() : { ...b };
          delete obj.finalAmount; delete obj.totalAmount; delete obj.discountAmount;
          return obj;
        }
        return b;
      }),
      salaryRecords:    allSalaryRecords,
      thisMonthRecords,
    });
  } catch (e) { next(e); }
};

// ── GET /api/staff/live-status ───────────────────────────────────────────────
const getLiveStaffStatus = async (req, res, next) => {
  try {
    const IST_MS     = 5.5 * 60 * 60 * 1000;
    const nowISTd    = new Date(Date.now() + IST_MS);
    const todayStr   = nowISTd.toISOString().split('T')[0];
    const todayStart = new Date(todayStr + 'T00:00:00.000Z');
    const todayEnd   = new Date(todayStr + 'T23:59:59.999Z');

    const staffUsers = await User.find(
      { salonId: req.salonId, role: { $in: ['staff', 'receptionist'] }, isActive: true },
      'name email phone avatar'
    );
    const uIds = staffUsers.map(u => u._id);

    const profiles = await Staff.find({ salonId: req.salonId, user: { $in: uIds } });

    const todayAtt = await Attendance.find({
      salonId: req.salonId,
      staff:   { $in: uIds },
      date:    { $gte: todayStart, $lte: todayEnd },
    });

    const activeBookings = await Booking.find({
      salonId: req.salonId,
      staff:   { $in: uIds },
      status:  'in-progress',
      date:    { $gte: todayStart, $lte: todayEnd },
    }).populate('service', 'name duration').populate('customer', 'name');

    const result = staffUsers.map(u => {
      const uid     = u._id.toString();
      const profile = profiles.find(p => p.user?.toString() === uid);
      const att     = todayAtt.find(a => a.staff?.toString() === uid);
      const booking = activeBookings.find(b => b.staff?.toString() === uid);

      const isClockedIn   = att?.sessions?.some(s => s.clockIn && !s.clockOut) || false;
      const isAttPresent  = ['present', 'late', 'half-day'].includes(att?.status);
      const isOnFloor     = isClockedIn || isAttPresent;
      const isAbsent      = att?.status === 'absent' || att?.status === 'leave' || att?.status === 'holiday';
      const hasActiveBook = !!booking;
      const isTempUnavail = profile?.tempUnavailable === true;

      let liveStatus;
      if (isAbsent && !isOnFloor)          liveStatus = 'absent';
      else if (!isOnFloor)                 liveStatus = 'off-duty';
      else if (isOnFloor && hasActiveBook) liveStatus = 'busy';
      else if (isOnFloor && isTempUnavail) liveStatus = 'temp-unavailable';
      else                                 liveStatus = 'available';

      if (profile && profile.availabilityStatus !== liveStatus) {
        Staff.findByIdAndUpdate(profile._id, {
          availabilityStatus: liveStatus,
          isAvailable:        liveStatus === 'available',
          currentBookingId:   booking?._id || null,
        }).exec();
      }

      return {
        _id:             u._id,
        name:            u.name,
        phone:           u.phone,
        avatar:          u.avatar,
        designation:     profile?.designation || 'staff',
        specializations: profile?.specializations || [],
        liveStatus,
        isClockedIn,
        clockedInAt:      isClockedIn ? att.sessions.find(s => s.clockIn && !s.clockOut)?.clockIn : null,
        totalMinutesToday: att?.totalMinutes || 0,
        attendanceStatus:  att?.status || 'unmarked',
        tempUnavailable:   profile?.tempUnavailable || false,
        currentBooking:    booking ? {
          _id:       booking._id,
          service:   booking.service?.name,
          customer:  booking.customer?.name,
          startedAt: booking.updatedAt,
          duration:  booking.service?.duration,
        } : null,
        shiftStart: profile?.schedule?.shiftStart || '09:00',
        shiftEnd:   profile?.schedule?.shiftEnd   || '21:00',
      };
    });

    const summary = {
      total:     result.length,
      available: result.filter(r => r.liveStatus === 'available').length,
      busy:      result.filter(r => r.liveStatus === 'busy').length,
      offDuty:   result.filter(r => r.liveStatus === 'off-duty').length,
      absent:    result.filter(r => r.liveStatus === 'absent').length,
    };

    res.status(200).json({ success: true, staff: result, summary, asOf: new Date() });
  } catch (e) { next(e); }
};

// ── PATCH /api/staff/:id/floor-status ───────────────────────────────────────
const setFloorStatus = async (req, res, next) => {
  try {
    const { tempUnavailable } = req.body;
    if (typeof tempUnavailable !== 'boolean') {
      return res.status(400).json({ success: false, message: 'tempUnavailable must be boolean' });
    }
    let profile = await Staff.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!profile) profile = await Staff.findOne({ user: req.params.id, salonId: req.salonId });
    if (!profile) return res.status(404).json({ success: false, message: 'Staff not found' });

    profile.tempUnavailable = tempUnavailable;
    if (tempUnavailable) {
      profile.availabilityStatus = 'temp-unavailable';
      profile.isAvailable = false;
    }
    await profile.save();
    res.status(200).json({ success: true, tempUnavailable, message: tempUnavailable ? 'Marked temp unavailable' : 'Marked available' });
  } catch (e) { next(e); }
};

module.exports = {
  addStaff, getAllStaff, getAvailableStaff, getStaffById, getMyProfile,
  updateStaff, patchStaff, deleteStaff, getStaffPerformance,
  recordSalaryPayment, getSalaryHistory, getMySalary, getMyEarnings,
  getLiveStaffStatus, setFloorStatus,
};
