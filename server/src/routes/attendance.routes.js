const express = require('express');
const router = express.Router();
const {
  clockIn,
  clockOut,
  getTodayAttendance,
  getMyAttendance,
  markAttendance,
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.post('/clock-in', protect, authorize('staff', 'receptionist'), clockIn);
router.post('/clock-out', protect, authorize('staff', 'receptionist'), clockOut);
router.get('/today', protect, authorize('admin'), getTodayAttendance);
router.get('/my', protect, getMyAttendance);
router.post('/mark', protect, authorize('admin'), markAttendance);

module.exports = router;
