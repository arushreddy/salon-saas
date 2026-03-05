const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const SalonSettings = require('../models/SalonSettings');
const { AppError } = require('../middlewares/errorHandler');

const generateInvoice = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('service', 'name category price discountPrice duration')
      .populate('customer', 'name email phone')
      .populate('staff', 'name');

    if (!booking) throw new AppError('Booking not found', 404);

    const payment = await Payment.findOne({ booking: bookingId, status: 'completed' });
    let settings = await SalonSettings.findOne();
    if (!settings) settings = await SalonSettings.create({});

    const taxRate = settings.taxRate || 18;
    const baseAmount = booking.finalAmount;
    const taxAmount = parseFloat(((baseAmount * taxRate) / (100 + taxRate)).toFixed(2));
    const preTexAmount = parseFloat((baseAmount - taxAmount).toFixed(2));

    const invoice = {
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      date: new Date(),
      salon: {
        name: settings.salonName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        gstNumber: settings.gstNumber,
      },
      customer: {
        name: booking.customer?.name,
        email: booking.customer?.email,
        phone: booking.customer?.phone,
      },
      service: {
        name: booking.service?.name,
        category: booking.service?.category,
        duration: booking.service?.duration,
      },
      staff: booking.staff?.name || 'Not assigned',
      bookingDate: booking.date,
      timeSlot: booking.timeSlot,
      pricing: {
        subtotal: preTexAmount,
        taxRate,
        taxAmount,
        cgst: parseFloat((taxAmount / 2).toFixed(2)),
        sgst: parseFloat((taxAmount / 2).toFixed(2)),
        discount: booking.discountAmount,
        total: baseAmount,
      },
      payment: {
        method: payment?.method || booking.paymentMethod || 'pending',
        status: payment?.status || booking.paymentStatus,
        transactionId: payment?.razorpayPaymentId || null,
        paidAt: payment?.createdAt || null,
      },
    };

    res.status(200).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

const getAllInvoices = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { status: 'completed', paymentStatus: 'paid' };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const bookings = await Booking.find(filter)
      .populate('service', 'name price')
      .populate('customer', 'name phone')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      invoices: bookings,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateInvoice, getAllInvoices };