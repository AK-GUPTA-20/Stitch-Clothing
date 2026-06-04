const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const paymentGatewaySchema = new Schema(
  {
    name             : { type: String, enum: ["razorpay", "stripe", "paytm", "cashfree", "phonepe"], required: true },
    displayName      : { type: String },
    keyId            : { type: String, select: false },
    keySecret        : { type: String, select: false },
    webhookSecret    : { type: String, select: false },
    environment      : { type: String, enum: ["live", "test"], default: "test" },
    isActive         : { type: Boolean, default: false },
    isPrimary        : { type: Boolean, default: false },
    supportedMethods : [{ type: String }],
    minAmount        : { type: Number, default: 1 },
    maxAmount        : { type: Number },
    logoUrl          : { type: String },
  },
  { _id: true },
);

const taxSlabSchema = new Schema(
  {
    label     : { type: String },
    rate      : { type: Number, required: true, min: 0, max: 100 },
    hsnCode   : { type: String },
    minAmount : { type: Number, default: 0 },
    maxAmount : { type: Number },
    isDefault : { type: Boolean, default: false },
    category  : { type: String },
  },
  { _id: true },
);

const emailTemplateSchema = new Schema(
  {
    key : {
      type : String,
      enum : [
        "welcome", "email_verify", "password_reset", "otp",
        "order_confirmed", "order_shipped", "order_delivered",
        "order_cancelled", "refund_initiated", "refund_processed",
        "seller_approved", "seller_rejected", "product_approved",
        "product_rejected", "low_stock_alert", "flash_sale_reminder",
        "gift_card_sent", "loyalty_tier_upgrade", "return_update",
      ],
      required : true,
    },
    subject   : { type: String, required: true },
    htmlBody  : { type: String, required: true },
    textBody  : { type: String },
    variables : [{ type: String }],
    isActive  : { type: Boolean, default: true },
    updatedAt : { type: Date, default: Date.now },
  },
  { _id: true },
);

const loyaltyRuleSchema = new Schema(
  {
    action          : {
      type : String,
      enum : ["purchase", "signup", "review", "referral", "birthday", "profile_complete", "app_download"],
      required: true,
    },
    pointsPerUnit   : { type: Number, required: true },
    maxPointsPerDay : { type: Number },
    minOrderAmount  : { type: Number, default: 0 },
    isActive        : { type: Boolean, default: true },
    description     : { type: String },
  },
  { _id: true },
);

const loyaltyTierSchema = new Schema(
  {
    name            : { type: String, enum: ["bronze", "silver", "gold", "platinum"], required: true },
    minPoints       : { type: Number, required: true },
    maxPoints       : { type: Number },
    color           : { type: String },
    icon            : { type: String },
    perks           : [{ type: String }],
    bonusMultiplier : { type: Number, default: 1 },
  },
  { _id: true },
);

const webhookSchema = new Schema(
  {
    name          : { type: String, required: true, trim: true },
    url           : { type: String, required: true },
    events        : [{ type: String }],
    secret        : { type: String, select: false },
    isActive      : { type: Boolean, default: true },
    retryPolicy   : {
      maxRetries       : { type: Number, default: 3 },
      intervalSeconds  : { type: Number, default: 60 },
    },
    headers       : { type: Map, of: String },
    deliveryLogs  : [{
      event         : { type: String },
      payload       : { type: Schema.Types.Mixed },
      status        : { type: String, enum: ["success", "failed", "pending"] },
      responseCode  : { type: Number },
      responseBody  : { type: String },
      attemptNumber : { type: Number, default: 1 },
      attemptedAt   : { type: Date, default: Date.now },
      nextRetryAt   : { type: Date },
    }],
    totalDelivered  : { type: Number, default: 0 },
    totalFailed     : { type: Number, default: 0 },
    lastTriggeredAt : { type: Date },
  },
  { _id: true },
);

