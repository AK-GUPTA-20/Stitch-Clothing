const jwt = require("jsonwebtoken");
const catchAsyncError = require("./catchAsyncError");
const ErrorHandler = require("./error");
const User = require("../models/User");

// Check if User is Authenticated
const isAuthenticated = catchAsyncError(async (req, res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7); // Remove "Bearer " prefix
  }

  if (!token) {
    token = req.cookies?.token;
  }

  if (!token) {
    return next(
      new ErrorHandler("Please login to access this resource.", 401)
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new ErrorHandler("User not found. Please login again.", 401)
      );
    }

    if (user.role === "seller") {
      const Seller = require("../models/Seller");
      const seller = await Seller.findOne({ userId: user._id });
      if (seller) {
        user.sellerId = seller._id;
      }
    }

    req.user = user;

    next();
  } catch (error) {
    return next(
      new ErrorHandler(
        "Invalid or expired token. Please login again.",
        401
      )
    );
  }
});

const optionalAuth = catchAsyncError(async (req, res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    token = req.cookies?.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.id);

    if (user) {
      if (user.role === "seller") {
        const Seller = require("../models/Seller");
        const seller = await Seller.findOne({ userId: user._id });
        if (seller) {
          user.sellerId = seller._id;
        }
      }
      req.user = user;
    }
  } catch (error) {
    // Ignore invalid/expired tokens for public endpoints.
  }

  next();
});

const isAdmin = catchAsyncError(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(
      new ErrorHandler(
        "Access denied. Admin privileges required.",
        403
      )
    );
  }

  next();
});

const isAuthorized = (roles) => {
  return catchAsyncError(async (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler("Please login to access this resource.", 401));
    }

    const rolesArray = Array.isArray(roles) ? roles : [roles];

    if (!rolesArray.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Access denied. This action requires ${rolesArray.join(" or ")} privileges.`,
          403
        )
      );
    }

    next();
  });
};

const isModerator = catchAsyncError(async (req, res, next) => {
  if (!req.user || (req.user.role !== "moderator" && req.user.role !== "admin")) {
    return next(
      new ErrorHandler(
        "Access denied. Moderator or Admin privileges required.",
        403
      )
    );
  }

  next();
});

module.exports = {
  isAuthenticated,
  optionalAuth,
  isAdmin,
  isAuthorized,
  isModerator,
};