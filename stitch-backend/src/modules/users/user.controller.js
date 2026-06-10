"use strict";

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../../models/User");
const Order = require("../../models/Order");
const mongoSanitize = require("express-mongo-sanitize");
const asyncHandler = require("../../middleware/asyncHandler");
const ErrorHandler = require("../../middleware/error");
const pick = require("../../utils/pick");
const sanitizeRegex = require("../../utils/sanitizeRegex");
const emailService = require("../../utils/emailService");


/** Sign a JWT access token */
const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE ,
  });

/** Sign a refresh token */
const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE,
  });

/** Helper to build the user response payload, including order count and seller info */
const buildUserResponse = async (user) => {
  let orderCount = 0;
  try {
    orderCount = await Order.countDocuments({ userId: user._id });
  } catch (err) {
    console.error("Error counting orders:", err.message);
  }

  const userData = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete userData.password;
  delete userData.refreshTokens;
  delete userData.twoFactorSecret;
  delete userData.otp;
  delete userData.emailVerifyToken;
  delete userData.googleId;
  delete userData.facebookId;
  delete userData.appleId;
  userData.orderCount = orderCount;

  if (user.role === "seller") {
    const Seller = require("../../models/Seller");
    const seller = await Seller.findOne({ userId: user._id });
    if (seller) {
      userData.sellerId = seller._id;
    }
  }

  return userData;
};

/** Set the access-token cookie and return tokens */
const sendTokenResponse = async (user, statusCode, res, refreshToken = null) => {
  const accessToken = signAccessToken(user._id);

  const cookieOptions = {
    httpOnly : true,
    secure   : process.env.NODE_ENV === "production",
    sameSite : "strict",
    expires  : new Date(Date.now() + 15 * 60 * 1000), // 15 min
  };

  res.cookie("token", accessToken, cookieOptions);

  const userData = await buildUserResponse(user);

  res.status(statusCode).json({
    success      : true,
    accessToken,
    ...(refreshToken && { refreshToken }),
    user         : userData,
  });
};

/** Build a safe user projection (never leak secrets) */
const SAFE_FIELDS =
  "-password -refreshTokens -twoFactorSecret -emailVerifyToken -googleId -facebookId -appleId";


//* Register (/api/v1/user/register)
exports.registerUser = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, phone, gender, dob, referralCode } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return next(new ErrorHandler("Please provide firstName, lastName, email, and password.", 400));
  }

  if (typeof email !== "string") {
    return next(new ErrorHandler("Invalid email format.", 400));
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return next(new ErrorHandler("Email is already registered.", 409));
  }

  // Resolve referrer
  let referredBy;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (referrer) referredBy = referrer._id;
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    gender,
    dob,
    referredBy,
  });

  if (referredBy) {
    await User.findByIdAndUpdate(referredBy, { $inc: { referralCount: 1 } });
  }

  const refreshToken = signRefreshToken(user._id);
  const deviceMeta   = _deviceMeta(req);

  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedCode = crypto.createHash("sha256").update(rawOtp).digest("hex");

  user.otp = {
    hashedCode,
    purpose: "email_verify",
    deliveredTo: user.email,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
  };

  user.refreshTokens.push({
    token     : refreshToken,
    expiresAt : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...deviceMeta,
  });
  await user.save({ validateBeforeSave: false });

  // Send OTP (rawOtp) to user.email via emailService
  await emailService.sendVerificationOTP(user.email, rawOtp);

  await sendTokenResponse(user, 201, res, refreshToken);
});



//* Login (/api/v1/user/login)
exports.loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please provide email and password.", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password +loginAttempts +lockUntil"
  );

  if (!user) {
    return next(new ErrorHandler("Invalid email or password.", 401));
  }

  if (user.isLocked) {
    return next(
      new ErrorHandler(
        "Account temporarily locked due to too many failed attempts. Try again after 2 hours.",
        423
      )
    );
  }

  if (user.isSuspended) {
    return next(
      new ErrorHandler(
        `Account suspended${user.suspensionReason ? `: ${user.suspensionReason}` : "."}`,
        403
      )
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    return next(new ErrorHandler("Invalid email or password.", 401));
  }

  // Reset failed attempts on success
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  // Update login metadata
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;

  const refreshToken = signRefreshToken(user._id);
  const deviceMeta   = _deviceMeta(req);

  // Prune expired tokens before adding new one
  user.refreshTokens = user.refreshTokens.filter(
    (t) => !t.isRevoked && t.expiresAt > new Date()
  );
  user.refreshTokens.push({
    token     : refreshToken,
    expiresAt : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...deviceMeta,
  });

  await user.save({ validateBeforeSave: false });

  await sendTokenResponse(user, 200, res, refreshToken);
});