const auditLogSchema = new Schema(
  {
    adminId     : { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminName   : { type: String },
    adminEmail  : { type: String },
    action      : { type: String, required: true },
    targetType  : {
      type : String,
      enum : ["user", "seller", "product", "order", "review", "coupon", "setting", "category", "brand", "refund"],
    },
    targetId    : { type: String },
    description : { type: String },
    changes     : {
      before : { type: Schema.Types.Mixed },
      after  : { type: Schema.Types.Mixed },
    },
    ip          : { type: String },
    userAgent   : { type: String },
    timestamp   : { type: Date, default: Date.now },
  },
  { _id: true },
);

const contentPageSchema = new Schema(
  {
    contentType : {
      type     : String,
      enum     : ["faq", "redirect", "static_page", "policy", "banner"],
      required : true,
    },
    question    : { type: String, trim: true },
    answer      : { type: String },
    faqCategory : { type: String },
    productId   : { type: Schema.Types.ObjectId, ref: "Product" },
    fromUrl      : { type: String },
    toUrl        : { type: String },
    redirectCode : { type: Number, default: 301 },
    slug        : { type: String, lowercase: true, trim: true },
    title       : { type: String },
    content     : { type: String },
    bannerUrl   : { type: String },
    linkUrl     : { type: String },
    targetScreen: { type: String },
    position         : { type: Number, default: 0 },
    isActive         : { type: Boolean, default: true },
    metaTitle        : { type: String },
    metaDescription  : { type: String },
    updatedAt        : { type: Date, default: Date.now },
  },
  { _id: true },
);

const configSchema = new Schema(
  {
    type : {
      type     : String,
      enum     : ["platform_settings", "webhook", "audit_log", "content_page"],
      required : true,
    },
    key         : { type: String, sparse: true },
    value       : { type: Schema.Types.Mixed },
    description : { type: String },
    isPublic    : { type: Boolean, default: false },
    group       : {
      type    : String,
      enum    : ["general", "payment", "shipping", "tax", "email", "sms", "loyalty", "viewer3d", "features", "maintenance"],
      default : "general",
    },
    updatedBy   : { type: Schema.Types.ObjectId, ref: "User" },
    settings : {
      general : {
        platformName            : { type: String, default: "3DCloth" },
        supportEmail            : { type: String },
        supportPhone            : { type: String },
        currency                : { type: String, default: "INR" },
        timezone                : { type: String, default: "Asia/Kolkata" },
        maintenanceMode         : { type: Boolean, default: false },
        maintenanceMessage      : { type: String },
        allowGuestCheckout      : { type: Boolean, default: true },
        maxCartItems            : { type: Number, default: 50 },
        maxWishlistItems        : { type: Number, default: 200 },
        defaultReturnWindowDays : { type: Number, default: 7 },
        platformCommissionRate  : { type: Number, default: 12.5 },
        minOrderAmount          : { type: Number, default: 0 },
        logoUrl                 : { type: String },
        faviconUrl              : { type: String },
        supportedLanguages      : [{ type: String }],
        defaultLanguage         : { type: String, default: "en" },
      },
      payment : {
        gateways          : { type: [paymentGatewaySchema], default: [] },
        codEnabled        : { type: Boolean, default: true },
        codMaxOrderValue  : { type: Number, default: 10000 },
        walletEnabled     : { type: Boolean, default: true },
        loyaltyEnabled    : { type: Boolean, default: true },
        emiEnabled        : { type: Boolean, default: false },
        autoRefundEnabled : { type: Boolean, default: true },
        autoRefundDays    : { type: Number, default: 7 },
      },
      shipping : {
        defaultCourier      : { type: String },
        freeShippingAbove   : { type: Number, default: 999 },
        packagingCharge     : { type: Number, default: 0 },
        codCharge           : { type: Number, default: 40 },
        expressAvailable    : { type: Boolean, default: false },
        expressCharge       : { type: Number, default: 0 },
      },
      tax : {
        gstEnabled     : { type: Boolean, default: true },
        taxIncluded    : { type: Boolean, default: false },
        defaultTaxRate : { type: Number, default: 5 },
        slabs          : { type: [taxSlabSchema], default: [] },
      },
      email : {
        provider     : { type: String, enum: ["ses", "sendgrid", "mailgun", "smtp"] },
        fromName     : { type: String, default: "3DCloth" },
        fromEmail    : { type: String },
        replyToEmail : { type: String },
        templates    : { type: [emailTemplateSchema], default: [] },
      },
      sms : {
        provider  : { type: String, enum: ["twilio", "msg91", "fast2sms", "textlocal", "sns", "kaleyra"] },
        apiKey    : { type: String },
        senderId  : { type: String },
        isActive  : { type: Boolean, default: false },
        accountSid: { type: String },
        authToken : { type: String },
        orderConfirmationEnabled: { type: Boolean, default: true },
        orderShippedEnabled: { type: Boolean, default: true },
        orderDeliveredEnabled: { type: Boolean, default: true },
        otpEnabled: { type: Boolean, default: true },
        marketingEnabled: { type: Boolean, default: false },
      },
      loyalty : {
        enabled              : { type: Boolean, default: true },
        rules                : { type: [loyaltyRuleSchema], default: [] },
        tiers                : { type: [loyaltyTierSchema], default: [] },
        pointsExpiryDays     : { type: Number, default: 365 },
        pointsValue          : { type: Number, default: 0.25 },
        maxRedemptionPercent : { type: Number, default: 50 },
        referralBonusBuyer   : { type: Number, default: 100 },
        referralBonusReferrer: { type: Number, default: 200 },
      },
      viewer3D : {
        enabled          : { type: Boolean, default: false },
        defaultModelFormat: { type: String, default: "glb" },
        autoRotate       : { type: Boolean, default: true },
        showWireframe    : { type: Boolean, default: false },
        enableAR         : { type: Boolean, default: false },
        maxFileSizeMb    : { type: Number, default: 50 },
        allowedFormats   : [{ type: String, default: ["glb", "gltf", "obj"] }],
        watermarkEnabled : { type: Boolean, default: false },
        watermarkText    : { type: String },
        bgColor          : { type: String, default: "#ffffff" },
        shadowEnabled    : { type: Boolean, default: true },
        exposureLevel    : { type: Number, default: 1.0 },
        maxFileSizeMB    : { type: Number, default: 200 },
        supportedFormats : [{ type: String }],
        defaultLod       : { type: String, default: "medium" },
        enableArView     : { type: Boolean, default: false },
        cdnBaseUrl       : { type: String },
      },
    },
    webhook : { type: webhookSchema },
    audit : { type: auditLogSchema },
    content : { type: contentPageSchema },
  },
  {
    timestamps : true,
    toJSON     : { virtuals: true },
    toObject   : { virtuals: true },
  },
);

configSchema.index({ type: 1 });
configSchema.index({ group: 1 });
configSchema.index({ isPublic: 1 });
configSchema.index({ "webhook.url": 1 }, { sparse: true });
configSchema.index({ "audit.adminId": 1 }, { sparse: true });
configSchema.index({ "audit.timestamp": -1 }, { sparse: true });
configSchema.index({ "content.contentType": 1 }, { sparse: true });
configSchema.index({ "content.slug": 1 }, { sparse: true });

const Config = model("Config", configSchema);

module.exports = Config;