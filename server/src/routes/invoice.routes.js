const express = require('express');
const router  = express.Router();
const { generateInvoice, getAllInvoices, searchByRef, getSince } = require('../controllers/invoice.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant);

router.get('/search',           authorize('admin','receptionist'), searchByRef);
router.get('/since/:timestamp', authorize('admin','receptionist'), getSince);
router.get('/',                 authorize('admin','receptionist'), getAllInvoices);
router.get('/:bookingId',       generateInvoice);  // customers can view own

module.exports = router;
