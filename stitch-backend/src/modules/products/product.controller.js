"use strict";

const path            = require("path");
const asyncHandler = require("../../middleware/asyncHandler");
const ErrorHandler    = require("../../middleware/error");
const Product         = require("../../models/Product");
const Config          = require("../../models/Config");
const Notification    = require("../../models/Notification");
const Seller          = require("../../models/Seller");
const { uploadToImageKit } = require("../../utils/imagekit");
const ResponseFormatter = require("../../utils/responseFormatter");


/** Recompute averageRating, totalRatings, totalReviews, ratingDistribution, sizeAccuracySummary */
function _recomputeRatings(product) {
  const approved = product.reviews.filter((r) => r.status === "approved");

  product.totalReviews = approved.length;
  product.totalRatings = approved.length;

  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sizeAcc = { runs_small: 0, true_to_size: 0, runs_large: 0 };
  let sum = 0;

  for (const r of approved) {
    dist[r.rating] = (dist[r.rating] || 0) + 1;
    sum += r.rating;
    if (r.sizeAccuracy && sizeAcc[r.sizeAccuracy] !== undefined) {
      sizeAcc[r.sizeAccuracy] += 1;
    }
  }

  product.ratingDistribution  = dist;
  product.sizeAccuracySummary = sizeAcc;
  product.averageRating       = approved.length ? Math.round((sum / approved.length) * 10) / 10 : 0;
}

function _serializeReview(review, productId) {
  const sellerReply = review.sellerReply || {};
  const reply = sellerReply.text
    ? {
        content  : sellerReply.text,
        createdAt: sellerReply.repliedAt || review.updatedAt || review.createdAt,
        isEdited : sellerReply.isEdited,
        editedAt : sellerReply.editedAt,
      }
    : undefined;

  return {
    _id                : review._id,
    product            : productId || review.product,
    user               : {
      _id   : review.userId,
      name  : review.userName || "Anonymous",
      avatar: review.userAvatar,
    },
    rating             : review.rating,
    title              : review.title,
    content            : review.body,
    helpfulCount       : review.helpfulCount || 0,
    status             : review.status,
    reply,
    sellerReply        : reply
      ? {
          text      : sellerReply.text,
          repliedAt : sellerReply.repliedAt,
          isEdited  : sellerReply.isEdited,
          editedAt  : sellerReply.editedAt,
        }
      : undefined,
    isVerifiedPurchase : review.isVerifiedPurchase,
    createdAt          : review.createdAt,
    updatedAt          : review.updatedAt,
    userId             : review.userId,
    userName           : review.userName,
    userAvatar         : review.userAvatar,
    orderId            : review.orderId,
    orderItemId        : review.orderItemId,
    pros               : review.pros,
    cons               : review.cons,
    images             : review.images,
    videoUrl           : review.videoUrl,
    sizeAccuracy       : review.sizeAccuracy,
    helpfulUserIds     : review.helpfulUserIds,
    isAnonymous        : review.isAnonymous,
    rejectionReason    : review.rejectionReason,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT — PUBLIC
───────────────────────────────────────────────────────────────────────────── */

//* Get all active products with filter, search, sort & pagination  GET /api/v1/products
exports.getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20,
    search, category, brand, sellerId,
    gender, fit, occasion, pattern, neckType, sleeveType, style,
    tags, fabric,
    minPrice, maxPrice,
    minRating,
    isFeatured, isCODAvailable, isReturnable,
    inStock,
    sortBy = "createdAt", order = "desc",
    status = "approved",
  } = req.query;

  const filter = { isActive: true, deletedAt: null, status };

  if (search) {
    filter.$text = { $search: search };
  }
  if (category)       filter["category.slug"]  = category;
  if (brand)          filter["brand.slug"]      = brand;
  if (sellerId) {
    const mongoose = require("mongoose");
    const Seller = require("../../models/Seller");
    let sellerIds = [sellerId];
    if (mongoose.Types.ObjectId.isValid(sellerId)) {
      const sellerDoc = await Seller.findOne({ $or: [{ _id: sellerId }, { userId: sellerId }] });
      if (sellerDoc) {
        sellerIds = [sellerDoc._id, sellerDoc.userId];
      }
    }
    filter.sellerId = { $in: sellerIds };
  }
  if (gender)         filter.gender             = gender;
  if (fit)            filter.fit                = fit;
  if (pattern)        filter.pattern            = new RegExp(pattern, "i");
  if (neckType)       filter.neckType           = new RegExp(neckType, "i");
  if (sleeveType)     filter.sleeveType         = new RegExp(sleeveType, "i");
  if (style)          filter.style              = new RegExp(style, "i");
  if (fabric)         filter.fabric             = new RegExp(fabric, "i");
  if (tags)           filter.tags               = { $in: tags.split(",").map((t) => t.trim().toLowerCase()) };
  if (occasion)       filter.occasion           = { $in: occasion.split(",").map((o) => o.trim()) };
  if (isFeatured)     filter.isFeatured         = isFeatured === "true";
  if (isCODAvailable) filter.isCODAvailable     = isCODAvailable === "true";
  if (isReturnable)   filter.isReturnable       = isReturnable === "true";
  if (inStock === "true")  filter.isInStock     = true;
  if (inStock === "false") filter.isInStock     = false;
  if (minRating)      filter.averageRating      = { $gte: parseFloat(minRating) };

  // Price filter: use salePrice if present else basePrice
  if (minPrice || maxPrice) {
    filter.basePrice = {};
    if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
    if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
  }

  const skip      = (Number(page) - 1) * Number(limit);
  const sortOrder = order === "asc" ? 1 : -1;

  const allowedSort = {
    createdAt     : { createdAt: sortOrder },
    price         : { basePrice: sortOrder },
    rating        : { averageRating: sortOrder },
    popularity    : { salesCount: sortOrder },
    views         : { viewCount: sortOrder },
    wishlist      : { wishlistCount: sortOrder },
    relevance     : search ? { score: { $meta: "textScore" } } : { createdAt: -1 },
  };
  const sort = allowedSort[sortBy] || { createdAt: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("seller")
      .select("-reviews -model3D -customisationOptions -relatedProductIds -frequentlyBoughtWith -bundledWith")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.status(200).json(ResponseFormatter.paginated(products, page, limit, total));
});

