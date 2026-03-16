const express = require('express');
const router = express.Router();
const {
  getAllServices, getServiceById, createService,
  updateService, patchService, deleteService, getCategories,
} = require('../controllers/service.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

// Public routes — no auth, no tenant guard
// (tenant is resolved from JWT/slug in getAllServices when needed)
router.get('/categories/list', getCategories);
router.get('/:id',             getServiceById);

// Authenticated routes — guardTenant attaches req.salonId from JWT
router.get('/',         protect, guardTenant, getAllServices);
router.post('/',        protect, guardTenant, authorize('admin'), createService);
router.put('/:id',      protect, guardTenant, authorize('admin'), updateService);
router.patch('/:id',    protect, guardTenant, authorize('admin'), patchService);
router.delete('/:id',   protect, guardTenant, authorize('admin'), deleteService);

module.exports = router;
