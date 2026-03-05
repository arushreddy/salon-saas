const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Booking date is required'],
    },
    timeSlot: {
      start: {
        type: String,
        required: [true, 'Start time is required'],
      },
      end: {
        type: String,
        required: [true, 'End time is required'],
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'confirmed',
    },
    type: {
      type: String,
      enum: ['online', 'walk-in'],
      default: 'online',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'partial'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'online', 'none'],
      default: 'none',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
bookingSchema.index({ customer: 1, date: -1 });
bookingSchema.index({ staff: 1, date: 1 });
bookingSchema.index({ date: 1, status: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);