const { verifyAccessToken } = require('../utils/token');
const { AppError } = require('./errorHandler');
const SalonSettings = require('../models/SalonSettings');

// ─────────────────────────────────────────────────────────────────────────────
// protect
// Validates the Bearer JWT and attaches decoded user context to req.user.
// Now also extracts salonId and franchiseId from the token payload.
// ─────────────────────────────────────────────────────────────────────────────
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access denied. No token provided.', 401);
    }

    const token   = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = {
      userId:      decoded.userId,
      role:        decoded.role,
      salonId:     decoded.salonId     || null,
      franchiseId: decoded.franchiseId || null,
    };

    // Convenience flag used by other middleware to skip tenant restrictions
    if (decoded.role === 'super_admin') {
      req.isSuperAdmin = true;
    }

    next();
  } catch (error) {
    console.error('Token error:', error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// authorize
// Role whitelist check. Usage: authorize('admin', 'receptionist')
// Unchanged from original — added new roles to the valid enum in User model.
// ─────────────────────────────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// guardTenant
// Ensures req.salonId is set for every route that needs it.
// - super_admin: passes through (they can access any salon via query params)
// - franchise_owner / franchise_manager: passes through (they specify salonId
//   via route param; cross-branch logic lives in franchise controllers)
// - admin / staff / receptionist / customer: must have salonId in their token
//
// After this runs, all controllers can safely use req.salonId.
// ─────────────────────────────────────────────────────────────────────────────
const guardTenant = (req, res, next) => {
  // Super admin bypasses tenant isolation entirely
  if (req.isSuperAdmin) return next();

  // Franchise roles access specific salons through explicit route params —
  // their controllers handle filtering themselves.
  if (
    req.user.role === 'franchise_owner' ||
    req.user.role === 'franchise_manager'
  ) {
    req.franchiseId = req.user.franchiseId;
    return next();
  }

  // All other roles must have a salonId in their token
  if (!req.user.salonId) {
    return next(new AppError('No salon assigned to this account. Contact your administrator.', 403));
  }

  req.salonId     = req.user.salonId;
  req.franchiseId = req.user.franchiseId || null;
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// checkPermission
// Dynamic permission check against the salon's SalonSettings.permissions map.
// Usage: router.get('/x', protect, checkPermission('canViewInventory'), handler)
//
// Updated in Phase 1 to look up settings by salonId (falls back to findOne()
// for the legacy single-salon document until migration is complete).
// ─────────────────────────────────────────────────────────────────────────────
const checkPermission = (permKey) => {
  return async (req, res, next) => {
    try {
      // Admin and super_admin always have all permissions
      if (req.user.role === 'admin' || req.isSuperAdmin) return next();

      // Build the query — use salonId if available, fall back to singleton
      const query = req.salonId ? { salonId: req.salonId } : {};
      const settings = await SalonSettings.findOne(query).lean();
      const rolePerms = settings?.permissions?.[req.user.role];

      if (!rolePerms || rolePerms[permKey] === false) {
        return next(new AppError(`Permission denied: ${permKey} is not enabled for your role`, 403));
      }
      next();
    } catch (e) {
      next(e);
    }
  };
};

module.exports = { protect, authorize, guardTenant, checkPermission };
