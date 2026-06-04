"use strict";

const express = require("express");
const {
  getPublicSettings,
  getPublicConfigByKey,
  getPublicFAQs,
  getContentBySlug,
  getPlatformSettings,
  updateGeneralSettings,
  toggleMaintenanceMode,
  updateShippingSettings,
  updatePaymentSettings,
  updateEmailSettings,
  updateSmsSettings,
  updateViewer3DSettings,
  getPaymentGateways,
  addPaymentGateway,
  updatePaymentGateway,
  setPrimaryGateway,
  deletePaymentGateway,
  updateTaxSettings,
  addTaxSlab,
  updateTaxSlab,
  deleteTaxSlab,
  getEmailTemplates,
  upsertEmailTemplate,
  toggleEmailTemplate,
  updateLoyaltySettings,
  addLoyaltyRule,
  updateLoyaltyRule,
  deleteLoyaltyRule,
  addLoyaltyTier,
  updateLoyaltyTier,
  getWebhooks,
  createWebhook,
  getWebhookById,
  updateWebhook,
  toggleWebhook,
  deleteWebhook,
  getWebhookLogs,
  getAuditLogs,
  createAuditLog,
  getAuditLogById,
  getContentPages,
  createContentPage,
  getContentPageById,
  updateContentPage,
  toggleContentPage,
  deleteContentPage,
  getAllConfigs,
  getConfigByKey,
  createConfig,
  updateConfigByKey,
  deleteConfigByKey,
} = require("../controllers/configController");

const { isAuthenticated, isAdmin } = require("../middleware/auth");

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────────────────────────────────────── */

router.get( "/public",             getPublicSettings      );
router.get( "/public/:key",        getPublicConfigByKey   );
router.get( "/content/faqs",       getPublicFAQs          );
router.get( "/content/slug/:slug", getContentBySlug       );

/* ─────────────────────────────────────────────────────────────────────────────
   PLATFORM SETTINGS
───────────────────────────────────────────────────────────────────────────── */

router.get(   "/settings",              isAuthenticated, isAdmin, getPlatformSettings     );
router.patch( "/settings/general",      isAuthenticated, isAdmin, updateGeneralSettings   );
router.patch( "/settings/maintenance",  isAuthenticated, isAdmin, toggleMaintenanceMode   );
router.patch( "/settings/shipping",     isAuthenticated, isAdmin, updateShippingSettings  );
router.patch( "/settings/payment",      isAuthenticated, isAdmin, updatePaymentSettings   );
router.patch( "/settings/email",        isAuthenticated, isAdmin, updateEmailSettings     );
router.patch( "/settings/sms",          isAuthenticated, isAdmin, updateSmsSettings       );
router.patch( "/settings/viewer3d",     isAuthenticated, isAdmin, updateViewer3DSettings  );

/* ─────────────────────────────────────────────────────────────────────────────
   PAYMENT GATEWAYS
───────────────────────────────────────────────────────────────────────────── */

router.route("/settings/payment/gateways")
  .get(  isAuthenticated, isAdmin, getPaymentGateways )
  .post( isAuthenticated, isAdmin, addPaymentGateway  );

router.route("/settings/payment/gateways/:gatewayId")
  .put(    isAuthenticated, isAdmin, updatePaymentGateway )
  .delete( isAuthenticated, isAdmin, deletePaymentGateway );

router.patch( "/settings/payment/gateways/:gatewayId/primary", isAuthenticated, isAdmin, setPrimaryGateway );

/* ─────────────────────────────────────────────────────────────────────────────
   TAX SETTINGS & SLABS
───────────────────────────────────────────────────────────────────────────── */

router.patch( "/settings/tax",          isAuthenticated, isAdmin, updateTaxSettings );
router.post(  "/settings/tax/slabs",    isAuthenticated, isAdmin, addTaxSlab        );
router.put(   "/settings/tax/slabs/:slabId",    isAuthenticated, isAdmin, updateTaxSlab );
router.delete("/settings/tax/slabs/:slabId",    isAuthenticated, isAdmin, deleteTaxSlab );

