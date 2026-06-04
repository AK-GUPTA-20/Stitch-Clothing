"use strict";

const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler    = require("../middleware/error");
const Config          = require("../models/Config");

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

/** Upsert the singleton platform_settings document */
async function _getPlatformDoc() {
  let doc = await Config.findOne({ type: "platform_settings" });
  if (!doc) doc = await Config.create({ type: "platform_settings" });
  return doc;
}

/** Attach audit trail entry whenever settings change */
async function _writeAudit(req, action, targetType, targetId, description, changes = {}) {
  await Config.create({
    type  : "audit_log",
    audit : {
      adminId    : req.user._id,
      adminName  : `${req.user.firstName} ${req.user.lastName}`,
      adminEmail : req.user.email,
      action,
      targetType,
      targetId   : String(targetId || ""),
      description,
      changes,
      ip         : req.ip,
      userAgent  : req.headers["user-agent"],
      timestamp  : new Date(),
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────────────────────────────────────── */

//* Get all public-facing platform settings (maintenance mode, currency, etc.)  GET /api/v1/configs/public
exports.getPublicSettings = catchAsyncError(async (req, res) => {
  const doc = await Config.findOne({ type: "platform_settings" }).select(
    "settings.general.platformName settings.general.currency settings.general.maintenanceMode " +
    "settings.general.maintenanceMessage settings.general.logoUrl settings.general.faviconUrl " +
    "settings.general.defaultLanguage settings.general.supportedLanguages " +
    "settings.general.allowGuestCheckout settings.general.minOrderAmount " +
    "settings.shipping.freeShippingAbove settings.shipping.codCharge " +
    "settings.payment.codEnabled settings.payment.walletEnabled settings.payment.loyaltyEnabled " +
    "settings.loyalty.enabled settings.loyalty.pointsValue settings.loyalty.maxRedemptionPercent " +
    "settings.viewer3D.enableArView settings.viewer3D.supportedFormats"
  );

  res.status(200).json({ success: true, data: doc?.settings || {} });
});

//* Get a single public key-value config by key  GET /api/v1/configs/public/:key
exports.getPublicConfigByKey = catchAsyncError(async (req, res, next) => {
  const config = await Config.findOne({ key: req.params.key, isPublic: true, type: "platform_settings" });
  if (!config) return next(new ErrorHandler("Config not found or not public.", 404));

  res.status(200).json({ success: true, key: config.key, value: config.value });
});

//* Get all active FAQs grouped by category  GET /api/v1/configs/content/faqs
exports.getPublicFAQs = catchAsyncError(async (req, res) => {
  const { category } = req.query;

  const filter = { type: "content_page", "content.contentType": "faq", "content.isActive": true };
  if (category) filter["content.faqCategory"] = category;

  const docs = await Config.find(filter)
    .select("content.question content.answer content.faqCategory content.position")
    .sort({ "content.position": 1 });

  const faqs = docs.map((d) => d.content);

  res.status(200).json({ success: true, count: faqs.length, data: faqs });
});

//* Get a content page by slug (static page, policy, banner)  GET /api/v1/configs/content/slug/:slug
exports.getContentBySlug = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({
    type               : "content_page",
    "content.slug"     : req.params.slug.toLowerCase(),
    "content.isActive" : true,
  }).select("-audit -webhook");

  if (!doc) return next(new ErrorHandler("Content page not found.", 404));

  res.status(200).json({ success: true, data: doc.content });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PLATFORM SETTINGS — SINGLETON
───────────────────────────────────────────────────────────────────────────── */

//* Get the full platform settings document (admin)  GET /api/v1/configs/settings
exports.getPlatformSettings = catchAsyncError(async (req, res) => {
  const doc = await Config.findOne({ type: "platform_settings" }).select(
    "-settings.email.templates -settings.payment.gateways -settings.tax.slabs " +
    "-settings.loyalty.rules -settings.loyalty.tiers"
  );

  res.status(200).json({ success: true, data: doc?.settings || {} });
});

//* Update general platform settings  PATCH /api/v1/configs/settings/general
exports.updateGeneralSettings = catchAsyncError(async (req, res, next) => {
  const ALLOWED = [
    "platformName", "supportEmail", "supportPhone", "currency", "timezone",
    "allowGuestCheckout", "maxCartItems", "maxWishlistItems",
    "defaultReturnWindowDays", "platformCommissionRate", "minOrderAmount",
    "logoUrl", "faviconUrl", "supportedLanguages", "defaultLanguage",
  ];

  const updates = {};
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[`settings.general.${f}`] = req.body[f]; });

  if (Object.keys(updates).length === 0) return next(new ErrorHandler("No valid fields provided.", 400));

  updates.updatedBy = req.user._id;

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).select("settings.general");

  await _writeAudit(req, "UPDATE_GENERAL_SETTINGS", "setting", doc._id, "General settings updated", { after: req.body });

  res.status(200).json({ success: true, general: doc.settings.general });
});

//* Toggle maintenance mode on or off  PATCH /api/v1/configs/settings/maintenance
exports.toggleMaintenanceMode = catchAsyncError(async (req, res, next) => {
  const { maintenanceMode, maintenanceMessage } = req.body;

  if (maintenanceMode === undefined) return next(new ErrorHandler("maintenanceMode boolean is required.", 400));

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    {
      $set: {
        "settings.general.maintenanceMode"    : maintenanceMode,
        "settings.general.maintenanceMessage" : maintenanceMessage || "",
        updatedBy                             : req.user._id,
      },
    },
    { new: true, upsert: true }
  ).select("settings.general.maintenanceMode settings.general.maintenanceMessage");

  await _writeAudit(req, maintenanceMode ? "MAINTENANCE_ON" : "MAINTENANCE_OFF", "setting", doc._id,
    `Maintenance mode ${maintenanceMode ? "enabled" : "disabled"}.`);

  res.status(200).json({
    success            : true,
    maintenanceMode    : doc.settings.general.maintenanceMode,
    maintenanceMessage : doc.settings.general.maintenanceMessage,
  });
});

