// src/models/ShiftReport.js
const mongoose = require('mongoose');

const shiftReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    closingBalance: { type: Number, default: 0 },
    cashIn: { type: Number, default: 0 },
    manualCashIn: { type: Number, default: 0 },
    withdrawn: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    salaries: { type: Number, default: 0 },
    advances: { type: Number, default: 0 },
    adjNet: { type: Number, default: 0 },
    todayCash: { type: Number, default: 0 },
    todayOnline: { type: Number, default: 0 },
    physicalCount: { type: Number, default: null },
    variance: { type: Number, default: null },
    note: { type: String, default: '' },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedAt: { type: Date, default: Date.now },
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


shiftReportSchema.index({ date: -1 });

module.exports = mongoose.model('ShiftReport', shiftReportSchema);