//* Get featured products  GET /api/v1/products/featured
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 12 } = req.query;

  const products = await Product.find({
    isActive  : true,
    isFeatured: true,
    status    : "approved",
    deletedAt : null,
  })
    .populate("seller")
    .select("name slug images basePrice salePrice averageRating totalReviews isFeatured variants")
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.status(200).json({ success: true, count: products.length, data: products });
});

//* Full-text search products  GET /api/v1/products/search
exports.searchProducts = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const products = await Product.find(
    { $text: { $search: q }, isActive: true, status: "approved", deletedAt: null },
    { score: { $meta: "textScore" } }
  )
    .populate("seller")
    .select("name slug images basePrice salePrice averageRating")
    .sort({ score: { $meta: "textScore" } })
    .limit(Number(limit));

  res.status(200).json({ success: true, count: products.length, data: products });
});

//* Get single product by ID  GET /api/v1/products/:id
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({
    _id      : req.params.id,
    isActive : true,
    deletedAt: null,
  })
    .populate("relatedProductIds", "name slug images basePrice salePrice averageRating totalReviews")
    .populate("frequentlyBoughtWith", "name slug images basePrice salePrice averageRating totalReviews")
    .populate("bundledWith.productId", "name slug images basePrice salePrice averageRating totalReviews")
    .populate("seller");

  if (!product) return next(new ErrorHandler("Product not found", 404));

  // Keep both keys for client compatibility (`data`) and convenience (`product`).
  res.status(200).json({ success: true, data: product, product });
});

//* Get single product by slug  GET /api/v1/products/slug/:slug
exports.getProductBySlug = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({
    slug     : req.params.slug.toLowerCase(),
    isActive : true,
    deletedAt: null,
  })
    .populate("relatedProductIds", "name slug images basePrice salePrice averageRating totalReviews")
    .populate("frequentlyBoughtWith", "name slug images basePrice salePrice averageRating totalReviews")
    .populate("bundledWith.productId", "name slug images basePrice salePrice averageRating totalReviews")
    .populate("seller");

  if (!product) return next(new ErrorHandler("Product not found", 404));

  res.status(200).json({ success: true, data: product, product });
});

