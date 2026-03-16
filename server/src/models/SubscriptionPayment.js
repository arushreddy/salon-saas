// src/models/SubscriptionPayment.js
// Tracks every subscription payment made by a salon to the platform owner.
const mongoose = require('mongoose');

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    // Plan at the time of payment
    plan: {
      type: String,
      enum: ['plan1', 'plan2', 'plan3'],
      required: true,
    },
    // Amount collected (after discount)
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Original amount before discount
    originalAmount: {
      type: Number,
      default: null,
    },
    // Discount applied
    discountAmount: {
      type: Number,
      default: 0,
    },
    // Payment mode
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'],
      required: true,
    },
    // Optional transaction/UTR/cheque reference
    transactionId: {
      type: String,
      default: '',
      trim: true,
    },
    // Duration purchased
    durationMonths: {
      type: Number,
      default: null,
    },
    // Subscription window for this payment
    periodStart: {
      type: Date,
      default: null,
    },
    periodEnd: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    // Who collected this payment (super admin)
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ salonId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);