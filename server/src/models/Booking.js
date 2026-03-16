const mongoose = require('mongoose');

// ── RefNo generator: GLM-YYMMDD-XXXX (e.g. GLM-250310-A3F7) ─────────────────
function generateRefNo() {
  const d = new Date();
  const yy   = String(d.getFullYear()).slice(2);
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GLM-${yy}${mm}${dd}-${rand}`;
}

const bookingSchema = new mongoose.Schema(
  {
    // ── Human-readable reference number ──────────────────────────────────────
    refNo: {
      type:    String,
      unique:  true,
      sparse:  true,
      default: generateRefNo,   // auto-generate at doc creation time
    },

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
    // All assigned staff members (multi-staff support)
    staffMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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
    couponCode: {
      type: String,
      default: '',
    },
    loyaltyPointsEarned: {
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
    // Extra services for multi-service walk-in bookings
    additionalServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
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
    // ── Multi-tenancy key (Phase 1) ─────────────────────────────────────────
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    // null unless this record belongs to a franchise branch
    franchiseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Franchise',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Auto-generate refNo on every new booking ─────────────────────────────────
bookingSchema.pre('save', async function () {
  if (!this.refNo) this.refNo = generateRefNo();
});

// Indexes for fast queries

bookingSchema.index({ customer: 1, date: -1 });
bookingSchema.index({ staff: 1, date: 1 });
bookingSchema.index({ date: 1, status: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ refNo: 1 });

module.exports = mongoose.model('Booking', bookingSchema);