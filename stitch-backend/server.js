require("dotenv").config();
const { validateEnvironment } = require("./src/config/environment");
const http = require("http");
const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Validate environment variables
try {
  validateEnvironment();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { getCorsOptions } = require("./src/config/cors");

const fs = require("fs");
const https = require("https");

let server;
if (NODE_ENV === "production") {
  // Enforce HTTPS in production with TLS certificates
  // In a real environment, cert.pem and key.pem must be safely stored
  try {
    const privateKey = fs.readFileSync("/etc/ssl/private/key.pem", "utf8");
    const certificate = fs.readFileSync("/etc/ssl/certs/cert.pem", "utf8");
    const credentials = { key: privateKey, cert: certificate };
    server = https.createServer(credentials, app);
    console.log("🔒 HTTPS Server initialized for Production");
  } catch (err) {
    console.error("Failed to load TLS certificates. Falling back to HTTP.", err.message);
    server = http.createServer(app);
  }
} else {
  // Local development uses plain HTTP
  server = http.createServer(app);
  console.log("🔓 HTTP Server initialized for Development");
}
// GRACEFUL SHUTDOWN 

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("HTTP server closed");

    try {
      const mongoose = require("mongoose");
      await mongoose.connection.close();
      console.log("MongoDB connection closed");

      console.log("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// ERROR HANDLERS 

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// START SERVER 

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log("=====================================");
      console.log(`🚀 Server running in ${NODE_ENV} mode`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log("=====================================");
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();