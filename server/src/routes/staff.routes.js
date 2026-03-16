const express = require('express');
const router  = express.Router();
const {
  addStaff, getAllStaff, getAvailableStaff, getStaffById, getMyProfile,
  updateStaff, patchStaff, deleteStaff, getStaffPerformance,
  recordSalaryPayment, getSalaryHistory, getMySalary, getMyEarnings,
  getLiveStaffStatus, setFloorStatus,
} = require('../controllers/staff.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

// All staff routes require auth + tenant context
router.use(protect, guardTenant);

// ── Static "my" routes — MUST be before /:id ────────────────────────────
router.get('/my/earnings', authorize('admin','staff','receptionist'), getMyEarnings);
router.get('/my/salary',   authorize('admin','staff','receptionist'), getMySalary);

// ── Lists ────────────────────────────────────────────────────────────────
router.get('/',            getAllStaff);
router.get('/available',   getAvailableStaff);
router.get('/live-status', authorize('admin','receptionist'), getLiveStaffStatus);
router.get('/me',          authorize('admin','staff','receptionist'), getMyProfile);

// ── Single staff ─────────────────────────────────────────────────────────
router.get('/:id',                 getStaffById);
router.get('/:id/performance',     authorize('admin'), getStaffPerformance);
router.get('/:id/salary-history',  authorize('admin','staff'), getSalaryHistory);

// ── Receptionist floor-status toggle ─────────────────────────────────────
router.patch('/:id/floor-status', authorize('admin','receptionist'), setFloorStatus);

// ── Admin mutations ──────────────────────────────────────────────────────
router.post('/',                   authorize('admin'), addStaff);
router.put('/:id',                 authorize('admin'), updateStaff);
router.patch('/:id',               authorize('admin'), patchStaff);
router.delete('/:id',              authorize('admin'), deleteStaff);
router.post('/:id/salary-payment', authorize('admin'), recordSalaryPayment);

module.exports = router;