//* Update shipping settings  PATCH /api/v1/configs/settings/shipping
exports.updateShippingSettings = catchAsyncError(async (req, res, next) => {
  const ALLOWED = ["defaultCourier", "freeShippingAbove", "packagingCharge", "codCharge", "expressAvailable", "expressCharge"];

  const updates = {};
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[`settings.shipping.${f}`] = req.body[f]; });

  if (Object.keys(updates).length === 0) return next(new ErrorHandler("No valid fields provided.", 400));

  updates.updatedBy = req.user._id;

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).select("settings.shipping");

  await _writeAudit(req, "UPDATE_SHIPPING_SETTINGS", "setting", doc._id, "Shipping settings updated.", { after: req.body });

  res.status(200).json({ success: true, shipping: doc.settings.shipping });
});

//* Update payment settings (COD, wallet, EMI toggles)  PATCH /api/v1/configs/settings/payment
exports.updatePaymentSettings = catchAsyncError(async (req, res, next) => {
  const ALLOWED = ["codEnabled", "codMaxOrderValue", "walletEnabled", "loyaltyEnabled", "emiEnabled", "autoRefundEnabled", "autoRefundDays"];

  const updates = {};
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[`settings.payment.${f}`] = req.body[f]; });

  if (Object.keys(updates).length === 0) return next(new ErrorHandler("No valid fields provided.", 400));

  updates.updatedBy = req.user._id;

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).select("settings.payment.codEnabled settings.payment.codMaxOrderValue settings.payment.walletEnabled settings.payment.loyaltyEnabled settings.payment.emiEnabled settings.payment.autoRefundEnabled settings.payment.autoRefundDays");

  await _writeAudit(req, "UPDATE_PAYMENT_SETTINGS", "setting", doc._id, "Payment settings updated.", { after: req.body });

  res.status(200).json({ success: true, payment: doc.settings.payment });
});

//* Update email provider settings  PATCH /api/v1/configs/settings/email
exports.updateEmailSettings = catchAsyncError(async (req, res, next) => {
  const { provider, fromName, fromEmail, replyToEmail } = req.body;

  const updates = {};
  if (provider)     updates["settings.email.provider"]     = provider;
  if (fromName)     updates["settings.email.fromName"]     = fromName;
  if (fromEmail)    updates["settings.email.fromEmail"]    = fromEmail;
  if (replyToEmail) updates["settings.email.replyToEmail"] = replyToEmail;
  updates.updatedBy = req.user._id;

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).select("settings.email.provider settings.email.fromName settings.email.fromEmail settings.email.replyToEmail");

  await _writeAudit(req, "UPDATE_EMAIL_SETTINGS", "setting", doc._id, "Email provider settings updated.");

  res.status(200).json({ success: true, email: doc.settings.email });
});

