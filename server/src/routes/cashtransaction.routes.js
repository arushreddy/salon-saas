// src/routes/cashTransaction.routes.js
const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/cashTransaction.controller');
const { protect, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant);

// Named routes FIRST (before /:id)
router.get('/summary',          ctrl.summary);
router.get('/today-bookings',   ctrl.todayBookings);
router.get('/shift-reports',    ctrl.shiftReports);
router.post('/shift-close',     ctrl.shiftClose);
router.get('/since/:timestamp', ctrl.since);

// CRUD
router.get('/',       ctrl.list);
router.post('/',      ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
