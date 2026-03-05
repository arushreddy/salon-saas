const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['shampoo', 'conditioner', 'oil', 'color', 'cream', 'serum', 'tools', 'accessories', 'consumables', 'other'],
      default: 'other',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      enum: ['pieces', 'ml', 'liters', 'grams', 'kg', 'bottles', 'packets', 'boxes'],
      default: 'pieces',
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    supplier: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

inventorySchema.virtual('stockValue').get(function () {
  return this.quantity * this.costPrice;
});

inventorySchema.index({ name: 'text', brand: 'text' });
inventorySchema.index({ category: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);