// src/middlewares/tenant.middleware.js
// ─────────────────────────────────────────────────────────────────────────────
// Resolves which salon a request belongs to.
//
// Used by TWO types of routes:
//
//   1. Internal dashboard routes (admin / staff / receptionist)
//      The JWT already contains salonId → guardTenant() sets req.salonId.
//
//   2. Public booking website routes (/api/public/*)
//      No JWT. Salon is identified by:
//        a) X-Salon-Slug header  (e.g. "royalcuts")
//        b) Host subdomain       (e.g. royalcuts.yourplatform.com)
//        c) Custom domain match  (e.g. book.royalcuts.in)
//
// PLAN STRUCTURE:
//   Plan 1 — Basic Admin only. No public booking site.
//   Plan 2 — Admin + Public booking website + embed widget + custom domain.
//   Plan 3 — Everything + franchise multi-branch management.
// ─────────────────────────────────────────────────────────────────────────────
const Salon        = require('../models/Salon');
const { AppError } = require('./errorHandler');

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'yourplatform.com';

// ── Resolve Tenant ────────────────────────────────────────────────────────────
const resolveTenant = async (req, res, next) => {
  try {
    if (req.isSuperAdmin) return next();
    if (req.salonId) return next(); // already resolved by JWT

    const slugHeader = req.headers['x-salon-slug'];
    const host       = (req.headers['host'] || '').toLowerCase().split(':')[0];

    let salon = null;

    // a) Explicit slug header
    if (slugHeader) {
      salon = await Salon.findOne({ slug: slugHeader.toLowerCase(), isActive: true }).lean();
    }

    // b) Exact custom domain match
    if (!salon && host) {
      salon = await Salon.findOne({ customDomain: host, isActive: true }).lean();
    }

    // c) Subdomain — "royalcuts.yourplatform.com"
    if (!salon && host && host.endsWith(`.${PLATFORM_DOMAIN}`)) {
      const sub = host.replace(`.${PLATFORM_DOMAIN}`, '');
      if (sub && sub !== 'www' && sub !== 'api') {
        salon = await Salon.findOne({ slug: sub, isActive: true }).lean();
      }
    }

    if (!salon) {
      return next(new AppError('Salon not found. Check the URL or slug.', 404));
    }

    if (salon.isSuspended) {
      return next(new AppError('This salon account is currently suspended.', 403));
    }

    req.salonId     = salon._id.toString();
    req.franchiseId = salon.franchiseId ? salon.franchiseId.toString() : null;
    req.salonData   = salon;

    next();
  } catch (err) {
    next(err);
  }
};

// ── Plan Feature Map ──────────────────────────────────────────────────────────
//
// Plan 1 — Basic (Admin dashboard only, NO public booking)
// Plan 2 — Pro   (Admin + public booking site + embed widget + custom domain)
// Plan 3 — Franchise (Everything + multi-branch franchise management)
//
const PLAN_FEATURES = {
  plan1: [
    'adminDashboard',
    'inventory',
    'staffMgmt',
    'walkIns',
    'reports',
    'whatsapp',
    'invoices',
    // ❌ onlineBooking  — not available on Plan 1
    // ❌ customerWebsite — not available on Plan 1
    // ❌ customDomain   — not available on Plan 1
  ],
  plan2: [
    'adminDashboard',
    'inventory',
    'staffMgmt',
    'walkIns',
    'reports',
    'whatsapp',
    'invoices',
    'onlineBooking',    // ✅ Public booking page
    'customerWebsite',  // ✅ yourplatform.com/book/slug
    'customDomain',     // ✅ book.royalcuts.in
  ],
  plan3: [
    'adminDashboard',
    'inventory',
    'staffMgmt',
    'walkIns',
    'reports',
    'whatsapp',
    'invoices',
    'onlineBooking',
    'customerWebsite',
    'customDomain',
    'franchiseAccess',  // ✅ Multi-branch franchise management
  ],
};

// User-friendly upgrade messages per feature
const UPGRADE_MSG = {
  onlineBooking:   'Online customer booking requires Plan 2 (Pro). Please upgrade your plan.',
  customerWebsite: 'Public booking website requires Plan 2 (Pro). Please upgrade your plan.',
  customDomain:    'Custom domain support requires Plan 2 (Pro). Please upgrade your plan.',
  franchiseAccess: 'Franchise management requires Plan 3. Please upgrade your plan.',
};

// ── Plan Guard Middleware ──────────────────────────────────────────────────────
const planGuard = (feature) => async (req, res, next) => {
  try {
    if (req.isSuperAdmin) return next();

    let salon = req.salonData;
    if (!salon) {
      salon = await Salon.findById(req.salonId)
        .select('plan subscriptionExpiry isSuspended name')
        .lean();
    }

    if (!salon) return next(new AppError('Salon not found', 404));

    // Subscription expiry check
    if (salon.subscriptionExpiry && new Date(salon.subscriptionExpiry) < new Date()) {
      return next(new AppError(
        'Your subscription has expired. Please contact your administrator to renew.',
        403
      ));
    }

    const allowed = PLAN_FEATURES[salon.plan] || PLAN_FEATURES.plan1;

    if (!allowed.includes(feature)) {
      const msg = UPGRADE_MSG[feature] || `This feature requires a higher plan.`;
      return next(new AppError(msg, 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { resolveTenant, planGuard };