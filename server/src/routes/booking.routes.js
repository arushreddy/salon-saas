const express = require('express');
const router = express.Router();
const {
  getAvailableSlots,
  createBooking,
  createWalkInBooking,
  getBookings,
  updateBookingStatus,
  getTodayStats,
} = require('../controllers/booking.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/available-slots', protect, getAvailableSlots);
router.get('/today/stats', protect, authorize('admin', 'staff'), getTodayStats);
router.get('/', protect, getBookings);
router.post('/', protect, createBooking);
router.post('/walk-in', protect, authorize('admin', 'receptionist'), createWalkInBooking);
router.patch('/:id/status', protect, updateBookingStatus);

module.exports = router;
