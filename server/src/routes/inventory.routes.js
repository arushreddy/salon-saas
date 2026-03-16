const express = require('express');
const router  = express.Router();
const {
  getAllProducts, createProduct, updateProduct, updateStock, deleteProduct,
} = require('../controllers/inventory.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant);

router.get('/',            authorize('admin','receptionist'), getAllProducts);
router.patch('/:id/stock', authorize('admin','receptionist'), updateStock);
router.post('/',           authorize('admin'), createProduct);
router.put('/:id',         authorize('admin'), updateProduct);
router.delete('/:id',      authorize('admin'), deleteProduct);

module.exports = router;
