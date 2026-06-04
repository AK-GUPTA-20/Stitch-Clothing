"use strict";

const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { addressSchema, imageSchema } = require("./shared");

const refreshTokenSchema = new Schema(
  {
    token      : { type: String, required: true },
    deviceId   : { type: String, trim: true },
    platform   : { type: String, enum: ["web", "android", "ios", "desktop"] },
    fcmToken   : { type: String },
    userAgent  : { type: String },
    ip         : { type: String },
    expiresAt  : { type: Date, required: true },
    isRevoked  : { type: Boolean, default: false },
    revokedAt  : { type: Date },
    createdAt  : { type: Date, default: Date.now },
  },
  { _id: true },
);

const otpSchema = new Schema(
  {
    code        : { type: String, select: false },
    hashedCode  : { type: String, select: false },
    purpose     : {
      type : String,
      enum : ["email_verify", "phone_verify", "password_reset", "login_2fa"],
    },
    deliveredTo : { type: String },
    expiresAt   : { type: Date },
    attempts    : { type: Number, default: 0, max: 5 },
    verified    : { type: Boolean, default: false },
    verifiedAt  : { type: Date },
  },
  { _id: false },
);

const pushTokenSchema = new Schema(
  {
    token     : { type: String, required: true },
    platform  : { type: String, enum: ["android", "ios", "web"] },
    deviceId  : { type: String },
    isActive  : { type: Boolean, default: true },
    updatedAt : { type: Date, default: Date.now },
  },
  { _id: true },
);

const walletTransactionSchema = new Schema(
  {
    type        : { type: String, required: true, enum: ["credit", "debit"] },
    amount      : { type: Number, required: true, min: 0 },
    balance     : { type: Number, required: true },
    source      : {
      type : String,
      enum : [
        "order_refund", "gift_card", "loyalty_redeem",
        "admin_credit", "cashback", "withdrawal", "order_payment",
        "referral_bonus",
      ],
    },
    referenceId : { type: String },
    description : { type: String, trim: true },
    createdAt   : { type: Date, default: Date.now },
  },
  { _id: true },
);

const loyaltyHistorySchema = new Schema(
  {
    type        : { type: String, required: true, enum: ["earn", "redeem", "expire", "adjust"] },
    points      : { type: Number, required: true },
    balance     : { type: Number, required: true },
    source      : {
      type : String,
      enum : [
        "purchase", "signup", "review", "referral",
        "birthday_bonus", "admin_credit", "redemption",
        "tier_upgrade_bonus",
      ],
    },
    referenceId : { type: String },
    description : { type: String, trim: true },
    expiresAt   : { type: Date },
    createdAt   : { type: Date, default: Date.now },
  },
  { _id: true },
);

