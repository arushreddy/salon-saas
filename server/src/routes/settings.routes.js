const express = require('express');
const router  = express.Router();
const { getSettings, updateSettings, getPublicSettings } = require('../controllers/settings.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.get('/public', getPublicSettings);                                        // no auth — public booking page
router.get('/',       protect, guardTenant, getSettings);                        // any logged-in user
router.put('/',       protect, guardTenant, authorize('admin'), updateSettings);  // admin only

module.exports = router;