//* Logout (/api/v1/user/logout)
exports.logoutUser = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { "refreshTokens.$[el].isRevoked": true, "refreshTokens.$[el].revokedAt": new Date() },
    }, {
      arrayFilters: [{ "el.token": refreshToken }],
    });
  }

  res.cookie("token", "", { expires: new Date(0), httpOnly: true });

  res.status(200).json({ success: true, message: "Logged out successfully." });
});


//* Logout from all devices (/api/v1/user/logout-all)
exports.logoutAllDevices = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      "refreshTokens.$[].isRevoked" : true,
      "refreshTokens.$[].revokedAt" : new Date(),
    },
  });

  res.cookie("token", "", { expires: new Date(0), httpOnly: true });

  res.status(200).json({ success: true, message: "Logged out from all devices." });
});


//* Refresh Token (/api/v1/user/refresh-token)
exports.refreshAccessToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new ErrorHandler("Refresh token is required.", 400));
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new ErrorHandler("Invalid or expired refresh token.", 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) return next(new ErrorHandler("User not found.", 401));

  const storedToken = user.refreshTokens.find(
    (t) => t.token === refreshToken && !t.isRevoked && t.expiresAt > new Date()
  );
  if (!storedToken) {
    return next(new ErrorHandler("Refresh token is invalid or has been revoked.", 401));
  }

  const newAccessToken = signAccessToken(user._id);

  res.cookie("token", newAccessToken, {
    httpOnly : true,
    secure   : process.env.NODE_ENV === "production",
    sameSite : "strict",
    expires  : new Date(Date.now() + 15 * 60 * 1000),
  });

  res.status(200).json({ success: true, accessToken: newAccessToken });
});

/* ─────────────────────────────────────────────────────────────────────────────
   EMAIL VERIFICATION
───────────────────────────────────────────────────────────────────────────── */


//* Send Email Verification (/api/v1/user/send-email-verification)
exports.sendEmailVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.emailVerified) {
    return next(new ErrorHandler("Email is already verified.", 400));
  }

  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedCode = crypto.createHash("sha256").update(rawOtp).digest("hex");

  user.otp = {
    hashedCode,
    purpose: "email_verify",
    deliveredTo: user.email,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
  };

  await user.save({ validateBeforeSave: false });

  // Send OTP to user.email via emailService
  await emailService.sendVerificationOTP(user.email, rawOtp);

  res.status(200).json({
    success : true,
    message : "Verification OTP sent. Please check your inbox.",
  });
});



//* Verify Email (/api/v1/user/verify-email)
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ErrorHandler("Please provide email and OTP.", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+otp.hashedCode +otp.purpose +otp.expiresAt +otp.attempts");

  if (!user || !user.otp || user.otp.purpose !== "email_verify") {
    return next(new ErrorHandler("Invalid or expired verification OTP.", 400));
  }

  if (user.otp.expiresAt < new Date()) {
    return next(new ErrorHandler("OTP has expired.", 400));
  }

  if (user.otp.attempts >= 5) {
    return next(new ErrorHandler("Too many OTP attempts. Please request a new one.", 429));
  }

  const hashedInput = crypto.createHash("sha256").update(String(otp)).digest("hex");
  if (user.otp.hashedCode !== hashedInput) {
    user.otp.attempts += 1;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler("Incorrect OTP.", 400));
  }

  user.emailVerified    = true;
  user.otp              = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Email verified successfully." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PASSWORD MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */


//* Forgot Password (/api/v1/user/forgot-password)
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Please provide an email.", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Generic message to prevent email enumeration
    return res.status(200).json({
      success : true,
      message : "If that email exists, a reset link has been sent.",
    });
  }

  const rawOtp  = crypto.randomInt(100000, 1000000).toString();
  const hashed  = crypto.createHash("sha256").update(rawOtp).digest("hex");

  user.otp = {
    hashedCode  : hashed,
    purpose     : "password_reset",
    deliveredTo : user.email,
    expiresAt   : new Date(Date.now() + 10 * 60 * 1000), // 10 min
    attempts    : 0,
    verified    : false,
  };
  await user.save({ validateBeforeSave: false });

  // Send password reset email
  await emailService.sendPasswordResetOTP(user.email, rawOtp);

  res.status(200).json({
    success : true,
    message : "If that email exists, a reset link has been sent.",
  });
});


//* Reset Password (/api/v1/user/reset-password)
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return next(new ErrorHandler("Please provide email, otp, and newPassword.", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+otp.hashedCode +otp.purpose +otp.verified +otp.expiresAt +otp.attempts");

  if (
    !user ||
    !user.otp ||
    user.otp.purpose !== "password_reset" ||
    user.otp.verified ||
    user.otp.expiresAt < new Date()
  ) {
    return next(new ErrorHandler("OTP is invalid or has expired.", 400));
  }

  if (user.otp.attempts >= 5) {
    return next(new ErrorHandler("Too many OTP attempts. Please request a new one.", 429));
  }

  const hashedInput = crypto.createHash("sha256").update(String(otp)).digest("hex");
  if (hashedInput !== user.otp.hashedCode) {
    user.otp.attempts += 1;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler("Incorrect OTP.", 400));
  }

  // Mark OTP as used to prevent replay attacks before clearing
  user.otp.verified = true;

  user.password           = newPassword;
  user.otp                = undefined;
  user.loginAttempts      = 0;
  user.lockUntil          = undefined;
  // Invalidate all refresh tokens safely
  user.refreshTokens.forEach((t) => {
    t.isRevoked = true;
    t.revokedAt = new Date();
  });

  await user.save();

  res.status(200).json({ success: true, message: "Password reset successfully. Please login." });
});



//* Change Password (/api/v1/user/change-password)
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler("Please provide current and new passwords.", 400));
  }

  if (currentPassword === newPassword) {
    return next(new ErrorHandler("New password must differ from the current password.", 400));
  }

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorHandler("Current password is incorrect.", 401));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: "Password changed successfully." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PROFILE — GET / UPDATE / AVATAR
───────────────────────────────────────────────────────────────────────────── */

//* Get My Profile (/api/v1/user/me)
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select(SAFE_FIELDS);

  const userData = await buildUserResponse(user);

  res.status(200).json({ success: true, user: userData });
});


//* Update My Profile (/api/v1/user/me)
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const ALLOWED = [
    "firstName", "lastName", "phone", "gender", "dob",
    "preferredLanguage", "preferredCurrency", "avatar",
  ];

  const updates = pick(req.body, ALLOWED);

  if (Object.keys(updates).length === 0) {
    return next(new ErrorHandler("No valid fields provided for update.", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select(SAFE_FIELDS);

  const userData = await buildUserResponse(user);

  res.status(200).json({ success: true, user: userData });
});

//* Update Avatar (/api/v1/user/me/avatar)
exports.updateAvatar = asyncHandler(async (req, res, next) => {
  const { avatarUrl } = req.body;

  if (!avatarUrl) {
    return next(new ErrorHandler("Avatar URL is required.", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatarUrl } },
    { new: true }
  ).select(SAFE_FIELDS);

  res.status(200).json({ success: true, user });
});


//* Update Body Measurements (/api/v1/user/me/measurements)
exports.updateBodyMeasurements = asyncHandler(async (req, res, next) => {
  const ALLOWED = ["height", "weight", "chest", "waist", "hips", "inseam", "shoulder", "neck", "sleeve", "unit"];
  const updates = { bodyMeasurements: { ...pick(req.body, ALLOWED), updatedAt: new Date() } };

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("bodyMeasurements");

  res.status(200).json({ success: true, bodyMeasurements: user.bodyMeasurements });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADDRESSES
───────────────────────────────────────────────────────────────────────────── */

//* get Address (/api/v1/user/addresses)
exports.getAddresses = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("addresses");
  res.status(200).json({ success: true, addresses: user.addresses || [] });
});



//* Add Address (/api/v1/user/addresses)
exports.addAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("addresses");

  if (!user.addresses) {
    user.addresses = [];
  }

  if (user.addresses.length >= 10) {
    return next(new ErrorHandler("Maximum of 10 addresses allowed.", 400));
  }

  const ALLOWED_ADDRESS_FIELDS = ["street", "city", "state", "zipCode", "country", "phone", "isDefault", "label", "landmark", "addressLine2"];
  user.addresses.push(pick(req.body, ALLOWED_ADDRESS_FIELDS));
  await user.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, addresses: user.addresses });
});


