const express = require('express');
const router  = express.Router();
const {
  getStaffAvailability, getAvailableSlots,
  createBooking, createWalkInBooking,
  getBookings, assignStaff, updateBookingStatus, verifyPaymentDirect,
  getTodayStats, processRefund, patchBookingNotes,
} = require('../controllers/booking.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

// All booking routes require auth + tenant context
router.use(protect, guardTenant);

// Static routes BEFORE /:id
router.get('/staff-availability', authorize('admin','receptionist','staff'), getStaffAvailability);
router.get('/available-slots',    getAvailableSlots);
router.get('/today/stats',        authorize('admin','receptionist','staff'), getTodayStats);
router.get('/',                   getBookings);

// Walk-in BEFORE generic POST /
router.post('/walk-in', authorize('admin','receptionist','staff'), createWalkInBooking);
router.post('/',        createBooking);

// ID-based routes
router.patch('/:id/assign',         authorize('admin','receptionist'), assignStaff);
router.patch('/:id/verify-payment', authorize('admin','receptionist'), verifyPaymentDirect);
router.patch('/:id/status',         updateBookingStatus);
router.patch('/:id/notes',          authorize('admin','receptionist'), patchBookingNotes);
router.post('/:id/refund',          authorize('admin'), processRefund);

module.exports = router;
