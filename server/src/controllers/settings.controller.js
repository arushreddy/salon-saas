// src/controllers/settings.controller.js — v3 (multi-tenant)
const SalonSettings = require('../models/SalonSettings');

const MASK = '••••••••';

/* ── Strip secrets before sending to client ─────────────── */
function safeCopy(doc) {
  const s = doc.toObject ? doc.toObject() : { ...doc };
  if (s.payment?.razorpayKeySecret)
    s.payment.razorpayKeySecret = s.payment.razorpayKeySecret ? MASK : '';
  if (s.adminPIN && s.adminPIN.length > 0)
    s.adminPIN = ''; // never send PIN to frontend
  return s;
}

/* ── GET /api/settings ──────────────────────────────────── */
const getSettings = async (req, res, next) => {
  try {
    let settings = await SalonSettings.findOne({ salonId: req.salonId });
    if (!settings) settings = await SalonSettings.create({ salonId: req.salonId });
    res.status(200).json({ success: true, settings: safeCopy(settings) });
  } catch (error) { next(error); }
};

/* ── PUT /api/settings ──────────────────────────────────── */
const updateSettings = async (req, res, next) => {
  try {
    let settings = await SalonSettings.findOne({ salonId: req.salonId });
    if (!settings) settings = await SalonSettings.create({ salonId: req.salonId });

    const u = req.body;

    const FLAT = [
      'salonName','tagline','phone','email','website','upiId','gstNumber',
      'taxRate','currency','showGSTOnReceipt','printReceiptAuto',
      'receiptHeader','receiptFooter',
      'maxAdvanceBookingDays','cancellationHours','maxBookingsPerSlot',
      'bookingConfirmMode','walkInEnabled','onlineBookingEnabled','requirePhoneVerify',
      'bronzeThreshold','silverThreshold','goldThreshold','platinumThreshold',
      'defaultCommission','lateThresholdMins','workingDaysPerMonth','maxAdvancePerStaff',
      'staffCanViewOtherBookings','staffCanEditProfile','staffCanSeeCustomerPhone',
      'lowStockThreshold','criticalStockThreshold','inventoryAlertEnabled','deductStockOnBooking',
      'receptionistCanViewRevenue','receptionistCanDeleteBookings','receptionistCanEditPrices',
      'sessionTimeoutMins',
      'msgBookingConfirm','msgBookingReminder','msgPaymentReceipt','msgCancellation',
    ];
    FLAT.forEach(k => { if (u[k] !== undefined) settings[k] = u[k]; });

    if (u.adminPIN && u.adminPIN !== MASK && u.adminPIN.length >= 4)
      settings.adminPIN = u.adminPIN;

    if (u.address)
      settings.address = { ...settings.address.toObject(), ...u.address };
    if (u.operatingHours)
      settings.operatingHours = { ...settings.operatingHours.toObject(), ...u.operatingHours };
    if (u.weeklySchedule) {
      const ws = settings.weeklySchedule.toObject();
      Object.entries(u.weeklySchedule).forEach(([day, val]) => {
        if (ws[day] !== undefined) ws[day] = { ...ws[day], ...val };
      });
      settings.weeklySchedule = ws;
    }
    if (u.billing)
      settings.billing = { ...settings.billing.toObject(), ...u.billing };
    if (u.theme)
      settings.theme = { ...settings.theme.toObject(), ...u.theme };

    if (u.payment) {
      const cur = settings.payment.toObject();
      const upd = { ...u.payment };
      if (!upd.razorpayKeySecret || upd.razorpayKeySecret === MASK)
        delete upd.razorpayKeySecret;
      settings.payment = { ...cur, ...upd };
    }

    // ── Public website customization ──────────────────────────────────────
    if (u.publicWebsite) {
      const cur = settings.publicWebsite
        ? (settings.publicWebsite.toObject ? settings.publicWebsite.toObject() : { ...settings.publicWebsite })
        : {};
      settings.publicWebsite = { ...cur, ...u.publicWebsite };
      // Sync customDomain to Salon model as well
      if (u.publicWebsite.customDomain !== undefined && req.salonId) {
        const Salon = require('../models/Salon');
        await Salon.findByIdAndUpdate(req.salonId, {
          customDomain: u.publicWebsite.customDomain || '',
        });
      }
    }

    await settings.save();
    res.status(200).json({ success: true, message: 'Settings saved', settings: safeCopy(settings) });
  } catch (error) { next(error); }
};

/* ── GET /api/settings/public ── (no auth, for booking page) ── */
const getPublicSettings = async (req, res, next) => {
  try {
    // resolveTenant middleware sets req.salonId on public routes
    const filter = req.salonId ? { salonId: req.salonId } : {};
    let settings = await SalonSettings.findOne(filter).lean();
    if (!settings) settings = {};
    const pub = {
      salonName:            settings.salonName,
      tagline:              settings.tagline,
      phone:                settings.phone,
      email:                settings.email,
      website:              settings.website,
      address:              settings.address,
      operatingHours:       settings.operatingHours,
      weeklySchedule:       settings.weeklySchedule,
      acceptCash:           settings.payment?.acceptCash,
      acceptUPI:            settings.payment?.acceptUPI,
      acceptCard:           settings.payment?.acceptCard,
      walkInEnabled:        settings.walkInEnabled,
      onlineBookingEnabled: settings.onlineBookingEnabled,
    };
    res.status(200).json({ success: true, settings: pub });
  } catch (error) { next(error); }
};

module.exports = { getSettings, updateSettings, getPublicSettings };