//* Update Address (/api/v1/user/addresses/:addressId)
exports.updateAddress = asyncHandler(async (req, res, next) => {
  const user    = await User.findById(req.user._id).select("addresses");
  
  if (!user.addresses) {
    user.addresses = [];
  }
  
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    return next(new ErrorHandler("Address not found.", 404));
  }

  const ALLOWED_ADDRESS_FIELDS = ["street", "city", "state", "zipCode", "country", "phone", "isDefault", "label", "landmark", "addressLine2"];
  Object.assign(address, pick(req.body, ALLOWED_ADDRESS_FIELDS));
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, addresses: user.addresses });
});


//* Delete Address (/api/v1/user/addresses/:addressId)
exports.deleteAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { addresses: { _id: req.params.addressId } } },
    { new: true }
  ).select("addresses");

  res.status(200).json({ success: true, addresses: user.addresses });
});

/* ─────────────────────────────────────────────────────────────────────────────
   WISHLIST
───────────────────────────────────────────────────────────────────────────── */

//* get Wishlist (/api/v1/user/wishlist)
exports.getWishlist = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .select("wishlist")
    .populate("wishlist.productId", "name price images slug");

  res.status(200).json({ success: true, wishlist: user.wishlist });
});


//* Add to Wishlist (/api/v1/user/wishlist or /api/v1/user/wishlist/:productId)
exports.addToWishlist = asyncHandler(async (req, res, next) => {
  const productId = req.params.productId || req.body.productId;
  const { variantId, priceWhenAdded, notifyOnPriceDrop } = req.body;

  if (!productId) {
    return next(new ErrorHandler("Product ID is required.", 400));
  }

  const user = await User.findById(req.user._id).select("wishlist");

  if (user.wishlist.length >= 200) {
    return next(new ErrorHandler("Wishlist limit of 200 items reached.", 400));
  }

  const exists = user.wishlist.some((w) => w.productId && w.productId.toString() === productId.toString());
  if (exists) {
    return next(new ErrorHandler("Product already in wishlist.", 409));
  }

  user.wishlist.push({ productId, variantId, priceWhenAdded, notifyOnPriceDrop });
  await user.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, wishlist: user.wishlist });
});


//* Remove from Wishlist (/api/v1/user/wishlist/:productId)
exports.removeFromWishlist = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { wishlist: { productId: req.params.productId } } },
    { new: true }
  ).select("wishlist");

  res.status(200).json({ success: true, wishlist: user.wishlist });
});


//* Clear Wishlist (/api/v1/user/wishlist)
exports.clearWishlist = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { wishlist: [] } });
  res.status(200).json({ success: true, message: "Wishlist cleared." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATIONS
───────────────────────────────────────────────────────────────────────────── */

//* get Notifications (/api/v1/user/notifications)
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user._id).select("notifications unreadNotifCount");

  let notifs = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
  if (unreadOnly === "true") notifs = notifs.filter((n) => !n.isRead);

  res.status(200).json({
    success          : true,
    unreadCount      : user.unreadNotifCount,
    total            : notifs.length,
    notifications    : notifs.slice(skip, skip + Number(limit)),
  });
});


//* Mark Notification as Read (/api/v1/user/notifications/:notifId/read)
exports.markNotificationRead = asyncHandler(async (req, res, next) => {
  // Only decrement the counter if the notification was previously unread
  const result = await User.findOneAndUpdate(
    { _id: req.user._id, "notifications._id": req.params.notifId, "notifications.isRead": false },
    {
      $set : {
        "notifications.$.isRead" : true,
        "notifications.$.readAt" : new Date(),
      },
      $inc : { unreadNotifCount: -1 },
    }
  );

  // If no document was matched (notification was already read), update only isRead/readAt
  if (!result) {
    await User.findOneAndUpdate(
      { _id: req.user._id, "notifications._id": req.params.notifId },
      {
        $set: {
          "notifications.$.isRead": true,
          "notifications.$.readAt": new Date(),
        },
      }
    );
  }

  res.status(200).json({ success: true, message: "Notification marked as read." });
});


