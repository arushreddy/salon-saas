// src/controllers/auth.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 changes:
//  • login  — fetches salonId + franchiseId from User, embeds in JWT.
//             Also checks that the user's salon is active and not suspended.
//  • refresh — carries salonId + franchiseId forward on rotation.
//  • register — unchanged (customers self-register with no salonId initially).
//  • logout / getMe — unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const User  = require('../models/User');
const Salon = require('../models/Salon');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middlewares/errorHandler');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../utils/token');
const { createAndSendOTP, verifyOTP } = require('../utils/otpService');

// Roles that are tied to a specific salon — must pass salon checks
const SALON_ROLES = ['admin', 'receptionist', 'staff', 'customer'];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Self-registration for customers. No salonId assigned here.
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email and password are required', 400);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const user = await User.create({ name, email, phone, password });

    const accessToken  = generateAccessToken(user._id, user.role, null, null);
    const refreshToken = generateRefreshToken(user._id, user.role, null, null);

    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User
      .findOne({ email })
      .select('+password +refreshTokens');

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // ── Salon + subscription check for salon-bound roles ─────────────────
    if (SALON_ROLES.includes(user.role)) {
      if (!user.salonId) {
        throw new AppError('No salon assigned to this account. Contact support.', 403);
      }

      const salon = await Salon
        .findById(user.salonId)
        .select('isActive isSuspended suspendReason name subscriptionExpiry')
        .lean();

      if (!salon || !salon.isActive) {
        throw new AppError('Your salon account is no longer active. Please contact support.', 403);
      }

      if (salon.isSuspended) {
        const reason = salon.suspendReason ? ` Reason: ${salon.suspendReason}` : '';
        throw new AppError(`Your salon (${salon.name}) has been suspended.${reason}`, 403);
      }

      if (salon.subscriptionExpiry) {
        const expiryDate = new Date(salon.subscriptionExpiry);
        if (expiryDate < new Date()) {
          throw new AppError(
            `Your salon subscription expired on ${expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Please contact your platform administrator to renew.`,
            403
          );
        }
      }
    }

    // ── Issue tokens with tenant context ────────────────────────────────
    const accessToken  = generateAccessToken(user._id, user.role, user.salonId, user.franchiseId);
    const refreshToken = generateRefreshToken(user._id, user.role, user.salonId, user.franchiseId);

    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await User.findByIdAndUpdate(req.user.userId, {
        $pull: { refreshTokens: refreshToken },
      });
    }

    clearRefreshTokenCookie(res);

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Rotates the refresh token and preserves salonId + franchiseId.
// ─────────────────────────────────────────────────────────────────────────────
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new AppError('No refresh token provided', 401);

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      throw new AppError('Refresh token not recognised', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // ── Re-check subscription on every token refresh ─────────────────────
    // This kicks out already-logged-in users the moment their sub expires.
    if (user.salonId && user.role !== 'super_admin') {
      const salon = await Salon
        .findById(user.salonId)
        .select('isActive isSuspended name subscriptionExpiry')
        .lean();

      if (!salon || !salon.isActive) {
        throw new AppError('Salon account is no longer active.', 403);
      }
      if (salon.isSuspended) {
        throw new AppError(`Salon (${salon.name}) has been suspended.`, 403);
      }
      if (salon.subscriptionExpiry && new Date(salon.subscriptionExpiry) < new Date()) {
        throw new AppError(
          `Subscription expired on ${new Date(salon.subscriptionExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Please renew to continue.`,
          403
        );
      }
    }

    // Rotate — always re-read salonId/franchiseId from DB so stale tokens
    // automatically pick up any admin reassignment.
    const newAccessToken  = generateAccessToken(user._id, user.role, user.salonId, user.franchiseId);
    const newRefreshToken = generateRefreshToken(user._id, user.role, user.salonId, user.franchiseId);

    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: refreshToken },
      $push: { refreshTokens: newRefreshToken },
    });

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) throw new AppError('User not found', 404);

    res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// Body: { identifier: '9876543210', channel: 'phone', purpose: 'login'|'reset' }
