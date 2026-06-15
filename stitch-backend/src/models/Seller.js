"use strict";

const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { addressSchema } = require("./shared");

const kycDocumentSchema = new Schema(
  {
    type : {
      type     : String,
      required : true,
      enum     : ["pan", "gst", "aadhaar", "bank_proof", "business_registration", "address_proof", "trademark", "id_proof", "tax_document", "bank_statement", "gst_certificate"],
    },
    fileUrl     : { type: String, required: true },
    status      : {
      type    : String,
      enum    : ["pending", "under_review", "approved", "rejected"],
      default : "pending",
    },
    remarks     : { type: String },
    uploadedAt  : { type: Date, default: Date.now },
    reviewedAt  : { type: Date },
    reviewedBy  : { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt   : { type: Date },
  },
  { _id: true },
);

const bankDetailsSchema = new Schema(
  {
    accountHolder : { type: String, required: true, trim: true },
    accountNumber : { type: String, required: true, select: false },
    ifscCode      : { type: String, required: true, uppercase: true, trim: true },
    bankName      : { type: String, required: true, trim: true },
    branchName    : { type: String, trim: true },
    accountType   : { type: String, enum: ["savings", "current"], default: "current" },
    isVerified    : { type: Boolean, default: false },
    verifiedAt    : { type: Date },
    upiId         : { type: String, trim: true },
  },
  { _id: false },
);

const payoutSchema = new Schema(
  {
    amount         : { type: Number, required: true, min: 0 },
    currency       : { type: String, default: "INR" },
    status         : {
      type    : String,
      enum    : ["pending", "processing", "processed", "failed", "on_hold"],
      default : "pending",
    },
    referenceId    : { type: String },
    bankSnapshot   : {
      accountHolder : String,
      accountNumber : String,
      ifscCode      : String,
      bankName      : String,
    },
    failureReason  : { type: String },
    requestedAt    : { type: Date, default: Date.now },
    processedAt    : { type: Date },
    processedBy    : { type: Schema.Types.ObjectId, ref: "User" },
    notes          : { type: String },
    payoutMethod   : { type: String, enum: ["neft", "imps", "rtgs", "upi"], default: "neft" },
    taxDeducted    : { type: Number, default: 0 },
    netAmount      : { type: Number },
  },
  { _id: true },
);

const sellerLedgerSchema = new Schema(
  {
    type        : { type: String, required: true, enum: ["credit", "debit"] },
    amount      : { type: Number, required: true, min: 0 },
    balance     : { type: Number, required: true },
    source      : {
      type : String,
      enum : [
        "order_settlement", "refund_deduction", "commission_deduction",
        "payout", "adjustment", "penalty", "bonus",
      ],
    },
    referenceId : { type: String },
    description : { type: String },
    createdAt   : { type: Date, default: Date.now },
  },
  { _id: true },
);

const warehouseSchema = new Schema(
  {
    name          : { type: String, required: true, trim: true },
    code          : { type: String, uppercase: true, trim: true },
    address       : { type: addressSchema },
    contactPhone  : { type: String },
    contactEmail  : { type: String },
    gstNumber     : { type: String },
    isDefault     : { type: Boolean, default: false },
    isActive      : { type: Boolean, default: true },
    operatingHours: { type: String },
    createdAt     : { type: Date, default: Date.now },
  },
  { _id: true },
);

const sellerNotifPrefSchema = new Schema(
  {
    newOrders       : { type: Boolean, default: true },
    lowStock        : { type: Boolean, default: true },
    payouts         : { type: Boolean, default: true },
    reviews         : { type: Boolean, default: true },
    returns         : { type: Boolean, default: true },
    accountAlerts   : { type: Boolean, default: true },
  },
  { _id: false },
);

const sellerSchema = new Schema(
  {
    userId : {
      type     : Schema.Types.ObjectId,
      ref      : "User",
      required : true,
      unique   : true,
    },
    businessName  : { type: String, required: true, trim: true },
    businessType  : {
      type     : String,
      enum     : ["individual", "proprietorship", "partnership", "private_limited", "public_limited", "llp"],
      required : true,
    },
    gstNumber         : {
      type  : String,
      trim  : true,
      // Note: format validated at KYC review stage, not at profile save
    },
    gstRegisteredState: { type: String, trim: true },
    panNumber         : {
      type      : String,
      uppercase : true,
      trim      : true,
      // Note: format validated at KYC review stage, not at profile save
    },
    website           : { type: String, trim: true },
    businessAddress   : { type: addressSchema },
    businessEmail     : { type: String, lowercase: true, trim: true },
    businessPhone     : { type: String, trim: true },
    onboardingStep : {
      type    : String,
      enum    : ["business_info", "kyc_upload", "bank_details", "store_setup", "completed"],
      default : "business_info",
    },
    agreementVersion : { type: String },
    agreedAt         : { type: Date },
    documents : { type: [kycDocumentSchema], default: [] },
    bankDetails : { type: bankDetailsSchema },
    verificationStatus  : {
      type    : String,
      enum    : ["not_submitted", "documents_received", "under_review", "approved", "rejected", "suspended"],
      default : "not_submitted",
    },
    verificationRemarks : { type: String },
    verifiedAt          : { type: Date },
    verifiedBy          : { type: Schema.Types.ObjectId, ref: "User" },
    suspensionReason    : { type: String },
    suspendedAt         : { type: Date },
    sellerLevel : {
      type    : String,
      enum    : ["bronze", "silver", "gold", "platinum"],
      default : "bronze",
    },
    commissionRate  : { type: Number, default: 12.5, min: 0, max: 100 },
    totalEarnings   : { type: Number, default: 0, min: 0 },
    totalOrders     : { type: Number, default: 0, min: 0 },
    totalProducts   : { type: Number, default: 0, min: 0 },
    totalRefunds    : { type: Number, default: 0, min: 0 },
    refundRate      : { type: Number, default: 0, min: 0 },
    pendingPayout   : { type: Number, default: 0, min: 0 },
    payoutSchedule : {
      type    : String,
      enum    : ["weekly", "biweekly", "monthly"],
      default : "weekly",
    },
    minPayoutAmount : { type: Number, default: 1000 },
    walletBalance : { type: Number, default: 0 },
    walletLedger  : { type: [sellerLedgerSchema], default: [] },
    payouts : { type: [payoutSchema], default: [] },
    store : {
      name             : { type: String, trim: true },
      slug             : { type: String, trim: true, lowercase: true },
      logo             : { type: String },
      banner           : { type: String },
      description      : { type: String, maxlength: 2000 },
      tagline          : { type: String, maxlength: 200 },
      categories       : [{ type: String }],
      socialLinks      : {
        instagram  : { type: String },
        facebook   : { type: String },
        twitter    : { type: String },
        youtube    : { type: String },
        pinterest  : { type: String },
      },
      returnPolicy     : { type: String },
      shippingPolicy   : { type: String },
      isVerified       : { type: Boolean, default: false },
      avgDeliveryDays  : { type: Number },
      returnRate       : { type: Number, default: 0 },
    },
    shippingPreference : {
      preferredCourier   : { type: String },
      handlingTimeDays   : { type: Number, default: 1 },
      dispatchCutoffTime : { type: String, default: "14:00" },
    },
    averageRating : { type: Number, default: 0, min: 0, max: 5 },
    totalRatings  : { type: Number, default: 0 },
    warehouses : { type: [warehouseSchema], default: [] },
    notificationPreferences : {
      email : { type: sellerNotifPrefSchema, default: () => ({}) },
      push  : { type: sellerNotifPrefSchema, default: () => ({}) },
      sms   : { type: sellerNotifPrefSchema, default: () => ({}) },
    },
    analyticsCache : {
      totalRevenue30d   : { type: Number, default: 0 },
      totalOrders30d    : { type: Number, default: 0 },
      conversionRate    : { type: Number, default: 0 },
      avgOrderValue     : { type: Number, default: 0 },
      topProductId      : { type: Schema.Types.ObjectId },
      pendingOrders     : { type: Number, default: 0 },
      cancelRate        : { type: Number, default: 0 },
      lastUpdated       : { type: Date },
    },
    isActive  : { type: Boolean, default: true },
    joinedAt  : { type: Date, default: Date.now },
    deletedAt : { type: Date },
  },
  {
    timestamps : true,
    toJSON     : { virtuals: true },
    toObject   : { virtuals: true },
  },
);

sellerSchema.virtual("isApproved").get(function () {
  return this.verificationStatus === "approved";
});

sellerSchema.virtual("isPayoutDue").get(function () {
  return this.pendingPayout >= this.minPayoutAmount;
});

sellerSchema.pre("save", function () {
  if (this.warehouses) {
    const defaults = this.warehouses.filter((w) => w.isDefault);
    if (defaults.length > 1) {
      this.warehouses.forEach((w, i, arr) => {
        w.isDefault = i === arr.map((x) => x.isDefault).lastIndexOf(true);
      });
    }
  }
});

sellerSchema.pre("save", function () {
  if (this.walletLedger && this.walletLedger.length > 500) {
    this.walletLedger = this.walletLedger.slice(-500);
  }
});

sellerSchema.index({ verificationStatus: 1 });
sellerSchema.index({ "store.slug": 1 }, { sparse: true, unique: true });
sellerSchema.index({ gstNumber: 1 }, { sparse: true });
sellerSchema.index({ sellerLevel: 1 });
sellerSchema.index({ averageRating: -1 });
sellerSchema.index({ isActive: 1 });
sellerSchema.index({ createdAt: -1 });

const Seller = model("Seller", sellerSchema);

module.exports = Seller;