//* Mark All Notifications as Read (/api/v1/user/notifications/read-all)
exports.markAllNotificationsRead = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set : {
      "notifications.$[el].isRead" : true,
      "notifications.$[el].readAt" : new Date(),
      unreadNotifCount             : 0,
    },
  }, { arrayFilters: [{ "el.isRead": false }] });

  res.status(200).json({ success: true, message: "All notifications marked as read." });
});


//* Delete Notification (/api/v1/user/notifications/:notifId)
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { notifications: { _id: req.params.notifId } },
  });

  res.status(200).json({ success: true, message: "Notification deleted." });
});


//* Update Notification Preferences (/api/v1/user/notification-preferences)
exports.updateNotificationPreferences = asyncHandler(async (req, res, next) => {
  const { email, push, sms } = req.body;
  const updates = {};

  if (email) updates["notificationPreferences.email"] = email;
  if (push)  updates["notificationPreferences.push"]  = push;
  if (sms)   updates["notificationPreferences.sms"]   = sms;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("notificationPreferences");

  res.status(200).json({ success: true, notificationPreferences: user.notificationPreferences });
});

/* ─────────────────────────────────────────────────────────────────────────────
   WALLET
───────────────────────────────────────────────────────────────────────────── */

//* get Wallet (/api/v1/user/wallet)
exports.getWallet = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user._id).select("walletBalance walletTransactions");

  const transactions = [...user.walletTransactions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + Number(limit))
    .map((transaction) => ({
      ...(transaction.toObject ? transaction.toObject() : transaction),
      balanceAfter: transaction.balance,
    }));

  res.status(200).json({
    success      : true,
    balance      : user.walletBalance,
    total        : user.walletTransactions.length,
    transactions,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   LOYALTY
───────────────────────────────────────────────────────────────────────────── */

//* get Loyalty Info (/api/v1/user/loyalty)
exports.getLoyalty = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user._id).select(
    "loyaltyPoints loyaltyTier loyaltyHistory"
  );

  const history = [...user.loyaltyHistory]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + Number(limit));

  res.status(200).json({
    success : true,
    points  : user.loyaltyPoints,
    tier    : user.loyaltyTier,
    total   : user.loyaltyHistory.length,
    history,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   SEARCH & RECENTLY VIEWED
───────────────────────────────────────────────────────────────────────────── */

//* get Search History (/api/v1/user/search-history)
exports.getSearchHistory = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("searchHistory");
  res.status(200).json({ success: true, searchHistory: user.searchHistory });
});


//* Clear Search History (/api/v1/user/search-history)
exports.clearSearchHistory = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { searchHistory: [] } });
  res.status(200).json({ success: true, message: "Search history cleared." });
});


//* get Recently Viewed Products (/api/v1/user/recently-viewed)
exports.getRecentlyViewed = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .select("recentlyViewed")
    .populate("recentlyViewed.productId", "name price images slug");

  res.status(200).json({ success: true, recentlyViewed: user.recentlyViewed });
});