//* Update SMS provider settings  PATCH /api/v1/configs/settings/sms
exports.updateSmsSettings = catchAsyncError(async (req, res, next) => {
  const {
    provider, enabled, fromNumber, accountSid, authToken, apiKey,
    orderConfirmationEnabled, orderShippedEnabled, orderDeliveredEnabled,
    otpEnabled, marketingEnabled
  } = req.body;

  const updates = { updatedBy: req.user._id };
  if (provider !== undefined) updates["settings.sms.provider"] = provider;
  if (enabled !== undefined) updates["settings.sms.isActive"] = enabled;
  if (fromNumber !== undefined) updates["settings.sms.senderId"] = fromNumber;
  if (accountSid !== undefined) updates["settings.sms.accountSid"] = accountSid;
  if (authToken !== undefined) updates["settings.sms.authToken"] = authToken;
  if (apiKey !== undefined) updates["settings.sms.apiKey"] = apiKey;
  if (orderConfirmationEnabled !== undefined) updates["settings.sms.orderConfirmationEnabled"] = orderConfirmationEnabled;
  if (orderShippedEnabled !== undefined) updates["settings.sms.orderShippedEnabled"] = orderShippedEnabled;
  if (orderDeliveredEnabled !== undefined) updates["settings.sms.orderDeliveredEnabled"] = orderDeliveredEnabled;
  if (otpEnabled !== undefined) updates["settings.sms.otpEnabled"] = otpEnabled;
  if (marketingEnabled !== undefined) updates["settings.sms.marketingEnabled"] = marketingEnabled;

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true }
  ).select("settings.sms");

  await _writeAudit(req, "UPDATE_SMS_SETTINGS", "setting", doc._id, "SMS provider settings updated.");

  res.status(200).json({ success: true, sms: doc.settings.sms });
});

//* Update 3D viewer settings  PATCH /api/v1/configs/settings/viewer3d
exports.updateViewer3DSettings = catchAsyncError(async (req, res, next) => {
  const ALLOWED = [
    "enabled", "defaultModelFormat", "autoRotate", "showWireframe", "enableAR",
    "maxFileSizeMb", "allowedFormats", "watermarkEnabled", "watermarkText",
    "bgColor", "shadowEnabled", "exposureLevel",
    "maxFileSizeMB", "supportedFormats", "defaultLod", "enableArView", "cdnBaseUrl"
  ];

  const updates = {};
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[`settings.viewer3D.${f}`] = req.body[f]; });

  if (Object.keys(updates).length === 0) return next(new ErrorHandler("No valid fields provided.", 400));

  updates.updatedBy = req.user._id;

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true }
  ).select("settings.viewer3D");

  await _writeAudit(req, "UPDATE_3DVIEWER_SETTINGS", "setting", doc._id, "3D viewer settings updated.", { after: req.body });

  res.status(200).json({ success: true, viewer3D: doc.settings.viewer3D });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PAYMENT GATEWAYS
───────────────────────────────────────────────────────────────────────────── */

//* Get all payment gateways (secrets excluded)  GET /api/v1/configs/settings/payment/gateways
exports.getPaymentGateways = catchAsyncError(async (req, res) => {
  const doc = await Config.findOne({ type: "platform_settings" }).select("settings.payment.gateways");
  const gateways = (doc?.settings?.payment?.gateways || []).map((g) => {
    const obj = g.toObject();
    delete obj.keyId; delete obj.keySecret; delete obj.webhookSecret;
    return obj;
  });

  res.status(200).json({ success: true, count: gateways.length, data: gateways });
});

//* Add a new payment gateway  POST /api/v1/configs/settings/payment/gateways
exports.addPaymentGateway = catchAsyncError(async (req, res, next) => {
  const doc = await _getPlatformDoc();

  const exists = doc.settings.payment.gateways.some((g) => g.name === req.body.name);
  if (exists) return next(new ErrorHandler(`Gateway "${req.body.name}" already exists.`, 409));

  doc.settings.payment.gateways.push(req.body);
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  await _writeAudit(req, "ADD_PAYMENT_GATEWAY", "setting", doc._id, `Gateway "${req.body.name}" added.`);

  const added = doc.settings.payment.gateways[doc.settings.payment.gateways.length - 1].toObject();
  delete added.keyId; delete added.keySecret; delete added.webhookSecret;

  res.status(201).json({ success: true, data: added });
});

//* Update a payment gateway by ID  PUT /api/v1/configs/settings/payment/gateways/:gatewayId
exports.updatePaymentGateway = catchAsyncError(async (req, res, next) => {
  const doc = await _getPlatformDoc();
  const gw  = doc.settings.payment.gateways.id(req.params.gatewayId);
  if (!gw) return next(new ErrorHandler("Payment gateway not found.", 404));

  const ALLOWED = ["displayName", "environment", "isActive", "supportedMethods", "minAmount", "maxAmount", "logoUrl", "keyId", "keySecret", "webhookSecret"];
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) gw[f] = req.body[f]; });

  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  await _writeAudit(req, "UPDATE_PAYMENT_GATEWAY", "setting", doc._id, `Gateway "${gw.name}" updated.`);

  const updated = gw.toObject();
  delete updated.keyId; delete updated.keySecret; delete updated.webhookSecret;

  res.status(200).json({ success: true, data: updated });
});

