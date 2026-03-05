const express = require('express');
const router = express.Router();
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getCategories,
} = require('../controllers/service.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getAllServices);
router.get('/categories/list', getCategories);
router.get('/:id', getServiceById);

// Admin only routes
router.post('/', protect, authorize('admin'), createService);
router.put('/:id', protect, authorize('admin'), updateService);
router.delete('/:id', protect, authorize('admin'), deleteService);

module.exports = router;