//* add Recently Viewed Product (/api/v1/user/recently-viewed)
exports.addRecentlyViewed = asyncHandler(async (req, res, next) => {
  const { productId, duration } = req.body;

  // Remove existing entry for this product to re-insert at end (dedup)
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { recentlyViewed: { productId } },
  });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { recentlyViewed: { productId, duration, viewedAt: new Date() } },
  });

  res.status(200).json({ success: true, message: "Added to recently viewed." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   REFERRAL
───────────────────────────────────────────────────────────────────────────── */

//* get Referral Info (/api/v1/user/referral)
exports.getReferralInfo = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("referralCode referralCount referredBy");

  res.status(200).json({
    success       : true,
    referralCode  : user.referralCode,
    referralCount : user.referralCount,
    referredBy    : user.referredBy,
    referralLink  : `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ACCOUNT DELETION
───────────────────────────────────────────────────────────────────────────── */

//* Request Account Deletion (/api/v1/user/request-deletion)
exports.requestAccountDeletion = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      deletionRequest: {
        requestedAt : new Date(),
        reason,
        scheduledAt,
        isCancelled : false,
      },
    },
  });

  res.status(200).json({
    success     : true,
    message     : "Account deletion scheduled.",
    scheduledAt,
  });
});


//* Cancel Account Deletion (/api/v1/user/cancel-deletion)
exports.cancelAccountDeletion = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("deletionRequest");

  if (!user.deletionRequest || user.deletionRequest.isCancelled) {
    return next(new ErrorHandler("No active deletion request found.", 400));
  }

  user.deletionRequest.isCancelled = true;
  user.deletionRequest.cancelledAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Account deletion request cancelled." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUSH TOKENS
───────────────────────────────────────────────────────────────────────────── */

//* Register Push Token (/api/v1/user/push-token)
exports.registerPushToken = asyncHandler(async (req, res, next) => {
  const { token, platform, deviceId } = req.body;

  if (!token) return next(new ErrorHandler("Push token is required.", 400));

  // Deactivate old tokens for same device
  await User.findByIdAndUpdate(req.user._id, {
    $set: { "pushTokens.$[el].isActive": false },
  }, { arrayFilters: [{ "el.deviceId": deviceId }] });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { pushTokens: { token, platform, deviceId, isActive: true, updatedAt: new Date() } },
  });

  res.status(200).json({ success: true, message: "Push token registered." });
});


//* deregister Push Token (/api/v1/user/push-token/:token)
exports.deregisterPushToken = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { pushTokens: { token: req.params.token } },
  });

  res.status(200).json({ success: true, message: "Push token removed." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — USER MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */

//* get  /api/v1/admin/users
exports.adminGetAllUsers = asyncHandler(async (req, res, next) => {
  const {
    page = 1, limit = 20, role, isActive, isSuspended,
    search, sortBy = "createdAt", order = "desc",
  } = req.query;

  const filter = { deletedAt: null };
  if (role)        filter.role        = role;
  if (isActive)    filter.isActive    = isActive === "true";
  if (isSuspended) filter.isSuspended = isSuspended === "true";

  if (search) {
    const safeSearch = sanitizeRegex(search);
    const regex = new RegExp(safeSearch, "i");
    filter.$or  = [{ email: regex }, { firstName: regex }, { lastName: regex }, { phone: regex }];
  }

  const skip  = (page - 1) * limit;
  const sort  = { [sortBy]: order === "desc" ? -1 : 1 };

  const [users, total, activeTotal, suspendedTotal] = await Promise.all([
    User.find(filter).select(SAFE_FIELDS).sort(sort).skip(skip).limit(Number(limit)),
    User.countDocuments(mongoSanitize.sanitize(filter)),
    User.countDocuments({ deletedAt: null, isActive: true, isSuspended: false }),
    User.countDocuments({ deletedAt: null, isSuspended: true })
  ]);

  res.status(200).json({
    success : true,
    total,
    activeTotal,
    suspendedTotal,
    page    : Number(page),
    pages   : Math.ceil(total / limit),
    users,
  });
});

//* getbyid /api/v1/admin/users/:id
exports.adminGetUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select(SAFE_FIELDS);

  if (!user) return next(new ErrorHandler("User not found.", 404));

  res.status(200).json({ success: true, user });
});


//* updateUser /api/v1/admin/users/:id
exports.adminUpdateUser = asyncHandler(async (req, res, next) => {
  const ALLOWED_ADMIN_FIELDS = ["firstName", "lastName", "email", "phone", "role", "isActive", "isSuspended"];
  const updates = pick(req.body, ALLOWED_ADMIN_FIELDS);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select(SAFE_FIELDS);

  if (!user) return next(new ErrorHandler("User not found.", 404));

  res.status(200).json({ success: true, user });
});


//* Suspend User (/api/v1/admin/users/:id/suspend)
exports.adminSuspendUser = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isSuspended     : true,
        suspensionReason: reason,
        suspendedAt     : new Date(),
        suspendedBy     : req.user._id,
      },
    },
    { new: true }
  ).select(SAFE_FIELDS);

  if (!user) return next(new ErrorHandler("User not found.", 404));

  res.status(200).json({ success: true, message: "User suspended.", user });
});



//* unsuspend User(/api/v1/admin/users/:id/unsuspend)
exports.adminUnsuspendUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set  : { isSuspended: false },
      $unset: { suspensionReason: 1, suspendedAt: 1, suspendedBy: 1 },
    },
    { new: true }
  ).select(SAFE_FIELDS);

  if (!user) return next(new ErrorHandler("User not found.", 404));

  res.status(200).json({ success: true, message: "User unsuspended.", user });
});


//* delete User (/api/v1/admin/users/:id)
exports.adminDeleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found.", 404));

  if (req.query.hard === "true") {
    await user.deleteOne();
    return res.status(200).json({ success: true, message: "User permanently deleted." });
  }

  user.deletedAt  = new Date();
  user.isActive   = false;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "User soft-deleted." });
});

//* Adjust Wallet (/api/v1/admin/users/:id/wallet)
exports.adminAdjustWallet = asyncHandler(async (req, res, next) => {
  const { type, amount, description } = req.body;

  if (!["credit", "debit"].includes(type)) {
    return next(new ErrorHandler("Type must be 'credit' or 'debit'.", 400));
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return next(new ErrorHandler("Please provide a valid positive amount.", 400));
  }

  const user = await User.findById(req.params.id).select("walletBalance walletTransactions");
  if (!user) return next(new ErrorHandler("User not found.", 404));

  if (type === "debit" && user.walletBalance < parsedAmount) {
    return next(new ErrorHandler("Insufficient wallet balance.", 400));
  }

  const newBalance = type === "credit"
    ? user.walletBalance + parsedAmount
    : user.walletBalance - parsedAmount;

  user.walletBalance = newBalance;
  user.walletTransactions.push({
    type,
    amount: parsedAmount,
    balance     : newBalance,
    source      : "admin_credit",
    description,
  });

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success    : true,
    message    : "Wallet adjusted.",
    newBalance,
  });
});

//* Adjust Loyalty Points (/api/v1/admin/users/:id/loyalty)
exports.adminAdjustLoyalty = asyncHandler(async (req, res, next) => {
  const { type, points, description } = req.body;

  if (!["earn", "redeem", "adjust"].includes(type)) {
    return next(new ErrorHandler("Type must be 'earn', 'redeem', or 'adjust'.", 400));
  }

  const parsedPoints = Number(points);
  if (isNaN(parsedPoints)) {
    return next(new ErrorHandler("Please provide a valid points amount.", 400));
  }
  if (parsedPoints <= 0 && type !== "adjust") {
    return next(new ErrorHandler("Points must be positive for earn/redeem.", 400));
  }

  const user = await User.findById(req.params.id).select("loyaltyPoints loyaltyTier loyaltyHistory");
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const newBalance =
    type === "redeem" ? user.loyaltyPoints - parsedPoints : user.loyaltyPoints + parsedPoints;

  if (newBalance < 0) {
    return next(new ErrorHandler("Insufficient loyalty points.", 400));
  }

  user.loyaltyPoints = newBalance;
  user.loyaltyHistory.push({
    type,
    points: parsedPoints,
    balance     : newBalance,
    source      : "admin_credit",
    description,
  });

  // Tier upgrade logic
  user.loyaltyTier = _resolveTier(newBalance);

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success    : true,
    message    : "Loyalty points adjusted.",
    newBalance,
    newTier    : user.loyaltyTier,
  });
});


//* Verify Email by Token (/api/v1/user/verify-email/:token)
exports.verifyEmailByToken = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  if (typeof token !== "string") {
    return next(new ErrorHandler("Invalid token format.", 400));
  }
  const user = await User.findOne({ emailVerifyToken: token });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired verification token.", 400));
  }

  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Email verified successfully." });
});


//* Get single notification by ID (/api/v1/user/notifications/:notifId)
exports.getNotificationById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("notifications");
  const notification = user.notifications.id(req.params.notifId);

  if (!notification) {
    return next(new ErrorHandler("Notification not found.", 404));
  }

  res.status(200).json({ success: true, data: notification });
});


/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE HELPERS
───────────────────────────────────────────────────────────────────────────── */

function _deviceMeta(req) {
  return {
    userAgent : req.headers["user-agent"],
    ip        : req.ip,
    platform  : _guessPlatform(req.headers["user-agent"]),
  };
}

function _guessPlatform(ua = "") {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad/i.test(ua)) return "ios";
  return "web";
}

function _resolveTier(points) {
  if (points >= 10000) return "platinum";
  if (points >= 5000)  return "gold";
  if (points >= 1000)  return "silver";
  return "bronze";
}