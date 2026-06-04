"use strict";

const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderByRef,
  cancelOrder,
  cancelOrderItem,
  requestReturn,
  requestRefund,
  getInvoice,
  verifyPayment,
  updatePaymentStatus,
  verifyCOD,
  getSellerOrders,
  confirmOrder,
  processOrder,
  markPacked,
  dispatchOrder,
  updateTracking,
  getAllOrders,
  updateOrderStatus,
  markDelivered,
  generateInvoice,
  adminCancelOrder,
  getRefunds,
  updateRefundStatus,
  updateReturnStatus,
  getOrderAnalytics,
  sellerCancelOrder,
  sellerDeliverOrder,
  sellerUpdateReturnStatus,
  sellerUpdateStatus,
} = require("../controllers/orderController");

const { isAuthenticated, isAdmin, isAuthorized } = require("../middleware/auth");

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC
 ───────────────────────────────────────────────────────────────────────────── */

router.post(   "/",                           isAuthenticated,                       createOrder     );
router.get(    "/my",                         isAuthenticated,                       getMyOrders     );
router.get(    "/ref/:orderId",               isAuthenticated,                       getOrderByRef   );
router.get(    "/analytics",                  isAuthenticated, isAdmin,              getOrderAnalytics );
router.get(    "/seller",                     isAuthenticated, isAuthorized(["seller", "admin"]), getSellerOrders  );
router.get(    "/:id",                        isAuthenticated,                       getOrderById    );
router.patch(  "/:id/cancel",                 isAuthenticated,                       cancelOrder     );
router.patch(  "/:id/items/:itemId/cancel",   isAuthenticated,                       cancelOrderItem );

/* ─────────────────────────────────────────────────────────────────────────────
   USER — RETURN & REFUND
 ───────────────────────────────────────────────────────────────────────────── */

router.post(  "/:id/return",   isAuthenticated, requestReturn  );
router.post(  "/:id/refund",   isAuthenticated, requestRefund  );
router.get(   "/:id/invoice",  isAuthenticated, getInvoice     );
router.get(   "/:id/refunds",  isAuthenticated, getRefunds     );

/* ─────────────────────────────────────────────────────────────────────────────
   PAYMENT
 ───────────────────────────────────────────────────────────────────────────── */

router.post(  "/:id/payment/verify",        isAuthenticated,                       verifyPayment       );
router.patch( "/:id/payment/status",        isAuthenticated, isAdmin,              updatePaymentStatus  );
router.patch( "/:id/payment/cod/verify",    isAuthenticated, isAdmin,              verifyCOD            );

/* ─────────────────────────────────────────────────────────────────────────────
   SELLER FLOW
 ───────────────────────────────────────────────────────────────────────────── */

router.patch( "/:id/confirm",  isAuthenticated, isAuthorized(["seller", "admin"]), confirmOrder     );
router.patch( "/:id/process",  isAuthenticated, isAuthorized(["seller", "admin"]), processOrder     );
router.patch( "/:id/pack",     isAuthenticated, isAuthorized(["seller", "admin"]), markPacked       );
router.patch( "/:id/dispatch", isAuthenticated, isAuthorized(["seller", "admin"]), dispatchOrder    );
router.patch( "/:id/tracking", isAuthenticated, isAuthorized(["seller", "admin"]), updateTracking   );
router.patch( "/:id/seller/cancel", isAuthenticated, isAuthorized(["seller", "admin"]), sellerCancelOrder );
router.patch( "/:id/seller/deliver", isAuthenticated, isAuthorized(["seller", "admin"]), sellerDeliverOrder );
router.patch( "/:id/seller/return", isAuthenticated, isAuthorized(["seller", "admin"]), sellerUpdateReturnStatus );
router.patch( "/:id/seller/status", isAuthenticated, isAuthorized(["seller", "admin"]), sellerUpdateStatus );

/* -----------------------------------------------------------------------------
   ADMIN - ORDER MANAGEMENT
----------------------------------------------------------------------------- */

router.get(   "/",                       isAuthenticated, isAdmin, getAllOrders        );
router.patch( "/:id/status",             isAuthenticated, isAdmin, updateOrderStatus   );
router.patch( "/:id/deliver",            isAuthenticated, isAdmin, markDelivered       );
router.patch( "/:id/invoice",            isAuthenticated, isAdmin, generateInvoice     );
router.patch( "/:id/admin/cancel",       isAuthenticated, isAdmin, adminCancelOrder    );

/* -----------------------------------------------------------------------------
   ADMIN - REFUND & RETURN
----------------------------------------------------------------------------- */

router.patch( "/:id/refunds/:refundId/status",  isAuthenticated, isAdmin, updateRefundStatus  );
router.patch( "/:id/return/status",             isAuthenticated, isAdmin, updateReturnStatus  );

module.exports = router;
