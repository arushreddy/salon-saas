const express = require('express');
const router = express.Router();
const {
  addStaff,
  getAllStaff,
  getAvailableStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getStaffPerformance,
} = require('../controllers/staff.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/', protect, getAllStaff);
router.get('/available', protect, getAvailableStaff);
router.get('/:id', protect, getStaffById);
router.get('/:id/performance', protect, authorize('admin'), getStaffPerformance);
router.post('/', protect, authorize('admin'), addStaff);
router.put('/:id', protect, authorize('admin'), updateStaff);
router.delete('/:id', protect, authorize('admin'), deleteStaff);

module.exports = router;
