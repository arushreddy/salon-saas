const Inventory    = require('../models/Inventory');
const InventoryLog = require('../models/InventoryLog');
const { AppError } = require('../middlewares/errorHandler');

const getAllProducts = async (req, res, next) => {
  try {
    const { category, search, lowStock, page = 1, limit = 50 } = req.query;
    const filter = { salonId: req.salonId, isActive: true };
    if (category) filter.category = category;
    if (search)   filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
    if (lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };

    const products = await Inventory.find(filter)
      .sort({ category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total         = await Inventory.countDocuments(filter);
    const lowStockCount = await Inventory.countDocuments({ salonId: req.salonId, isActive: true, $expr: { $lte: ['$quantity', '$lowStockThreshold'] } });
    const totalValue    = await Inventory.aggregate([
      { $match: { salonId: req.salonId, isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$costPrice'] } } } },
    ]);

    res.status(200).json({
      success: true, products,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
      summary:    { totalProducts: total, lowStockCount, totalValue: totalValue[0]?.total || 0 },
    });
  } catch (error) { next(error); }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await Inventory.create({ ...req.body, salonId: req.salonId });

    if (product.quantity > 0) {
      await InventoryLog.create({
        salonId:     req.salonId,
        product:     product._id,
        type:        'refill',
        quantity:    product.quantity,
        stockBefore: 0,
        stockAfter:  product.quantity,
        performedBy: req.user.userId,
        notes:       'Initial stock',
        supplier:    req.body.supplier?.name || '',
        costPerUnit: product.costPrice,
      });
    }

    res.status(201).json({ success: true, message: 'Product added', product });
  } catch (error) { next(error); }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Inventory.findOneAndUpdate(
      { _id: req.params.id, salonId: req.salonId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) throw new AppError('Product not found', 404);
    res.status(200).json({ success: true, message: 'Product updated', product });
  } catch (error) { next(error); }
};

const updateStock = async (req, res, next) => {
  try {
    const { quantity, type, notes, bookingId, customerName, serviceName, supplier, invoiceNo, costPerUnit } = req.body;

    const product = await Inventory.findOne({ _id: req.params.id, salonId: req.salonId });
    if (!product) throw new AppError('Product not found', 404);

    const stockBefore = product.quantity;

    if (type === 'add' || type === 'refill') {
      product.quantity += Number(quantity);
    } else if (type === 'use' || type === 'wastage') {
      if (product.quantity < quantity) throw new AppError('Insufficient stock', 400);
      product.quantity -= Number(quantity);
    } else {
      product.quantity = Number(quantity);
    }

    const stockAfter = product.quantity;
    await product.save();

    const logType = type === 'add' ? 'refill' : type === 'use' ? 'use' : type === 'refill' ? 'refill' : type === 'wastage' ? 'wastage' : 'adjustment';

    await InventoryLog.create({
      salonId:      req.salonId,
      product:      product._id,
      type:         logType,
      quantity:     Number(quantity),
      stockBefore,  stockAfter,
      performedBy:  req.user.userId,
      bookingId:    bookingId || null,
      customerName: customerName || '',
      serviceName:  serviceName || '',
      notes:        notes || '',
      supplier:     supplier || '',
      invoiceNo:    invoiceNo || '',
      costPerUnit:  costPerUnit || product.costPrice || 0,
    });

    res.status(200).json({ success: true, message: 'Stock updated', product });
  } catch (error) { next(error); }
};

const getHistory = async (req, res, next) => {
  try {
    const { type, productId, staffId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = { salonId: req.salonId };

    if (type)      filter.type        = type;
    if (productId) filter.product     = productId;
    if (staffId)   filter.performedBy = staffId;
    if (req.user.role === 'staff') filter.performedBy = req.user.userId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate)   filter.createdAt.$lte = new Date(endDate   + 'T23:59:59.999Z');
    }

    const logs = await InventoryLog.find(filter)
      .populate('product',     'name brand unit category')
      .populate('performedBy', 'name role')
      .populate('bookingId',   'timeSlot date')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await InventoryLog.countDocuments(filter);
    res.status(200).json({ success: true, logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getProductHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const logs = await InventoryLog.find({ product: req.params.id, salonId: req.salonId })
      .populate('performedBy', 'name role')
      .populate('bookingId', 'timeSlot date')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await InventoryLog.countDocuments({ product: req.params.id, salonId: req.salonId });
    res.status(200).json({ success: true, logs, pagination: { total, page: parseInt(page) } });
  } catch (error) { next(error); }
};

const deleteProduct = async (req, res, next) => {
  try {
    await Inventory.findOneAndUpdate({ _id: req.params.id, salonId: req.salonId }, { isActive: false });
    res.status(200).json({ success: true, message: 'Product removed' });
  } catch (error) { next(error); }
};

module.exports = { getAllProducts, createProduct, updateProduct, updateStock, getHistory, getProductHistory, deleteProduct };
