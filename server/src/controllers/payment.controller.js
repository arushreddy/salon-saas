const Payment       = require('../models/Payment');
const Booking       = require('../models/Booking');
const Staff         = require('../models/Staff');
const User          = require('../models/User');
const Salon         = require('../models/Salon');
const SalonSettings = require('../models/SalonSettings');
const { AppError }  = require('../middlewares/errorHandler');
const { sendPaymentReceipt } = require('../utils/whatsappService');

const getSettings = async (salonId) => {
  let s = await SalonSettings.findOne({ salonId });
  if (!s) s = await SalonSettings.create({ salonId });
  return s;
};

// ── POST /api/payments/create-order ─────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, salonId: req.salonId }).populate('service');
    if (!booking) throw new AppError('Booking not found', 404);
    const settings = await getSettings(req.salonId);
    if (!settings.payment.razorpayEnabled || !settings.payment.razorpayKeyId)
      throw new AppError('Online payment not configured. Please pay at the salon.', 400);
    let Razorpay;
    try { Razorpay = require('razorpay'); }
    catch (e) { throw new AppError('Razorpay module not installed. Run: npm install razorpay', 500); }
    const razorpay = new Razorpay({ key_id: settings.payment.razorpayKeyId, key_secret: settings.payment.razorpayKeySecret });
    const order = await razorpay.orders.create({
      amount:   booking.finalAmount * 100,
      currency: 'INR',
      receipt:  `booking_${booking._id}`,
      notes:    { bookingId: booking._id.toString(), service: booking.service?.name || '', customer: req.user.userId },
    });
    await Payment.create({ salonId: req.salonId, booking: booking._id, customer: req.user.userId, amount: booking.finalAmount, method: 'razorpay', status: 'pending', razorpayOrderId: order.id });
    res.status(200).json({ success: true, order: { id: order.id, amount: order.amount, currency: order.currency }, key: settings.payment.razorpayKeyId });
  } catch (error) { next(error); }
};

// ── POST /api/payments/verify ────────────────────────────────────────────────
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;
    const settings = await getSettings(req.salonId);
    const crypto   = require('crypto');
    const expected = crypto.createHmac('sha256', settings.payment.razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
    if (expected !== razorpaySignature) throw new AppError('Payment verification failed — invalid signature', 400);
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId, salonId: req.salonId },
      { razorpayPaymentId, razorpaySignature, status: 'completed' },
      { new: true }
    );
    await Booking.findOneAndUpdate({ _id: bookingId, salonId: req.salonId }, { paymentStatus: 'paid', paymentMethod: 'online' });
    const booking = await Booking.findById(bookingId);
    if (booking?.staff) {
      await Staff.findOneAndUpdate({ user: booking.staff, salonId: req.salonId }, { $inc: { totalRevenueGenerated: booking.finalAmount } });
    }
    res.status(200).json({ success: true, message: 'Payment verified and booking confirmed!', payment });
  } catch (error) { next(error); }
};

// ── POST /api/payments/mark-paid ─────────────────────────────────────────────
const markAsPaid = async (req, res, next) => {
  try {
    const { bookingId, method, notes, transactionId } = req.body;
    if (!bookingId || !method) throw new AppError('Booking ID and payment method are required', 400);
    const booking = await Booking.findOne({ _id: bookingId, salonId: req.salonId });
    if (!booking) throw new AppError('Booking not found', 404);
    const payment = await Payment.create({
      salonId:       req.salonId,
      booking:       booking._id,
      customer:      booking.customer,
      amount:        booking.finalAmount,
      method,
      status:        'completed',
      notes:         notes || '',
      transactionId: transactionId || null,
      collectedBy:   req.user.userId,
    });
    booking.paymentStatus = 'paid';
    booking.paymentMethod = method;
    await booking.save();
    if (booking.staff) {
      await Staff.findOneAndUpdate(
        { user: booking.staff, salonId: req.salonId },
        { $inc: { totalServicesCompleted: booking.status === 'completed' ? 1 : 0, totalRevenueGenerated: booking.finalAmount } }
      );
    }

    // ── WhatsApp: Payment Receipt ────────────────────────────────────────
    try {
      const pop = await Booking.findById(booking._id)
        .populate('customer', 'name phone')
        .populate('service', 'name');
      if (pop?.customer?.phone) {
        const salon = await Salon.findById(req.salonId).select('name').lean();
        await sendPaymentReceipt({
          phone:        pop.customer.phone,
          customerName: pop.customer.name,
          salonName:    salon?.name || 'Salon',
          serviceName:  pop.service?.name || 'Service',
          amount:       booking.finalAmount,
          method,
          refNo:        booking.refNo,
          date:         new Date(),
        });
      }
    } catch (waErr) {
      console.error('[WA] Payment receipt failed (non-fatal):', waErr.message);
    }

    res.status(200).json({ success: true, message: `Payment of ₹${booking.finalAmount} recorded via ${method}`, payment });
  } catch (error) { next(error); }
};