const wishlistItemSchema = new Schema(
  {
    productId  : { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId  : { type: Schema.Types.ObjectId },
    addedAt    : { type: Date, default: Date.now },
    priceWhenAdded: { type: Number },
    notifyOnPriceDrop: { type: Boolean, default: false },
  },
  { _id: true },
);

const recentlyViewedSchema = new Schema(
  {
    productId : { type: Schema.Types.ObjectId, ref: "Product", required: true },
    viewedAt  : { type: Date, default: Date.now },
    duration  : { type: Number },
  },
  { _id: false },
);

const notificationSchema = new Schema(
  {
    type : {
      type     : String,
      required : true,
      enum     : [
        "order_update", "payment", "promotion", "review",
        "wishlist_alert", "price_drop", "system", "referral",
        "loyalty",
        "return_update",
      ],
    },
    title    : { type: String, required: true, trim: true },
    body     : { type: String, required: true, trim: true },
    imageUrl : { type: String },
    data     : {
      orderId     : { type: String },
      productId   : { type: Schema.Types.ObjectId },
      promotionId : { type: Schema.Types.ObjectId },
      actionUrl   : { type: String },
      deepLink    : { type: String },
    },
    channel   : { type: String, enum: ["push", "email", "sms", "in_app"] },
    isRead    : { type: Boolean, default: false },
    readAt    : { type: Date },
    createdAt : { type: Date, default: Date.now },
  },
  { _id: true },
);

const notifPrefChannelSchema = new Schema(
  {
    orderUpdates  : { type: Boolean, default: true },
    promotions    : { type: Boolean, default: true },
    newArrivals   : { type: Boolean, default: true },
    priceDrops    : { type: Boolean, default: true },
    reviews       : { type: Boolean, default: true },
    wishlistAlert : { type: Boolean, default: true },
    otp           : { type: Boolean, default: true },
    loyalty       : { type: Boolean, default: true },
    returnUpdates : { type: Boolean, default: true },
  },
  { _id: false },
);

const bodyMeasurementSchema = new Schema(
  {
    height   : { type: Number },
    weight   : { type: Number },
    chest    : { type: Number },
    waist    : { type: Number },
    hips     : { type: Number },
    inseam   : { type: Number },
    shoulder : { type: Number },
    neck     : { type: Number },
    sleeve   : { type: Number },
    unit     : { type: String, enum: ["cm", "in"], default: "cm" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const deletionRequestSchema = new Schema(
  {
    requestedAt   : { type: Date },
    reason        : { type: String },
    scheduledAt   : { type: Date },
    isCancelled   : { type: Boolean, default: false },
    cancelledAt   : { type: Date },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    firstName : { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    lastName  : { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email     : {
      type      : String,
      required  : true,
      unique    : true,
      lowercase : true,
      trim      : true,
      match     : [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone     : {
      type   : String,
      trim   : true,
      sparse : true,
      unique : true,
      match  : [/^\+?[1-9]\d{1,14}$/, "Invalid phone (E.164 format expected)"],
    },
    password  : { type: String, minlength: 8, select: false },
    avatar    : { type: String },
    gender    : { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    dob       : { type: Date },
    role      : { type: String, enum: ["user", "seller", "admin"], default: "user" },
    preferredLanguage : { type: String, default: "en", maxlength: 5 },
    preferredCurrency : { type: String, default: "INR", uppercase: true, maxlength: 3 },
    emailVerified    : { type: Boolean, default: false },
    phoneVerified    : { type: Boolean, default: false },
    isActive         : { type: Boolean, default: true },
    isSuspended      : { type: Boolean, default: false },
    suspensionReason : { type: String },
    suspendedAt      : { type: Date },
    suspendedBy      : { type: Schema.Types.ObjectId, ref: "User" },
    emailVerifyToken : { type: String, select: false },
    isEmailUnsubscribed: { type: Boolean, default: false },
    passwordChangedAt  : { type: Date },
    loginAttempts      : { type: Number, default: 0 },
    lockUntil          : { type: Date },
    twoFactorEnabled   : { type: Boolean, default: false },
    twoFactorSecret    : { type: String, select: false },
    refreshTokens : { type: [refreshTokenSchema], default: [] },
    otp           : { type: otpSchema },
    pushTokens    : { type: [pushTokenSchema], default: [] },
    googleId    : { type: String, sparse: true, select: false },
    facebookId  : { type: String, sparse: true, select: false },
    appleId     : { type: String, sparse: true, select: false },
    activeCartId : { type: Schema.Types.ObjectId },
    addresses : {
      type     : [addressSchema],
      default  : [],
      validate : [(v) => !v || v.length <= 10, "Max 10 addresses allowed"],
    },
    bodyMeasurements : { type: bodyMeasurementSchema, default: () => ({}) },
    walletBalance      : { type: Number, default: 0, min: 0 },
    walletTransactions : { type: [walletTransactionSchema], default: [] },
    loyaltyPoints  : { type: Number, default: 0, min: 0 },
    loyaltyTier    : {
      type    : String,
      enum    : ["bronze", "silver", "gold", "platinum"],
      default : "bronze",
    },
    loyaltyHistory : { type: [loyaltyHistorySchema], default: [] },
    referralCode   : { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    referredBy     : { type: Schema.Types.ObjectId, ref: "User" },
    referralCount  : { type: Number, default: 0 },
    wishlist : {
      type     : [wishlistItemSchema],
      default  : [],
      validate : [(v) => !v || v.length <= 200, "Max 200 wishlist items"],
    },
    searchHistory : {
      type    : [{ query: String, searchedAt: { type: Date, default: Date.now } }],
      default : [],
    },
    recentlyViewed : { type: [recentlyViewedSchema], default: [] },
    notifications    : { type: [notificationSchema], default: [] },
    unreadNotifCount : { type: Number, default: 0 },
    notificationPreferences : {
      email : { type: notifPrefChannelSchema, default: () => ({}) },
      push  : { type: notifPrefChannelSchema, default: () => ({}) },
      sms   : { type: notifPrefChannelSchema, default: () => ({}) },
    },
    deletionRequest : { type: deletionRequestSchema },
    deletedAt       : { type: Date },
    lastLoginAt  : { type: Date },
    lastLoginIp  : { type: String },
    lastActiveAt : { type: Date },
  },
  {
    timestamps : true,
    toJSON     : { virtuals: true },
    toObject   : { virtuals: true },
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   VIRTUALS
───────────────────────────────────────────────────────────────────────────── */
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual("isLocked").get(function () {             
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual("age").get(function () {                  
  if (!this.dob) return null;
  return Math.floor((Date.now() - this.dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

userSchema.virtual("orderCount")
  .get(function () {
    return this._orderCount || 0;
  })
  .set(function (val) {
    this._orderCount = val;
  });

/* ─────────────────────────────────────────────────────────────────────────────
   INSTANCE METHODS (stubs — implement in service layer or here)
───────────────────────────────────────────────────────────────────────────── */

/** Compare plain password against hashed password */
userSchema.methods.comparePassword = async function (plainPassword) {
  const bcrypt = require("bcryptjs");
  return bcrypt.compare(plainPassword, this.password);
};

/** Check if JWT issued before password change */
userSchema.methods.isJWTValid = function (jwtIssuedAt) {     
  if (!this.passwordChangedAt) return true;
  return jwtIssuedAt > Math.floor(this.passwordChangedAt.getTime() / 1000);
};

/** Increment login attempts — lock after 5 failed tries */
userSchema.methods.incLoginAttempts = async function () {    
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

/* ─────────────────────────────────────────────────────────────────────────────
   PRE-SAVE HOOKS
───────────────────────────────────────────────────────────────────────────── */

/** Hash password before saving */
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const bcrypt = require("bcryptjs");
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();                       
});

/** Auto-generate referral code on first save */
userSchema.pre("save", function () {                      
  if (!this.referralCode && this.isNew) {
    this.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
});

/** Cap arrays to prevent document bloat */
userSchema.pre("save", function () {                      
  if (this.notifications && this.notifications.length > 100)
    this.notifications = this.notifications.slice(-100);
  if (this.walletTransactions && this.walletTransactions.length > 200)
    this.walletTransactions = this.walletTransactions.slice(-200);
  if (this.loyaltyHistory && this.loyaltyHistory.length > 200)
    this.loyaltyHistory = this.loyaltyHistory.slice(-200);
  if (this.recentlyViewed && this.recentlyViewed.length > 50)
    this.recentlyViewed = this.recentlyViewed.slice(-50);
  if (this.searchHistory && this.searchHistory.length > 50)
    this.searchHistory = this.searchHistory.slice(-50);
});

/* ─────────────────────────────────────────────────────────────────────────────
   INDEXES
───────────────────────────────────────────────────────────────────────────── */
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, role: 1 });                             
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });                                   
userSchema.index({ "wishlist.productId": 1 });
userSchema.index({ deletedAt: 1 }, { sparse: true });                    

const User = model("User", userSchema);

module.exports = User;