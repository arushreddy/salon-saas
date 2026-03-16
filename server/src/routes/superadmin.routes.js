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

router.use(protect, authorize('super_admin'));

// ── Dashboard & Search ──────────────────────────────────────────────────────
router.get('/stats',    getStats);
router.get('/search',   globalSearch);
router.get('/analytics', getAnalytics);

// ── Salons ──────────────────────────────────────────────────────────────────
router.get('/salons',                             getSalons);
router.post('/salons',                            createSalon);
router.get('/salons/:id',                         getSalon);
router.put('/salons/:id',                         updateSalon);
router.delete('/salons/:id',                      deleteSalon);
router.post('/salons/:id/renew-subscription',     renewSubscription);
router.get('/salons/:id/payments',                getSubscriptionPayments);
router.post('/salons/:id/suspend',                suspendSalon);
router.post('/salons/:id/unsuspend',              unsuspendSalon);
router.post('/salons/:id/reset-password',         resetAdminPassword);
router.post('/salons/:id/impersonate',            impersonateSalon);

// ── Users ───────────────────────────────────────────────────────────────────
router.get('/users',                  getUsers);
router.post('/users/:id/force-logout', forceLogout);

// ── Plans ───────────────────────────────────────────────────────────────────
router.get('/plans',        getPlans);
router.post('/plans',       createPlan);
router.put('/plans/:id',    updatePlan);
router.delete('/plans/:id', deletePlan);

// ── Franchises ──────────────────────────────────────────────────────────────
router.get('/franchises', getFranchises);

// ── Exports ─────────────────────────────────────────────────────────────────
router.get('/export/salons', exportSalons);

module.exports = router;