//* Set a gateway as the primary payment gateway  PATCH /api/v1/configs/settings/payment/gateways/:gatewayId/primary
exports.setPrimaryGateway = catchAsyncError(async (req, res, next) => {
  const doc = await _getPlatformDoc();
  const gw  = doc.settings.payment.gateways.id(req.params.gatewayId);
  if (!gw) return next(new ErrorHandler("Payment gateway not found.", 404));

  doc.settings.payment.gateways.forEach((g) => { g.isPrimary = false; });
  gw.isPrimary = true;
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  await _writeAudit(req, "SET_PRIMARY_GATEWAY", "setting", doc._id, `Gateway "${gw.name}" set as primary.`);

  res.status(200).json({ success: true, message: `"${gw.name}" is now the primary gateway.` });
});

//* Delete a payment gateway  DELETE /api/v1/configs/settings/payment/gateways/:gatewayId
exports.deletePaymentGateway = catchAsyncError(async (req, res, next) => {
  const doc = await _getPlatformDoc();
  const gw  = doc.settings.payment.gateways.id(req.params.gatewayId);
  if (!gw) return next(new ErrorHandler("Payment gateway not found.", 404));

  if (gw.isPrimary) return next(new ErrorHandler("Cannot delete the primary gateway. Set another as primary first.", 400));

  doc.settings.payment.gateways.pull({ _id: req.params.gatewayId });
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  await _writeAudit(req, "DELETE_PAYMENT_GATEWAY", "setting", doc._id, `Gateway "${gw.name}" deleted.`);

  res.status(200).json({ success: true, message: "Payment gateway deleted." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   TAX SLABS
───────────────────────────────────────────────────────────────────────────── */

//* Update tax settings (GST toggle, default rate)  PATCH /api/v1/configs/settings/tax
exports.updateTaxSettings = catchAsyncError(async (req, res, next) => {
  const { gstEnabled, taxIncluded, defaultTaxRate } = req.body;

  const updates = { updatedBy: req.user._id };
  if (gstEnabled     !== undefined) updates["settings.tax.gstEnabled"]     = gstEnabled;
  if (taxIncluded    !== undefined) updates["settings.tax.taxIncluded"]    = taxIncluded;
  if (defaultTaxRate !== undefined) updates["settings.tax.defaultTaxRate"] = defaultTaxRate;

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true }
  ).select("settings.tax.gstEnabled settings.tax.taxIncluded settings.tax.defaultTaxRate");

  await _writeAudit(req, "UPDATE_TAX_SETTINGS", "setting", doc._id, "Tax settings updated.", { after: req.body });

  res.status(200).json({ success: true, tax: doc.settings.tax });
});

//* Add a new tax slab  POST /api/v1/configs/settings/tax/slabs
exports.addTaxSlab = catchAsyncError(async (req, res, next) => {
  if (req.body.rate === undefined) return next(new ErrorHandler("rate is required.", 400));

  const doc = await _getPlatformDoc();

  if (req.body.isDefault) {
    doc.settings.tax.slabs.forEach((s) => { s.isDefault = false; });
  }

  doc.settings.tax.slabs.push(req.body);
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, slabs: doc.settings.tax.slabs });
});

//* Update a tax slab by ID  PUT /api/v1/configs/settings/tax/slabs/:slabId
exports.updateTaxSlab = catchAsyncError(async (req, res, next) => {
  const doc  = await _getPlatformDoc();
  const slab = doc.settings.tax.slabs.id(req.params.slabId);
  if (!slab) return next(new ErrorHandler("Tax slab not found.", 404));

  if (req.body.isDefault) {
    doc.settings.tax.slabs.forEach((s) => { s.isDefault = false; });
  }

  Object.assign(slab, req.body);
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, slabs: doc.settings.tax.slabs });
});

//* Delete a tax slab  DELETE /api/v1/configs/settings/tax/slabs/:slabId
exports.deleteTaxSlab = catchAsyncError(async (req, res, next) => {
  const doc  = await _getPlatformDoc();
  const slab = doc.settings.tax.slabs.id(req.params.slabId);
  if (!slab) return next(new ErrorHandler("Tax slab not found.", 404));

  doc.settings.tax.slabs.pull({ _id: req.params.slabId });
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, slabs: doc.settings.tax.slabs });
});

/* ─────────────────────────────────────────────────────────────────────────────
   EMAIL TEMPLATES
───────────────────────────────────────────────────────────────────────────── */

//* Get all email templates  GET /api/v1/configs/settings/email/templates
exports.getEmailTemplates = catchAsyncError(async (req, res) => {
  const { isActive } = req.query;

  const doc = await Config.findOne({ type: "platform_settings" }).select("settings.email.templates");
  let templates = doc?.settings?.email?.templates || [];
  if (isActive !== undefined) templates = templates.filter((t) => t.isActive === (isActive === "true"));

  res.status(200).json({ success: true, count: templates.length, data: templates });
});

