// server/src/routes/public.routes.js
// No JWT required — salon resolved from X-Salon-Slug header, subdomain, or custom domain
const express = require('express');
const router  = express.Router();
const { resolveTenant, planGuard } = require('../middlewares/tenant.middleware');
const Service      = require('../models/Service');
const Staff        = require('../models/Staff');
const Salon        = require('../models/Salon');
const SalonSettings = require('../models/SalonSettings');
const Booking      = require('../models/Booking');
const User         = require('../models/User');
const { AppError } = require('../middlewares/errorHandler');

// All routes resolve tenant first
router.use(resolveTenant);

// ── GET /api/public/salon-info ─────────────────────────────────────────────
router.get('/salon-info', async (req, res, next) => {
  try {
    const [salon, settings] = await Promise.all([
      Salon.findById(req.salonId).select('name slug logo phone email address plan features').lean(),
      SalonSettings.findOne({ salonId: req.salonId }).lean(),
    ]);
    if (!salon) throw new AppError('Salon not found', 404);

    const pw = settings?.publicWebsite || {};

    res.json({
      success: true,
      salon: {
        name:        settings?.salonName     || salon.name,
        tagline:     pw.heroSubtitle         || settings?.tagline || '',
        heroTitle:   pw.heroTitle            || settings?.salonName || salon.name,
        heroImage:   pw.heroImage            || '',
        logo:        settings?.logo          || salon.logo || '',
        phone:       settings?.phone         || salon.phone || '',
        email:       settings?.email         || salon.email || '',
        address:     settings?.address       || salon.address || {},
        slug:        salon.slug,
        features:    salon.features,
        plan:        salon.plan,
        // Website customization
        theme: {
          primaryColor:   pw.primaryColor   || '#B8860B',
          secondaryColor: pw.secondaryColor || '#1A1208',
          bgColor:        pw.bgColor        || '#FDFAF5',
        },
        about: pw.aboutEnabled ? {
          enabled: true,
          title:   pw.aboutTitle || 'About Us',
          text:    pw.aboutText  || '',
          image:   pw.aboutImage || '',
        } : { enabled: false },
        gallery: pw.galleryEnabled ? (pw.gallery || []) : [],
        social: {
          instagram: pw.instagram || '',
          facebook:  pw.facebook  || '',
          google:    pw.google    || '',
        },
        mapEmbedUrl:     pw.mapEmbedUrl     || '',
        metaTitle:       pw.metaTitle       || settings?.salonName || salon.name,
        metaDescription: pw.metaDescription || pw.heroSubtitle || settings?.tagline || '',
        externalWebsite: pw.externalWebsite || '',
      },
    });
  } catch (e) { next(e); }
});

// ── GET /api/public/services ───────────────────────────────────────────────
router.get('/services', planGuard('onlineBooking'), async (req, res, next) => {
  try {
    const services = await Service.find({ salonId: req.salonId, isActive: true })
      .select('name category price discountPrice duration description')
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({ success: true, services });
  } catch (e) { next(e); }
});

// ── GET /api/public/staff ──────────────────────────────────────────────────
router.get('/staff', planGuard('onlineBooking'), async (req, res, next) => {
  try {
    const staff = await Staff.find({ salonId: req.salonId, isActive: true })
      .select('name designation photo specialties')
      .lean();
    res.json({ success: true, staff });
  } catch (e) { next(e); }
});

// ── GET /api/public/timeslots ──────────────────────────────────────────────
router.get('/timeslots', planGuard('onlineBooking'), async (req, res, next) => {
  try {
    const { date, serviceId, staffId } = req.query;
    if (!date || !serviceId) throw new AppError('date and serviceId are required', 400);

    const service = await Service.findOne({ _id: serviceId, salonId: req.salonId }).lean();
    if (!service) throw new AppError('Service not found', 404);

    // Check operating hours
    const settings = await SalonSettings.findOne({ salonId: req.salonId })
      .select('operatingHours weeklySchedule')
      .lean();

    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = settings?.weeklySchedule?.[dayName];
    if (daySchedule?.closed) {
      return res.json({ success: true, slots: [], message: 'Salon is closed on this day' });
    }

    const openTime  = daySchedule?.open  || settings?.operatingHours?.open  || '09:00';
    const closeTime = daySchedule?.close || settings?.operatingHours?.close || '21:00';

    const addMins = (t, m) => {
      const [h, mn] = t.split(':').map(Number);
      const total = h * 60 + mn + m;
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };
    const overlap = (as, ae, bs, be) => as < be && ae > bs;

    const start = new Date(date); start.setHours(0,0,0,0);
    const end   = new Date(date); end.setHours(23,59,59,999);
    const filter = { salonId: req.salonId, date: { $gte: start, $lte: end }, status: { $nin: ['cancelled','no-show'] } };
    if (staffId) filter.staff = staffId;

    const existing   = await Booking.find(filter).lean();
    const staffCount = await Staff.countDocuments({ salonId: req.salonId, isActive: true });
    const maxPerSlot = staffId ? 1 : Math.max(1, staffCount);

    // Generate slots from open to close time in 30-min increments
    const allSlots = [];
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    for (let total = oh * 60 + om; total < ch * 60 + cm; total += 30) {
      allSlots.push(`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`);
    }

    const now     = new Date();
    const isToday = new Date(date).toDateString() === now.toDateString();

    const available = allSlots.filter(slot => {
      const slotEnd = addMins(slot, service.duration);
      if (slotEnd > closeTime) return false;
      if (isToday) {
        const nowStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        if (slot <= nowStr) return false;
      }
      const blocked = existing.filter(b =>
        b.timeSlot?.start && overlap(slot, slotEnd, b.timeSlot.start, b.timeSlot.end)
      ).length;
      return blocked < maxPerSlot;
    });

    res.json({
      success: true,
      slots: available.map(s => {
        const slotEnd = addMins(s, service.duration);
        const [h]     = s.split(':').map(Number);
        const dh      = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return {
          start: s, end: slotEnd,
          display: `${dh}:${s.split(':')[1]} ${h >= 12 ? 'PM' : 'AM'}`,
        };
      }),
    });
  } catch (e) { next(e); }
});

