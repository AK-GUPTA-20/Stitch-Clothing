const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { errorMiddleware } = require("./middleware/error");
const { getCorsOptions } = require("./config/cors");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({
  crossOriginResourcePolicy: false, // Ensure statically served images are loadable by the frontend
}));
// mongo sanitize removed
app.use(cors(getCorsOptions()));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

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
