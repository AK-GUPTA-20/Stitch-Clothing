"use strict";

const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const usageLogSchema = new Schema(
  {
    userId         : { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId        : { type: String },
    discountAmount : { type: Number, default: 0 },
    usedAt         : { type: Date, default: Date.now },
  },
  { _id: true },
);

const bulkCodeSchema = new Schema(
  {
    code       : { type: String, required: true, uppercase: true },
    isUsed     : { type: Boolean, default: false },
    usedBy     : { type: Schema.Types.ObjectId, ref: "User" },
    usedAt     : { type: Date },
    usedInOrderId: { type: String },
  },
  { _id: true },
);

const flashProductSchema = new Schema(
  {
    productId       : { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId       : { type: Schema.Types.ObjectId },
    name            : { type: String },
    image           : { type: String },
    originalPrice   : { type: Number, required: true },
    salePrice       : { type: Number, required: true },
    discountPercent : { type: Number },
    maxQtyPerUser   : { type: Number, default: 2 },
    totalStock      : { type: Number, required: true },
    soldCount       : { type: Number, default: 0 },
    reservedCount   : { type: Number, default: 0 },
  },
  { _id: true },
);

const giftCardUsageSchema = new Schema(
  {
    orderId    : { type: String },
    amountUsed : { type: Number },
    balance    : { type: Number },
    usedAt     : { type: Date, default: Date.now },
  },
  { _id: true },
);

const promotionSchema = new Schema(
  {
    type : {
      type     : String,
      enum     : ["coupon", "flash_sale", "gift_card"],
      required : true,
    },
    name        : { type: String, required: true, trim: true },
    description : { type: String, trim: true },
    bannerUrl   : { type: String },
    isActive    : { type: Boolean, default: true },
    startDate   : { type: Date, required: true },
    endDate     : { type: Date },
    createdBy   : { type: Schema.Types.ObjectId, ref: "User" },
    code : {
      type      : String,
      uppercase : true,
      trim      : true,
      sparse    : true,
      match     : [/^[A-Z0-9]{4,20}$/, "Code must be 4–20 alphanumeric chars"],
    },
    discountType : {
      type : String,
      enum : ["percentage", "flat", "free_shipping", "buy_x_get_y"],
    },
    discountValue       : { type: Number, min: 0 },
    maxDiscountAmount   : { type: Number, min: 0 },
    minOrderValue       : { type: Number, default: 0, min: 0 },
    minItemCount        : { type: Number, default: 1, min: 1 },
    usageLimit          : { type: Number },
    usageCount          : { type: Number, default: 0 },
    perUserLimit        : { type: Number, default: 1 },
    applicableCategories: [{ type: Schema.Types.ObjectId }],
    applicableProducts  : [{ type: Schema.Types.ObjectId, ref: "Product" }],
    excludedProducts    : [{ type: Schema.Types.ObjectId, ref: "Product" }],
    isFirstOrderOnly    : { type: Boolean, default: false },
    isNewUserOnly       : { type: Boolean, default: false },
    isFreeShipping      : { type: Boolean, default: false },
    buyXGetY : {
      buyQuantity  : { type: Number },
      getQuantity  : { type: Number },
      getProductId : { type: Schema.Types.ObjectId },
    },
    usageLog  : { type: [usageLogSchema], default: [] },
    bulkCodes : { type: [bulkCodeSchema], default: [] },
    flashProducts      : { type: [flashProductSchema], default: [] },
    registeredUsers    : [{ type: Schema.Types.ObjectId, ref: "User" }],
    notificationSent   : { type: Boolean, default: false },
    maxOrdersPerUser   : { type: Number, default: 1 },
    giftCardCode      : { type: String, uppercase: true, sparse: true },
    initialBalance    : { type: Number, min: 0 },
    currentBalance    : { type: Number, min: 0 },
    purchasedBy       : { type: Schema.Types.ObjectId, ref: "User" },
    purchasedFor      : { type: Schema.Types.ObjectId, ref: "User" },
    recipientEmail    : { type: String, lowercase: true },
    recipientName     : { type: String },
    personalMessage   : { type: String, maxlength: 300 },
    isRedeemed        : { type: Boolean, default: false },
    redeemedAt        : { type: Date },
    redeemedInOrderId : { type: String },
    giftCardExpiresAt : { type: Date },
    giftCardUsageLog  : { type: [giftCardUsageSchema], default: [] },
  },
  {
    timestamps : true,
    toJSON     : { virtuals: true },
    toObject   : { virtuals: true },
  },
);

promotionSchema.virtual("isExpired").get(function () {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
});

promotionSchema.virtual("isUsageLimitReached").get(function () {
  if (!this.usageLimit) return false;
  return this.usageCount >= this.usageLimit;
});

promotionSchema.index({ type: 1 });
promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
promotionSchema.index({ "usageLog.userId": 1 });

const Promotion = model("Promotion", promotionSchema);

module.exports = Promotion;