// ── POST /api/public/book ──────────────────────────────────────────────────
router.post('/book', planGuard('onlineBooking'), async (req, res, next) => {
  try {
    const { serviceId, staffId, date, timeSlot, customerName, customerPhone, customerEmail, notes } = req.body;

    if (!serviceId || !date || !timeSlot?.start || !customerName || !customerPhone)
      throw new AppError('serviceId, date, timeSlot, customerName and customerPhone are required', 400);

    const service = await Service.findOne({ _id: serviceId, salonId: req.salonId }).lean();
    if (!service) throw new AppError('Service not found', 404);

    const normalPhone = customerPhone.replace(/\D/g, '').replace(/^91(\d{10})$/, '$1');

    // Find or create customer
    let customer = await User.findOne({ phone: normalPhone, salonId: req.salonId, role: 'customer' });
    if (!customer) {
      customer = await User.create({
        name:     customerName,
        phone:    normalPhone,
        email:    customerEmail || `guest_${normalPhone}@booking.temp`,
        role:     'customer',
        salonId:  req.salonId,
        password: normalPhone,
        isActive: true,
      });
    } else {
      // Update name/email if changed
      if (customer.name !== customerName || (customerEmail && !customer.email?.includes('@booking.temp'))) {
        customer.name  = customerName;
        if (customerEmail) customer.email = customerEmail;
        await customer.save();
      }
    }

    const addMins = (t, m) => {
      const [h, mn] = t.split(':').map(Number);
      const total = h * 60 + mn + m;
      return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    };

    const booking = await Booking.create({
      salonId:       req.salonId,
      franchiseId:   req.franchiseId || null,
      customer:      customer._id,
      service:       serviceId,
      staff:         staffId || null,
      date:          new Date(date),
      timeSlot: {
        start: timeSlot.start,
        end:   timeSlot.end || addMins(timeSlot.start, service.duration),
      },
      status:        'confirmed',
      type:          'online',
      notes:         notes || '',
      finalAmount:   service.discountPrice || service.price,
      totalAmount:   service.price,
      paymentStatus: 'pending',
      paymentMethod: 'none',
    });

    const salonSettings = await SalonSettings.findOne({ salonId: req.salonId })
      .select('phone phoneNumbers salonName publicWebsite')
      .lean();
    const adminPhone = salonSettings?.phone || salonSettings?.phoneNumbers?.[0]?.number || '';

    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      booking: {
        _id:             booking._id,
        refNo:           booking.refNo,
        service:         service.name,
        date,
        timeSlot:        booking.timeSlot,
        status:          'confirmed',
        customerPhone:   normalPhone,
        customerName,
        salonName:       salonSettings?.salonName || req.salonData?.name,
        salonAdminPhone: adminPhone,
        amount:          booking.finalAmount,
      },
    });
  } catch (e) { next(e); }
});

// ── GET /api/public/bookings ───────────────────────────────────────────────
router.get('/bookings', planGuard('onlineBooking'), async (req, res, next) => {
  try {
    const { phone, refNo } = req.query;
    if (!phone && !refNo) throw new AppError('phone or refNo required', 400);

    const filter = { salonId: req.salonId };
    if (refNo) {
      filter.refNo = refNo.toUpperCase();
    } else {
      const normalPhone = phone.replace(/\D/g, '').replace(/^91(\d{10})$/, '$1');
      const customer = await User.findOne({ phone: normalPhone, salonId: req.salonId, role: 'customer' });
      if (!customer) return res.json({ success: true, bookings: [] });
      filter.customer = customer._id;
    }

    const bookings = await Booking.find(filter)
      .populate('service', 'name price duration')
      .populate('staff', 'name')
      .sort({ date: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, bookings });
  } catch (e) { next(e); }
});

