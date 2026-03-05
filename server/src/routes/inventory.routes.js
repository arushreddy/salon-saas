const express = require('express');
const router = express.Router();
const { getAllProducts, createProduct, updateProduct, updateStock, deleteProduct } = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/', protect, authorize('admin'), getAllProducts);
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.patch('/:id/stock', protect, authorize('admin'), updateStock);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
