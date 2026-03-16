const Coupon = require('../models/Coupon');
const { AppError } = require('../middlewares/errorHandler');

const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ salonId: req.salonId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, coupons });
  } catch (error) { next(error); }
};

const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create({ ...req.body, salonId: req.salonId });
    res.status(201).json({ success: true, message: 'Coupon created', coupon });
  } catch (error) { next(error); }
};

const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), salonId: req.salonId });

    if (!coupon) throw new AppError('Invalid coupon code', 404);

    const validation = coupon.isValid();
    if (!validation.valid) throw new AppError(validation.reason, 400);

    if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
      throw new AppError(`Minimum order amount is ₹${coupon.minOrderAmount}`, 400);
    }

    const discount = coupon.calculateDiscount(amount);
    res.status(200).json({
      success: true,
      coupon: {
        code:          coupon.code,
        description:   coupon.description,
        discountType:  coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        finalAmount:   amount - discount,
      },
    });
  } catch (error) { next(error); }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, salonId: req.salonId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!coupon) throw new AppError('Coupon not found', 404);
    res.status(200).json({ success: true, message: 'Coupon updated', coupon });
  } catch (error) { next(error); }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, salonId: req.salonId });
    if (!coupon) throw new AppError('Coupon not found', 404);
    res.status(200).json({ success: true, message: 'Coupon deleted' });
  } catch (error) { next(error); }
};

module.exports = { getAllCoupons, createCoupon, validateCoupon, updateCoupon, deleteCoupon };
