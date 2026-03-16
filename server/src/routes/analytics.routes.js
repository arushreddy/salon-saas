const express = require('express');
const router  = express.Router();
const {
  getOverview, getRevenueChart, getTopServices,
  getStaffPerformance, getPaymentMethods, getBookingStats,
} = require('../controllers/analytics.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant, authorize('admin'));

router.get('/overview',          getOverview);
router.get('/revenue-chart',     getRevenueChart);
router.get('/top-services',      getTopServices);
router.get('/staff-performance', getStaffPerformance);
router.get('/payment-methods',   getPaymentMethods);
router.get('/booking-stats',     getBookingStats);

module.exports = router;
