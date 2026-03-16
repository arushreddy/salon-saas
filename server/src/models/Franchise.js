const mongoose = require('mongoose');

const franchiseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Franchise name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'],
    },
    // The franchise owner user
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Branding
    logo: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    // Optional custom domain for the main franchise website
    customDomain: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    billingEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    // Subscription & status
    plan: {
      type: String,
      enum: ['plan3'],
      default: 'plan3',
    },
    subscriptionExpiry: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Franchise-level feature settings
    settings: {
      // If true, all branches share one central booking system
      sharedBookingSystem: { type: Boolean, default: false },
      // If true, all branches share the same service catalogue
      sharedServices:      { type: Boolean, default: false },
    },
    // Which super admin created this franchise
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

franchiseSchema.index({ slug: 1 });
franchiseSchema.index({ customDomain: 1 });
franchiseSchema.index({ owner: 1 });

module.exports = mongoose.model('Franchise', franchiseSchema);
