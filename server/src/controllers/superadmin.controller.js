// src/controllers/superadmin.controller.js
// All routes protected by authorize('super_admin')
const Salon                = require('../models/Salon');
const Franchise            = require('../models/Franchise');
const User                 = require('../models/User');
const Booking              = require('../models/Booking');
const Payment              = require('../models/Payment');
const Staff                = require('../models/Staff');
const Plan                 = require('../models/Plan');
const SubscriptionPayment  = require('../models/SubscriptionPayment');
const { AppError } = require('../middlewares/errorHandler');
const bcrypt    = require('bcryptjs');
const { generateAccessToken } = require('../utils/token');

// ── GET /api/superadmin/stats ─────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSalons, activeSalons, suspendedSalons, totalUsers,
      totalFranchises, newThisMonth,
    ] = await Promise.all([
      Salon.countDocuments(),
      Salon.countDocuments({ isActive: true, isSuspended: false }),
      Salon.countDocuments({ isSuspended: true }),
      User.countDocuments(),
      Franchise.countDocuments(),
      Salon.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    // Expired subscriptions
    const expiredSubs = await Salon.countDocuments({
      subscriptionExpiry: { $lt: now, $ne: null },
      isActive: true,
    });

    // Plan breakdown
    const planBreakdown = await Salon.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    // Platform revenue: subscription payments collected
    const revenueAgg = await SubscriptionPayment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // MRR: subscription payments this month
    const mrrAgg = await SubscriptionPayment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const mrr = mrrAgg[0]?.total || 0;

    // Total bookings
    const totalBookings = await Booking.countDocuments();
    const bookingsThisMonth = await Booking.countDocuments({ createdAt: { $gte: startOfMonth } });

    res.status(200).json({
      success: true,
      stats: {
        totalSalons, activeSalons, suspendedSalons,
        totalUsers, totalFranchises, newThisMonth,
        expiredSubs, totalRevenue, mrr,
        totalBookings, bookingsThisMonth,
        planBreakdown: planBreakdown.reduce((acc, p) => {
          acc[p._id || 'unset'] = p.count; return acc;
        }, {}),
      },
    });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/salons ────────────────────────────────────────────────
const getSalons = async (req, res, next) => {
  try {
    const { search, plan, status, franchise, page = 1, limit = 25 } = req.query;
    const filter = {};

    if (plan)      filter.plan = plan;
    if (franchise) filter.franchiseId = franchise;

    if (status === 'active')    { filter.isActive = true;  filter.isSuspended = false; }
    if (status === 'suspended') { filter.isSuspended = true; }
    if (status === 'inactive')  { filter.isActive = false; }
    if (status === 'expired')   {
      filter.subscriptionExpiry = { $lt: new Date(), $ne: null };
      filter.isActive = true;
    }

    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { slug:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [salons, total] = await Promise.all([
      Salon.find(filter)
        .populate({ path: 'admin', select: 'name email phone', strictPopulate: false })
        .populate({ path: 'franchiseId', select: 'name slug', strictPopulate: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Salon.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      salons,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
    });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/salons/:id ────────────────────────────────────────────
const getSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id)
      .populate({ path: 'admin', select: 'name email phone role lastLogin', strictPopulate: false })
      .populate({ path: 'franchiseId', select: 'name slug', strictPopulate: false })
      .lean();
    if (!salon) throw new AppError('Salon not found', 404);

    // Attach counts
    const [staffCount, bookingCount, revenueAgg] = await Promise.all([
      Staff.countDocuments({ salonId: salon._id }),
      Booking.countDocuments({ salonId: salon._id }),
      Payment.aggregate([
        { $match: { salonId: salon._id, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      salon: {
        ...salon,
        staffCount,
        bookingCount,
        totalRevenue: revenueAgg[0]?.total || 0,
      },
    });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/salons ───────────────────────────────────────────────
const createSalon = async (req, res, next) => {
  try {
    const {
      name, slug, adminEmail, adminName, adminPhone, adminPassword,
      plan, franchiseId, subscriptionMonths, subscriptionYears, subscriptionExpiry,
      phone, email, address,
    } = req.body;

    if (!name || !slug || !adminEmail || !adminPassword)
      throw new AppError('name, slug, adminEmail and adminPassword are required', 400);

    const normalSlug = slug.toLowerCase().trim();
    if (await Salon.findOne({ slug: normalSlug }))
      throw new AppError('Slug already taken', 409);

    let adminUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!adminUser) {
      adminUser = await User.create({
        name: adminName || adminEmail.split('@')[0],
        email: adminEmail.toLowerCase(),
        phone: adminPhone || '',
        password: adminPassword,
        role: 'admin',
      });
    }

    let computedExpiry = null;
    if (subscriptionExpiry) {
      computedExpiry = new Date(subscriptionExpiry);
    } else if (subscriptionMonths || subscriptionYears) {
      computedExpiry = new Date();
      if (subscriptionMonths) computedExpiry.setMonth(computedExpiry.getMonth() + parseInt(subscriptionMonths));
      if (subscriptionYears)  computedExpiry.setFullYear(computedExpiry.getFullYear() + parseInt(subscriptionYears));
    }

    const salon = await Salon.create({
      name, slug: normalSlug,
      admin: adminUser._id,
      plan: plan || 'plan1',
      franchiseId: franchiseId || null,
      subscriptionExpiry: computedExpiry,
      phone: phone || '',
      email: email || '',
      address: address || {},
      isActive: true,
      createdBy: req.user.userId,
    });

    await User.findByIdAndUpdate(adminUser._id, { salonId: salon._id });

    const populated = await Salon.findById(salon._id)
      .populate('admin', 'name email')
      .lean();

    res.status(201).json({ success: true, message: 'Salon created', salon: populated });
  } catch (e) { next(e); }
};

// ── PUT /api/superadmin/salons/:id ────────────────────────────────────────────
const updateSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) throw new AppError('Salon not found', 404);

    const allowed = ['name', 'plan', 'subscriptionExpiry', 'isActive', 'phone',
                     'email', 'logo', 'customDomain', 'features', 'address'];
    allowed.forEach(k => { if (req.body[k] !== undefined) salon[k] = req.body[k]; });
    await salon.save();

    const updated = await Salon.findById(salon._id)
      .populate('admin', 'name email')
      .lean();
    res.status(200).json({ success: true, message: 'Salon updated', salon: updated });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/salons/:id/renew-subscription ────────────────────────
// Body: { months, years, expiryDate, plan, amount, method, transactionId, notes }
const renewSubscription = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) throw new AppError('Salon not found', 404);

    const {
      months, years, expiryDate, plan,
      // payment fields
      amount, method, transactionId, notes,
    } = req.body;

    if (plan) salon.plan = plan;

    const prevExpiry = salon.subscriptionExpiry;

    if (expiryDate) {
      salon.subscriptionExpiry = new Date(expiryDate);
    } else if (months || years) {
      const base = salon.subscriptionExpiry && salon.subscriptionExpiry > new Date()
        ? new Date(salon.subscriptionExpiry)
        : new Date();
      if (months) base.setMonth(base.getMonth() + parseInt(months));
      if (years)  base.setFullYear(base.getFullYear() + parseInt(years));
      salon.subscriptionExpiry = base;
    } else if (!plan) {
      throw new AppError('Provide months, years, expiryDate, or plan', 400);
    }

    // Reactivate if suspended due to expiry
    if (salon.subscriptionExpiry > new Date()) {
      salon.isActive = true;
      salon.isSuspended = false;
      salon.suspendReason = '';
    }

    await salon.save();

    // Record subscription payment if amount provided
    let paymentRecord = null;
    if (amount && parseFloat(amount) > 0 && method) {
      // Calculate duration months for record
      let durationMonths = null;
      if (months) durationMonths = parseInt(months);
      else if (years) durationMonths = parseInt(years) * 12;

      paymentRecord = await SubscriptionPayment.create({
        salonId:        salon._id,
        plan:           salon.plan,
        amount:         parseFloat(amount),
        originalAmount: req.body.originalAmount || parseFloat(amount),
        discountAmount: req.body.discountAmount || 0,
        method:         method,
        transactionId:  transactionId || '',
        notes:          notes || '',
        durationMonths,
        periodStart:    prevExpiry && prevExpiry > new Date() ? prevExpiry : new Date(),
        periodEnd:      salon.subscriptionExpiry,
        collectedBy:    req.user.userId,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription renewed' + (paymentRecord ? ' and payment recorded' : ''),
      subscriptionExpiry: salon.subscriptionExpiry,
      plan: salon.plan,
      payment: paymentRecord,
    });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/salons/:id/payments ────────────────────────────────────
const getSubscriptionPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { salonId: req.params.id };

    const [payments, total] = await Promise.all([
      SubscriptionPayment.find(filter)
        .populate({ path: 'collectedBy', select: 'name email', strictPopulate: false })
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      SubscriptionPayment.countDocuments(filter),
    ]);

    const totalAmount = await SubscriptionPayment.aggregate([
      { $match: { salonId: require('mongoose').Types.ObjectId.createFromHexString(req.params.id) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      success: true,
      payments,
      totalRevenue: totalAmount[0]?.total || 0,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/salons/:id/suspend ───────────────────────────────────
const suspendSalon = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const salon = await Salon.findById(req.params.id);
    if (!salon) throw new AppError('Salon not found', 404);
    salon.isSuspended   = true;
    salon.suspendReason = reason || '';
    await salon.save();
    res.status(200).json({ success: true, message: 'Salon suspended' });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/salons/:id/unsuspend ─────────────────────────────────
const unsuspendSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) throw new AppError('Salon not found', 404);
    salon.isSuspended   = false;
    salon.suspendReason = '';
    await salon.save();
    res.status(200).json({ success: true, message: 'Salon reinstated' });
  } catch (e) { next(e); }
};

// ── DELETE /api/superadmin/salons/:id ─────────────────────────────────────────
const deleteSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) throw new AppError('Salon not found', 404);
    salon.isActive = false;
    await salon.save();
    res.status(200).json({ success: true, message: 'Salon deactivated' });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/salons/:id/reset-password ───────────────────────────
const resetAdminPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      throw new AppError('Password must be at least 6 characters', 400);

    const salon = await Salon.findById(req.params.id).populate('admin');
    if (!salon || !salon.admin) throw new AppError('Salon or admin not found', 404);

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(salon.admin._id, { password: hashed });

    res.status(200).json({ success: true, message: 'Admin password reset successfully' });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/salons/:id/impersonate ───────────────────────────────
const impersonateSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id).populate('admin');
    if (!salon || !salon.admin) throw new AppError('Salon or admin not found', 404);

    const adminUser = salon.admin;
    const token = generateAccessToken({
      userId: adminUser._id.toString(),
      role: adminUser.role,
      salonId: salon._id.toString(),
      impersonatedBy: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Impersonation token generated',
      token,
      salonSlug: salon.slug,
      adminUser: { name: adminUser.name, email: adminUser.email },
    });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/users ─────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (role)   filter.role = role;
    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate({ path: 'salonId', select: 'name slug', strictPopulate: false })
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true, users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/users/:id/force-logout ───────────────────────────────
const forceLogout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { $set: { refreshTokens: [] } });
    res.status(200).json({ success: true, message: 'User force logged out' });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/plans ─────────────────────────────────────────────────
const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1 }).lean();
    res.status(200).json({ success: true, plans });
  } catch (e) { next(e); }
};

// ── POST /api/superadmin/plans ────────────────────────────────────────────────
const createPlan = async (req, res, next) => {
  try {
    const plan = await Plan.create({ ...req.body, createdBy: req.user.userId });
    res.status(201).json({ success: true, message: 'Plan created', plan });
  } catch (e) { next(e); }
};

// ── PUT /api/superadmin/plans/:id ─────────────────────────────────────────────
const updatePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) throw new AppError('Plan not found', 404);
    res.status(200).json({ success: true, message: 'Plan updated', plan });
  } catch (e) { next(e); }
};

