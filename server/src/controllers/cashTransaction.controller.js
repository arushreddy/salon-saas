// src/controllers/cashTransaction.controller.js — multi-tenant (Phase 3)
//
// KEY FIX carried forward: computeSummary() only counts cash bookings SINCE
// the last shift close (not all-time). salonId is now threaded through every
// query so data is completely scoped to the current tenant.

const CashTransaction = require('../models/CashTransaction');
const ShiftReport     = require('../models/ShiftReport');
const Booking         = require('../models/Booking');

/* ── IST helpers ─────────────────────────────────────────────────────────── */
const IST_MS        = 5.5 * 60 * 60 * 1000;
const todayIST      = () => new Date(Date.now() + IST_MS).toISOString().split('T')[0];
const startOfDayIST = d  => new Date(d + 'T00:00:00+05:30');
const endOfDayIST   = d  => new Date(d + 'T23:59:59+05:30');

/* ═══════════════════════════════════════════════════════════════════════════
   computeSummary(salonId, sinceDate?)
   All queries now scoped to salonId so salons never bleed into each other.
   ═══════════════════════════════════════════════════════════════════════════ */
async function computeSummary(salonId, sinceDate = null) {

  // ── 1. Determine the shift boundary ──────────────────────────────────────
  let shiftStart = sinceDate;

  if (!shiftStart) {
    const lastShift = await ShiftReport.findOne({ salonId }).sort({ closedAt: -1 }).lean();
    if (lastShift?.closedAt) {
      shiftStart = new Date(lastShift.closedAt);
    } else {
      shiftStart = startOfDayIST(todayIST());
    }
  }

  // ── 2. Cash bookings SINCE shiftStart ────────────────────────────────────
  const cashAgg = await Booking.aggregate([
    {
      $match: {
        salonId,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        $or: [
          { date:      { $gte: shiftStart } },
          { createdAt: { $gte: shiftStart } },
          { paidAt:    { $gte: shiftStart } },
        ],
      },
    },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);
  const cashIn = cashAgg[0]?.total || 0;

  // ── 3. Manual transactions SINCE shiftStart ───────────────────────────────
  const manualAgg = await CashTransaction.aggregate([
    { $match: { salonId, createdAt: { $gte: shiftStart } } },
    {
      $group: {
        _id:   '$type',
        total: { $sum: '$amount' },
        signedTotal: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'adjustment'] },
              { $cond: [{ $eq: ['$sign', '+'] }, '$amount', { $multiply: ['$amount', -1] }] },
              '$amount',
            ],
          },
        },
      },
    },
  ]);

  let manualCashIn = 0, withdrawn = 0, expenses = 0,
      salaries     = 0, advances  = 0, adjNet   = 0;

  for (const row of manualAgg) {
    if (row._id === 'cash_in')    manualCashIn = row.total;
    if (row._id === 'withdrawal') withdrawn    = row.total;
    if (row._id === 'expense')    expenses     = row.total;
    if (row._id === 'salary')     salaries     = row.total;
    if (row._id === 'advance')    advances     = row.total;
    if (row._id === 'adjustment') adjNet       = row.signedTotal;
  }

  const balance = cashIn + manualCashIn + adjNet - withdrawn - expenses - salaries - advances;

  return {
    balance,
    cashIn,
    manualCashIn,
    withdrawn,
    expenses,
    salaries,
    advances,
    adjNet,
    shiftStartedAt: shiftStart.toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GET /cash-transactions
   ═══════════════════════════════════════════════════════════════════════════ */
exports.list = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const txns  = await CashTransaction.find({ salonId: req.salonId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name role');
    res.json({ success: true, transactions: txns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /cash-transactions
   ═══════════════════════════════════════════════════════════════════════════ */
exports.create = async (req, res) => {
  try {
    const { type, amount, note, date, time, recipient, sign } = req.body;

    if (!type || !amount || !note)
      return res.status(400).json({ success: false, message: 'type, amount and note are required' });
    if (amount <= 0)
      return res.status(400).json({ success: false, message: 'Amount must be positive' });

    const txn = await CashTransaction.create({
      salonId:   req.salonId,
      type,
      amount:    Number(amount),
      note:      note.trim(),
      date:      date || todayIST(),
      time:      time || null,
      recipient: recipient || null,
      sign:      type === 'adjustment' ? (sign || '+') : '+',
      createdBy: req.user?.userId || null,
    });

    await txn.populate('createdBy', 'name role');

    const summary = await computeSummary(req.salonId);
    res.status(201).json({ success: true, transaction: txn, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE /cash-transactions/:id
   ═══════════════════════════════════════════════════════════════════════════ */
exports.remove = async (req, res) => {
  try {
    const txn = await CashTransaction.findOneAndDelete({ _id: req.params.id, salonId: req.salonId });
    if (!txn)
      return res.status(404).json({ success: false, message: 'Transaction not found' });

    const summary = await computeSummary(req.salonId);
    res.json({ success: true, deletedId: req.params.id, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /cash-transactions/summary
   ═══════════════════════════════════════════════════════════════════════════ */
exports.summary = async (req, res) => {
  try {
    const summary = await computeSummary(req.salonId);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /cash-transactions/today-bookings
   ═══════════════════════════════════════════════════════════════════════════ */
exports.todayBookings = async (req, res) => {
  try {
    const today    = todayIST();
    const dayStart = startOfDayIST(today);
    const dayEnd   = endOfDayIST(today);

    const allToday = await Booking.find({
      salonId:       req.salonId,
      paymentStatus: 'paid',
      $or: [
        { date:      { $gte: dayStart, $lte: dayEnd } },
        { createdAt: { $gte: dayStart, $lte: dayEnd } },
      ],
    })
      .populate('customer', 'name phone')
      .populate('service',  'name price')
      .populate('staff',    'name')
      .sort({ createdAt: -1 })
      .lean();

    const cashBookings   = allToday.filter(b => b.paymentMethod === 'cash');
    const onlineBookings = allToday.filter(b => ['upi', 'card', 'online', 'razorpay'].includes(b.paymentMethod));

    res.json({ success: true, cashBookings, onlineBookings, date: today });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /cash-transactions/since/:timestamp
   ═══════════════════════════════════════════════════════════════════════════ */
exports.since = async (req, res) => {
  try {
    const since = new Date(parseInt(req.params.timestamp));
    if (isNaN(since.getTime()))
      return res.status(400).json({ success: false, message: 'Invalid timestamp' });

    const added = await CashTransaction.find({ salonId: req.salonId, updatedAt: { $gt: since } })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name role');

    const summary = await computeSummary(req.salonId);

    res.json({ success: true, added, deletedIds: [], summary, serverTime: Date.now() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /cash-transactions/shift-close
   ═══════════════════════════════════════════════════════════════════════════ */
exports.shiftClose = async (req, res) => {
  try {
    const {
      cashIn, manualCashIn, withdrawn, expenses, salaries, advances, adjNet,
      closingBalance, todayCash, todayOnline, physicalCount, variance, note,
    } = req.body;

    const report = await ShiftReport.create({
      salonId:        req.salonId,
      date:           todayIST(),
      closingBalance: closingBalance || 0,
      cashIn:         cashIn         || 0,
      manualCashIn:   manualCashIn   || 0,
      withdrawn:      withdrawn      || 0,
      expenses:       expenses       || 0,
      salaries:       salaries       || 0,
      advances:       advances       || 0,
      adjNet:         adjNet         || 0,
      todayCash:      todayCash      || 0,
      todayOnline:    todayOnline    || 0,
      physicalCount:  physicalCount  || null,
      variance:       variance       || null,
      note:           note           || '',
      closedBy:       req.user?.userId || null,
      closedAt:       new Date(),
    });

    await report.populate('closedBy', 'name role');

    const summary = await computeSummary(req.salonId);
    res.status(201).json({ success: true, report, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /cash-transactions/shift-reports
   ═══════════════════════════════════════════════════════════════════════════ */
exports.shiftReports = async (req, res) => {
  try {
    const limit   = parseInt(req.query.limit) || 60;
    const reports = await ShiftReport.find({ salonId: req.salonId })
      .sort({ closedAt: -1 })
      .limit(limit)
      .populate('closedBy', 'name role');
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