/* ─────────────────────────────────────────────────────────────────────────────
   EMAIL TEMPLATES
───────────────────────────────────────────────────────────────────────────── */

router.route("/settings/email/templates")
  .get(  isAuthenticated, isAdmin, getEmailTemplates   )
  .post( isAuthenticated, isAdmin, upsertEmailTemplate );

router.patch( "/settings/email/templates/:templateId/toggle", isAuthenticated, isAdmin, toggleEmailTemplate );

/* ─────────────────────────────────────────────────────────────────────────────
   LOYALTY SETTINGS, RULES & TIERS
───────────────────────────────────────────────────────────────────────────── */

router.patch(  "/settings/loyalty",              isAuthenticated, isAdmin, updateLoyaltySettings );
router.route("/settings/loyalty/rules")
  .post( isAuthenticated, isAdmin, addLoyaltyRule );

router.route("/settings/loyalty/rules/:ruleId")
  .put(    isAuthenticated, isAdmin, updateLoyaltyRule )
  .delete( isAuthenticated, isAdmin, deleteLoyaltyRule );

router.post( "/settings/loyalty/tiers",          isAuthenticated, isAdmin, addLoyaltyTier  );
router.put(  "/settings/loyalty/tiers/:tierId",  isAuthenticated, isAdmin, updateLoyaltyTier );

/* ─────────────────────────────────────────────────────────────────────────────
   WEBHOOKS
───────────────────────────────────────────────────────────────────────────── */

router.route("/webhooks")
  .get(  isAuthenticated, isAdmin, getWebhooks   )
  .post( isAuthenticated, isAdmin, createWebhook );

router.route("/webhooks/:id")
  .get(    isAuthenticated, isAdmin, getWebhookById )
  .put(    isAuthenticated, isAdmin, updateWebhook  )
  .delete( isAuthenticated, isAdmin, deleteWebhook  );

router.patch( "/webhooks/:id/toggle", isAuthenticated, isAdmin, toggleWebhook  );
router.get(   "/webhooks/:id/logs",   isAuthenticated, isAdmin, getWebhookLogs );

/* ─────────────────────────────────────────────────────────────────────────────
   AUDIT LOGS
───────────────────────────────────────────────────────────────────────────── */

router.route("/audit-logs")
  .get(  isAuthenticated, isAdmin, getAuditLogs   )
  .post( isAuthenticated, isAdmin, createAuditLog );

router.get( "/audit-logs/:id", isAuthenticated, isAdmin, getAuditLogById );

/* ─────────────────────────────────────────────────────────────────────────────
   CONTENT PAGES (admin CRUD — public read via /public routes above)
───────────────────────────────────────────────────────────────────────────── */

router.route("/content")
  .get(  isAuthenticated, isAdmin, getContentPages  )
  .post( isAuthenticated, isAdmin, createContentPage );

router.route("/content/:id")
  .get(    isAuthenticated, isAdmin, getContentPageById )
  .put(    isAuthenticated, isAdmin, updateContentPage  )
  .delete( isAuthenticated, isAdmin, deleteContentPage  );

router.patch( "/content/:id/toggle", isAuthenticated, isAdmin, toggleContentPage );

/* ─────────────────────────────────────────────────────────────────────────────
   GENERIC KEY-VALUE CONFIGS
───────────────────────────────────────────────────────────────────────────── */

router.route("/")
  .get(  isAuthenticated, isAdmin, getAllConfigs )
  .post( isAuthenticated, isAdmin, createConfig );

router.route("/key/:key")
  .get(    getConfigByKey  )  // public if isPublic=true, else requires admin
  .put(    isAuthenticated, isAdmin, updateConfigByKey )
  .delete( isAuthenticated, isAdmin, deleteConfigByKey );

module.exports = router;