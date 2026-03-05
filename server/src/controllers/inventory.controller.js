const Inventory = require('../models/Inventory');
const { AppError } = require('../middlewares/errorHandler');

const getAllProducts = async (req, res, next) => {
  try {
    const { category, search, lowStock, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
    }

    const products = await Inventory.find(filter)
      .sort({ category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Inventory.countDocuments(filter);
    const lowStockCount = await Inventory.countDocuments({
      isActive: true,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    });

    const totalValue = await Inventory.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$costPrice'] } } } },
    ]);

    res.status(200).json({
      success: true,
      products,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
      summary: {
        totalProducts: total,
        lowStockCount,
        totalValue: totalValue[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await Inventory.create(req.body);
    res.status(201).json({ success: true, message: 'Product added', product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) throw new AppError('Product not found', 404);
    res.status(200).json({ success: true, message: 'Product updated', product });
  } catch (error) {
    next(error);
  }
};

const updateStock = async (req, res, next) => {
  try {
    const { quantity, type } = req.body;
    const product = await Inventory.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    if (type === 'add') {
      product.quantity += quantity;
    } else if (type === 'use') {
      if (product.quantity < quantity) throw new AppError('Insufficient stock', 400);
      product.quantity -= quantity;
    } else {
      product.quantity = quantity;
    }

    await product.save();
    res.status(200).json({ success: true, message: 'Stock updated', product });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await Inventory.findByIdAndUpdate(req.params.id, { isActive: false });
    res.status(200).json({ success: true, message: 'Product removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllProducts, createProduct, updateProduct, updateStock, deleteProduct };