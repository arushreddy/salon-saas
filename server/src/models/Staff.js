const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specializations: {
      type: [String],
      enum: ['hair', 'skin', 'nails', 'makeup', 'spa', 'bridal', 'grooming', 'combo'],
      default: [],
    },
    designation: {
      type: String,
      enum: ['junior_stylist', 'senior_stylist', 'master_stylist', 'receptionist', 'manager', 'trainee'],
      default: 'junior_stylist',
    },
    salary: {
      base: { type: Number, default: 0 },
      commissionEnabled: { type: Boolean, default: false },
      commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    schedule: {
      weeklyOff: {
        type: [String],
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        default: ['sunday'],
      },
      shiftStart: { type: String, default: '09:00' },
      shiftEnd: { type: String, default: '21:00' },
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
    },
    documents: {
      aadhaar: { type: String, default: '' },
      pan: { type: String, default: '' },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    bio: {
      type: String,
      maxlength: 300,
      default: '',
    },
    totalServicesCompleted: {
      type: Number,
      default: 0,
    },
    totalRevenueGenerated: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.index({ user: 1 });
staffSchema.index({ specializations: 1 });
staffSchema.index({ designation: 1 });

module.exports = mongoose.model('Staff', staffSchema);