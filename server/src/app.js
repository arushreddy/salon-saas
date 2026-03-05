const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middlewares/errorHandler");
const healthRoutes = require("./routes/health.routes");

const app = express();

// --------------- SECURITY ---------------
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true, // Allow cookies (for refresh tokens)
  })
);

// --------------- RATE LIMITING ---------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
app.use("/api", limiter);

// --------------- PARSING ---------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --------------- LOGGING ---------------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// --------------- ROUTES ---------------
app.use("/api/health", healthRoutes);
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);
const userRoutes = require("./routes/user.routes");
app.use("/api/users", userRoutes);
const serviceRoutes = require("./routes/service.routes");
app.use("/api/services", serviceRoutes);
const bookingRoutes = require("./routes/booking.routes");
app.use("/api/bookings", bookingRoutes);
const staffRoutes = require("./routes/staff.routes");
const attendanceRoutes = require("./routes/attendance.routes");
app.use("/api/staff", staffRoutes);
app.use("/api/attendance", attendanceRoutes);
const paymentRoutes = require("./routes/payment.routes");
const settingsRoutes = require("./routes/settings.routes");
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes);
const analyticsRoutes = require("./routes/analytics.routes");
app.use("/api/analytics", analyticsRoutes);

// Future routes will be added here:
// app.use("/api/auth", authRoutes);
// app.use("/api/services", serviceRoutes);
// app.use("/api/bookings", bookingRoutes);
// etc.

// --------------- 404 HANDLER ---------------
app.use("*all", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// --------------- ERROR HANDLER ---------------
app.use(errorHandler);

module.exports = app;