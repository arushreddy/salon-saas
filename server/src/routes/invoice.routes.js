const express = require('express');
const router = express.Router();
const { generateInvoice, getAllInvoices } = require('../controllers/invoice.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/', protect, authorize('admin'), getAllInvoices);
router.get('/:bookingId', protect, generateInvoice);

module.exports = router;