//* Create or replace an email template by key  POST /api/v1/configs/settings/email/templates
exports.upsertEmailTemplate = catchAsyncError(async (req, res, next) => {
  const { key, subject, htmlBody, textBody, variables } = req.body;
  if (!key || !subject || !htmlBody) return next(new ErrorHandler("key, subject and htmlBody are required.", 400));

  const doc = await _getPlatformDoc();

  const existing = doc.settings.email.templates.find((t) => t.key === key);
  if (existing) {
    existing.subject  = subject;
    existing.htmlBody = htmlBody;
    existing.textBody = textBody;
    existing.variables = variables || existing.variables;
    existing.updatedAt = new Date();
  } else {
    doc.settings.email.templates.push({ key, subject, htmlBody, textBody, variables: variables || [], updatedAt: new Date() });
  }

  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  await _writeAudit(req, "UPSERT_EMAIL_TEMPLATE", "setting", doc._id, `Email template "${key}" saved.`);

  res.status(200).json({ success: true, template: doc.settings.email.templates.find((t) => t.key === key) });
});

//* Toggle an email template active or inactive  PATCH /api/v1/configs/settings/email/templates/:templateId/toggle
exports.toggleEmailTemplate = catchAsyncError(async (req, res, next) => {
  const doc = await _getPlatformDoc();
  const tmpl = doc.settings.email.templates.id(req.params.templateId);
  if (!tmpl) return next(new ErrorHandler("Email template not found.", 404));

  tmpl.isActive  = !tmpl.isActive;
  tmpl.updatedAt = new Date();
  doc.updatedBy  = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, isActive: tmpl.isActive, key: tmpl.key });
});

/* ─────────────────────────────────────────────────────────────────────────────
   LOYALTY RULES & TIERS
───────────────────────────────────────────────────────────────────────────── */

//* Update loyalty global settings (points value, expiry, referral bonuses)  PATCH /api/v1/configs/settings/loyalty
exports.updateLoyaltySettings = catchAsyncError(async (req, res, next) => {
  const ALLOWED = ["enabled", "pointsExpiryDays", "pointsValue", "maxRedemptionPercent", "referralBonusBuyer", "referralBonusReferrer"];

  const updates = { updatedBy: req.user._id };
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[`settings.loyalty.${f}`] = req.body[f]; });

  if (Object.keys(updates).length === 1) return next(new ErrorHandler("No valid fields provided.", 400));

  const doc = await Config.findOneAndUpdate(
    { type: "platform_settings" },
    { $set: updates },
    { new: true, upsert: true }
  ).select("settings.loyalty.enabled settings.loyalty.pointsExpiryDays settings.loyalty.pointsValue settings.loyalty.maxRedemptionPercent settings.loyalty.referralBonusBuyer settings.loyalty.referralBonusReferrer");

  await _writeAudit(req, "UPDATE_LOYALTY_SETTINGS", "setting", doc._id, "Loyalty settings updated.", { after: req.body });

  res.status(200).json({ success: true, loyalty: doc.settings.loyalty });
});

//* Add a loyalty earn rule  POST /api/v1/configs/settings/loyalty/rules
exports.addLoyaltyRule = catchAsyncError(async (req, res, next) => {
  if (!req.body.action || req.body.pointsPerUnit === undefined) {
    return next(new ErrorHandler("action and pointsPerUnit are required.", 400));
  }

  const doc = await _getPlatformDoc();

  const exists = doc.settings.loyalty.rules.some((r) => r.action === req.body.action);
  if (exists) return next(new ErrorHandler(`Rule for action "${req.body.action}" already exists.`, 409));

  doc.settings.loyalty.rules.push(req.body);
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, rules: doc.settings.loyalty.rules });
});

//* Update a loyalty rule by ID  PUT /api/v1/configs/settings/loyalty/rules/:ruleId
exports.updateLoyaltyRule = catchAsyncError(async (req, res, next) => {
  const doc  = await _getPlatformDoc();
  const rule = doc.settings.loyalty.rules.id(req.params.ruleId);
  if (!rule) return next(new ErrorHandler("Loyalty rule not found.", 404));

  Object.assign(rule, req.body);
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, rules: doc.settings.loyalty.rules });
});

//* Delete a loyalty rule  DELETE /api/v1/configs/settings/loyalty/rules/:ruleId
exports.deleteLoyaltyRule = catchAsyncError(async (req, res, next) => {
  const doc = await _getPlatformDoc();
  if (!doc.settings.loyalty.rules.id(req.params.ruleId)) return next(new ErrorHandler("Loyalty rule not found.", 404));

  doc.settings.loyalty.rules.pull({ _id: req.params.ruleId });
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, rules: doc.settings.loyalty.rules });
});

//* Add a loyalty tier (bronze, silver, gold, platinum)  POST /api/v1/configs/settings/loyalty/tiers
exports.addLoyaltyTier = catchAsyncError(async (req, res, next) => {
  if (!req.body.name || req.body.minPoints === undefined) {
    return next(new ErrorHandler("name and minPoints are required.", 400));
  }

  const doc = await _getPlatformDoc();

  const exists = doc.settings.loyalty.tiers.some((t) => t.name === req.body.name);
  if (exists) return next(new ErrorHandler(`Tier "${req.body.name}" already exists.`, 409));

  doc.settings.loyalty.tiers.push(req.body);
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, tiers: doc.settings.loyalty.tiers });
});

