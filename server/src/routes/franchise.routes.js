// src/routes/franchise.routes.js
// Phase 4 — Franchise Module Routes
// All routes require valid JWT.
// franchise_owner   = full access (FO)
// franchise_manager = read-only access (FM — analytics + overview only)
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');

const {
  getOverview,
  getBranches,
  getCrossAnalytics,
  getBranchBookings,
  addManager,
  listManagers,
  removeManager,
  exportCSV,
  getPlanReminderLinks,
  sendCustomWhatsApp,
  getWhatsAppTemplates,
} = require('../controllers/franchise.controller');

const FO = authorize('franchise_owner');
const FM = authorize('franchise_owner', 'franchise_manager'); // both roles

// Apply protect to all routes in this file
router.use(protect);

// ── Dashboard & Branch Overview ───────────────────────────────────────────────
router.get('/overview',                           FM, getOverview);
router.get('/branches',                           FM, getBranches);
router.get('/branches/:salonId/bookings',         FM, getBranchBookings);

// ── Cross-Branch Analytics ────────────────────────────────────────────────────
router.get('/analytics',                          FM, getCrossAnalytics);

// ── Manager Management (franchise_owner only) ─────────────────────────────────
router.post  ('/managers',                        FO, addManager);
router.get   ('/managers',                        FO, listManagers);
router.delete('/managers/:userId',                FO, removeManager);

// ── Export (CSV) ──────────────────────────────────────────────────────────────
// GET so the browser can directly download
router.get('/export/csv',                         FM, exportCSV);

// ── WhatsApp ──────────────────────────────────────────────────────────────────
router.get ('/whatsapp/templates',                FO, getWhatsAppTemplates);
router.post('/whatsapp/plan-reminder',            FO, getPlanReminderLinks);
router.post('/whatsapp/custom',                   FO, sendCustomWhatsApp);

module.exports = router;
