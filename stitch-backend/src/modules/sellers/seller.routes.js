"use strict";

const express = require("express");
const {
  getSellers,
  getSellerById,
  getSellerBySlug,
  registerSeller,
  getMyProfile,
  updateBusinessInfo,
  updateStore,
  updateShippingPreference,
  updateNotificationPreferences,
  updatePayoutSettings,
  uploadDocument,
  getDocuments,
  deleteDocument,
  updateBankDetails,
  getBankDetails,
  getWallet,
  requestPayout,
  getMyPayouts,
  getWarehouses,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse,
  setDefaultWarehouse,
  getSellerAnalytics,
  adminGetAllSellers,
  adminGetSeller,
  verifySeller,
  suspendSeller,
  unsuspendSeller,
  deleteSeller,
  updateDocumentStatus,
  verifyBankDetails,
  updateCommissionRate,
  updateSellerLevel,
  processPayoutAdmin,
  adminAdjustWallet,
  refreshAnalyticsCache,
  getSellerDashboard,
  getPublicSellerAnalytics,
  getMyNotifications,
  markNotificationAsRead,
} = require("./seller.controller");

const { isAuthenticated, isAdmin, isAuthorized } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────────────────────────────────────── */

router.get(  "/",               getSellers      );
router.get(  "/slug/:slug",     getSellerBySlug );
router.get(  "/slug/:slug/analytics", getPublicSellerAnalytics );
// Note: /:id is moved down to prevent intercepting /me

/* ─────────────────────────────────────────────────────────────────────────────
   SELLER — ONBOARDING & PROFILE
───────────────────────────────────────────────────────────────────────────── */

router.post(  "/register",                    isAuthenticated,                            registerSeller                );
router.get(   "/me",                          isAuthenticated, isAuthorized(["seller", "admin"]), getMyProfile          );
router.patch( "/me/business",                 isAuthenticated, isAuthorized(["seller", "admin"]), updateBusinessInfo     );
router.patch( "/me/store",                    isAuthenticated, isAuthorized(["seller", "admin"]), updateStore            );
router.patch( "/me/shipping",                 isAuthenticated, isAuthorized(["seller", "admin"]), updateShippingPreference);
router.patch( "/me/notification-preferences", isAuthenticated, isAuthorized(["seller", "admin"]), updateNotificationPreferences);
router.patch( "/me/payout-settings",          isAuthenticated, isAuthorized(["seller", "admin"]), updatePayoutSettings   );

/* ─────────────────────────────────────────────────────────────────────────────
   KYC DOCUMENTS
───────────────────────────────────────────────────────────────────────────── */

router.route("/me/documents")
  .post( isAuthenticated, isAuthorized(["seller", "admin"]), upload.single("file"), uploadDocument )
  .get(  isAuthenticated, isAuthorized(["seller", "admin"]), getDocuments   );

router.delete( "/me/documents/:docId", isAuthenticated, isAuthorized(["seller", "admin"]), deleteDocument );

/* ─────────────────────────────────────────────────────────────────────────────
   BANK DETAILS
───────────────────────────────────────────────────────────────────────────── */

router.route("/me/bank")
  .put( isAuthenticated, isAuthorized(["seller", "admin"]), updateBankDetails )
  .get( isAuthenticated, isAuthorized(["seller", "admin"]), getBankDetails    );

/* ─────────────────────────────────────────────────────────────────────────────
   WALLET & LEDGER
───────────────────────────────────────────────────────────────────────────── */

router.get( "/me/wallet", isAuthenticated, isAuthorized(["seller", "admin"]), getWallet );

/* ─────────────────────────────────────────────────────────────────────────────
   PAYOUTS
───────────────────────────────────────────────────────────────────────────── */

router.route("/me/payouts")
  .post( isAuthenticated, isAuthorized(["seller", "admin"]), requestPayout )
  .get(  isAuthenticated, isAuthorized(["seller", "admin"]), getMyPayouts  );

/* ─────────────────────────────────────────────────────────────────────────────
   WAREHOUSES
───────────────────────────────────────────────────────────────────────────── */

router.route("/me/warehouses")
  .get(  isAuthenticated, isAuthorized(["seller", "admin"]), getWarehouses )
  .post( isAuthenticated, isAuthorized(["seller", "admin"]), addWarehouse  );

router.route("/me/warehouses/:warehouseId")
  .put(    isAuthenticated, isAuthorized(["seller", "admin"]), updateWarehouse )
  .delete( isAuthenticated, isAuthorized(["seller", "admin"]), deleteWarehouse );

router.patch( "/me/warehouses/:warehouseId/default", isAuthenticated, isAuthorized(["seller", "admin"]), setDefaultWarehouse );

/* ─────────────────────────────────────────────────────────────────────────────
   ANALYTICS & DASHBOARD
───────────────────────────────────────────────────────────────────────────── */

router.get( "/me/dashboard", isAuthenticated, isAuthorized(["seller", "admin"]), getSellerDashboard );
router.get( "/me/analytics", isAuthenticated, isAuthorized(["seller", "admin"]), getSellerAnalytics );

/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATIONS
───────────────────────────────────────────────────────────────────────────── */

router.get( "/me/notifications", isAuthenticated, isAuthorized(["seller", "admin"]), getMyNotifications );
router.patch( "/me/notifications/:notificationId/read", isAuthenticated, isAuthorized(["seller", "admin"]), markNotificationAsRead );

/* ─────────────────────────────────────────────────────────────────────────────
   FALLBACK PUBLIC ROUTE (/:id) - MOVED TO BOTTOM
───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — SELLER MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */

router.get(    "/admin",     isAuthenticated, isAdmin, adminGetAllSellers );
router.get(    "/admin/:id", isAuthenticated, isAdmin, adminGetSeller     );
router.delete( "/admin/:id", isAuthenticated, isAdmin, deleteSeller       );

router.patch( "/admin/:id/verify",            isAuthenticated, isAdmin, verifySeller          );
router.patch( "/admin/:id/suspend",           isAuthenticated, isAdmin, suspendSeller         );
router.patch( "/admin/:id/unsuspend",         isAuthenticated, isAdmin, unsuspendSeller       );
router.patch( "/admin/:id/commission",        isAuthenticated, isAdmin, updateCommissionRate  );
router.patch( "/admin/:id/level",             isAuthenticated, isAdmin, updateSellerLevel     );
router.patch( "/admin/:id/bank/verify",       isAuthenticated, isAdmin, verifyBankDetails     );
router.patch( "/admin/:id/wallet/adjust",     isAuthenticated, isAdmin, adminAdjustWallet     );
router.patch( "/admin/:id/analytics/refresh", isAuthenticated, isAdmin, refreshAnalyticsCache );

router.patch( "/admin/:id/documents/:docId/status",   isAuthenticated, isAdmin, updateDocumentStatus );
router.patch( "/admin/:id/payouts/:payoutId/status",  isAuthenticated, isAdmin, processPayoutAdmin   );

/* ─────────────────────────────────────────────────────────────────────────────
   FALLBACK PUBLIC ROUTE (/:id)
───────────────────────────────────────────────────────────────────────────── */
router.get( "/:id", getSellerById );

module.exports = router;
