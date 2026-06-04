const express = require("express");
const userController = require("../controllers/userController");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

const router = express.Router();

// =========================================================================
// PUBLIC ROUTES
// =========================================================================

// Auth & Registration
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.post("/refresh-token", userController.refreshAccessToken);

// Email Verification
router.post("/verify-email", userController.verifyEmail);
router.get("/verify-email/:token", userController.verifyEmailByToken);

// Password Management (Public)
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);


// =========================================================================
// AUTHENTICATED USER ROUTES
// =========================================================================
router.use(isAuthenticated); // Apply to all routes below

// Session
router.post("/logout", userController.logoutUser);
router.post("/logout-all", userController.logoutAllDevices);

// Email Verification (Initiate)
router.post("/send-email-verification", userController.sendEmailVerification);

// Password Management (Private)
router.route("/change-password")
  .post(userController.changePassword)
  .patch(userController.changePassword);

// Profile
router.route("/me")
  .get(userController.getMyProfile)
  .put(userController.updateProfile);
router.put("/me/avatar", userController.updateAvatar);
router.put("/me/measurements", userController.updateBodyMeasurements);

// Addresses
router.route("/addresses")
  .get(userController.getAddresses)
  .post(userController.addAddress);
router.route("/addresses/:addressId")
  .put(userController.updateAddress)
  .delete(userController.deleteAddress);

// Wishlist
router.route("/wishlist")
  .get(userController.getWishlist)
  .post(userController.addToWishlist)
  .delete(userController.clearWishlist);
router.delete("/wishlist/:productId", userController.removeFromWishlist);
router.post("/wishlist/:productId", userController.addToWishlist);

// Notifications
router.route("/notifications")
  .get(userController.getNotifications);
router.route("/notifications/read-all")
  .put(userController.markAllNotificationsRead)
  .patch(userController.markAllNotificationsRead);
router.route("/notifications/:notifId")
  .get(userController.getNotificationById)
  .delete(userController.deleteNotification);
router.route("/notifications/:notifId/read")
  .put(userController.markNotificationRead)
  .patch(userController.markNotificationRead);
router.route("/notification-preferences")
  .put(userController.updateNotificationPreferences)
  .patch(userController.updateNotificationPreferences);

// Wallet & Loyalty
router.get("/wallet", userController.getWallet);
router.get("/loyalty", userController.getLoyalty);

// Search & Recently Viewed
router.route("/search-history")
  .get(userController.getSearchHistory)
  .delete(userController.clearSearchHistory);
router.route("/recently-viewed")
  .get(userController.getRecentlyViewed)
  .post(userController.addRecentlyViewed);

// Referral
router.get("/referral", userController.getReferralInfo);

// Account Deletion
router.post("/request-deletion", userController.requestAccountDeletion);
router.post("/cancel-deletion", userController.cancelAccountDeletion);

// Push Tokens
router.post("/push-token", userController.registerPushToken);
router.delete("/push-token/:token", userController.deregisterPushToken);


// =========================================================================
// ADMIN ROUTES
// =========================================================================
router.use(isAdmin); // Apply admin check to all routes below

router.route("/admin")
  .get(userController.adminGetAllUsers);

router.route("/admin/:id")
  .get(userController.adminGetUser)
  .put(userController.adminUpdateUser)
  .delete(userController.adminDeleteUser);

router.route("/admin/:id/suspend")
  .put(userController.adminSuspendUser)
  .patch(userController.adminSuspendUser);
router.route("/admin/:id/unsuspend")
  .put(userController.adminUnsuspendUser)
  .patch(userController.adminUnsuspendUser);
router.route("/admin/:id/wallet")
  .post(userController.adminAdjustWallet)
  .patch(userController.adminAdjustWallet);
router.route("/admin/:id/loyalty")
  .post(userController.adminAdjustLoyalty)
  .patch(userController.adminAdjustLoyalty);

module.exports = router;
