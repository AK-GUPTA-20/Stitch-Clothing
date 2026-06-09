const express = require("express");
const {
  getProducts,
  getFeaturedProducts,
  searchProducts,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  getProductsBySeller,
  incrementViewCount,
  incrementShareCount,

  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  submitForApproval,

  approveProduct,
  rejectProduct,
  toggleFeatured,
  bulkUpdateStatus,
  bulkDeleteProducts,

  addVariant,
  updateVariant,
  deleteVariant,
  updateVariantStock,

  addImages,
  deleteImage,
  reorderImages,

  getReviews,
  addReview,
  markReviewHelpful,
  deleteReview,
  addSellerReply,
  updateReviewStatus,

  updateModel3D,
  updateViewerConfig,
} = require("./product.controller");

const { isAuthenticated, isAuthorized, isVerifiedSeller } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

const router = express.Router();

// Public routes
router.route("/")
  .get(getProducts)
  .post(isAuthenticated, isVerifiedSeller, createProduct);

router.get("/featured", getFeaturedProducts);
router.get("/search", searchProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/seller/:sellerId", getProductsBySeller);

// Bulk admin operations
router.patch("/bulk/status", isAuthenticated, isAuthorized("admin"), bulkUpdateStatus);
router.delete("/bulk", isAuthenticated, isAuthorized("admin"), bulkDeleteProducts);

// Single-product routes
router.route("/:id")
  .get(getProductById)
  .put(isAuthenticated, isVerifiedSeller, updateProduct)
  .delete(isAuthenticated, isVerifiedSeller, deleteProduct);

router.patch("/:id/restore", isAuthenticated, isAuthorized("admin"), restoreProduct);
router.patch("/:id/submit", isAuthenticated, isVerifiedSeller, submitForApproval);

// Engagement
router.patch("/:id/view", incrementViewCount);
router.patch("/:id/share", incrementShareCount);
router.get("/:id/related", getRelatedProducts);

// Admin moderation
router.patch("/:id/approve", isAuthenticated, isAuthorized("admin"), approveProduct);
router.patch("/:id/reject", isAuthenticated, isAuthorized("admin"), rejectProduct);
router.patch("/:id/feature", isAuthenticated, isAuthorized("admin"), toggleFeatured);

// Variant routes
router.post("/:id/variants", isAuthenticated, isVerifiedSeller, addVariant);
router.route("/:id/variants/:variantId")
  .put(isAuthenticated, isVerifiedSeller, updateVariant)
  .delete(isAuthenticated, isVerifiedSeller, deleteVariant);
router.patch("/:id/variants/:variantId/stock", isAuthenticated, isVerifiedSeller, updateVariantStock);

// Image routes
router.post("/:id/images", isAuthenticated, isVerifiedSeller, upload.array("images"), addImages);
router.put("/:id/images/reorder", isAuthenticated, isVerifiedSeller, reorderImages);
router.delete("/:id/images/:imageId", isAuthenticated, isVerifiedSeller, deleteImage);

// Review routes
router.route("/:id/reviews")
  .get(getReviews)
  .post(isAuthenticated, addReview);
router.patch("/:id/reviews/:reviewId/helpful", isAuthenticated, markReviewHelpful);
router.delete("/:id/reviews/:reviewId", isAuthenticated, deleteReview);
router.post("/:id/reviews/:reviewId/reply", isAuthenticated, isVerifiedSeller, addSellerReply);
router.patch("/:id/reviews/:reviewId/status", isAuthenticated, isAuthorized("admin"), updateReviewStatus);

// 3D model routes
router.put("/:id/model3d", isAuthenticated, isVerifiedSeller, updateModel3D);
router.patch("/:id/model3d/viewer-config", isAuthenticated, isVerifiedSeller, updateViewerConfig);

module.exports = router;