//* Get related products for a product  GET /api/v1/products/:id/related
exports.getRelatedProducts = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).select("relatedProductIds frequentlyBoughtWith category gender");
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const ids = [
    ...(product.relatedProductIds || []),
    ...(product.frequentlyBoughtWith || []),
  ];

  let related;
  if (ids.length > 0) {
    related = await Product.find({ _id: { $in: ids }, isActive: true, deletedAt: null })
      .populate("seller")
      .select("name slug images basePrice salePrice averageRating totalReviews")
      .limit(12);
  } else {
    // fallback: same category + gender
    related = await Product.find({
      _id      : { $ne: req.params.id },
      "category.id": product.category?.id,
      gender   : product.gender,
      isActive : true,
      deletedAt: null,
    })
      .populate("seller")
      .select("name slug images basePrice salePrice averageRating totalReviews")
      .limit(12);
  }

  res.status(200).json({ success: true, count: related.length, data: related });
});

//* Increment product view count  PATCH /api/v1/products/:id/view
exports.incrementViewCount = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).select("viewCount");

  if (!product) return next(new ErrorHandler("Product not found", 404));

  res.status(200).json({ success: true, viewCount: product.viewCount });
});

//* Increment product share count  PATCH /api/v1/products/:id/share
exports.incrementShareCount = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $inc: { shareCount: 1 } },
    { new: true }
  ).select("shareCount");

  if (!product) return next(new ErrorHandler("Product not found", 404));

  res.status(200).json({ success: true, shareCount: product.shareCount });
});

//* Get all products by a seller  GET /api/v1/products/seller/:sellerId
exports.getProductsBySeller = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const mongoose = require("mongoose");
  const Seller = require("../../models/Seller");
  let sellerIds = [req.params.sellerId];
  if (mongoose.Types.ObjectId.isValid(req.params.sellerId)) {
    const sellerDoc = await Seller.findOne({ $or: [{ _id: req.params.sellerId }, { userId: req.params.sellerId }] });
    if (sellerDoc) {
      sellerIds = [sellerDoc._id, sellerDoc.userId];
    }
  }
  const filter = { sellerId: { $in: sellerIds }, deletedAt: null };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("seller")
      .select("-reviews -model3D")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : products,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT — SELLER / ADMIN CRUD
───────────────────────────────────────────────────────────────────────────── */

//* Create a new product  POST /api/v1/products
exports.createProduct = asyncHandler(async (req, res, next) => {
  // Attach seller from auth if not provided (seller role)
  if (!req.body.sellerId && req.user?.sellerId) {
    req.body.sellerId = req.user.sellerId;
  }

  if (!req.body.sellerId) {
    return next(new ErrorHandler("Seller ID is required.", 400));
  }

  const mongoose = require("mongoose");
  const Seller = require("../../models/Seller");
  const seller = await Seller.findOne({ $or: [{ _id: req.body.sellerId }, { userId: req.body.sellerId }] });

  if (!seller) {
    return next(new ErrorHandler("Seller not found.", 404));
  }

  if (seller.verificationStatus !== "approved") {
    return next(new ErrorHandler("Product creation is blocked. Seller verification status is not approved.", 403));
  }

  // Automatically approve and activate new products
  req.body.status      = "approved";
  req.body.isActive    = true;
  req.body.publishedAt = new Date();
  req.body.approvedAt  = new Date();
  if (req.user?._id) {
    req.body.approvedBy = req.user._id;
  }

  const product = await Product.create(req.body);

  res.status(201).json({ success: true, data: product });
});

