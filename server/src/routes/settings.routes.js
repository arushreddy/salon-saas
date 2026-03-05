const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/', protect, getSettings);
router.put('/', protect, authorize('admin'), updateSettings);

module.exports = router;