//* Update a loyalty tier by ID  PUT /api/v1/configs/settings/loyalty/tiers/:tierId
exports.updateLoyaltyTier = catchAsyncError(async (req, res, next) => {
  const doc  = await _getPlatformDoc();
  const tier = doc.settings.loyalty.tiers.id(req.params.tierId);
  if (!tier) return next(new ErrorHandler("Loyalty tier not found.", 404));

  Object.assign(tier, req.body);
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, tiers: doc.settings.loyalty.tiers });
});

/* ─────────────────────────────────────────────────────────────────────────────
   WEBHOOKS
───────────────────────────────────────────────────────────────────────────── */

//* Get all webhooks with delivery stats  GET /api/v1/configs/webhooks
exports.getWebhooks = catchAsyncError(async (req, res) => {
  const { isActive } = req.query;

  const filter = { type: "webhook" };
  if (isActive !== undefined) filter["webhook.isActive"] = isActive === "true";

  const docs = await Config.find(filter).select("-webhook.deliveryLogs -webhook.secret");

  res.status(200).json({ success: true, count: docs.length, data: docs.map((d) => d.webhook) });
});

//* Create a new webhook endpoint  POST /api/v1/configs/webhooks
exports.createWebhook = catchAsyncError(async (req, res, next) => {
  const { name, url, events, secret, retryPolicy, headers } = req.body;
  if (!name || !url) return next(new ErrorHandler("name and url are required.", 400));

  const exists = await Config.findOne({ type: "webhook", "webhook.url": url });
  if (exists) return next(new ErrorHandler("A webhook with this URL already exists.", 409));

  const doc = await Config.create({
    type    : "webhook",
    updatedBy: req.user._id,
    webhook : { name, url, events: events || [], secret, retryPolicy, headers, isActive: true },
  });

  await _writeAudit(req, "CREATE_WEBHOOK", "setting", doc._id, `Webhook "${name}" created.`);

  const out = doc.webhook.toObject();
  delete out.secret;
  res.status(201).json({ success: true, data: out });
});

//* Get a webhook by ID  GET /api/v1/configs/webhooks/:id
exports.getWebhookById = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({ _id: req.params.id, type: "webhook" }).select("-webhook.secret");
  if (!doc) return next(new ErrorHandler("Webhook not found.", 404));

  res.status(200).json({ success: true, data: doc.webhook });
});

//* Update a webhook's config  PUT /api/v1/configs/webhooks/:id
exports.updateWebhook = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({ _id: req.params.id, type: "webhook" });
  if (!doc) return next(new ErrorHandler("Webhook not found.", 404));

  const ALLOWED = ["name", "url", "events", "secret", "retryPolicy", "headers"];
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) doc.webhook[f] = req.body[f]; });
  doc.updatedBy = req.user._id;
  await doc.save({ validateBeforeSave: false });

  await _writeAudit(req, "UPDATE_WEBHOOK", "setting", doc._id, `Webhook "${doc.webhook.name}" updated.`);

  const out = doc.webhook.toObject();
  delete out.secret;
  res.status(200).json({ success: true, data: out });
});

//* Toggle a webhook active or inactive  PATCH /api/v1/configs/webhooks/:id/toggle
exports.toggleWebhook = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({ _id: req.params.id, type: "webhook" });
  if (!doc) return next(new ErrorHandler("Webhook not found.", 404));

  doc.webhook.isActive = !doc.webhook.isActive;
  doc.updatedBy        = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, isActive: doc.webhook.isActive });
});

//* Delete a webhook  DELETE /api/v1/configs/webhooks/:id
exports.deleteWebhook = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOneAndDelete({ _id: req.params.id, type: "webhook" });
  if (!doc) return next(new ErrorHandler("Webhook not found.", 404));

  await _writeAudit(req, "DELETE_WEBHOOK", "setting", req.params.id, `Webhook "${doc.webhook.name}" deleted.`);

  res.status(200).json({ success: true, message: "Webhook deleted." });
});