// ── DELETE /api/superadmin/plans/:id ──────────────────────────────────────────
const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) throw new AppError('Plan not found', 404);
    res.status(200).json({ success: true, message: 'Plan deleted' });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/franchises ────────────────────────────────────────────
const getFranchises = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];

    const [franchises, total] = await Promise.all([
      Franchise.find(filter)
        .populate({ path: 'owner', select: 'name email phone', strictPopulate: false })
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Franchise.countDocuments(filter),
    ]);

    // Attach branch counts
    const franchiseIds = franchises.map(f => f._id);
    const branchCounts = await Salon.aggregate([
      { $match: { franchiseId: { $in: franchiseIds } } },
      { $group: { _id: '$franchiseId', count: { $sum: 1 } } },
    ]);
    const countMap = branchCounts.reduce((m, b) => { m[b._id.toString()] = b.count; return m; }, {});

    const enriched = franchises.map(f => ({ ...f, branchCount: countMap[f._id.toString()] || 0 }));

    res.status(200).json({
      success: true, franchises: enriched,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/analytics ─────────────────────────────────────────────
const getAnalytics = async (req, res, next) => {
  try {
    const { months = 6 } = req.query;
    const numMonths = parseInt(months);
    const now = new Date();

    // Build monthly buckets
    const monthlyData = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyData.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      });
    }

    const startDate = new Date(now.getFullYear(), now.getMonth() - numMonths + 1, 1);

    // Salon growth per month
    const salonGrowth = await Salon.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
    ]);

    // Platform revenue per month (from subscription payments)
    const revenueGrowth = await SubscriptionPayment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, total: { $sum: '$amount' } } },
    ]);

    // Booking activity per month
    const bookingActivity = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
    ]);

    // Map to timeline
    const salonMap    = salonGrowth.reduce((m, d)  => { m[`${d._id.year}-${d._id.month}`] = d.count; return m; }, {});
    const revenueMap  = revenueGrowth.reduce((m, d) => { m[`${d._id.year}-${d._id.month}`] = d.total; return m; }, {});
    const bookingMap  = bookingActivity.reduce((m, d) => { m[`${d._id.year}-${d._id.month}`] = d.count; return m; }, {});

    const timeline = monthlyData.map(m => {
      const key = `${m.year}-${m.month + 1}`;
      return {
        label: m.label,
        newSalons: salonMap[key] || 0,
        revenue: revenueMap[key] || 0,
        bookings: bookingMap[key] || 0,
      };
    });

    // Top salons by subscription revenue paid to platform
    const topSalons = await SubscriptionPayment.aggregate([
      { $group: { _id: '$salonId', revenue: { $sum: '$amount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'salons', localField: '_id', foreignField: '_id', as: 'salon' } },
      { $unwind: { path: '$salon', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$salon.name', revenue: 1, plan: '$salon.plan' } },
    ]);

    // Revenue by plan (from subscription payments)
    const revenueByPlan = await SubscriptionPayment.aggregate([
      { $group: { _id: '$plan', total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      success: true,
      analytics: { timeline, topSalons, revenueByPlan },
    });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/search ────────────────────────────────────────────────
const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ success: true, results: [] });

    const regex = { $regex: q, $options: 'i' };

    const [salons, users, franchises] = await Promise.all([
      Salon.find({ $or: [{ name: regex }, { slug: regex }, { email: regex }] })
        .select('name slug plan isActive isSuspended').limit(5).lean(),
      User.find({ $or: [{ name: regex }, { email: regex }, { phone: regex }] })
        .select('name email role').limit(5).lean(),
      Franchise.find({ $or: [{ name: regex }, { slug: regex }] })
        .select('name slug').limit(3).lean(),
    ]);

    res.status(200).json({
      success: true,
      results: [
        ...salons.map(s => ({ type: 'salon', id: s._id, title: s.name, sub: s.slug, meta: s.plan })),
        ...users.map(u => ({ type: 'user', id: u._id, title: u.name, sub: u.email, meta: u.role })),
        ...franchises.map(f => ({ type: 'franchise', id: f._id, title: f.name, sub: f.slug, meta: 'franchise' })),
      ],
    });
  } catch (e) { next(e); }
};

// ── GET /api/superadmin/export/salons ─────────────────────────────────────────
const exportSalons = async (req, res, next) => {
  try {
    const { plan, status } = req.query;
    const filter = {};
    if (plan)      filter.plan = plan;
    if (status === 'active')    { filter.isActive = true; filter.isSuspended = false; }
    if (status === 'suspended') { filter.isSuspended = true; }
    if (status === 'inactive')  { filter.isActive = false; }

    const salons = await Salon.find(filter)
      .populate({ path: 'admin', select: 'name email phone', strictPopulate: false })
      .sort({ createdAt: -1 })
      .lean();

    const rows = salons.map(s => [
      s.name, s.slug,
      s.admin?.name || '', s.admin?.email || '', s.admin?.phone || '',
      s.plan, s.isActive ? 'Active' : 'Inactive',
      s.isSuspended ? 'Yes' : 'No',
      s.subscriptionExpiry ? new Date(s.subscriptionExpiry).toLocaleDateString('en-IN') : 'N/A',
      new Date(s.createdAt).toLocaleDateString('en-IN'),
    ]);

    const header = ['Salon Name','Slug','Admin Name','Admin Email','Admin Phone',
                    'Plan','Status','Suspended','Expiry','Created'];
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=salons.csv');
    res.send(csv);
  } catch (e) { next(e); }
};

module.exports = {
  getStats, getSalons, getSalon, createSalon, updateSalon,
  renewSubscription, getSubscriptionPayments,
  suspendSalon, unsuspendSalon, deleteSalon,
  resetAdminPassword, impersonateSalon,
  getUsers, forceLogout,
  getPlans, createPlan, updatePlan, deletePlan,
  getFranchises,
  getAnalytics, globalSearch,
  exportSalons,
};