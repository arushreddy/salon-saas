const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const { errorHandler } = require('./middlewares/errorHandler');
const healthRoutes    = require('./routes/health.routes');
const franchiseRoutes = require('./routes/franchise.routes');

// ✅ Register all models explicitly to prevent MissingSchemaError
require('./models/User');
require('./models/Service');
require('./models/Booking');
require('./models/Coupon');
require('./models/Payment');
require('./models/Inventory');
require('./models/SalonSettings');
require('./models/Staff');
require('./models/Attendance');
require('./models/CashTransaction');
require('./models/ShiftReport');
require('./models/Salon');
require('./models/Franchise');
require('./models/Plan');
require('./models/SubscriptionPayment');
require('./models/OTP');

const app = express();

// 1. IMPORT ALL ROUTES
const inventoryRoutes       = require('./routes/inventory.routes');
const invoiceRoutes         = require('./routes/invoice.routes');
const couponRoutes          = require('./routes/coupon.routes');
const authRoutes            = require('./routes/auth.routes');
const userRoutes            = require('./routes/user.routes');
const serviceRoutes         = require('./routes/service.routes');
const bookingRoutes         = require('./routes/booking.routes');
const staffRoutes           = require('./routes/staff.routes');
const attendanceRoutes      = require('./routes/attendance.routes');
const paymentRoutes         = require('./routes/payment.routes');
const settingsRoutes        = require('./routes/settings.routes');
const analyticsRoutes       = require('./routes/analytics.routes');
const cashTransactionRoutes = require('./routes/cashTransaction.routes');
const superadminRoutes      = require('./routes/superadmin.routes');
const notificationRoutes    = require('./routes/notification.routes');
const publicRoutes          = require('./routes/public.routes');

// 2. SECURITY & CORS
app.use(helmet({ crossOriginEmbedderPolicy: false }));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://salon-saas-one.vercel.app',
  'https://salon-saas-git-main-spartan2.vercel.app',
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_2,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    const platformDomain = process.env.PLATFORM_DOMAIN || 'yourplatform.com';
    if (origin.endsWith(`.${platformDomain}`)) return cb(null, true);
    // Allow all vercel preview deployments for this project
    if (origin.includes('salon-saas') && origin.endsWith('.vercel.app')) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// 3. PARSING MIDDLEWARE
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. RATE LIMITING
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 1000,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use('/api',              generalLimiter);
app.use('/api/auth/login',   authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/public',       publicLimiter);

// 5. LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { skip: (req, res) => res.statusCode < 400 }));
}

// 6. REGISTER ROUTES
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Glamour Salon API is live', env: process.env.NODE_ENV });
});

app.use('/api/health',            healthRoutes);
app.use('/api/auth',              authRoutes);
app.use('/api/users',             userRoutes);
app.use('/api/services',          serviceRoutes);
app.use('/api/bookings',          bookingRoutes);
app.use('/api/staff',             staffRoutes);
app.use('/api/attendance',        attendanceRoutes);
app.use('/api/payments',          paymentRoutes);
app.use('/api/settings',          settingsRoutes);
app.use('/api/analytics',         analyticsRoutes);
app.use('/api/cash-transactions', cashTransactionRoutes);
app.use('/api/inventory',         inventoryRoutes);
app.use('/api/invoices',          invoiceRoutes);
app.use('/api/coupons',           couponRoutes);
app.use('/api/notifications',     notificationRoutes);
app.use('/api/superadmin',        superadminRoutes);
app.use('/api/franchise',         franchiseRoutes);
app.use('/api/public',            publicRoutes);

// 7. 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// 8. GLOBAL ERROR HANDLER
app.use(errorHandler);

module.exports = app;