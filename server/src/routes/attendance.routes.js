// ─── attendance.routes.js ──────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const {
  clockIn, clockOut, getMyAttendance, getTodayAttendance,
  markAttendance, getAttendanceReport, getStaffList, applyDeduction,
} = require('../controllers/attendance.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant);

router.post('/clock-in',  authorize('staff','receptionist'), clockIn);
router.post('/clock-out', authorize('staff','receptionist'), clockOut);
router.get('/my',         getMyAttendance);
router.get('/today',      authorize('admin','receptionist'), getTodayAttendance);
router.get('/report',     authorize('admin','receptionist'), getAttendanceReport);
router.get('/staff-list', authorize('admin','receptionist'), getStaffList);
router.post('/mark',      authorize('admin','receptionist'), markAttendance);
router.post('/deduction', authorize('admin'), applyDeduction);

module.exports = router;