//* Get delivery logs for a webhook with pagination  GET /api/v1/configs/webhooks/:id/logs
exports.getWebhookLogs = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const doc = await Config.findOne({ _id: req.params.id, type: "webhook" }).select("webhook.deliveryLogs webhook.totalDelivered webhook.totalFailed webhook.name");
  if (!doc) return next(new ErrorHandler("Webhook not found.", 404));

  let logs = [...(doc.webhook.deliveryLogs || [])].sort(
    (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
  );
  if (status) logs = logs.filter((l) => l.status === status);

  res.status(200).json({
    success        : true,
    webhookName    : doc.webhook.name,
    totalDelivered : doc.webhook.totalDelivered,
    totalFailed    : doc.webhook.totalFailed,
    total          : logs.length,
    page           : Number(page),
    pages          : Math.ceil(logs.length / Number(limit)),
    data           : logs.slice(skip, skip + Number(limit)),
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   AUDIT LOGS
───────────────────────────────────────────────────────────────────────────── */

//* Get all audit logs with filters and pagination  GET /api/v1/configs/audit-logs
exports.getAuditLogs = catchAsyncError(async (req, res) => {
  const {
    page = 1, limit = 30,
    adminId, targetType, action,
    from, to, search,
    sortOrder = "desc",
  } = req.query;

  const filter = { type: "audit_log" };

  if (adminId)    filter["audit.adminId"]    = adminId;
  if (targetType) filter["audit.targetType"] = targetType;
  if (action)     filter["audit.action"]     = new RegExp(action, "i");
  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [
      { "audit.adminName"   : re },
      { "audit.adminEmail"  : re },
      { "audit.description" : re },
      { "audit.action"      : re },
    ];
  }
  if (from || to) {
    filter["audit.timestamp"] = {};
    if (from) filter["audit.timestamp"].$gte = new Date(from);
    if (to)   filter["audit.timestamp"].$lte = new Date(to);
  }

  const skip      = (Number(page) - 1) * Number(limit);
  const direction = sortOrder === "asc" ? 1 : -1;

  const [docs, total] = await Promise.all([
    Config.find(filter).sort({ "audit.timestamp": direction }).skip(skip).limit(Number(limit)).select("audit createdAt"),
    Config.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : docs.map((d) => d.audit),
  });
});

//* Create an audit log entry manually (system / internal use)  POST /api/v1/configs/audit-logs
exports.createAuditLog = catchAsyncError(async (req, res, next) => {
  const { action, targetType, targetId, description, changes } = req.body;
  if (!action) return next(new ErrorHandler("action is required.", 400));

  const doc = await Config.create({
    type  : "audit_log",
    audit : {
      adminId    : req.user._id,
      adminName  : `${req.user.firstName} ${req.user.lastName}`,
      adminEmail : req.user.email,
      action,
      targetType,
      targetId   : String(targetId || ""),
      description,
      changes,
      ip         : req.ip,
      userAgent  : req.headers["user-agent"],
      timestamp  : new Date(),
    },
  });

  res.status(201).json({ success: true, data: doc.audit });
});

//* Get a single audit log entry by ID  GET /api/v1/configs/audit-logs/:id
exports.getAuditLogById = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({ _id: req.params.id, type: "audit_log" }).select("audit createdAt");
  if (!doc) return next(new ErrorHandler("Audit log not found.", 404));

  res.status(200).json({ success: true, data: doc.audit });
});

/* ─────────────────────────────────────────────────────────────────────────────
   CONTENT PAGES
───────────────────────────────────────────────────────────────────────────── */

//* Get all content entries with filter by type  GET /api/v1/configs/content
exports.getContentPages = catchAsyncError(async (req, res) => {
  const { contentType, isActive, page = 1, limit = 20 } = req.query;

  const filter = { type: "content_page" };
  if (contentType) filter["content.contentType"] = contentType;
  if (isActive !== undefined) filter["content.isActive"] = isActive === "true";

  const skip = (Number(page) - 1) * Number(limit);

  const [docs, total] = await Promise.all([
    Config.find(filter)
      .select("content createdAt updatedAt")
      .sort({ "content.position": 1 })
      .skip(skip)
      .limit(Number(limit)),
    Config.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : docs.map((d) => ({ _id: d._id, ...d.content.toObject(), updatedAt: d.updatedAt })),
  });
});

//* Create a content page, FAQ, redirect, or banner  POST /api/v1/configs/content
exports.createContentPage = catchAsyncError(async (req, res, next) => {
  if (!req.body.contentType) return next(new ErrorHandler("contentType is required.", 400));

  if (req.body.slug) {
    const slugExists = await Config.findOne({ type: "content_page", "content.slug": req.body.slug.toLowerCase() });
    if (slugExists) return next(new ErrorHandler("A content page with this slug already exists.", 409));
  }

  const doc = await Config.create({
    type      : "content_page",
    updatedBy : req.user._id,
    content   : { ...req.body, updatedAt: new Date() },
  });

  await _writeAudit(req, "CREATE_CONTENT", "setting", doc._id, `Content "${req.body.contentType}" created.`);

  res.status(201).json({ success: true, data: doc.content });
});

//* Get a content page by ID  GET /api/v1/configs/content/:id
exports.getContentPageById = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({ _id: req.params.id, type: "content_page" }).select("content updatedAt");
  if (!doc) return next(new ErrorHandler("Content page not found.", 404));

  res.status(200).json({ success: true, data: doc.content });
});

