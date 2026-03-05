const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

router.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    service: "Glamour Salon API",
    environment: process.env.NODE_ENV,
    database: states[dbState],
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;