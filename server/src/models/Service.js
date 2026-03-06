const Service = require('../models/Service');
const { AppError } = require('../middlewares/errorHandler');

// GET /api/services — Public (with filters)
const getAllServices = async (req, res, next) => {
  try {
    const { category, gender, search, active, sort, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (gender) filter.gender = { $in: [gender, 'unisex'] };
    if (active !== undefined) filter.isActive = active === 'true';
    else filter.isActive = true;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { category: 1, name: 1 };
    if (sort === 'price_low') sortOption = { price: 1 };
    if (sort === 'price_high') sortOption = { price: -1 };
    if (sort === 'popular') sortOption = { popularity: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const services = await Service.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      services,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/services/:id — Public
const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/services — Admin only
const createService = async (req, res, next) => {
  try {
    const { name, description, category, price, discountPrice, duration, image, gender } = req.body;

    if (!name || !category || !price || !duration) {
      throw new AppError('Name, category, price and duration are required', 400);
    }

    const service = await Service.create({
      name,
      description,
      category,
      price,
      discountPrice: discountPrice || null,
      duration,
      image,
      gender,
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/services/:id — Admin only
const updateService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      throw new AppError('Service not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/services/:id — Admin only
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/services/categories/list — Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Service.distinct('category', { isActive: true });

    const categoryInfo = {
      hair: { label: 'Hair', emoji: '💇', description: 'Cuts, styling, coloring & treatments' },
      skin: { label: 'Skin Care', emoji: '✨', description: 'Facials, cleanup & skin treatments' },
      nails: { label: 'Nails', emoji: '💅', description: 'Manicure, pedicure & nail art' },
      makeup: { label: 'Makeup', emoji: '💄', description: 'Party, bridal & everyday looks' },
      spa: { label: 'Spa & Wellness', emoji: '🧖', description: 'Massage, body wraps & relaxation' },
      bridal: { label: 'Bridal', emoji: '👰', description: 'Complete bridal packages' },
      grooming: { label: 'Grooming', emoji: '🧔', description: 'Beard, facial & men\'s care' },
      combo: { label: 'Combo Packages', emoji: '🎁', description: 'Bundled services at special prices' },
    };

    const result = categories.map((cat) => ({
      value: cat,
      ...categoryInfo[cat],
    }));

    res.status(200).json({
      success: true,
      categories: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getCategories,
};