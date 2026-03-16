// server/src/routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const {
  register, login, loginWithPhone, logout, refreshAccessToken, getMe,
  sendOTP, verifyOTPLogin, resetPasswordOTP,
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

// ── Standard auth ──────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/login',    login);           // email + password
router.post('/login-phone', loginWithPhone); // phone + password
router.post('/logout',   protect, logout);
router.post('/refresh',  refreshAccessToken);
router.get('/me',        protect, getMe);

// ── OTP ────────────────────────────────────────────────────────────────────
// Send OTP: { identifier, channel: 'phone'|'email', purpose: 'login'|'reset' }
router.post('/send-otp',          sendOTP);
// Login via OTP: { identifier, channel, otp }
router.post('/verify-otp-login',  verifyOTPLogin);
// Reset password: { identifier, channel, otp, newPassword }
router.post('/reset-password-otp', resetPasswordOTP);

module.exports = router;