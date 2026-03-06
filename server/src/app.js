const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middlewares/errorHandler");
const healthRoutes = require("./routes/health.routes");

// ✅ Register all models explicitly to prevent MissingSchemaError
require("./models/User");
require("./models/Service");
require("./models/Booking");
require("./models/Coupon");
require("./models/Payment");
require("./models/Inventory");
require("./models/SalonSettings");
require("./models/Staff");
require("./models/Attendance");

const app = express();

// 1. IMPORT ALL ROUTES
const inventoryRoutes = require("./routes/inventory.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const couponRoutes = require("./routes/coupon.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const serviceRoutes = require("./routes/service.routes");
const bookingRoutes = require("./routes/booking.routes");
const staffRoutes = require("./routes/staff.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const paymentRoutes = require("./routes/payment.routes");
const settingsRoutes = require("./routes/settings.routes");
const analyticsRoutes = require("./routes/analytics.routes");

// 2. SECURITY & CORS
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

// 3. PARSING MIDDLEWARE
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
app.use("/api", limiter);

// 5. LOGGING
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 6. REGISTER ROUTES
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Glamour Salon API is live",
    env: process.env.NODE_ENV,
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/analytics", analyticsRoutes);

// PHASE 9 ROUTES
app.use("/api/inventory", inventoryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/coupons", couponRoutes);

// 7. 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// 8. GLOBAL ERROR HANDLER
app.use(errorHandler);

module.exports = app;