const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
    },
    // URL-safe slug: used as yourplatform.com/royalcuts or subdomain royalcuts.yourplatform.com
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'],
    },
    // Optional franchise this salon belongs to
    franchiseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Franchise',
      default: null,
      index: true,
    },
    // The primary admin user for this salon
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Subscription plan
    plan: {
      type: String,
      enum: ['plan1', 'plan2', 'plan3'],
      default: 'plan1',
    },
    subscriptionExpiry: {
      type: Date,
      default: null,
    },
    // Status flags
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendReason: {
      type: String,
      default: '',
    },
    // Branding
    logo: {
      type: String,
      default: '',
    },
    // Custom domain (e.g. royalcuts.com) — set by salon admin, resolved by tenant middleware
    customDomain: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    // Contact
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    address: {
      street:  { type: String, default: '' },
      city:    { type: String, default: '' },
      state:   { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    // Feature flags — controlled by plan + super admin overrides
    features: {
      onlineBooking:  { type: Boolean, default: false }, // plan2+
      customWebsite:  { type: Boolean, default: false }, // plan2+
      whatsappModule: { type: Boolean, default: true  }, // all plans
      invoices:       { type: Boolean, default: true  }, // all plans
      franchiseAccess:{ type: Boolean, default: false }, // plan3 only
    },
    // Which super admin created this salon
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

salonSchema.index({ slug: 1 });
salonSchema.index({ customDomain: 1 });
salonSchema.index({ franchiseId: 1 });
salonSchema.index({ isActive: 1, isSuspended: 1 });

module.exports = mongoose.model('Salon', salonSchema);
