require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Then start Express
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`, {
        env: process.env.NODE_ENV,
        port: PORT,
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION — shutting down", {
    error: err.message,
  });
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION — shutting down", {
    error: err.message,
  });
  process.exit(1);
});

startServer();