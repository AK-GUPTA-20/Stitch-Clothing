"use strict";

const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { addressSchema, statusHistorySchema } = require("./shared");

const orderItemSchema = new Schema(
  {
    productId   : { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId   : { type: Schema.Types.ObjectId, required: true },
    sellerId    : { type: Schema.Types.ObjectId, ref: "Seller" },
    name        : { type: String, required: true },
    slug        : { type: String },
    sku         : { type: String, required: true },
    image       : { type: String },
    color       : { name: { type: String }, hexCode: { type: String } },
    size        : { label: { type: String }, value: { type: String } },
    fabric      : { type: String },
    hsn         : { type: String },
    quantity       : { type: Number, required: true, min: 1 },
    unitPrice      : { type: Number, required: true, min: 0 },
    comparePrice   : { type: Number },
    taxRate        : { type: Number, default: 0 },
    taxAmount      : { type: Number, default: 0 },
    discountAmount : { type: Number, default: 0 },
    subtotal       : { type: Number, required: true, min: 0 },
    isReturnable      : { type: Boolean, default: true },
    returnWindowDays  : { type: Number, default: 7 },
    isExchangeable    : { type: Boolean, default: true },
    customisations : [{ type: { type: String }, value: { type: String }, charge: { type: Number } }],
    status       : {
      type    : String,
      enum    : ["active", "cancelled", "returned", "exchanged", "refunded"],
      default : "active",
    },
    cancelledQty : { type: Number, default: 0 },
    returnedQty  : { type: Number, default: 0 },
    isReviewed   : { type: Boolean, default: false },
  },
  { 
    _id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);

orderItemSchema.virtual("productName").get(function () {
  return this.name;
});

orderItemSchema.virtual("productImage").get(function () {
  return this.image;
});

orderItemSchema.virtual("productSlug").get(function () {
  return this.slug;
});

orderItemSchema.virtual("totalPrice").get(function () {
  return this.subtotal;
});

orderItemSchema.virtual("variant").get(function () {
  return {
    color: this.color,
    size: this.size,
    sku: this.sku,
    price: this.unitPrice
  };
});

const pricingSchema = new Schema(
  {
    subtotal        : { type: Number, required: true, min: 0 },
    couponDiscount  : { type: Number, default: 0, min: 0 },
    loyaltyDiscount : { type: Number, default: 0, min: 0 },
    walletDiscount  : { type: Number, default: 0, min: 0 },
    giftCardDiscount: { type: Number, default: 0, min: 0 },
    deliveryCharge  : { type: Number, default: 0, min: 0 },
    giftWrapCharge  : { type: Number, default: 0, min: 0 },
    taxAmount       : { type: Number, default: 0, min: 0 },
    roundOff        : { type: Number, default: 0 },
    total           : { type: Number, required: true, min: 0 },
    currency        : { type: String, default: "INR", uppercase: true },
  },
  { 
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);

pricingSchema.virtual("tax").get(function () {
  return this.taxAmount;
});

pricingSchema.virtual("shippingCharge").get(function () {
  return this.deliveryCharge;
});

pricingSchema.virtual("walletDeducted").get(function () {
  return this.walletDiscount;
});

pricingSchema.virtual("discount").get(function () {
  return this.couponDiscount + this.loyaltyDiscount + this.giftCardDiscount;
});

const paymentSchema = new Schema(
  {
    method           : {
      type     : String,
      enum     : ["razorpay", "stripe", "paytm", "cod", "wallet", "upi", "netbanking", "card", "emi", "gift_card"],
      required : true,
    },
    status           : {
      type    : String,
      enum    : ["pending", "authorized", "captured", "paid", "failed", "refunded", "partial_refund", "cancelled"],
      default : "pending",
    },
    gatewayOrderId   : { type: String },
    gatewayPaymentId : { type: String },
    gatewaySignature : { type: String, select: false },
    transactionId    : { type: String },
    amount           : { type: Number, required: true, min: 0 },
    currency         : { type: String, default: "INR" },
    paidAt           : { type: Date },
    failureReason    : { type: String },
    failureCode      : { type: String },
    gatewayResponse  : { type: Schema.Types.Mixed, select: false },
    walletAmountUsed   : { type: Number, default: 0 },
    loyaltyPointsUsed  : { type: Number, default: 0 },
    giftCardAmountUsed : { type: Number, default: 0 },
    bankName     : { type: String },
    cardLast4    : { type: String },
    cardBrand    : { type: String },
    upiId        : { type: String },
    emiMonths    : { type: Number },
  },
  { _id: false },
);

const refundSchema = new Schema(
  {
    reason      : {
      type : String,
      enum : ["wrong_item", "damaged", "not_as_described", "changed_mind", "defective", "size_issue", "late_delivery", "seller_cancelled"],
      required : true,
    },
    description : { type: String, maxlength: 1000 },
    items       : [{ orderItemId: Schema.Types.ObjectId, quantity: { type: Number, min: 1 } }],
    images      : [{ type: String }],
    amount      : { type: Number, min: 0 },
    refundTo    : { type: String, enum: ["original_payment", "wallet", "store_credit"], default: "original_payment" },
    status      : {
      type    : String,
      enum    : ["requested", "under_review", "approved", "rejected", "processing", "processed", "failed"],
      default : "requested",
    },
    adminNote       : { type: String },
    rejectionReason : { type: String },
    gatewayRefundId : { type: String },
    requestedAt     : { type: Date, default: Date.now },
    resolvedAt      : { type: Date },
    processedAt     : { type: Date },
    processedBy     : { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true },
);

const returnRequestSchema = new Schema(
  {
    type            : { type: String, enum: ["return", "exchange"], required: true },
    status          : {
      type    : String,
      enum    : ["requested", "pickup_scheduled", "picked_up", "received", "approved", "rejected", "completed"],
      default : "requested",
    },
    reason          : { type: String },
    description     : { type: String },
    images          : [{ type: String }],
    pickupDate      : { type: Date },
    pickupAddress   : { type: addressSchema },
    exchangeProductId : { type: Schema.Types.ObjectId },
    exchangeVariantId : { type: Schema.Types.ObjectId },
    adminNote       : { type: String },
    requestedAt     : { type: Date, default: Date.now },
    resolvedAt      : { type: Date },
  },
  { _id: false },
);

const trackingSchema = new Schema(
  {
    courier           : { type: String },
    awb               : { type: String },
    labelUrl          : { type: String },
    trackingUrl       : { type: String },
    estimatedDelivery : { type: Date },
    dispatchedAt      : { type: Date },
    deliveredAt       : { type: Date },
  },
  { 
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);

trackingSchema.virtual("awbNumber").get(function () {
  return this.awb;
});

const orderSchema = new Schema(
  {
    orderId           : { type: String, unique: true, uppercase: true, default: () => `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}` },
    userId            : { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId          : { type: Schema.Types.ObjectId, ref: "Seller" },
    checkoutSessionId : { type: String },
    items : { type: [orderItemSchema], required: true },
    shippingAddress : { type: addressSchema, required: true },
    billingAddress  : { type: addressSchema },
    pricing : { type: pricingSchema, required: true },
    appliedPromotions : [{
      promotionId    : { type: Schema.Types.ObjectId, ref: "Promotion" },
      code           : { type: String },
      discountType   : { type: String },
      discountAmount : { type: Number },
    }],
    isGiftWrapped  : { type: Boolean, default: false },
    giftMessage    : { type: String, maxlength: 200 },
    giftWrapCharge : { type: Number, default: 0 },
    payment : { type: paymentSchema, required: true },
    refunds : { type: [refundSchema], default: [] },
    returnRequest : { type: returnRequestSchema },
    orderStatus : {
      type    : String,
      enum    : [
        "pending", "confirmed", "processing", "packed", "dispatched",
        "delivered", "cancelled", "returns"
      ],
      default : "pending",
    },
    statusHistory    : { type: [statusHistorySchema], default: [] },
    cancellationReason: { type: String },
    cancelledAt      : { type: Date },
    cancelledBy      : { type: Schema.Types.ObjectId, ref: "User" },
    tracking : { type: trackingSchema },
    sellerConfirmedAt  : { type: Date },
    sellerPackedAt     : { type: Date },
    sellerDispatchedAt : { type: Date },
    invoice : {
      number      : { type: String },
      url         : { type: String },
      generatedAt : { type: Date },
    },
    isCODVerified  : { type: Boolean, default: false },
    codVerifiedAt  : { type: Date },
    codVerifiedBy  : { type: Schema.Types.ObjectId, ref: "User" },
    notes      : { type: String },
    isSellerSettled : { type: Boolean, default: false },
    isRefundDeducted : { type: Boolean, default: false },
    isReviewed : { type: Boolean, default: false },
    placedAt   : { type: Date, default: Date.now },
  },
  {
    timestamps : true,
    toJSON     : { virtuals: true },
    toObject   : { virtuals: true },
  },
);

orderSchema.virtual("isPaid").get(function () {
  return this.payment.status === "paid" || this.payment.status === "captured";
});

orderSchema.virtual("isDelivered").get(function () {
  return this.orderStatus === "delivered";
});

orderSchema.virtual("itemCount").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.virtual("status")
  .get(function () {
    return this.orderStatus;
  })
  .set(function (val) {
    this.orderStatus = val;
  });

orderSchema.virtual("invoiceUrl").get(function () {
  return this.invoice?.url;
});

orderSchema.virtual("invoiceNumber").get(function () {
  return this.invoice?.number;
});

orderSchema.pre("save", function () {
  if (this.isNew && !this.orderId) {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderId = `ORD-${year}-${rand}`;
  }
});

orderSchema.pre("save", function () {
  if (this.isModified("orderStatus") && !this.isNew) {
    this.statusHistory.push({
      status    : this.orderStatus,
      updatedBy : this._updatedBy || null,
      role      : "system",
      timestamp : new Date(),
    });
  }
});

orderSchema.index({ userId: 1 });
orderSchema.index({ sellerId: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ "payment.gatewayPaymentId": 1 }, { sparse: true });
orderSchema.index({ "tracking.awb": 1 }, { sparse: true });
orderSchema.index({ placedAt: -1 });
orderSchema.index({ createdAt: -1 });

const Order = model("Order", orderSchema);

module.exports = Order;