const Booking       = require('../models/Booking');
const Payment       = require('../models/Payment');
const SalonSettings = require('../models/SalonSettings');
const { AppError }  = require('../middlewares/errorHandler');

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

const shapeInvoice = (booking, payment) => {
  const services = [];
  if (booking.service) {
    services.push({
      name:     booking.service.name     || '—',
      category: booking.service.category || '',
      duration: booking.service.duration || 0,
      price:    booking.service.price    || booking.totalAmount || 0,
    });
  }
  if (Array.isArray(booking.additionalServices)) {
    booking.additionalServices.forEach(s => {
      if (s && s.name) services.push({ name: s.name, category: s.category || '', duration: s.duration || 0, price: s.price || 0 });
    });
  }

  return {
    _id:           booking._id,
    invoiceRef:    booking.refNo,
    bookingId:     booking._id,
    refNo:         booking.refNo,
    customerName:  booking.customer?.name  || 'Walk-in',
    customerPhone: booking.customer?.phone || '',
    customerEmail: booking.customer?.email || '',
    service:       services[0]?.name || '—',
    services,
    stylist:       booking.staff?.name || booking.staffName || '—',
    staffName:     booking.staff?.name || '—',
    date:          booking.date,
    completedAt:   booking.completedAt,
    timeSlot:      booking.timeSlot,
    type:          booking.type     || 'walk-in',
    status:        booking.status,
    notes:         booking.notes    || '',
    totalAmount:    booking.totalAmount    || 0,
    discountAmount: booking.discountAmount || 0,
    couponCode:     booking.couponCode     || '',
    couponDiscount: booking.couponCode     ? (booking.discountAmount || 0) : 0,
    manualDiscount: !booking.couponCode    ? (booking.discountAmount || 0) : 0,
    finalAmount:    booking.finalAmount    || 0,
    loyaltyPoints:  booking.loyaltyPointsEarned || 0,
    paymentMethod:  booking.paymentMethod  || 'cash',
    paymentStatus:  booking.paymentStatus,
    transactionId:  payment?.razorpayPaymentId || null,
    paidAt:         payment?.createdAt     || booking.completedAt,
    createdAt:      booking.createdAt,
    updatedAt:      booking.updatedAt,
  };
};

