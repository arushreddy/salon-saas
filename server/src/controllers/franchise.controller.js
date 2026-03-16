// src/controllers/franchise.controller.js
// Phase 4 — Franchise Module
// Covers: branch management, cross-analytics, managers, WhatsApp,
//         CSV/PDF export, plan reminders, and manual notifications.
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const Salon     = require('../models/Salon');
const Franchise = require('../models/Franchise');
const User      = require('../models/User');
const Booking   = require('../models/Booking');
const { AppError } = require('../middlewares/errorHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtINR = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

/**
 * Build a WhatsApp deep-link URL.
 * Opens wa.me with a pre-filled message — no API key needed.
 * @param {string} phone  - 10-digit Indian phone (we prepend +91)
 * @param {string} message - plain-text message (will be URI-encoded)
 */
const buildWhatsAppLink = (phone, message) => {
  const intl = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
  return `https://wa.me/${intl.replace('+', '')}?text=${encodeURIComponent(message)}`;
};

/**
 * Days until a date (negative = already expired).
 */
const daysUntil = (date) =>
  date ? Math.ceil((new Date(date) - new Date()) / 86400000) : null;


// ── GET /api/franchise/overview ───────────────────────────────────────────────
/**
 * Dashboard KPIs: combined today bookings, revenue, branch stats.
 */
const getOverview = async (req, res, next) => {
  try {
    const franchiseId = new mongoose.Types.ObjectId(req.user.franchiseId);

    // All salons in this franchise
    const salons = await Salon.find({ franchiseId })
      .populate('admin', 'name email phone')
      .lean();

    const salonIds = salons.map(s => s._id);

    // Today's window
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // This month window
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [todayStats, monthStats, allTimeRevenue] = await Promise.all([
      Booking.aggregate([
        { $match: { franchiseId, date: { $gte: todayStart, $lte: todayEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$salonId', bookings: { $count: {} }, revenue: { $sum: '$finalAmount' } } },
      ]),
      Booking.aggregate([
        { $match: { franchiseId, date: { $gte: monthStart }, status: 'completed' } },
        { $group: { _id: null, bookings: { $count: {} }, revenue: { $sum: '$finalAmount' } } },
      ]),
      Booking.aggregate([
        { $match: { franchiseId, status: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$finalAmount' } } },
      ]),
    ]);

    // Build per-salon map
    const todayMap = {};
    todayStats.forEach(s => { todayMap[s._id.toString()] = s; });

    const enrichedSalons = salons.map(s => {
      const td   = todayMap[s._id.toString()] || { bookings: 0, revenue: 0 };
      const days = daysUntil(s.subscriptionExpiry);
      return {
        ...s,
        todayBookings : td.bookings,
        todayRevenue  : td.revenue,
        expiryDays    : days,
        expiryUrgent  : days !== null && days <= 7,
        expiryWarning : days !== null && days > 7 && days <= 30,
      };
    });

    res.json({
      success: true,
      overview: {
        totalBranches  : salons.length,
        activeBranches : salons.filter(s => s.isActive && !s.isSuspended).length,
        suspendedCount : salons.filter(s => s.isSuspended).length,
        expiringCount  : enrichedSalons.filter(s => s.expiryWarning || s.expiryUrgent).length,
        todayBookings  : todayStats.reduce((a, s) => a + s.bookings, 0),
        todayRevenue   : todayStats.reduce((a, s) => a + (s.revenue || 0), 0),
        monthBookings  : monthStats[0]?.bookings || 0,
        monthRevenue   : monthStats[0]?.revenue  || 0,
        allTimeRevenue : allTimeRevenue[0]?.revenue || 0,
      },
      salons: enrichedSalons,
    });
  } catch (e) { next(e); }
};


// ── GET /api/franchise/branches ───────────────────────────────────────────────
/**
 * Paginated list of all branches with live stats.
 */
const getBranches = async (req, res, next) => {
  try {
    const franchiseId = new mongoose.Types.ObjectId(req.user.franchiseId);
    const { search, status, page = 1, limit = 20 } = req.query;

    const filter = { franchiseId };
    if (status === 'active')    { filter.isActive = true; filter.isSuspended = false; }
    if (status === 'suspended') { filter.isSuspended = true; }
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];

    const [salons, total] = await Promise.all([
      Salon.find(filter)
        .populate('admin', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .lean(),
      Salon.countDocuments(filter),
    ]);

    // Attach 30-day rolling stats for each branch
    const salonIds = salons.map(s => s._id);
    const since30  = new Date(Date.now() - 30 * 86400000);
    const stats30  = await Booking.aggregate([
      { $match: { salonId: { $in: salonIds }, date: { $gte: since30 }, status: 'completed' } },
      { $group: { _id: '$salonId', revenue30: { $sum: '$finalAmount' }, bookings30: { $count: {} } } },
    ]);
    const statsMap = {};
    stats30.forEach(s => { statsMap[s._id.toString()] = s; });

    const enriched = salons.map(s => ({
      ...s,
      revenue30 : statsMap[s._id.toString()]?.revenue30  || 0,
      bookings30: statsMap[s._id.toString()]?.bookings30 || 0,
      expiryDays: daysUntil(s.subscriptionExpiry),
    }));

    res.json({
      success: true, salons: enriched,
      pagination: { total, page: +page, pages: Math.ceil(total / +limit) },
    });
  } catch (e) { next(e); }
};


// ── GET /api/franchise/analytics ─────────────────────────────────────────────
/**
 * Cross-branch analytics with daily/weekly/monthly grouping.
 * Query: from, to, groupBy ('day'|'week'|'month'), salonId (optional filter)
 */
const getCrossAnalytics = async (req, res, next) => {
  try {
    const franchiseId = new mongoose.Types.ObjectId(req.user.franchiseId);
    const {
      from = new Date(Date.now() - 30 * 86400000).toISOString(),
      to   = new Date().toISOString(),
      groupBy = 'day',
    } = req.query;

    const salons = await Salon.find({ franchiseId }).select('_id name slug').lean();

    // Date grouping format
    const dateFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d';

    const [revenueByBranch, revenueOverTime, statusBreakdown, topServices] = await Promise.all([
      // Revenue per branch (all time in range)
      Booking.aggregate([
        { $match: {
            franchiseId,
            date: { $gte: new Date(from), $lte: new Date(to) },
            status: 'completed',
        }},
        { $group: {
            _id: '$salonId',
            totalRevenue  : { $sum: '$finalAmount' },
            totalBookings : { $count: {} },
            avgTicket     : { $avg: '$finalAmount' },
        }},
        { $sort: { totalRevenue: -1 } },
      ]),

      // Revenue trend over time per branch
      Booking.aggregate([
        { $match: {
            franchiseId,
            date: { $gte: new Date(from), $lte: new Date(to) },
            status: 'completed',
        }},
        { $group: {
            _id: {
              period  : { $dateToString: { format: dateFormat, date: '$date' } },
              salonId : '$salonId',
            },
            revenue  : { $sum: '$finalAmount' },
            bookings : { $count: {} },
        }},
        { $sort: { '_id.period': 1 } },
      ]),

      // Booking status distribution
      Booking.aggregate([
        { $match: { franchiseId, date: { $gte: new Date(from), $lte: new Date(to) } } },
        { $group: { _id: '$status', count: { $count: {} } } },
      ]),

      // Top services across all branches
      Booking.aggregate([
        { $match: {
            franchiseId,
            date: { $gte: new Date(from), $lte: new Date(to) },
            status: 'completed',
        }},
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
        { $unwind: '$svc' },
        { $group: {
            _id     : '$svc.name',
            count   : { $count: {} },
            revenue : { $sum: '$finalAmount' },
        }},
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Merge salon names into revenueByBranch
    const salonMap = {};
    salons.forEach(s => { salonMap[s._id.toString()] = s.name; });

    const branchData = revenueByBranch.map(b => ({
      salonId      : b._id,
      salonName    : salonMap[b._id.toString()] || 'Unknown',
      totalRevenue : b.totalRevenue,
      totalBookings: b.totalBookings,
      avgTicket    : Math.round(b.avgTicket || 0),
    }));

    // Build time-series: { period → { salonId → { revenue, bookings } } }
    const periods = {};
    revenueOverTime.forEach(row => {
      const p = row._id.period;
      const s = row._id.salonId.toString();
      if (!periods[p]) periods[p] = {};
      periods[p][s] = { revenue: row.revenue, bookings: row.bookings };
    });

    const timeSeries = Object.entries(periods)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, byBranch]) => ({
        period,
        total: Object.values(byBranch).reduce((s, v) => s + v.revenue, 0),
        ...Object.fromEntries(
          salons.map(s => [`sal_${s._id}`, byBranch[s._id.toString()]?.revenue || 0])
        ),
      }));

    res.json({
      success: true,
      salons    : salons.map(s => ({ ...s, id: s._id })),
      branchData,
      timeSeries,
      statusBreakdown,
      topServices,
      dateRange: { from, to, groupBy },
    });
  } catch (e) { next(e); }
};


// ── GET /api/franchise/branches/:salonId/bookings ─────────────────────────────
const getBranchBookings = async (req, res, next) => {
  try {
    const franchiseId = req.user.franchiseId;
    const { salonId }  = req.params;
    const { from, to, status, page = 1, limit = 30 } = req.query;

    // Verify this salon belongs to the franchise
    const salon = await Salon.findOne({ _id: salonId, franchiseId }).lean();
    if (!salon) throw new AppError('Branch not found or access denied', 404);

    const filter = { salonId };
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('customer', 'name phone')
        .populate('service',  'name price')
        .populate('staff',    'name')
        .sort({ date: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true, salon, bookings,
      pagination: { total, page: +page, pages: Math.ceil(total / +limit) },
    });
  } catch (e) { next(e); }
};


// ── POST /api/franchise/managers ──────────────────────────────────────────────
const addManager = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const franchiseId = req.user.franchiseId;

    if (!name || !email || !phone || !password)
      throw new AppError('name, email, phone, password are all required', 400);

    const exists = await User.findOne({ email }).lean();
    if (exists) throw new AppError('A user with this email already exists', 409);

    const mgr = await User.create({
      name, email, phone, password,
      role: 'franchise_manager',
      franchiseId,
      salonId: null,
    });

    res.status(201).json({ success: true, user: { ...mgr.toObject(), password: undefined } });
  } catch (e) { next(e); }
};

// ── GET /api/franchise/managers ───────────────────────────────────────────────
const listManagers = async (req, res, next) => {
  try {
    const { franchiseId } = req.user;
    const managers = await User.find({ franchiseId, role: 'franchise_manager' })
      .select('-password -refreshTokens')
      .lean();
    res.json({ success: true, managers });
  } catch (e) { next(e); }
};

// ── DELETE /api/franchise/managers/:userId ────────────────────────────────────
const removeManager = async (req, res, next) => {
  try {
    const { franchiseId } = req.user;
    const mgr = await User.findOne({ _id: req.params.userId, franchiseId, role: 'franchise_manager' });
    if (!mgr) throw new AppError('Manager not found', 404);
    await mgr.deleteOne();
    res.json({ success: true, message: 'Manager removed' });
  } catch (e) { next(e); }
};


// ── GET /api/franchise/export/csv ─────────────────────────────────────────────
/**
 * Export bookings across all branches as CSV.
 * Query: from, to, salonId (optional), type ('bookings'|'revenue'|'branches')
 */
const exportCSV = async (req, res, next) => {
  try {
    const franchiseId = new mongoose.Types.ObjectId(req.user.franchiseId);
    const {
      from = new Date(Date.now() - 30 * 86400000).toISOString(),
      to   = new Date().toISOString(),
      type = 'bookings',
      salonId,
    } = req.query;

    let csvRows = [];

    if (type === 'branches') {
      // Branch summary report
      const salons = await Salon.find({ franchiseId })
        .populate('admin', 'name email phone')
        .lean();
      const salonIds = salons.map(s => s._id);
      const stats = await Booking.aggregate([
        { $match: { salonId: { $in: salonIds }, date: { $gte: new Date(from), $lte: new Date(to) }, status: 'completed' } },
        { $group: { _id: '$salonId', revenue: { $sum: '$finalAmount' }, bookings: { $count: {} } } },
      ]);
      const sm = {};
      stats.forEach(s => { sm[s._id.toString()] = s; });

      csvRows.push(['Branch Name', 'Slug', 'Plan', 'Admin', 'Admin Email', 'Admin Phone',
                    'Status', 'Bookings', 'Revenue (₹)', 'Subscription Expiry']);
      salons.forEach(s => {
        const st = sm[s._id.toString()] || {};
        csvRows.push([
          s.name, s.slug, s.plan,
          s.admin?.name || '', s.admin?.email || '', s.admin?.phone || '',
          s.isSuspended ? 'Suspended' : s.isActive ? 'Active' : 'Inactive',
          st.bookings || 0, st.revenue || 0,
          s.subscriptionExpiry ? new Date(s.subscriptionExpiry).toLocaleDateString('en-IN') : 'No expiry',
        ]);
      });
    } else {
      // Booking-level export
      const filter = {
        franchiseId,
        date: { $gte: new Date(from), $lte: new Date(to) },
      };
      if (salonId) filter.salonId = new mongoose.Types.ObjectId(salonId);

      const bookings = await Booking.find(filter)
        .populate('customer', 'name phone email')
        .populate('service',  'name price')
        .populate('staff',    'name')
        .populate('salonId',  'name')
        .sort({ date: -1 })
        .lean();

      csvRows.push(['Ref No', 'Branch', 'Date', 'Time', 'Customer', 'Customer Phone',
                    'Service', 'Staff', 'Status', 'Amount (₹)', 'Payment Method']);
      bookings.forEach(b => {
        csvRows.push([
          b.refNo || '',
          b.salonId?.name || '',
          new Date(b.date).toLocaleDateString('en-IN'),
          b.timeSlot?.start || '',
          b.customer?.name || '',
          b.customer?.phone || '',
          b.service?.name || '',
          b.staff?.name || 'Unassigned',
          b.status || '',
          b.finalAmount || b.service?.price || 0,
          b.paymentMethod || '',
        ]);
      });
    }

    // Build CSV string
    const csv = csvRows.map(row =>
      row.map(cell => {
        const s = String(cell).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(',')
    ).join('\r\n');

    const filename = `franchise_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // UTF-8 BOM for Excel
  } catch (e) { next(e); }
};


// ── POST /api/franchise/whatsapp/plan-reminder ────────────────────────────────
/**
 * Generate WhatsApp deep-link messages for plan expiry reminders.
 * Optionally targets a specific salonId; otherwise returns all expiring salons.
 * This is MANUAL — the frontend opens the wa.me link in a new tab.
 */
const getPlanReminderLinks = async (req, res, next) => {
  try {
    const franchiseId = new mongoose.Types.ObjectId(req.user.franchiseId);
    const { salonId, withinDays = 30, customMessage } = req.body;

    const filter = { franchiseId };
    if (salonId) filter._id = new mongoose.Types.ObjectId(salonId);
    else {
      const cutoff = addDays(new Date(), +withinDays);
      filter.subscriptionExpiry = { $lte: cutoff, $gte: new Date() };
    }

    const salons = await Salon.find(filter)
      .populate('admin', 'name email phone')
      .lean();

    const results = salons.map(salon => {
      const days = daysUntil(salon.subscriptionExpiry);
      const phone = salon.admin?.phone || '';

      const defaultMsg = days !== null && days <= 0
        ? `Hi ${salon.admin?.name || 'there'},\n\nYour subscription for *${salon.name}* has expired. Please renew to continue using the platform.\n\nContact us for renewal options.`
        : `Hi ${salon.admin?.name || 'there'},\n\nThis is a reminder that your subscription for *${salon.name}* will expire in *${days} day${days === 1 ? '' : 's'}* on ${new Date(salon.subscriptionExpiry).toLocaleDateString('en-IN')}.\n\nPlease renew on time to avoid any interruption.\n\nThank you!`;

      const message = customMessage || defaultMsg;
      const waLink  = phone ? buildWhatsAppLink(phone, message) : null;

      return {
        salonId      : salon._id,
        salonName    : salon.name,
        adminName    : salon.admin?.name,
        adminPhone   : phone,
        expiryDate   : salon.subscriptionExpiry,
        expiryDays   : days,
        expired      : days !== null && days <= 0,
        message,
        waLink,
        canSend      : !!phone,
      };
    });

    res.json({ success: true, reminders: results });
  } catch (e) { next(e); }
};


// ── POST /api/franchise/whatsapp/custom ───────────────────────────────────────
/**
 * Send a custom WhatsApp message to one or more branch admins.
 * Returns wa.me deep-link(s) — frontend opens them.
 */
const sendCustomWhatsApp = async (req, res, next) => {
  try {
    const franchiseId = req.user.franchiseId;
    const { salonIds, message } = req.body;

    if (!message || !message.trim()) throw new AppError('Message is required', 400);
    if (!salonIds?.length) throw new AppError('At least one salonId required', 400);

    const salons = await Salon.find({ _id: { $in: salonIds }, franchiseId })
      .populate('admin', 'name email phone')
      .lean();

    const results = salons.map(s => ({
      salonId  : s._id,
      salonName: s.name,
      phone    : s.admin?.phone,
      waLink   : s.admin?.phone ? buildWhatsAppLink(s.admin.phone, message) : null,
      canSend  : !!s.admin?.phone,
    }));

    res.json({ success: true, results, message });
  } catch (e) { next(e); }
};


// ── GET /api/franchise/whatsapp/templates ─────────────────────────────────────
/**
 * Pre-built message templates for common scenarios.
 */
const getWhatsAppTemplates = async (req, res, next) => {
  const templates = [
    {
      id: 'expiry_reminder',
      label: 'Subscription expiry reminder',
      template: `Hi {adminName},\n\nYour subscription for *{salonName}* expires on *{expiryDate}* ({expiryDays} days left).\n\nPlease renew to avoid any interruption to your services.\n\nThank you!`,
    },
    {
      id: 'expiry_urgent',
      label: 'Urgent — expires in 3 days or less',
      template: `⚠️ Urgent: Hi {adminName},\n\nYour subscription for *{salonName}* expires in just *{expiryDays} day(s)* on {expiryDate}.\n\nRenew immediately to keep your salon running without interruption.\n\nContact us now.`,
    },
    {
      id: 'expired',
      label: 'Subscription expired',
      template: `Hi {adminName},\n\nYour subscription for *{salonName}* has *expired*. Your salon dashboard is currently restricted.\n\nPlease renew your plan to restore full access.\n\nWe look forward to continuing to serve you!`,
    },
    {
      id: 'welcome_new_branch',
      label: 'Welcome new branch admin',
      template: `Welcome, {adminName}! 🎉\n\nYour salon *{salonName}* has been successfully onboarded to our platform.\n\nYour login credentials:\nEmail: {adminEmail}\nTemp Password: {tempPassword}\n\nPlease log in and change your password at your earliest convenience.\n\nFor support, reply to this message.`,
    },
    {
      id: 'payment_received',
      label: 'Payment / renewal confirmation',
      template: `Hi {adminName},\n\nWe've received your payment for *{salonName}*. Your subscription is now active until *{expiryDate}*.\n\nThank you for being with us! 🙏`,
    },
    {
      id: 'custom',
      label: 'Custom message',
      template: '',
    },
  ];
  res.json({ success: true, templates });
};


module.exports = {
  getOverview,
  getBranches,
  getCrossAnalytics,
  getBranchBookings,
  addManager,
  listManagers,
  removeManager,
  exportCSV,
  getPlanReminderLinks,
  sendCustomWhatsApp,
  getWhatsAppTemplates,
};
