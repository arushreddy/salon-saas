const User = require('../models/User');
const { AppError } = require('../middlewares/errorHandler');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../utils/token');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email and password are required', 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'customer',
    });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken },
    });

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

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email, isActive: true }).select('+password +refreshTokens');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await User.findByIdAndUpdate(req.user?.userId, {
        $pull: { refreshTokens: refreshToken },
      });
    }

    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
      clearRefreshTokenCookie(res);
      throw new AppError('Token reuse detected. All sessions revoked.', 401);
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id, user.role);

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, logout, refreshAccessToken, getMe };