// ── POST /api/payments/refund ────────────────────────────────────────────────
const refundPayment = async (req, res, next) => {
  try {
    const { paymentId, reason } = req.body;
    const payment = await Payment.findOne({ _id: paymentId, salonId: req.salonId });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'refunded') throw new AppError('Already refunded', 400);
    if (payment.method === 'razorpay' && payment.razorpayPaymentId) {
      const settings = await getSettings(req.salonId);
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({ key_id: settings.payment.razorpayKeyId, key_secret: settings.payment.razorpayKeySecret });
        const refund   = await razorpay.payments.refund(payment.razorpayPaymentId, { amount: payment.amount * 100, notes: { reason: reason || 'Customer requested refund' } });
        payment.refundId = refund.id;
      } catch (e) { console.error('Razorpay refund failed:', e.message); }
    }
    payment.status       = 'refunded';
    payment.refundAmount = payment.amount;
    payment.refundReason = reason || '';
    payment.refundedAt   = new Date();
    await payment.save();
    await Booking.findOneAndUpdate({ _id: payment.booking, salonId: req.salonId }, { paymentStatus: 'refunded' });
    res.status(200).json({ success: true, message: 'Payment refunded successfully', payment });
  } catch (error) { next(error); }
};

// ── GET /api/payments ────────────────────────────────────────────────────────
const getPayments = async (req, res, next) => {
  try {
    const { status, method, startDate, endDate, page = 1, limit = 50, search } = req.query;
    const filter = { salonId: req.salonId };
    if (req.user.role === 'customer') filter.customer = req.user.userId;
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.createdAt.$lte = end; }
    }

    let payments = await Payment.find(filter)
      .populate('booking',     'date timeSlot type notes service')
      .populate('customer',    'name email phone')
      .populate('collectedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    if (search) {
      const q = search.toLowerCase();
      payments = payments.filter(p =>
        p.customer?.name?.toLowerCase().includes(q) ||
        p.customer?.phone?.includes(q) ||
        (p.transactionId || '').toLowerCase().includes(q) ||
        p._id.toString().includes(q)
      );
    }

    const total  = await Payment.countDocuments(filter);
    const totals = await Payment.aggregate([
      { $match: { ...filter, status: 'completed' } },
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true, payments,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
      summary:    { overall: totals.reduce((s, t) => s + t.total, 0), byMethod: totals },
    });
  } catch (error) { next(error); }
};

