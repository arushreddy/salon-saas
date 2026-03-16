const express = require('express');
const router  = express.Router();
const {
  createOrder, verifyPayment, markAsPaid, refundPayment,
  getPayments, getPaymentDashboard, getPaymentConfig,
} = require('../controllers/payment.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant);

router.get('/config',    getPaymentConfig);
router.get('/dashboard', authorize('admin'), getPaymentDashboard);
router.get('/',          getPayments);
router.post('/create-order', createOrder);
router.post('/verify',       verifyPayment);
router.post('/mark-paid',    authorize('admin','receptionist','staff'), markAsPaid);
router.post('/refund',       authorize('admin'), refundPayment);

module.exports = router;