//* Update a content page by ID  PUT /api/v1/configs/content/:id
exports.updateContentPage = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({ _id: req.params.id, type: "content_page" });
  if (!doc) return next(new ErrorHandler("Content page not found.", 404));

  const ALLOWED = [
    "title", "content", "slug", "question", "answer", "faqCategory",
    "fromUrl", "toUrl", "redirectCode", "bannerUrl", "linkUrl",
    "targetScreen", "position", "isActive", "metaTitle", "metaDescription",
  ];
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) doc.content[f] = req.body[f]; });
  doc.content.updatedAt = new Date();
  doc.updatedBy         = req.user._id;
  await doc.save({ validateBeforeSave: false });

  await _writeAudit(req, "UPDATE_CONTENT", "setting", doc._id, `Content "${doc.content.contentType}" updated.`);

  res.status(200).json({ success: true, data: doc.content });
});

//* Toggle a content page active or inactive  PATCH /api/v1/configs/content/:id/toggle
exports.toggleContentPage = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOne({ _id: req.params.id, type: "content_page" });
  if (!doc) return next(new ErrorHandler("Content page not found.", 404));

  doc.content.isActive  = !doc.content.isActive;
  doc.content.updatedAt = new Date();
  doc.updatedBy         = req.user._id;
  await doc.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, isActive: doc.content.isActive });
});

//* Delete a content page  DELETE /api/v1/configs/content/:id
exports.deleteContentPage = catchAsyncError(async (req, res, next) => {
  const doc = await Config.findOneAndDelete({ _id: req.params.id, type: "content_page" });
  if (!doc) return next(new ErrorHandler("Content page not found.", 404));

  await _writeAudit(req, "DELETE_CONTENT", "setting", req.params.id, `Content "${doc.content.contentType}" deleted.`);

  res.status(200).json({ success: true, message: "Content page deleted." });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GENERIC KEY-VALUE CONFIG
───────────────────────────────────────────────────────────────────────────── */

//* Get all configs (admin, supports group and type filter)  GET /api/v1/configs
exports.getAllConfigs = catchAsyncError(async (req, res) => {
  const { type, group, isPublic, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (type)     filter.type     = type;
  if (group)    filter.group    = group;
  if (isPublic !== undefined) filter.isPublic = isPublic === "true";

  const skip = (Number(page) - 1) * Number(limit);

  const [docs, total] = await Promise.all([
    Config.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Config.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : docs,
  });
});

//* Get a key-value config by key (public if isPublic=true)  GET /api/v1/configs/key/:key
exports.getConfigByKey = catchAsyncError(async (req, res, next) => {
  const config = await Config.findOne({ key: req.params.key });
  if (!config) return next(new ErrorHandler("Config not found.", 404));

  if (!config.isPublic && (!req.user || req.user.role !== "admin")) {
    return next(new ErrorHandler("Not authorised to view this config.", 403));
  }

  res.status(200).json({ success: true, data: config });
});

//* Create a new key-value config entry  POST /api/v1/configs
exports.createConfig = catchAsyncError(async (req, res, next) => {
  if (!req.body.type) return next(new ErrorHandler("type is required.", 400));

  if (req.body.key) {
    const exists = await Config.findOne({ key: req.body.key });
    if (exists) return next(new ErrorHandler(`Config key "${req.body.key}" already exists.`, 409));
  }

  req.body.updatedBy = req.user._id;
  const config = await Config.create(req.body);

  await _writeAudit(req, "CREATE_CONFIG", "setting", config._id, `Config "${req.body.key || req.body.type}" created.`);

  res.status(201).json({ success: true, data: config });
});

//* Update a key-value config by key  PUT /api/v1/configs/key/:key
exports.updateConfigByKey = catchAsyncError(async (req, res, next) => {
  const before = await Config.findOne({ key: req.params.key });
  if (!before) return next(new ErrorHandler("Config not found.", 404));

  req.body.updatedBy = req.user._id;

  const config = await Config.findOneAndUpdate(
    { key: req.params.key },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  await _writeAudit(req, "UPDATE_CONFIG", "setting", config._id, `Config "${req.params.key}" updated.`, {
    before: { value: before.value },
    after : { value: req.body.value },
  });

  res.status(200).json({ success: true, data: config });
});

//* Delete a key-value config by key  DELETE /api/v1/configs/key/:key
exports.deleteConfigByKey = catchAsyncError(async (req, res, next) => {
  const config = await Config.findOneAndDelete({ key: req.params.key });
  if (!config) return next(new ErrorHandler("Config not found.", 404));

  await _writeAudit(req, "DELETE_CONFIG", "setting", config._id, `Config "${req.params.key}" deleted.`);

  res.status(200).json({ success: true, message: "Config deleted." });
});