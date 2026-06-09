const jwt = require("jsonwebtoken");
const asyncHandler = require("./asyncHandler");
const ErrorHandler = require("./error");
const User = require("../models/User");

// Helper to extract token and user
const getAuthUser = async (req) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7); // Remove "Bearer " prefix
  }

  if (!token) {
    token = req.cookies?.token;
  }

  if (!token) {
    return { token: null, user: null };
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.id);

  if (user && user.role === "seller") {
    const Seller = require("../models/Seller");
    const seller = await Seller.findOne({ userId: user._id });
    if (seller) {
      user.sellerId = seller._id;
    }
  }

  return { token, user };
};

// Check if User is Authenticated
const isAuthenticated = asyncHandler(async (req, res, next) => {
  try {
    const { token, user } = await getAuthUser(req);

    if (!token) {
      return next(
        new ErrorHandler("Please login to access this resource.", 401)
      );
    }

    if (!user) {
      return next(
        new ErrorHandler("User not found. Please login again.", 401)
      );
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

const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const { token, user } = await getAuthUser(req);
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Ignore invalid/expired tokens for public endpoints.
  }
  next();
});

const isAdmin = asyncHandler(async (req, res, next) => {
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
  return asyncHandler(async (req, res, next) => {
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

const isModerator = asyncHandler(async (req, res, next) => {
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

const isVerifiedSeller = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler("Please login to access this resource.", 401));
  }

  if (req.user.role === "admin") {
    return next();
  }
  
  if (req.user.role !== "seller") {
    return next(new ErrorHandler("Access denied. Seller privileges required.", 403));
  }

  const Seller = require("../models/Seller");
  const seller = await Seller.findOne({ userId: req.user._id });
  
  if (!seller || seller.verificationStatus !== "approved") {
    return next(new ErrorHandler("Access denied. Your seller account must be verified by an admin to perform this action.", 403));
  }
  
  next();
});

module.exports = {
  isAuthenticated,
  optionalAuth,
  isAdmin,
  isAuthorized,
  isModerator,
  isVerifiedSeller,
};