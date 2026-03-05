const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Staff = require('../models/Staff');
const SalonSettings = require('../models/SalonSettings');
const { AppError } = require('../middlewares/errorHandler');

// Helper: Get or create salon settings
const getSettings = async () => {
  let settings = await SalonSettings.findOne();
  if (!settings) {
    settings = await SalonSettings.create({});
  }
  return settings;
};

// POST /api/payments/create-order — Create Razorpay order
const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) throw new AppError('Booking not found', 404);

    const settings = await getSettings();

    if (!settings.payment.razorpayEnabled || !settings.payment.razorpayKeyId) {
      throw new AppError('Online payment is not configured. Please pay at the salon.', 400);
    }

    // Dynamic import of Razorpay (only when keys exist)
    let Razorpay;
    try {
      Razorpay = require('razorpay');
    } catch (e) {
      throw new AppError('Razorpay module not installed. Run: npm install razorpay', 500);
    }

    const razorpay = new Razorpay({
      key_id: settings.payment.razorpayKeyId,
      key_secret: settings.payment.razorpayKeySecret,
    });

    const order = await razorpay.orders.create({
      amount: booking.finalAmount * 100, // Razorpay uses paise
      currency: 'INR',
      receipt: `booking_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        service: booking.service?.name || '',
        customer: req.user.userId,
      },
    });

    // Create pending payment record
    await Payment.create({
      booking: booking._id,
      customer: req.user.userId,
      amount: booking.finalAmount,
      method: 'razorpay',
      status: 'pending',
      razorpayOrderId: order.id,
    });

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: settings.payment.razorpayKeyId,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/verify — Verify Razorpay payment
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

    const settings = await getSettings();

    // Verify signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', settings.payment.razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Payment verification failed — invalid signature', 400);
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: 'completed',
      },
      { new: true }
    );

    // Update booking
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'paid',
      paymentMethod: 'online',
    });

    // Update staff stats if assigned
    const booking = await Booking.findById(bookingId);
    if (booking.staff) {
      await Staff.findOneAndUpdate(
        { user: booking.staff },
        {
          $inc: {
            totalRevenueGenerated: booking.finalAmount,
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and booking confirmed!',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/mark-paid — Admin/Receptionist marks as paid
const markAsPaid = async (req, res, next) => {
  try {
    const { bookingId, method, notes } = req.body;

    if (!bookingId || !method) {
      throw new AppError('Booking ID and payment method are required', 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('Booking not found', 404);

    // Create payment record
    const payment = await Payment.create({
      booking: booking._id,
      customer: booking.customer,
      amount: booking.finalAmount,
      method,
      status: 'completed',
      notes: notes || '',
      collectedBy: req.user.userId,
    });

    // Update booking
    booking.paymentStatus = 'paid';
    booking.paymentMethod = method;
    await booking.save();

    // Update staff stats
    if (booking.staff) {
      await Staff.findOneAndUpdate(
        { user: booking.staff },
        {
          $inc: {
            totalServicesCompleted: booking.status === 'completed' ? 1 : 0,
            totalRevenueGenerated: booking.finalAmount,
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: `Payment of ₹${booking.finalAmount} recorded via ${method}`,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/refund — Admin refunds payment
const refundPayment = async (req, res, next) => {
  try {
    const { paymentId, reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'refunded') throw new AppError('Already refunded', 400);

    // If Razorpay payment, process refund through Razorpay
    if (payment.method === 'razorpay' && payment.razorpayPaymentId) {
      const settings = await getSettings();
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: settings.payment.razorpayKeyId,
          key_secret: settings.payment.razorpayKeySecret,
        });

        const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: payment.amount * 100,
          notes: { reason: reason || 'Customer requested refund' },
        });

        payment.refundId = refund.id;
      } catch (e) {
        // If Razorpay refund fails, still mark as refunded locally
        console.error('Razorpay refund failed:', e.message);
      }
    }

    payment.status = 'refunded';
    payment.refundAmount = payment.amount;
    payment.refundReason = reason || '';
    payment.refundedAt = new Date();
    await payment.save();

    // Update booking
    await Booking.findByIdAndUpdate(payment.booking, {
      paymentStatus: 'refunded',
    });

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments — Get all payments with filters
const getPayments = async (req, res, next) => {
  try {
    const { status, method, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'customer') {
      filter.customer = req.user.userId;
    }

    if (status) filter.status = status;
    if (method) filter.method = method;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const payments = await Payment.find(filter)
      .populate('booking', 'date timeSlot type')
      .populate('customer', 'name email phone')
      .populate('collectedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    // Calculate totals
    const totals = await Payment.aggregate([
      { $match: { ...filter, status: 'completed' } },
      {
        $group: {
          _id: '$method',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const overallTotal = totals.reduce((sum, t) => sum + t.total, 0);

    res.status(200).json({
      success: true,
      payments,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
      summary: {
        overall: overallTotal,
        byMethod: totals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/dashboard — Payment dashboard stats
const getPaymentDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());

    const [todayStats, weekStats, monthStats, methodBreakdown, recentPayments] = await Promise.all([
      // Today
      Payment.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // This week
      Payment.aggregate([
        { $match: { createdAt: { $gte: thisWeekStart }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // This month
      Payment.aggregate([
        { $match: { createdAt: { $gte: thisMonthStart }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // By method (this month)
      Payment.aggregate([
        { $match: { createdAt: { $gte: thisMonthStart }, status: 'completed' } },
        { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // Recent 10
      Payment.find({ status: 'completed' })
        .populate('customer', 'name')
        .populate('booking', 'date')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    // Pending payments
    const pendingCount = await Payment.countDocuments({ status: 'pending' });
    const pendingAmount = await Payment.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        today: { revenue: todayStats[0]?.total || 0, count: todayStats[0]?.count || 0 },
        thisWeek: { revenue: weekStats[0]?.total || 0, count: weekStats[0]?.count || 0 },
        thisMonth: { revenue: monthStats[0]?.total || 0, count: monthStats[0]?.count || 0 },
        byMethod: methodBreakdown,
        pending: { count: pendingCount, amount: pendingAmount[0]?.total || 0 },
        recentPayments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/config — Get payment config (public key only)
const getPaymentConfig = async (req, res, next) => {
  try {
    const settings = await getSettings();

    res.status(200).json({
      success: true,
      config: {
        razorpayEnabled: settings.payment.razorpayEnabled,
        razorpayKeyId: settings.payment.razorpayEnabled ? settings.payment.razorpayKeyId : null,
        payAtSalonEnabled: settings.payment.payAtSalonEnabled,
        acceptCash: settings.payment.acceptCash,
        acceptUPI: settings.payment.acceptUPI,
        acceptCard: settings.payment.acceptCard,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  markAsPaid,
  refundPayment,
  getPayments,
  getPaymentDashboard,
  getPaymentConfig,
};