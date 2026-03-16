const jwt = require('jsonwebtoken');

/**
 * generateAccessToken
 * Embeds userId, role, salonId and franchiseId so every downstream
 * middleware has tenant context without an extra DB lookup.
 *
 * @param {string|ObjectId} userId
 * @param {string}          role
 * @param {string|null}     salonId      - null for super_admin / franchise_owner
 * @param {string|null}     franchiseId  - null unless user is in a franchise
 */
const generateAccessToken = (userId, role, salonId = null, franchiseId = null) => {
  return jwt.sign(
    {
      userId:      userId.toString(),
      role,
      salonId:     salonId     ? salonId.toString()     : null,
      franchiseId: franchiseId ? franchiseId.toString() : null,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * generateRefreshToken
 * Carries the same tenant context so token rotation preserves salonId.
 */
const generateRefreshToken = (userId, role, salonId = null, franchiseId = null) => {
  return jwt.sign(
    {
      userId:      userId.toString(),
      role,
      salonId:     salonId     ? salonId.toString()     : null,
      franchiseId: franchiseId ? franchiseId.toString() : null,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/',
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path:     '/',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
