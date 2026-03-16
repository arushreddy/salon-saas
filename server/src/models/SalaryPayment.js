const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema({
  staff:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  staffProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  type:         { type: String, enum: ['payment','bonus','deduction','advance'], required: true },
  month:        { type: String, required: true },   // "2026-03"
  amount:       { type: Number, required: true, min: 0 },

  // Snapshot of salary config at time of record
  baseSalary:        { type: Number, default: 0 },
  commissionEnabled: { type: Boolean, default: false },
  commissionPercent: { type: Number, default: 0 },
  commissionAmount:  { type: Number, default: 0 },
  revenueGenerated:  { type: Number, default: 0 },
  totalNetPay:       { type: Number, default: 0 },  // full net for payment records

  note:            { type: String, default: '' },
  paymentMethod:   { type: String, enum: ['cash','upi','bank','cheque','other'], default: 'cash' },
  referenceNo:     { type: String, default: '' },   // UPI txn / UTR / cheque no

  // Payslip receipt (base64 image stored inline — small files only)
  receiptImage:    { type: String, default: '' },
  receiptFileName: { type: String, default: '' },

  // For attendance-linked deductions — stores which day the deduction applies to
  attendanceDate: { type: Date, default: null },

  status:   { type: String, enum: ['paid','pending','cancelled'], default: 'paid' },
  paidBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt:   { type: Date, default: Date.now },
}, { timestamps: true });

salaryPaymentSchema.index({ staff: 1, month: -1 });
salaryPaymentSchema.index({ month: -1 });

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema);