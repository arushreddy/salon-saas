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
    // Live availability — auto-updated by clock-in/out and booking status
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'off-duty', 'absent', 'temp-unavailable'],
      default: 'off-duty',
    },
    // Reference to the booking currently keeping this staff busy
    currentBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    // Receptionist can mark staff as temporarily unavailable (e.g. stepped out)
    tempUnavailable: {
      type: Boolean,
      default: false,
    },
    bio: {
      type: String,
      maxlength: 300,
      default: '',
    },
    // Admin-controlled permissions — granular feature access per staff member
    permissions: {
      // Always ON (defaults true) — core features every staff needs
      viewOwnAppointments:  { type: Boolean, default: true },
      viewAssignedServices: { type: Boolean, default: true },
      updateAppointmentStatus: { type: Boolean, default: true },
      viewOwnProfile:       { type: Boolean, default: true },
      clockInOut:           { type: Boolean, default: true },

      // Admin grants these selectively
      viewAllAppointments:  { type: Boolean, default: false },
      viewCustomerDetails:  { type: Boolean, default: false },
      createWalkInBooking:  { type: Boolean, default: false },
      viewOwnEarnings:      { type: Boolean, default: false },
      viewInventory:        { type: Boolean, default: false },
      viewServices:         { type: Boolean, default: false },
      manageOwnSchedule:    { type: Boolean, default: false },
      viewReports:          { type: Boolean, default: false },
      cancelAppointments:   { type: Boolean, default: false },
      sendWhatsApp:         { type: Boolean, default: false },
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


staffSchema.index({ user: 1 });
staffSchema.index({ specializations: 1 });
staffSchema.index({ designation: 1 });

module.exports = mongoose.model('Staff', staffSchema);