// ── GET /api/public/widget.js ──────────────────────────────────────────────
// Embed widget script — salons paste one <script> tag on their website
// Auto-detects their domain, shows a floating Book Now button
router.get('/widget.js', async (req, res, next) => {
  try {
    const slug = req.query.salon || req.headers['x-salon-slug'];
    if (!slug) {
      res.type('application/javascript');
      return res.send(`console.error('[Glamour Widget] Missing salon parameter. Use: ?salon=your-slug');`);
    }

    // Get salon settings for widget customization
    const salon = await Salon.findOne({ slug, isActive: true }).lean();
    if (!salon) {
      res.type('application/javascript');
      return res.send(`console.error('[Glamour Widget] Salon "${slug}" not found.');`);
    }

    const settings = await SalonSettings.findOne({ salonId: salon._id })
      .select('salonName publicWebsite')
      .lean();

    const pw           = settings?.publicWebsite || {};
    const salonName    = settings?.salonName || salon.name;
    const primaryColor = pw.embedWidgetColor    || pw.primaryColor || '#B8860B';
    const buttonText   = pw.embedWidgetText     || 'Book Appointment';
    const position     = pw.embedWidgetPosition || 'bottom-right';
    const bookingUrl   = `${req.protocol}://${req.get('host')}/book/${slug}/appointment`;

    const posStyle = position === 'bottom-left'
      ? 'bottom:24px;left:24px;'
      : 'bottom:24px;right:24px;';

    // The widget JS — injects a floating button + iframe modal
    const widgetJS = `
(function() {
  if (window.__GlamourWidget) return;
  window.__GlamourWidget = true;

  var PRIMARY = '${primaryColor}';
  var BOOKING_URL = '${bookingUrl}';
  var SALON_NAME  = '${salonName.replace(/'/g, "\\'")}';
  var BTN_TEXT    = '${buttonText.replace(/'/g, "\\'")}';

  // Inject styles
  var style = document.createElement('style');
  style.innerHTML = [
    '.glm-btn{position:fixed;${posStyle}z-index:99999;background:' + PRIMARY + ';color:#1A1208;border:none;',
    'border-radius:50px;padding:14px 24px;font-size:15px;font-weight:700;cursor:pointer;',
    'box-shadow:0 4px 24px rgba(0,0,0,0.18);display:flex;align-items:center;gap:8px;',
    'font-family:Georgia,serif;font-style:italic;transition:transform 0.2s,box-shadow 0.2s;}',
    '.glm-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.22);}',
    '.glm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:none;align-items:center;justify-content:center;}',
    '.glm-overlay.open{display:flex;}',
    '.glm-modal{background:#fff;border-radius:20px;overflow:hidden;width:100%;max-width:480px;',
    'height:85vh;max-height:700px;position:relative;box-shadow:0 24px 80px rgba(0,0,0,0.3);}',
    '.glm-close{position:absolute;top:12px;right:14px;z-index:10;background:rgba(0,0,0,0.5);',
    'color:#fff;border:none;border-radius:50%;width:30px;height:30px;font-size:18px;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;line-height:1;}',
    '.glm-iframe{width:100%;height:100%;border:none;}',
  ].join('');
  document.head.appendChild(style);

  // Create button
  var btn = document.createElement('button');
  btn.className = 'glm-btn';
  btn.innerHTML = '&#9986; ' + BTN_TEXT;
  btn.title = 'Book at ' + SALON_NAME;

  // Create overlay + modal
  var overlay = document.createElement('div');
  overlay.className = 'glm-overlay';

  var modal = document.createElement('div');
  modal.className = 'glm-modal';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'glm-close';
  closeBtn.innerHTML = '&times;';

  var iframe = document.createElement('iframe');
  iframe.className = 'glm-iframe';
  iframe.title = 'Book at ' + SALON_NAME;

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(btn);
  document.body.appendChild(overlay);

  var isOpen = false;

  function openWidget() {
    if (!iframe.src) iframe.src = BOOKING_URL;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    isOpen = true;
  }

  function closeWidget() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    isOpen = false;
  }

  btn.addEventListener('click', openWidget);
  closeBtn.addEventListener('click', closeWidget);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeWidget(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && isOpen) closeWidget(); });

  // Expose API so devs can trigger programmatically
  window.GlamourBooking = { open: openWidget, close: closeWidget };
})();
`;

    res.type('application/javascript');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(widgetJS);
  } catch (e) { next(e); }
});

module.exports = router;