require("dotenv").config();
const app       = require("./src/app");
const connectDB = require("./src/config/db");
const logger    = require("./src/utils/logger");
console.log("Mongo URI exists:", !!process.env.MONGODB_URI);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`, { env: process.env.NODE_ENV, port: PORT });
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => { logger.error("UNHANDLED REJECTION", { error: err.message }); process.exit(1); });
process.on("uncaughtException",  (err) => { logger.error("UNCAUGHT EXCEPTION",  { error: err.message }); process.exit(1); });

startServer();
