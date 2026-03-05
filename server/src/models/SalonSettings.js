const mongoose = require('mongoose');

const salonSettingsSchema = new mongoose.Schema(
  {
    salonName: {
      type: String,
      default: 'Glamour Salon',
    },
    tagline: {
      type: String,
      default: 'Premium Salon Experience',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    gstNumber: {
      type: String,
      default: '',
    },
    operatingHours: {
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' },
      slotInterval: { type: Number, default: 30 },
      breakStart: { type: String, default: '' },
      breakEnd: { type: String, default: '' },
    },
    weeklySchedule: {
      monday: { isOpen: { type: Boolean, default: true }, open: { type: String, default: '09:00' }, close: { type: String, default: '21:00' } },
      tuesday: { isOpen: { type: Boolean, default: true }, open: { type: String, default: '09:00' }, close: { type: String, default: '21:00' } },
      wednesday: { isOpen: { type: Boolean, default: true }, open: { type: String, default: '09:00' }, close: { type: String, default: '21:00' } },
      thursday: { isOpen: { type: Boolean, default: true }, open: { type: String, default: '09:00' }, close: { type: String, default: '21:00' } },
      friday: { isOpen: { type: Boolean, default: true }, open: { type: String, default: '09:00' }, close: { type: String, default: '21:00' } },
      saturday: { isOpen: { type: Boolean, default: true }, open: { type: String, default: '10:00' }, close: { type: String, default: '22:00' } },
      sunday: { isOpen: { type: Boolean, default: true }, open: { type: String, default: '10:00' }, close: { type: String, default: '18:00' } },
    },
    payment: {
      razorpayEnabled: { type: Boolean, default: false },
      razorpayKeyId: { type: String, default: '' },
      razorpayKeySecret: { type: String, default: '' },
      payAtSalonEnabled: { type: Boolean, default: true },
      acceptCash: { type: Boolean, default: true },
      acceptUPI: { type: Boolean, default: true },
      acceptCard: { type: Boolean, default: true },
    },
    theme: {
      primaryColor: { type: String, default: '#C9A96E' },
      accentColor: { type: String, default: '#2C2C2C' },
      backgroundColor: { type: String, default: '#FAF7F2' },
    },
    currency: {
      type: String,
      default: 'INR',
    },
    taxRate: {
      type: Number,
      default: 18,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SalonSettings', salonSettingsSchema);