//* Update product fields  PUT /api/v1/products/:id
exports.updateProduct = asyncHandler(async (req, res, next) => {
  // Never allow direct mutation of computed/audit fields
  const PROTECTED = ["averageRating", "totalRatings", "totalReviews", "ratingDistribution",
    "viewCount", "salesCount", "wishlistCount", "shareCount", "approvedBy", "approvedAt",
    "deletedAt", "reviews"];
  PROTECTED.forEach((f) => delete req.body[f]);

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!product) return next(new ErrorHandler("Product not found", 404));

  res.status(200).json({ success: true, data: product });
});

//* Soft-delete a product  DELETE /api/v1/products/:id
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  product.isActive  = false;
  product.status    = "archived";
  product.deletedAt = new Date();
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Product archived successfully." });
});

//* Restore a soft-deleted product (admin)  PATCH /api/v1/products/:id/restore
exports.restoreProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  product.isActive  = true;
  product.status    = "approved";
  product.deletedAt = undefined;
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Product restored.", data: product });
});

//* Submit product for admin approval  PATCH /api/v1/products/:id/submit
exports.submitForApproval = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  if (!["draft", "rejected"].includes(product.status)) {
    return next(new ErrorHandler(`Cannot submit a product with status "${product.status}".`, 400));
  }

  // Automatically approve and activate upon submission (resolves legacy drafts)
  product.status      = "approved";
  product.isActive    = true;
  product.publishedAt = product.publishedAt || new Date();
  product.approvedAt  = new Date();
  if (req.user?._id) {
    product.approvedBy = req.user._id;
  }
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Product approved and published.", data: product });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT — ADMIN STATUS & MODERATION
───────────────────────────────────────────────────────────────────────────── */

//* Approve a pending product (admin)  PATCH /api/v1/products/:id/approve
exports.approveProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  product.status      = "approved";
  product.approvedBy  = req.user._id;
  product.approvedAt  = new Date();
  product.isActive    = true;
  product.publishedAt = product.publishedAt || new Date();
  await product.save({ validateBeforeSave: false });

  await Config.create({
    type: "audit_log",
    audit: {
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`,
      adminEmail: req.user.email,
      action: "approve_product",
      targetType: "product",
      targetId: String(product._id),
      description: `Product "${product.name}" approved.`,
    }
  });

  const seller = await Seller.findById(product.sellerId).select("userId");
  if (seller) {
    await Notification.create({
      userId: seller.userId,
      type: "general",
      title: "Product Approved",
      message: `Your product "${product.name}" has been approved and is now live.`,
      actionUrl: `/seller/products`
    });
  }

  res.status(200).json({ success: true, message: "Product approved and published.", data: product });
});

//* Reject a product with a reason (admin)  PATCH /api/v1/products/:id/reject
exports.rejectProduct = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return next(new ErrorHandler("Rejection reason is required.", 400));

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  product.status          = "rejected";
  product.rejectionReason = reason;
  await product.save({ validateBeforeSave: false });

  await Config.create({
    type: "audit_log",
    audit: {
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`,
      adminEmail: req.user.email,
      action: "reject_product",
      targetType: "product",
      targetId: String(product._id),
      description: `Product "${product.name}" rejected. Reason: ${reason}`,
    }
  });

  const seller = await Seller.findById(product.sellerId).select("userId");
  if (seller) {
    await Notification.create({
      userId: seller.userId,
      type: "general",
      title: "Product Rejected",
      message: `Your product "${product.name}" was rejected. Reason: ${reason}`,
      actionUrl: `/seller/products`
    });
  }

  res.status(200).json({ success: true, message: "Product rejected.", data: product });
});

//* Toggle product featured status (admin)  PATCH /api/v1/products/:id/feature
exports.toggleFeatured = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  product.isFeatured = !product.isFeatured;
  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success    : true,
    isFeatured : product.isFeatured,
    message    : `Product ${product.isFeatured ? "marked as" : "removed from"} featured.`,
  });
});

