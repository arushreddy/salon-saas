const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const { AppError } = require('../middlewares/errorHandler');

// Helper: Get date ranges
const getDateRange = (period) => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today, end: tomorrow };
    }
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }
    case 'thisWeek': {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart, end: new Date() };
    }
    case 'lastWeek': {
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return { start: lastWeekStart, end: lastWeekEnd };
    }
    case 'thisMonth': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end: new Date() };
    }
    case 'lastMonth': {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: lastMonthStart, end: lastMonthEnd };
    }
    case 'thisYear': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { start: yearStart, end: new Date() };
    }
    case 'last30': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { start: thirtyDaysAgo, end: new Date() };
    }
    case 'last7': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return { start: sevenDaysAgo, end: new Date() };
    }
    default: {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end: new Date() };
    }
  }
};

// GET /api/analytics/overview
const getOverview = async (req, res, next) => {
  try {
    const { period = 'thisMonth' } = req.query;
    const { start, end } = getDateRange(period);

    // Get previous period for comparison
    const duration = end - start;
    const prevStart = new Date(start - duration);
    const prevEnd = new Date(start);

    const dateFilter = { $gte: start, $lt: end };
    const prevDateFilter = { $gte: prevStart, $lt: prevEnd };

    // Current period stats
    const [revenue, prevRevenue, bookings, prevBookings, customers, prevCustomers] = await Promise.all([
      Payment.aggregate([
        { $match: { createdAt: dateFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { createdAt: prevDateFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Booking.countDocuments({ date: dateFilter, status: { $ne: 'cancelled' } }),
      Booking.countDocuments({ date: prevDateFilter, status: { $ne: 'cancelled' } }),
      User.countDocuments({ role: 'customer', createdAt: dateFilter }),
      User.countDocuments({ role: 'customer', createdAt: prevDateFilter }),
    ]);

    const currentRevenue = revenue[0]?.total || 0;
    const previousRevenue = prevRevenue[0]?.total || 0;
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : 0;

    const bookingGrowth = prevBookings > 0 ? ((bookings - prevBookings) / prevBookings * 100).toFixed(1) : 0;
    const customerGrowth = prevCustomers > 0 ? ((customers - prevCustomers) / prevCustomers * 100).toFixed(1) : 0;

    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const completedBookings = await Booking.countDocuments({ date: dateFilter, status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ date: dateFilter, status: 'cancelled' });

    res.status(200).json({
      success: true,
      overview: {
        revenue: { current: currentRevenue, previous: previousRevenue, growth: parseFloat(revenueGrowth) },
        bookings: { current: bookings, previous: prevBookings, growth: parseFloat(bookingGrowth), completed: completedBookings, cancelled: cancelledBookings },
        customers: { new: customers, previous: prevCustomers, growth: parseFloat(customerGrowth), total: totalCustomers },
        payments: { count: revenue[0]?.count || 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/revenue-chart
const getRevenueChart = async (req, res, next) => {
  try {
    const { period = 'last30' } = req.query;
    const { start, end } = getDateRange(period);

    let groupFormat;
    let labelFormat;

    if (period === 'today' || period === 'yesterday') {
      groupFormat = { $hour: '$createdAt' };
      labelFormat = 'hour';
    } else if (period === 'last7' || period === 'thisWeek' || period === 'lastWeek') {
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      labelFormat = 'day';
    } else {
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      labelFormat = 'day';
    }

    const revenueData = await Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: 'completed' } },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing dates
    const chartData = [];
    const current = new Date(start);
    while (current < end) {
      const dateStr = current.toISOString().split('T')[0];
      const existing = revenueData.find((d) => d._id === dateStr);

      chartData.push({
        date: dateStr,
        label: current.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: existing?.revenue || 0,
        count: existing?.count || 0,
      });

      current.setDate(current.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      chart: chartData,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/top-services
const getTopServices = async (req, res, next) => {
  try {
    const { period = 'thisMonth' } = req.query;
    const { start, end } = getDateRange(period);

    const topServices = await Booking.aggregate([
      {
        $match: {
          date: { $gte: start, $lt: end },
          status: { $in: ['completed', 'in-progress', 'confirmed'] },
        },
      },
      {
        $group: {
          _id: '$service',
          bookings: { $sum: 1 },
          revenue: { $sum: '$finalAmount' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceInfo',
        },
      },
      { $unwind: '$serviceInfo' },
      {
        $project: {
          name: '$serviceInfo.name',
          category: '$serviceInfo.category',
          bookings: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      services: topServices,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/staff-performance
const getStaffPerformance = async (req, res, next) => {
  try {
    const { period = 'thisMonth' } = req.query;
    const { start, end } = getDateRange(period);

    const staffPerformance = await Booking.aggregate([
      {
        $match: {
          date: { $gte: start, $lt: end },
          status: 'completed',
          staff: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$staff',
          bookings: { $sum: 1 },
          revenue: { $sum: '$finalAmount' },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staffInfo',
        },
      },
      { $unwind: '$staffInfo' },
      {
        $project: {
          name: '$staffInfo.name',
          bookings: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      staff: staffPerformance,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/payment-methods
const getPaymentMethods = async (req, res, next) => {
  try {
    const { period = 'thisMonth' } = req.query;
    const { start, end } = getDateRange(period);

    const methods = await Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: 'completed' } },
      {
        $group: {
          _id: '$method',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      methods,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/booking-stats
const getBookingStats = async (req, res, next) => {
  try {
    const { period = 'thisMonth' } = req.query;
    const { start, end } = getDateRange(period);

    const stats = await Booking.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Booking type breakdown
    const typeBreakdown = await Booking.aggregate([
      { $match: { date: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          revenue: { $sum: '$finalAmount' },
        },
      },
    ]);

    // Peak hours
    const peakHours = await Booking.aggregate([
      {
        $match: {
          date: { $gte: start, $lt: end },
          status: { $in: ['completed', 'confirmed', 'in-progress'] },
        },
      },
      {
        $group: {
          _id: { $substr: ['$timeSlot.start', 0, 2] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      statusBreakdown: stats,
      typeBreakdown,
      peakHours: peakHours.map((h) => ({
        hour: parseInt(h._id),
        label: `${parseInt(h._id) > 12 ? parseInt(h._id) - 12 : parseInt(h._id)}:00 ${parseInt(h._id) >= 12 ? 'PM' : 'AM'}`,
        count: h.count,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getRevenueChart,
  getTopServices,
  getStaffPerformance,
  getPaymentMethods,
  getBookingStats,
};