// ── GET /api/payments/dashboard ──────────────────────────────────────────────
const getPaymentDashboard = async (req, res, next) => {
  try {
    const salonId = req.salonId;
    const now     = new Date();
    const today   = new Date(now); today.setHours(0, 0, 0, 0);
    const tomorrow     = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart    = new Date(today); weekStart.setDate(weekStart.getDate() - 6);

    const base = (extra) => ({ salonId, ...extra });

    const [
      todayStats, weekStats, monthStats, lastMonthStats,
      methodBreakdown, pendingAgg, refundedAgg,
      dailyLast30, monthlyLast12, topCustomers, staffRevenue,
      hourlyToday, statusBreakdown,
    ] = await Promise.all([
      Payment.aggregate([{ $match: base({ createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' }) }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: weekStart }, status: 'completed' }) }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: monthStart }, status: 'completed' }) }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }, status: 'completed' }) }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: monthStart }, status: 'completed' }) }, { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      Payment.aggregate([{ $match: base({ status: 'pending' }) }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: monthStart }, status: 'refunded' }) }, { $group: { _id: null, total: { $sum: '$refundAmount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000) }, status: 'completed' }) }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth() + 1, 1) }, status: 'completed' }) }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+05:30' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: monthStart }, status: 'completed' }) }, { $group: { _id: '$customer', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 5 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, { $project: { name: '$user.name', phone: '$user.phone', total: 1, count: 1 } }]),
      Booking.aggregate([{ $match: { salonId, date: { $gte: monthStart }, status: 'completed', paymentStatus: 'paid', staff: { $ne: null } } }, { $group: { _id: '$staff', revenue: { $sum: '$finalAmount' }, count: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 5 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, { $project: { name: '$user.name', revenue: 1, count: 1 } }]),
      Payment.aggregate([{ $match: base({ createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' }) }, { $group: { _id: { $hour: { date: '$createdAt', timezone: '+05:30' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Payment.aggregate([{ $match: { salonId } }, { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    ]);

    const thisMonthRev = monthStats[0]?.total || 0;
    const lastMonthRev = lastMonthStats[0]?.total || 0;
    const monthGrowth  = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;

    res.status(200).json({ success: true, dashboard: {
      today:     { revenue: todayStats[0]?.total || 0, count: todayStats[0]?.count || 0, avgTxn: todayStats[0]?.avg || 0 },
      thisWeek:  { revenue: weekStats[0]?.total  || 0, count: weekStats[0]?.count  || 0 },
      thisMonth: { revenue: thisMonthRev, count: monthStats[0]?.count || 0, avg: monthStats[0]?.avg || 0, growth: monthGrowth },
      lastMonth: { revenue: lastMonthRev },
      byMethod:  methodBreakdown,
      pending:   { count: pendingAgg[0]?.count  || 0, amount: pendingAgg[0]?.total  || 0 },
      refunded:  { count: refundedAgg[0]?.count || 0, amount: refundedAgg[0]?.total || 0 },
      dailyLast30, monthlyLast12, topCustomers, staffRevenue, hourlyToday, statusBreakdown,
    }});
  } catch (error) { next(error); }
};

// ── GET /api/payments/config ─────────────────────────────────────────────────
const getPaymentConfig = async (req, res, next) => {
  try {
    const settings = await getSettings(req.salonId);
    res.status(200).json({ success: true, config: {
      razorpayEnabled:   settings.payment.razorpayEnabled,
      razorpayKeyId:     settings.payment.razorpayEnabled ? settings.payment.razorpayKeyId : null,
      payAtSalonEnabled: settings.payment.payAtSalonEnabled,
      acceptCash:        settings.payment.acceptCash,
      acceptUPI:         settings.payment.acceptUPI,
      acceptCard:        settings.payment.acceptCard,
    }});
  } catch (error) { next(error); }
};

// ── GET /api/payments/analytics ──────────────────────────────────────────────
const getPaymentAnalytics = async (req, res, next) => {
  try {
    const salonId         = req.salonId;
    const { period = 'thisMonth' } = req.query;
    const now = new Date();
    let start, end, prevStart, prevEnd;

    switch (period) {
      case 'today':
        start = new Date(now); start.setHours(0, 0, 0, 0);
        end   = new Date(now); end.setHours(23, 59, 59, 999);
        prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
        prevEnd   = new Date(start);
        break;
      case 'thisWeek':
        start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
        end   = new Date(now);
        prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
        prevEnd   = new Date(start);
        break;
      case 'last30':
        start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
        end   = new Date(now);
        prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 30);
        prevEnd   = new Date(start);
        break;
      default:
        start     = new Date(now.getFullYear(), now.getMonth(), 1);
        end       = new Date(now);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd   = start;
    }

    const [curr, prev, byDay, byMethod] = await Promise.all([
      Payment.aggregate([{ $match: { salonId, createdAt: { $gte: start, $lte: end }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } }]),
      Payment.aggregate([{ $match: { salonId, createdAt: { $gte: prevStart, $lte: prevEnd }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { salonId, createdAt: { $gte: start, $lte: end }, status: 'completed' } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Payment.aggregate([{ $match: { salonId, createdAt: { $gte: start, $lte: end }, status: 'completed' } }, { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);

    const currTotal = curr[0]?.total || 0;
    const prevTotal = prev[0]?.total || 0;
    const growth    = prevTotal > 0 ? Math.round(((currTotal - prevTotal) / prevTotal) * 100) : 0;

    res.status(200).json({ success: true, analytics: {
      current:  { total: currTotal, count: curr[0]?.count || 0, avg: curr[0]?.avg || 0 },
      previous: { total: prevTotal, count: prev[0]?.count || 0 },
      growth, byDay, byMethod, period, start, end,
    }});
  } catch (error) { next(error); }
};

module.exports = { createOrder, verifyPayment, markAsPaid, refundPayment, getPayments, getPaymentDashboard, getPaymentConfig, getPaymentAnalytics };