//* Bulk update product status (admin)  PATCH /api/v1/products/bulk/status
exports.bulkUpdateStatus = asyncHandler(async (req, res, next) => {
  const { ids, status } = req.body;

  const ALLOWED = ["draft", "pending_approval", "approved", "rejected", "archived", "suspended"];
  if (!Array.isArray(ids) || ids.length === 0)    return next(new ErrorHandler("ids array is required.", 400));
  if (!ALLOWED.includes(status))                  return next(new ErrorHandler(`Invalid status "${status}".`, 400));

  const result = await Product.updateMany(
    { _id: { $in: ids } },
    { $set: { status } }
  );

  await Config.create({
    type: "audit_log",
    audit: {
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`,
      adminEmail: req.user.email,
      action: "bulk_update_product_status",
      targetType: "product",
      description: `Bulk updated ${result.modifiedCount} products to status: ${status}`,
    }
  });

  res.status(200).json({
    success : true,
    message : `${result.modifiedCount} products updated to ${status}.`,
  });
});

//* Bulk soft-delete products (admin)  DELETE /api/v1/products/bulk
exports.bulkDeleteProducts = asyncHandler(async (req, res, next) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return next(new ErrorHandler("ids array is required.", 400));

  const result = await Product.updateMany(
    { _id: { $in: ids } },
    { $set: { isActive: false, status: "archived", deletedAt: new Date() } }
  );

  res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
});

/* ─────────────────────────────────────────────────────────────────────────────
   VARIANTS
───────────────────────────────────────────────────────────────────────────── */

//* Add a new variant to a product  POST /api/v1/products/:id/variants
exports.addVariant = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  // Prevent duplicate SKU within product
  const skuExists = product.variants.some(
    (v) => v.sku === req.body.sku?.toUpperCase()
  );
  if (skuExists) return next(new ErrorHandler(`SKU "${req.body.sku}" already exists on this product.`, 409));

  product.variants.push(req.body);
  await product.save();

  res.status(201).json({ success: true, variants: product.variants });
});

//* Update a specific variant  PUT /api/v1/products/:id/variants/:variantId
exports.updateVariant = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return next(new ErrorHandler("Variant not found", 404));

  // Never allow direct overwrite of computed stock fields via this route
  delete req.body.totalStock;
  delete req.body.reservedStock;
  delete req.body.soldCount;

  Object.assign(variant, req.body);
  await product.save();

  res.status(200).json({ success: true, variants: product.variants });
});

//* Archive (soft-delete) a variant  DELETE /api/v1/products/:id/variants/:variantId
exports.deleteVariant = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return next(new ErrorHandler("Variant not found", 404));

  variant.isActive   = false;
  variant.isArchived = true;
  await product.save();

  res.status(200).json({ success: true, message: "Variant archived.", variants: product.variants });
});

//* Update stock levels for a variant  PATCH /api/v1/products/:id/variants/:variantId/stock
exports.updateVariantStock = asyncHandler(async (req, res, next) => {
  const { totalStock, reservedStock, warehouseStock } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return next(new ErrorHandler("Variant not found", 404));

  if (totalStock    !== undefined) variant.totalStock    = totalStock;
  if (reservedStock !== undefined) variant.reservedStock = reservedStock;
  if (Array.isArray(warehouseStock)) variant.warehouseStock = warehouseStock;

  await product.save();

  res.status(200).json({
    success        : true,
    variantId      : variant._id,
    totalStock     : variant.totalStock,
    reservedStock  : variant.reservedStock,
    availableStock : variant.availableStock,
    isInStock      : variant.isInStock,
    productStock   : product.totalStock,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   IMAGES
───────────────────────────────────────────────────────────────────────────── */

//* Add images to a product  POST /api/v1/products/:id/images
exports.addImages = asyncHandler(async (req, res, next) => {
  let newImages = [];

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    // Upload each buffer to ImageKit
    const uploadPromises = req.files.map(async (file) => {
      const fileName = file.originalname || `product-${Date.now()}.jpg`;
      const result = await uploadToImageKit(file.buffer, fileName, "/stitch/products");
      
      return {
        url: result.url,
        fileId: result.fileId, // Store fileId for potential deletion later
        alt: file.originalname ? path.parse(file.originalname).name : "product image",
        position: 0,
        isDefault: false,
        type: "front"
      };
    });

    newImages = await Promise.all(uploadPromises);
  } else if (req.body.images) {
    const { images } = req.body;
    if (Array.isArray(images)) {
      newImages = images;
    }
  }

  if (newImages.length === 0) {
    return next(new ErrorHandler("No images provided.", 400));
  }

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  // If product currently has no images, make the first new image default
  if (product.images.length === 0 && newImages.length > 0) {
    newImages[0].isDefault = true;
  }

  product.images.push(...newImages);
  await product.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, images: product.images });
});

//* Delete a product image  DELETE /api/v1/products/:id/images/:imageId
exports.deleteImage = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $pull: { images: { _id: req.params.imageId } } },
    { new: true }
  ).select("images");

  if (!product) return next(new ErrorHandler("Product not found", 404));

  res.status(200).json({ success: true, images: product.images });
});

//* Reorder product images by setting position values  PUT /api/v1/products/:id/images/reorder
exports.reorderImages = asyncHandler(async (req, res, next) => {
  const { order } = req.body; // [{ id, position }]
  if (!Array.isArray(order)) return next(new ErrorHandler("order array is required.", 400));

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  for (const { id, position } of order) {
    const img = product.images.id(id);
    if (img) img.position = position;
  }
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, images: product.images });
});

/* ─────────────────────────────────────────────────────────────────────────────
   REVIEWS
───────────────────────────────────────────────────────────────────────────── */

//* Get approved reviews for a product with pagination  GET /api/v1/products/:id/reviews
exports.getReviews = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, sortBy = "createdAt", order = "desc", rating } = req.query;

  const product = await Product.findById(req.params.id).select("reviews averageRating totalReviews ratingDistribution sizeAccuracySummary");
  if (!product) return next(new ErrorHandler("Product not found", 404));

  let reviews = product.reviews.filter((r) => r.status === "approved");

  if (rating) reviews = reviews.filter((r) => r.rating === Number(rating));

  reviews.sort((a, b) => {
    if (sortBy === "helpful")   return b.helpfulCount - a.helpfulCount;
    if (sortBy === "rating")    return order === "asc" ? a.rating - b.rating : b.rating - a.rating;
    return order === "asc"
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const skip  = (Number(page) - 1) * Number(limit);
  const total = reviews.length;

  const normalizedReviews = reviews.slice(skip, skip + Number(limit)).map((review) => _serializeReview(review, req.params.id));

  res.status(200).json({
    success             : true,
    total,
    page                : Number(page),
    pages               : Math.ceil(total / Number(limit)),
    averageRating       : product.averageRating,
    totalReviews        : product.totalReviews,
    ratingDistribution  : product.ratingDistribution,
    sizeAccuracySummary : product.sizeAccuracySummary,
    reviews             : normalizedReviews,
    data                : normalizedReviews,
  });
});

//* Add a review to a product  POST /api/v1/products/:id/reviews
exports.addReview = asyncHandler(async (req, res, next) => {
  const {
    orderId,
    orderItemId,
    rating,
    title,
    body,
    content,
    pros,
    cons,
    images,
    videoUrl,
    sizeAccuracy,
    isAnonymous,
  } = req.body;

  const reviewBody = typeof body === "string" && body.trim()
    ? body.trim()
    : typeof content === "string" && content.trim()
      ? content.trim()
      : "";

  if (!reviewBody) return next(new ErrorHandler("Review content is required.", 400));

  const reviewTitle = typeof title === "string" && title.trim()
    ? title.trim().slice(0, 100)
    : reviewBody.slice(0, 100);
  const reviewOrderId = typeof orderId === "string" && orderId.trim()
    ? orderId.trim()
    : `direct:${req.user._id}:${req.params.id}`;

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  // One review per user per orderItem
  const alreadyReviewed = product.reviews.find(
    (r) => r.userId.toString() === req.user._id.toString() && r.orderId === reviewOrderId
  );
  if (alreadyReviewed) {
    return res.status(200).json({
      success: true,
      message: "Review already submitted.",
      review : _serializeReview(alreadyReviewed, req.params.id),
    });
  }

  const review = {
    userId    : req.user._id,
    userName  : req.user.firstName + " " + req.user.lastName,
    userAvatar: req.user.avatar,
    orderId   : reviewOrderId,
    orderItemId,
    rating,
    title     : reviewTitle,
    body      : reviewBody,
    pros        : pros  || [],
    cons        : cons  || [],
    images      : images || [],
    videoUrl,
    sizeAccuracy,
    isAnonymous : isAnonymous || false,
    status      : "approved",
    isVerifiedPurchase: !!orderId,
  };

  product.reviews.push(review);
  await product.save();

  const savedReview = product.reviews[product.reviews.length - 1];

  res.status(201).json({
    success: true,
    message: "Review submitted successfully.",
    review : _serializeReview(savedReview, req.params.id),
  });
});

//* Mark a review as helpful  PATCH /api/v1/products/:id/reviews/:reviewId/helpful
exports.markReviewHelpful = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const review = product.reviews.id(req.params.reviewId);
  if (!review || review.status !== "approved") return next(new ErrorHandler("Review not found", 404));

  const userId = req.user._id.toString();
  const alreadyVoted = review.helpfulUserIds.map((id) => id.toString()).includes(userId);

  if (alreadyVoted) {
    review.helpfulUserIds = review.helpfulUserIds.filter((id) => id.toString() !== userId);
    review.helpfulCount   = Math.max(0, review.helpfulCount - 1);
  } else {
    review.helpfulUserIds.push(req.user._id);
    review.helpfulCount += 1;
  }

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success      : true,
    helpfulCount : review.helpfulCount,
    voted        : !alreadyVoted,
  });
});

//* Delete own review  DELETE /api/v1/products/:id/reviews/:reviewId
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const review = product.reviews.id(req.params.reviewId);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  if (review.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised to delete this review.", 403));
  }

  product.reviews.pull({ _id: req.params.reviewId });
  _recomputeRatings(product);
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Review deleted." });
});

//* Add or update seller reply to a review  POST /api/v1/products/:id/reviews/:reviewId/reply
exports.addSellerReply = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  if (!text) return next(new ErrorHandler("Reply text is required.", 400));

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const isProductSeller = product.sellerId.toString() === req.user._id.toString() || (req.user.sellerId && product.sellerId.toString() === req.user.sellerId.toString());
  if (!isProductSeller && req.user.role !== "admin") {
    return next(new ErrorHandler("Only the seller can reply to reviews.", 403));
  }

  const review = product.reviews.id(req.params.reviewId);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  const isEdit = !!review.sellerReply?.text;
  review.sellerReply = {
    text,
    repliedAt : review.sellerReply?.repliedAt || new Date(),
    isEdited  : isEdit,
    editedAt  : isEdit ? new Date() : undefined,
  };

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success    : true,
    sellerReply: review.sellerReply,
    review     : _serializeReview(review, req.params.id),
  });
});

//* Update review status — approve / reject / flag (admin)  PATCH /api/v1/products/:id/reviews/:reviewId/status
exports.updateReviewStatus = asyncHandler(async (req, res, next) => {
  const { status, rejectionReason } = req.body;
  const ALLOWED = ["pending", "approved", "rejected", "flagged"];

  if (!ALLOWED.includes(status)) return next(new ErrorHandler(`Invalid review status "${status}".`, 400));

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const review = product.reviews.id(req.params.reviewId);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  review.status = status;
  if (status === "rejected" && rejectionReason) review.rejectionReason = rejectionReason;

  _recomputeRatings(product);
  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    review : _serializeReview(review, req.params.id),
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   3D MODEL
───────────────────────────────────────────────────────────────────────────── */

//* Save or update the 3D model metadata for a product  PUT /api/v1/products/:id/model3d
exports.updateModel3D = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  product.model3D = { ...(product.model3D || {}), ...req.body, uploadedAt: new Date() };
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, model3D: product.model3D, has3DModel: product.has3DModel });
});

//* Update viewer configuration for a product's 3D model  PATCH /api/v1/products/:id/model3d/viewer-config
exports.updateViewerConfig = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  if (!product.model3D) return next(new ErrorHandler("No 3D model exists for this product.", 404));

  Object.assign(product.model3D.viewerConfig, req.body);
  await product.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, viewerConfig: product.model3D.viewerConfig });
});