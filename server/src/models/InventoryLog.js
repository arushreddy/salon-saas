const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    type: {
      type: String,
      enum: ['use', 'refill', 'wastage', 'adjustment'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    stockBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    stockAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    customerName: {
      type: String,
      default: '',
    },
    serviceName: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    supplier: {
      type: String,
      default: '',
    },
    invoiceNo: {
      type: String,
      default: '',
    },
    costPerUnit: {
      type: Number,
      default: 0,
    },
    // ── Multi-tenancy key (Phase 1) ─────────────────────────────────────────
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);


inventoryLogSchema.index({ product: 1, createdAt: -1 });
inventoryLogSchema.index({ performedBy: 1 });
inventoryLogSchema.index({ type: 1 });
inventoryLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);