//   OR  { identifier: 'admin@salon.com', channel: 'email', purpose: 'reset' }
// ─────────────────────────────────────────────────────────────────────────────
const sendOTP = async (req, res, next) => {
  try {
    const { identifier, channel, purpose } = req.body;
    if (!identifier || !channel || !purpose)
      throw new AppError('identifier, channel and purpose are required', 400);
    if (!['phone', 'email'].includes(channel))
      throw new AppError('channel must be phone or email', 400);
    if (!['login', 'reset'].includes(purpose))
      throw new AppError('purpose must be login or reset', 400);

    // Verify user exists with this phone/email
    const query = channel === 'phone'
      ? { phone: identifier.replace(/\D/g, '') }
      : { email: identifier.toLowerCase() };

    const user = await User.findOne(query);
    if (!user) {
      // Don't reveal if user exists — generic message
      return res.json({ success: true, message: 'If an account exists, OTP has been sent.' });
    }

    // Check salon access before allowing OTP login
    if (SALON_ROLES.includes(user.role) && user.salonId) {
      const salon = await Salon.findById(user.salonId)
        .select('isActive isSuspended name subscriptionExpiry').lean();
      if (!salon || !salon.isActive)
        throw new AppError('Your salon account is no longer active.', 403);
      if (salon.isSuspended)
        throw new AppError(`Your salon has been suspended.`, 403);
      if (salon.subscriptionExpiry && new Date(salon.subscriptionExpiry) < new Date())
        throw new AppError('Your subscription has expired. Contact your administrator.', 403);
    }

    await createAndSendOTP(
      channel === 'phone' ? identifier.replace(/\D/g, '') : identifier.toLowerCase(),
      channel,
      purpose
    );

    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp-login
// Body: { identifier: '9876543210', channel: 'phone', otp: '123456' }
// Logs the user in if OTP is valid — returns token
// ─────────────────────────────────────────────────────────────────────────────
const verifyOTPLogin = async (req, res, next) => {
  try {
    const { identifier, channel, otp } = req.body;
    if (!identifier || !channel || !otp)
      throw new AppError('identifier, channel and otp are required', 400);

    const normalId = channel === 'phone'
      ? identifier.replace(/\D/g, '')
      : identifier.toLowerCase();

    const result = await verifyOTP(normalId, otp, 'login');
    if (!result.valid) throw new AppError(result.reason, 400);

    // Find user
    const query = channel === 'phone' ? { phone: normalId } : { email: normalId };
    const user  = await User.findOne(query).select('+refreshTokens');
    if (!user) throw new AppError('User not found', 404);
    if (!user.isActive) throw new AppError('Account deactivated.', 403);

    // Issue tokens
    const accessToken  = generateAccessToken(user._id, user.role, user.salonId, user.franchiseId);
    const refreshToken = generateRefreshToken(user._id, user.role, user.salonId, user.franchiseId);

    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password-otp
// Body: { identifier, channel, otp, newPassword }
// Verifies OTP then resets password
// ─────────────────────────────────────────────────────────────────────────────
const resetPasswordOTP = async (req, res, next) => {
  try {
    const { identifier, channel, otp, newPassword } = req.body;
    if (!identifier || !channel || !otp || !newPassword)
      throw new AppError('identifier, channel, otp and newPassword are required', 400);
    if (newPassword.length < 6)
      throw new AppError('Password must be at least 6 characters', 400);

    const normalId = channel === 'phone'
      ? identifier.replace(/\D/g, '')
      : identifier.toLowerCase();

    const result = await verifyOTP(normalId, otp, 'reset');
    if (!result.valid) throw new AppError(result.reason, 400);

    const query = channel === 'phone' ? { phone: normalId } : { email: normalId };
    const user  = await User.findOne(query);
    if (!user) throw new AppError('User not found', 404);

    // Use save() to trigger bcrypt pre-save hook
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login-phone
// Body: { phone, password }
// Allows login with phone number + password (alternative to email)
// ─────────────────────────────────────────────────────────────────────────────
const loginWithPhone = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) throw new AppError('Phone and password are required', 400);

    const normalPhone = phone.replace(/\D/g, '');
    const user = await User.findOne({ phone: normalPhone }).select('+password +refreshTokens');
    if (!user) throw new AppError('Invalid phone or password', 401);
    if (!user.isActive) throw new AppError('Account deactivated. Contact support.', 403);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid phone or password', 401);

    if (SALON_ROLES.includes(user.role)) {
      if (!user.salonId) throw new AppError('No salon assigned to this account.', 403);
      const salon = await Salon.findById(user.salonId)
        .select('isActive isSuspended suspendReason name subscriptionExpiry').lean();
      if (!salon || !salon.isActive) throw new AppError('Salon account is no longer active.', 403);
      if (salon.isSuspended) throw new AppError(`Salon has been suspended. ${salon.suspendReason || ''}`, 403);
      if (salon.subscriptionExpiry && new Date(salon.subscriptionExpiry) < new Date())
        throw new AppError(`Subscription expired on ${new Date(salon.subscriptionExpiry).toLocaleDateString('en-IN')}. Contact administrator.`, 403);
    }

    const accessToken  = generateAccessToken(user._id, user.role, user.salonId, user.franchiseId);
    const refreshToken = generateRefreshToken(user._id, user.role, user.salonId, user.franchiseId);
    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });
    setRefreshTokenCookie(res, refreshToken);

    res.json({ success: true, message: 'Login successful', accessToken, user: user.toSafeObject() });
  } catch (e) { next(e); }
};

module.exports = {
  register, login, loginWithPhone, logout, refreshAccessToken, getMe,
  sendOTP, verifyOTPLogin, resetPasswordOTP,
};
