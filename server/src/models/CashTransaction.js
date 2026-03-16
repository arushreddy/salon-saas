// src/models/CashTransaction.js
const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['cash_in', 'withdrawal', 'expense', 'salary', 'advance', 'adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // For adjustments: '+' adds to balance, '-' removes
    sign: {
      type: String,
      enum: ['+', '-'],
      default: '+',
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional: name of staff for salary/advance
    recipient: {
      type: String,
      trim: true,
      default: null,
    },
    date: {
      type: String, // 'YYYY-MM-DD' stored as IST date string
      required: true,
    },
    time: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // ── Multi-tenancy key (Phase 1) ─────────────────────────────────────────
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);


cashTransactionSchema.index({ date: -1 });
cashTransactionSchema.index({ type: 1, date: -1 });
cashTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);