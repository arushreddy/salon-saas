// server/src/models/OTP.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  // Can be phone number or email
  identifier: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  // 'phone' or 'email'
  channel: {
    type: String,
    enum: ['phone', 'email'],
    required: true,
  },
  // 'login' or 'reset'
  purpose: {
    type: String,
    enum: ['login', 'reset'],
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ identifier: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);