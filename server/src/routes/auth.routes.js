const express = require('express');
const router = express.Router();
const { register, login, logout, refreshAccessToken, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshAccessToken);
router.get('/me', protect, getMe);

module.exports = router;