// ── GET /invoices ──────────────────────────────────────────────────────────────
const getAllInvoices = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, search, refNo, paymentMethod, type, stylist, since } = req.query;

    const filter = { salonId: req.salonId, status: 'completed', paymentStatus: 'paid' };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   { const e = new Date(endDate); e.setHours(23, 59, 59, 999); filter.date.$lte = e; }
    }
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (type)          filter.type          = type;
    if (since)         filter.updatedAt     = { $gt: new Date(since) };

    let bookings = await Booking.find(filter)
      .populate('service',            'name category price duration')
      .populate('additionalServices', 'name category price duration')
      .populate('customer',           'name phone email')
      .populate('staff',              'name')
      .sort({ completedAt: -1, date: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    if (refNo) {
      const re = new RegExp(refNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      bookings  = bookings.filter(b => re.test(b.refNo));
    }
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      bookings  = bookings.filter(b =>
        re.test(b.refNo) ||
        re.test(b.customer?.name  || '') ||
        re.test(b.customer?.phone || '') ||
        re.test(b.staff?.name     || '')
      );
    }
    if (stylist) {
      bookings = bookings.filter(b => (b.staff?.name || '').toLowerCase() === stylist.toLowerCase());
    }

    const total = await Booking.countDocuments(filter);

    const bookingIds = bookings.map(b => b._id);
    const payments   = await Payment.find({ salonId: req.salonId, booking: { $in: bookingIds }, status: 'completed' });
    const payMap     = {};
    payments.forEach(p => { payMap[p.booking?.toString()] = p; });

    const invoices = bookings.map(b => shapeInvoice(b, payMap[b._id.toString()]));

    const allFilter = { salonId: req.salonId, status: 'completed', paymentStatus: 'paid' };
    const [revenue, discounts, count] = await Promise.all([
      Booking.aggregate([{ $match: allFilter }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
      Booking.aggregate([{ $match: allFilter }, { $group: { _id: null, total: { $sum: '$discountAmount' } } }]),
      Booking.countDocuments(allFilter),
    ]);

    res.status(200).json({
      success: true, invoices,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      summary: { totalRevenue: revenue[0]?.total || 0, totalDiscounts: discounts[0]?.total || 0, totalCount: count },
    });
  } catch (err) { next(err); }
};

// ── GET /invoices/search?refNo=xxx ─────────────────────────────────────────────
const searchByRef = async (req, res, next) => {
  try {
    const { refNo, q } = req.query;
    const term = refNo || q;
    if (!term) throw new AppError('refNo or q param required', 400);

    const re      = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const booking = await Booking.findOne({
      salonId: req.salonId,
      $or:     [{ refNo: re }, { _id: term.match(/^[0-9a-fA-F]{24}$/) ? term : undefined }],
      status:  'completed',
    })
      .populate('service',            'name category price duration')
      .populate('additionalServices', 'name category price duration')
      .populate('customer',           'name phone email')
      .populate('staff',              'name');

    if (!booking) throw new AppError('Invoice not found', 404);

    const payment = await Payment.findOne({ booking: booking._id, salonId: req.salonId, status: 'completed' });
    res.status(200).json({ success: true, invoice: shapeInvoice(booking, payment) });
  } catch (err) { next(err); }
};

// ── GET /invoices/:bookingId ───────────────────────────────────────────────────
const generateInvoice = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, salonId: req.salonId })
      .populate('service',            'name category price discountPrice duration')
      .populate('additionalServices', 'name category price duration')
      .populate('customer',           'name email phone')
      .populate('staff',              'name');

    if (!booking) throw new AppError('Booking not found', 404);

    const payment  = await Payment.findOne({ booking: bookingId, salonId: req.salonId, status: 'completed' });
    let   settings = await SalonSettings.findOne({ salonId: req.salonId });
    if (!settings) settings = await SalonSettings.create({ salonId: req.salonId });

    const taxRate      = settings.taxRate || 0;
    const baseAmount   = booking.finalAmount;
    const taxAmount    = parseFloat(((baseAmount * taxRate) / (100 + taxRate)).toFixed(2));
    const preTexAmount = parseFloat((baseAmount - taxAmount).toFixed(2));

    res.status(200).json({ success: true, invoice: {
      ...shapeInvoice(booking, payment),
      salon: {
        name:      settings.salonName || 'Salon',
        address:   settings.address   || '',
        phone:     settings.phone     || '',
        email:     settings.email     || '',
        gstNumber: settings.gstNumber || '',
      },
      pricing: {
        subtotal:  preTexAmount,
        taxRate,   taxAmount,
        cgst:      parseFloat((taxAmount / 2).toFixed(2)),
        sgst:      parseFloat((taxAmount / 2).toFixed(2)),
        discount:  booking.discountAmount || 0,
        total:     baseAmount,
      },
    }});
  } catch (err) { next(err); }
};

// ── GET /invoices/since/:timestamp ────────────────────────────────────────────
const getSince = async (req, res, next) => {
  try {
    const ts      = new Date(Number(req.params.timestamp));
    const bookings = await Booking.find({
      salonId: req.salonId,
      status: 'completed', paymentStatus: 'paid',
      updatedAt: { $gt: ts },
    })
      .populate('service',            'name category price duration')
      .populate('additionalServices', 'name category price duration')
      .populate('customer',           'name phone email')
      .populate('staff',              'name')
      .sort({ updatedAt: -1 })
      .limit(200);

    const payments = await Payment.find({ salonId: req.salonId, booking: { $in: bookings.map(b => b._id) }, status: 'completed' });
    const payMap   = {};
    payments.forEach(p => { payMap[p.booking?.toString()] = p; });

    res.status(200).json({
      success:  true,
      invoices: bookings.map(b => shapeInvoice(b, payMap[b._id.toString()])),
      serverTs: Date.now(),
    });
  } catch (err) { next(err); }
};

module.exports = { generateInvoice, getAllInvoices, searchByRef, getSince };
