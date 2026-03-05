const express = require('express');
const router = express.Router();
const { getAllCoupons, createCoupon, validateCoupon, updateCoupon, deleteCoupon } = require('../controllers/coupon.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/', protect, authorize('admin'), getAllCoupons);
router.post('/', protect, authorize('admin'), createCoupon);
router.post('/validate', protect, validateCoupon);
router.put('/:id', protect, authorize('admin'), updateCoupon);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);

module.exports = router;
