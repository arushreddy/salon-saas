// src/models/Plan.js
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // e.g. "plan1", "plan2", "plan3", "enterprise"
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: {
      monthly: { type: Number, default: 0 },
      yearly:  { type: Number, default: 0 },
    },
    currency: { type: String, default: 'INR' },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },

    // Limits
    limits: {
      staffCount:   { type: Number, default: 5 },
      branchCount:  { type: Number, default: 1 },
      bookingsPerMonth: { type: Number, default: 500 },
    },

    // Feature flags
    features: {
      onlineBooking:    { type: Boolean, default: false },
      customWebsite:    { type: Boolean, default: false },
      whatsappModule:   { type: Boolean, default: true  },
      invoices:         { type: Boolean, default: true  },
      inventory:        { type: Boolean, default: true  },
      analytics:        { type: Boolean, default: false },
      apiAccess:        { type: Boolean, default: false },
      franchiseAccess:  { type: Boolean, default: false },
      customDomain:     { type: Boolean, default: false },
      prioritySupport:  { type: Boolean, default: false },
    },

    // Internal metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);