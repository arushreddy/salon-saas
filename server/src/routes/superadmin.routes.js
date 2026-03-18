// src/routes/superadmin.routes.js
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getStats, getSalons, getSalon, createSalon, updateSalon,
  renewSubscription, getSubscriptionPayments,
  suspendSalon, unsuspendSalon, deleteSalon,
  resetAdminPassword, impersonateSalon,
  getUsers, forceLogout,
  getPlans, createPlan, updatePlan, deletePlan,
  getFranchises,
  getAnalytics, globalSearch,
  exportSalons,
} = require('../controllers/superadmin.controller');

const SubscriptionPayment = require('../models/SubscriptionPayment');
const Salon               = require('../models/Salon');

router.use(protect, authorize('super_admin'));

// ── Dashboard & Search ───────────────────────────────────────────────────────
router.get('/stats',     getStats);
router.get('/search',    globalSearch);
router.get('/analytics', getAnalytics);

// ── Revenue Stats (for superadmin salons page) ───────────────────────────────
router.get('/revenue-stats', async (req, res, next) => {
  try {
    const now            = new Date();
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalAgg,
      monthAgg,
      planAgg,
      activeSalons,
      totalSalons,
      expiringSoon,
    ] = await Promise.all([
      // Total revenue all time
      SubscriptionPayment.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // This month revenue
      SubscriptionPayment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Revenue by plan
      SubscriptionPayment.aggregate([
        { $group: { _id: '$plan', total: { $sum: '$amount' } } }
      ]),
      // Active salons count
      Salon.countDocuments({ isActive: true, isSuspended: false }),
      // Total salons count
      Salon.countDocuments({}),
      // Expiring within 30 days
      Salon.countDocuments({
        isActive: true,
        isSuspended: false,
        subscriptionExpiry: { $gte: now, $lte: thirtyDaysLater },
      }),
    ]);

    const planRevenue = {};
    planAgg.forEach(p => { planRevenue[p._id] = p.total; });

    res.json({
      totalRevenue:  totalAgg[0]?.total  || 0,
      totalPayments: totalAgg[0]?.count  || 0,
      monthRevenue:  monthAgg[0]?.total  || 0,
      monthPayments: monthAgg[0]?.count  || 0,
      activeSalons,
      totalSalons,
      expiringSoon,
      planRevenue,
    });
  } catch (e) { next(e); }
});

// ── Salons ───────────────────────────────────────────────────────────────────
router.get('/salons',                         getSalons);
router.post('/salons',                        createSalon);
router.get('/salons/:id',                     getSalon);
router.put('/salons/:id',                     updateSalon);
router.delete('/salons/:id',                  deleteSalon);
router.post('/salons/:id/renew-subscription', renewSubscription);
router.get('/salons/:id/payments',            getSubscriptionPayments);
router.post('/salons/:id/suspend',            suspendSalon);
router.post('/salons/:id/unsuspend',          unsuspendSalon);
router.post('/salons/:id/reset-password',     resetAdminPassword);
router.post('/salons/:id/impersonate',        impersonateSalon);

// ── Users ────────────────────────────────────────────────────────────────────
router.get('/users',                   getUsers);
router.post('/users/:id/force-logout', forceLogout);

// ── Plans ────────────────────────────────────────────────────────────────────
router.get('/plans',        getPlans);
router.post('/plans',       createPlan);
router.put('/plans/:id',    updatePlan);
router.delete('/plans/:id', deletePlan);

// ── Franchises ───────────────────────────────────────────────────────────────
router.get('/franchises', getFranchises);

// ── Exports ──────────────────────────────────────────────────────────────────
router.get('/export/salons', exportSalons);

module.exports = router;