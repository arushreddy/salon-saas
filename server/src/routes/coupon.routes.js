const express = require('express');
const router  = express.Router();
const { getAllCoupons, createCoupon, validateCoupon, updateCoupon, deleteCoupon } = require('../controllers/coupon.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant);

router.get('/',       authorize('admin'), getAllCoupons);
router.post('/',      authorize('admin'), createCoupon);
router.post('/validate', validateCoupon);
router.put('/:id',    authorize('admin'), updateCoupon);
router.delete('/:id', authorize('admin'), deleteCoupon);

module.exports = router;
