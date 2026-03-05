const express = require('express');
const router = express.Router();
const {
  getOverview,
  getRevenueChart,
  getTopServices,
  getStaffPerformance,
  getPaymentMethods,
  getBookingStats,
} = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/overview', protect, authorize('admin'), getOverview);
router.get('/revenue-chart', protect, authorize('admin'), getRevenueChart);
router.get('/top-services', protect, authorize('admin'), getTopServices);
router.get('/staff-performance', protect, authorize('admin'), getStaffPerformance);
router.get('/payment-methods', protect, authorize('admin'), getPaymentMethods);
router.get('/booking-stats', protect, authorize('admin'), getBookingStats);

module.exports = router;
