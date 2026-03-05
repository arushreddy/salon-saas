const SalonSettings = require('../models/SalonSettings');
const { AppError } = require('../middlewares/errorHandler');

// GET /api/settings
const getSettings = async (req, res, next) => {
  try {
    let settings = await SalonSettings.findOne();
    if (!settings) {
      settings = await SalonSettings.create({});
    }

    // Don't expose Razorpay secret to frontend
    const safeSettings = settings.toObject();
    if (safeSettings.payment) {
      safeSettings.payment.razorpayKeySecret = safeSettings.payment.razorpayKeySecret ? '••••••••' : '';
    }

    res.status(200).json({
      success: true,
      settings: safeSettings,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/settings
const updateSettings = async (req, res, next) => {
  try {
    let settings = await SalonSettings.findOne();
    if (!settings) {
      settings = await SalonSettings.create({});
    }

    const updates = req.body;

    // Update each section
    if (updates.salonName) settings.salonName = updates.salonName;
    if (updates.tagline) settings.tagline = updates.tagline;
    if (updates.phone) settings.phone = updates.phone;
    if (updates.email) settings.email = updates.email;
    if (updates.address) settings.address = { ...settings.address.toObject(), ...updates.address };
    if (updates.gstNumber !== undefined) settings.gstNumber = updates.gstNumber;
    if (updates.operatingHours) settings.operatingHours = { ...settings.operatingHours.toObject(), ...updates.operatingHours };
    if (updates.weeklySchedule) settings.weeklySchedule = { ...settings.weeklySchedule.toObject(), ...updates.weeklySchedule };
    if (updates.taxRate !== undefined) settings.taxRate = updates.taxRate;
    if (updates.theme) settings.theme = { ...settings.theme.toObject(), ...updates.theme };

    // Payment settings — handle Razorpay secret carefully
    if (updates.payment) {
      const paymentUpdate = { ...updates.payment };
      // Don't overwrite secret with masked value
      if (paymentUpdate.razorpayKeySecret === '••••••••' || !paymentUpdate.razorpayKeySecret) {
        delete paymentUpdate.razorpayKeySecret;
      }
      settings.payment = { ...settings.payment.toObject(), ...paymentUpdate };
    }

    await settings.save();

    // Return safe version
    const safeSettings = settings.toObject();
    if (safeSettings.payment) {
      safeSettings.payment.razorpayKeySecret = safeSettings.payment.razorpayKeySecret ? '••••••••' : '';
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings: safeSettings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };