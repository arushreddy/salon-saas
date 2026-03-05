const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  markAsPaid,
  refundPayment,
  getPayments,
  getPaymentDashboard,
  getPaymentConfig,
} = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/config', protect, getPaymentConfig);
router.get('/dashboard', protect, authorize('admin'), getPaymentDashboard);
router.get('/', protect, getPayments);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/mark-paid', protect, authorize('admin', 'receptionist'), markAsPaid);
router.post('/refund', protect, authorize('admin'), refundPayment);

module.exports = router;
