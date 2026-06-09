const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { errorMiddleware } = require("./middleware/error");
const { getCorsOptions } = require("./config/cors");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors(getCorsOptions()));
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login/register attempts from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Import Routes
const routes = require("./routes");
app.use("/api/v1", routes);


app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Stitch Backend API is running 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
