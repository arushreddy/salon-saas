// src/models/SalonSettings.js
const mongoose = require('mongoose');

const dayScheduleSchema = new mongoose.Schema({
  open:  { type: String, default: '09:00' },
  close: { type: String, default: '21:00' },
  closed:{ type: Boolean, default: false  },
}, { _id: false });

const salonSettingsSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      default: null,
      index: true,
    },

    // ── Identity ─────────────────────────────────────────────────────────
    salonName:  { type: String, default: 'Glamour Salon' },
    tagline:    { type: String, default: 'Premium Salon & Spa' },
    phone:      { type: String, default: '' },
    phoneNumbers: {
      type: [{ number: String, label: String }],
      default: [],
    },
    email:   { type: String, default: '' },
    website: { type: String, default: '' },
    logo:    { type: String, default: '' },

    // ── Address ───────────────────────────────────────────────────────────
    address: {
      street:  { type: String, default: '' },
      city:    { type: String, default: '' },
      state:   { type: String, default: '' },
      pincode: { type: String, default: '' },
    },

    // ── PUBLIC WEBSITE CUSTOMIZATION ─────────────────────────────────────
    publicWebsite: {
      // Hero section
      heroTitle:    { type: String, default: '' },  // overrides salonName in hero
      heroSubtitle: { type: String, default: '' },  // tagline on hero
      heroImage:    { type: String, default: '' },  // background image URL

      // About section
      aboutEnabled: { type: Boolean, default: false },
      aboutTitle:   { type: String, default: 'About Us' },
      aboutText:    { type: String, default: '' },
      aboutImage:   { type: String, default: '' },

      // Gallery
      galleryEnabled: { type: Boolean, default: false },
      gallery: [{
        url:     { type: String },
        caption: { type: String, default: '' },
      }],

      // Color theme
      primaryColor:   { type: String, default: '#B8860B' },
      secondaryColor: { type: String, default: '#1A1208' },
      bgColor:        { type: String, default: '#FDFAF5' },

      // Social links
      instagram: { type: String, default: '' },
      facebook:  { type: String, default: '' },
      google:    { type: String, default: '' },

      // Google Maps embed
      mapEmbedUrl: { type: String, default: '' },

      // SEO
      metaTitle:       { type: String, default: '' },
      metaDescription: { type: String, default: '' },

      // Custom domain (Type 2 — hosted on your platform)
      customDomain: { type: String, default: '' },

      // External website integration (Type 3 — they have their own site)
      externalWebsite:       { type: String, default: '' },   // their domain e.g. royalcuts.com
      embedEnabled:          { type: Boolean, default: true },
      embedWidgetPosition:   { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
      embedWidgetColor:      { type: String, default: '#B8860B' },
      embedWidgetText:       { type: String, default: 'Book Appointment' },
    },

    // ── Payment / billing ─────────────────────────────────────────────────
    upiId:     { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    taxRate:   { type: Number, default: 18 },
    currency:  { type: String, default: 'INR' },
    payment: {
      acceptCash:         { type: Boolean, default: true  },
      acceptUPI:          { type: Boolean, default: true  },
      acceptCard:         { type: Boolean, default: true  },
      razorpayKeyId:      { type: String,  default: ''    },
      razorpayKeySecret:  { type: String,  default: '', select: false },
      razorpayEnabled:    { type: Boolean, default: false },
    },
    billing: {
      invoicePrefix:  { type: String, default: 'INV' },
      invoiceCounter: { type: Number, default: 1     },
    },

    // ── Receipt ───────────────────────────────────────────────────────────
    receiptHeader:    { type: String,  default: '' },
    receiptFooter:    { type: String,  default: 'Thank you for visiting! 💛' },
    showGSTOnReceipt: { type: Boolean, default: true  },
    printReceiptAuto: { type: Boolean, default: false },

    // ── Booking settings ─────────────────────────────────────────────────
    maxAdvanceBookingDays: { type: Number, default: 30 },
    cancellationHours:     { type: Number, default: 2  },
    maxBookingsPerSlot:    { type: Number, default: 1  },
    bookingConfirmMode:    { type: String, enum: ['auto','manual'], default: 'auto' },
    walkInEnabled:         { type: Boolean, default: true  },
    onlineBookingEnabled:  { type: Boolean, default: false },
    requirePhoneVerify:    { type: Boolean, default: false },

    // ── Operating hours ───────────────────────────────────────────────────
    operatingHours: {
      open:  { type: String, default: '09:00' },
      close: { type: String, default: '21:00' },
    },
    weeklySchedule: {
      monday:    { type: dayScheduleSchema, default: () => ({}) },
      tuesday:   { type: dayScheduleSchema, default: () => ({}) },
      wednesday: { type: dayScheduleSchema, default: () => ({}) },
      thursday:  { type: dayScheduleSchema, default: () => ({}) },
      friday:    { type: dayScheduleSchema, default: () => ({}) },
      saturday:  { type: dayScheduleSchema, default: () => ({}) },
      sunday:    { type: dayScheduleSchema, default: () => ({ closed: true }) },
    },

    // ── Loyalty tiers ─────────────────────────────────────────────────────
    bronzeThreshold:   { type: Number, default: 0    },
    silverThreshold:   { type: Number, default: 500  },
    goldThreshold:     { type: Number, default: 1500 },
    platinumThreshold: { type: Number, default: 5000 },

    // ── Staff / salary defaults ───────────────────────────────────────────
    defaultCommission:         { type: Number,  default: 0     },
    lateThresholdMins:         { type: Number,  default: 15    },
    workingDaysPerMonth:       { type: Number,  default: 26    },
    maxAdvancePerStaff:        { type: Number,  default: 5000  },
    staffCanViewOtherBookings: { type: Boolean, default: false },
    staffCanEditProfile:       { type: Boolean, default: true  },
    staffCanSeeCustomerPhone:  { type: Boolean, default: false },

    // ── Receptionist permissions ──────────────────────────────────────────
    receptionistCanViewRevenue:    { type: Boolean, default: false },
    receptionistCanDeleteBookings: { type: Boolean, default: false },
    receptionistCanEditPrices:     { type: Boolean, default: false },

    // ── Inventory ─────────────────────────────────────────────────────────
    lowStockThreshold:      { type: Number,  default: 5     },
    criticalStockThreshold: { type: Number,  default: 2     },
    inventoryAlertEnabled:  { type: Boolean, default: true  },
    deductStockOnBooking:   { type: Boolean, default: false },

    // ── Theme ─────────────────────────────────────────────────────────────
    theme: {
      primaryColor: { type: String, default: '#B8860B' },
      mode:         { type: String, enum: ['light','dark'], default: 'light' },
    },

    // ── Security ─────────────────────────────────────────────────────────
    adminPIN:           { type: String, default: '', select: false },
    sessionTimeoutMins: { type: Number, default: 60 },

    // ── WhatsApp message templates ────────────────────────────────────────
    msgBookingConfirm:  { type: String, default: '' },
    msgBookingReminder: { type: String, default: '' },
    msgPaymentReceipt:  { type: String, default: '' },
    msgCancellation:    { type: String, default: '' },

    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalonSettings', salonSettingsSchema);