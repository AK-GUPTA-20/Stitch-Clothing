"use strict";

const asyncHandler = require("../../middleware/asyncHandler");
const ErrorHandler    = require("../../middleware/error");
const Seller          = require("../../models/Seller");
const Order           = require("../../models/Order");
const Product         = require("../../models/Product");
const Config          = require("../../models/Config");
const Notification    = require("../../models/Notification");
const { uploadToImageKit } = require("../../utils/imagekit");

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

const SAFE_PUBLIC_FIELDS =
  "-bankDetails -documents -payouts -walletLedger -analyticsCache " +
  "-commissionRate -totalEarnings -pendingPayout -walletBalance " +
  "-verificationRemarks -suspensionReason -panNumber -gstNumber -businessEmail -businessPhone -onboardingStep -agreementVersion -agreedAt -userId";

const PROTECTED_FIELDS = [
  "userId", "totalEarnings", "totalOrders", "totalProducts", "totalRefunds",
  "refundRate", "pendingPayout", "walletBalance", "walletLedger", "payouts",
  "verifiedAt", "verifiedBy", "commissionRate", "sellerLevel",
  "averageRating", "totalRatings", "analyticsCache", "deletedAt", "joinedAt",
];

function _resolveTier(totalOrders) {
  if (totalOrders >= 5000)  return "platinum";
  if (totalOrders >= 1000)  return "gold";
  if (totalOrders >= 200)   return "silver";
  return "bronze";
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────────────────────────────────────── */

//* Get all approved active sellers with filters and pagination  GET /api/v1/sellers
exports.getSellers = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20,
    search, sellerLevel, category,
    minRating, sortBy = "createdAt", order = "desc",
  } = req.query;

  const filter = {
    isActive           : true,
    verificationStatus : "approved",
    deletedAt          : null,
  };

  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [
      { businessName   : re },
      { "store.name"   : re },
      { "store.slug"   : re },
    ];
  }
  if (sellerLevel) filter.sellerLevel            = sellerLevel;
  if (category)    filter["store.categories"]    = category;
  if (minRating)   filter.averageRating          = { $gte: parseFloat(minRating) };

  const skip      = (Number(page) - 1) * Number(limit);
  const direction = order === "asc" ? 1 : -1;

  const [sellers, total] = await Promise.all([
    Seller.find(filter)
      .select(SAFE_PUBLIC_FIELDS)
      .sort({ [sortBy]: direction })
      .skip(skip)
      .limit(Number(limit)),
    Seller.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    count   : sellers.length,
    data    : sellers,
  });
});

//* Get public seller profile by ID  GET /api/v1/sellers/:id
exports.getSellerById = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({
    _id       : req.params.id,
    isActive  : true,
    deletedAt : null,
  }).select(SAFE_PUBLIC_FIELDS);

  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  res.status(200).json({ success: true, data: seller });
});



/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATIONS (SELLER)
───────────────────────────────────────────────────────────────────────────── */

exports.getMyNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  
  res.status(200).json({ success: true, notifications });
});

exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) return next(new ErrorHandler("Notification not found.", 404));

  res.status(200).json({ success: true, notification });
});

//* Get public seller store profile by store slug  GET /api/v1/sellers/slug/:slug
exports.getSellerBySlug = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({
    "store.slug" : req.params.slug.toLowerCase(),
    isActive     : true,
    deletedAt    : null,
  }).select(SAFE_PUBLIC_FIELDS);

  if (!seller) return next(new ErrorHandler("Store not found.", 404));

  res.status(200).json({ success: true, data: seller });
});

//* Get public analytics for a seller store GET /api/v1/sellers/slug/:slug/analytics
exports.getPublicSellerAnalytics = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({
    "store.slug": req.params.slug.toLowerCase(),
    isActive: true,
    deletedAt: null,
  }).select("_id");

  if (!seller) return next(new ErrorHandler("Store not found.", 404));

  // 1. Order Aggregations
  const orderStats = await Order.aggregate([
    { $match: { sellerId: seller._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        returned: { $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] } },
        refunded: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] } },
        totalDeliveryTimeMs: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$status", "delivered"] }, { $ne: ["$deliveredAt", null] }] },
              { $subtract: ["$deliveredAt", "$createdAt"] },
              0
            ]
          }
        }
      }
    }
  ]);

  const orders = orderStats[0] || {
    totalOrders: 0, delivered: 0, cancelled: 0, returned: 0, refunded: 0, totalDeliveryTimeMs: 0
  };

  const deliverySuccessRate = orders.totalOrders > 0 ? (orders.delivered / orders.totalOrders) * 100 : 0;
  const returnRate = orders.delivered > 0 ? (orders.returned / orders.delivered) * 100 : 0;
  const averageDeliveryTimeDays = orders.delivered > 0 
    ? (orders.totalDeliveryTimeMs / orders.delivered) / (1000 * 60 * 60 * 24)
    : 0;

  // 2. Product Aggregations
  const productStats = await Product.aggregate([
    { $match: { sellerId: seller._id, status: "approved" } },
    {
      $group: {
        _id: null,
        activeProducts: { $sum: 1 },
        totalViews: { $sum: "$viewCount" },
        totalWishlisted: { $sum: "$wishlistCount" },
        totalShares: { $sum: "$shareCount" },
        totalSales: { $sum: "$salesCount" },
        totalReviews: { $sum: "$totalReviews" },
        sumRatingValues: { $sum: { $multiply: ["$averageRating", "$totalRatings"] } },
        sumTotalRatings: { $sum: "$totalRatings" }
      }
    }
  ]);

  const products = productStats[0] || {
    activeProducts: 0, totalViews: 0, totalWishlisted: 0, totalShares: 0, 
    totalSales: 0, totalReviews: 0, sumRatingValues: 0, sumTotalRatings: 0
  };

  const averageProductRating = products.sumTotalRatings > 0 
    ? products.sumRatingValues / products.sumTotalRatings 
    : 0;

  // 3. Top Product
  const topProduct = await Product.findOne({ sellerId: seller._id, status: "approved" })
    .sort("-salesCount")
    .select("name slug images salesCount averageRating")
    .lean();

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        ordersDelivered: orders.delivered,
        ordersCancelled: orders.cancelled,
        ordersReturned: orders.returned,
        deliverySuccessRate: deliverySuccessRate.toFixed(2),
        returnRate: returnRate.toFixed(2),
        averageDeliveryTimeDays: averageDeliveryTimeDays.toFixed(1),
        activeProducts: products.activeProducts,
        totalViews: products.totalViews,
        totalWishlisted: products.totalWishlisted,
        totalSales: products.totalSales,
        totalReviews: products.totalReviews,
        averageProductRating: averageProductRating.toFixed(1),
      },
      topProduct: topProduct || null
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   SELLER — ONBOARDING & PROFILE
───────────────────────────────────────────────────────────────────────────── */

//* Register authenticated user as a seller  POST /api/v1/sellers/register
exports.registerSeller = asyncHandler(async (req, res, next) => {
  const existing = await Seller.findOne({ userId: req.user._id });
  if (existing) {
    return next(new ErrorHandler("You already have a seller account.", 409));
  }

  req.body.userId = req.user._id;
  if (!req.body.businessType) {
    req.body.businessType = "individual";
  }

  const seller = await Seller.create(req.body);

  res.status(201).json({ success: true, data: seller });
});

//* Get the authenticated seller's full profile  GET /api/v1/sellers/me
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id, deletedAt: null });
  if (!seller) return res.status(200).json({ success: true, data: null });

  res.status(200).json({ success: true, data: seller });
});

//* Update seller business information (onboarding step 1)  PATCH /api/v1/sellers/me/business
exports.updateBusinessInfo = asyncHandler(async (req, res, next) => {
  const ALLOWED = [
    "businessName", "businessType", "gstNumber", "gstRegisteredState",
    "panNumber", "website", "businessAddress", "businessEmail",
    "businessPhone", "agreementVersion", "agreedAt",
  ];

  const updates = {};
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (Object.keys(updates).length === 0) {
    return next(new ErrorHandler("No valid fields provided.", 400));
  }

  const seller = await Seller.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  // Auto-advance onboarding step
  if (seller.onboardingStep === "business_info") {
    seller.onboardingStep = "kyc_upload";
    await seller.save({ validateBeforeSave: false });
  }

  res.status(200).json({ success: true, data: seller });
});

//* Update seller store profile  PATCH /api/v1/sellers/me/store
exports.updateStore = asyncHandler(async (req, res, next) => {
  const ALLOWED_STORE = [
    "name", "slug", "logo", "banner", "description", "tagline",
    "categories", "socialLinks", "returnPolicy", "shippingPolicy", "avgDeliveryDays",
  ];

  const storeUpdates = {};
  ALLOWED_STORE.forEach((f) => {
    if (req.body[f] !== undefined) storeUpdates[`store.${f}`] = req.body[f];
  });

  if (Object.keys(storeUpdates).length === 0) {
    return next(new ErrorHandler("No valid store fields provided.", 400));
  }

  // Ensure store slug uniqueness
  if (req.body.slug) {
    const slugExists = await Seller.findOne({
      "store.slug" : req.body.slug.toLowerCase(),
      userId       : { $ne: req.user._id },
    });
    if (slugExists) return next(new ErrorHandler("Store slug is already taken.", 409));
  }

  const seller = await Seller.findOneAndUpdate(
    { userId: req.user._id },
    { $set: storeUpdates },
    { new: true, runValidators: true }
  );

  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  if (seller.onboardingStep === "store_setup") {
    seller.onboardingStep = "completed";
    await seller.save({ validateBeforeSave: false });
  }

  res.status(200).json({ success: true, store: seller.store });
});

//* Update seller shipping preferences  PATCH /api/v1/sellers/me/shipping
exports.updateShippingPreference = asyncHandler(async (req, res, next) => {
  const { preferredCourier, handlingTimeDays, dispatchCutoffTime } = req.body;

  const updates = {};
  if (preferredCourier   !== undefined) updates["shippingPreference.preferredCourier"]   = preferredCourier;
  if (handlingTimeDays   !== undefined) updates["shippingPreference.handlingTimeDays"]   = handlingTimeDays;
  if (dispatchCutoffTime !== undefined) updates["shippingPreference.dispatchCutoffTime"] = dispatchCutoffTime;

  const seller = await Seller.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates },
    { new: true }
  ).select("shippingPreference");

  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  res.status(200).json({ success: true, shippingPreference: seller.shippingPreference });
});

//* Update seller notification preferences  PATCH /api/v1/sellers/me/notification-preferences
exports.updateNotificationPreferences = asyncHandler(async (req, res, next) => {
  const { email, push, sms } = req.body;
  const updates = {};

  if (email) updates["notificationPreferences.email"] = email;
  if (push)  updates["notificationPreferences.push"]  = push;
  if (sms)   updates["notificationPreferences.sms"]   = sms;

  const seller = await Seller.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  ).select("notificationPreferences");

  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  res.status(200).json({ success: true, notificationPreferences: seller.notificationPreferences });
});

//* Update seller payout schedule preferences  PATCH /api/v1/sellers/me/payout-settings
exports.updatePayoutSettings = asyncHandler(async (req, res, next) => {
  const { payoutSchedule, minPayoutAmount } = req.body;

  const updates = {};
  if (payoutSchedule)  updates.payoutSchedule  = payoutSchedule;
  if (minPayoutAmount) updates.minPayoutAmount  = minPayoutAmount;

  const seller = await Seller.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  ).select("payoutSchedule minPayoutAmount");

  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  res.status(200).json({ success: true, payoutSchedule: seller.payoutSchedule, minPayoutAmount: seller.minPayoutAmount });
});

/* ─────────────────────────────────────────────────────────────────────────────
   KYC DOCUMENTS
───────────────────────────────────────────────────────────────────────────── */

//* Upload a KYC document  POST /api/v1/sellers/me/documents
exports.uploadDocument = asyncHandler(async (req, res, next) => {
  let { type, fileUrl, expiresAt } = req.body;

  if (req.file) {
    const fileName = req.file.originalname || `kyc-${Date.now()}`;
    const result = await uploadToImageKit(req.file.buffer, fileName, "/stitch/kyc");
    fileUrl = result.url;
  }

  if (!type || !fileUrl) {
    return next(new ErrorHandler("type and file(Url) are required.", 400));
  }

  const seller = await Seller.findOne({ userId: req.user._id });
  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  // Replace if same type already exists and is not approved
  const existingIdx = seller.documents.findIndex((d) => d.type === type && d.status !== "approved");
  if (existingIdx !== -1) {
    seller.documents.splice(existingIdx, 1);
  }

  seller.documents.push({
    type,
    fileUrl,
    status     : "pending",
    uploadedAt : new Date(),
    expiresAt  : expiresAt ? new Date(expiresAt) : undefined,
  });

  if (seller.onboardingStep === "kyc_upload") {
    seller.onboardingStep = "bank_details";
  }

  // Update overall KYC status to indicate we have documents to review
  if (seller.verificationStatus === "not_submitted" || seller.verificationStatus === "rejected") {
    seller.verificationStatus = "documents_received";
  }

  await seller.save({ validateBeforeSave: false });
  const newDocId = seller.documents[seller.documents.length - 1]._id;

  // Auto-verify after 10 seconds for testing
  setTimeout(async () => {
    try {
      const dbSeller = await Seller.findById(seller._id);
      if (!dbSeller) return;
      const dbDoc = dbSeller.documents.id(newDocId);
      if (dbDoc && dbDoc.status === "pending") {
        dbDoc.status = "approved";
        dbDoc.remarks = "Auto-verified by system.";
        dbDoc.reviewedAt = new Date();
        dbSeller.verificationStatus = "approved";
        if (dbSeller.onboardingStep === "kyc_verification") {
          dbSeller.onboardingStep = "completed";
        }
        await dbSeller.save({ validateBeforeSave: false });
        console.log(`Auto-verified document ${newDocId} for seller ${dbSeller._id}`);
      }
    } catch (e) {
      console.error("Auto-verify error:", e);
    }
  }, 10000);

  res.status(201).json({ success: true, documents: seller.documents });
});

//* Get all KYC documents of the seller  GET /api/v1/sellers/me/documents
exports.getDocuments = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("documents");
  if (!seller) return res.status(200).json({ success: true, documents: [] });

  res.status(200).json({ success: true, documents: seller.documents });
});

//* Delete a KYC document (only if pending or rejected)  DELETE /api/v1/sellers/me/documents/:docId
exports.deleteDocument = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("documents");
  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  const doc = seller.documents.id(req.params.docId);
  if (!doc) return next(new ErrorHandler("Document not found.", 404));

  if (doc.status === "approved") {
    return next(new ErrorHandler("Approved documents cannot be deleted.", 400));
  }

  seller.documents.pull({ _id: req.params.docId });
  await seller.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, documents: seller.documents });
});

/* ─────────────────────────────────────────────────────────────────────────────
   BANK DETAILS
───────────────────────────────────────────────────────────────────────────── */

//* Save or update seller bank details  PUT /api/v1/sellers/me/bank
exports.updateBankDetails = asyncHandler(async (req, res, next) => {
  const { accountHolder, accountNumber, ifscCode, bankName, branchName, accountType, upiId } = req.body;

  if (!accountHolder || !accountNumber || !ifscCode || !bankName) {
    return next(new ErrorHandler("accountHolder, accountNumber, ifscCode and bankName are required.", 400));
  }

  const seller = await Seller.findOneAndUpdate(
    { userId: req.user._id },
    {
      $set: {
        "bankDetails.accountHolder" : accountHolder,
        "bankDetails.accountNumber" : accountNumber,
        "bankDetails.ifscCode"      : ifscCode.toUpperCase(),
        "bankDetails.bankName"      : bankName,
        "bankDetails.branchName"    : branchName,
        "bankDetails.accountType"   : accountType || "current",
        "bankDetails.upiId"         : upiId,
        "bankDetails.isVerified"    : false, // resets on update; admin re-verifies
      },
    },
    { new: true, runValidators: true }
  );

  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  if (seller.onboardingStep === "bank_details") {
    seller.onboardingStep = "store_setup";
    await seller.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    success     : true,
    bankDetails : {
      accountHolder : seller.bankDetails.accountHolder,
      bankName      : seller.bankDetails.bankName,
      ifscCode      : seller.bankDetails.ifscCode,
      accountType   : seller.bankDetails.accountType,
      upiId         : seller.bankDetails.upiId,
      isVerified    : seller.bankDetails.isVerified,
    },
  });
});

//* Get seller bank details (masked)  GET /api/v1/sellers/me/bank
exports.getBankDetails = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("+bankDetails.accountNumber bankDetails");
  if (!seller) return res.status(200).json({ success: true, bankDetails: null });

  const bd = seller.bankDetails || {};

  res.status(200).json({
    success     : true,
    bankDetails : {
      accountHolder  : bd.accountHolder,
      accountNumber  : bd.accountNumber ? `****${bd.accountNumber.slice(-4)}` : null,
      ifscCode       : bd.ifscCode,
      bankName       : bd.bankName,
      branchName     : bd.branchName,
      accountType    : bd.accountType,
      upiId          : bd.upiId,
      isVerified     : bd.isVerified,
      verifiedAt     : bd.verifiedAt,
    },
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   WALLET & LEDGER
───────────────────────────────────────────────────────────────────────────── */

//* Get seller wallet balance and paginated ledger  GET /api/v1/sellers/me/wallet
exports.getWallet = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const seller = await Seller.findOne({ userId: req.user._id }).select("walletBalance pendingPayout walletLedger");
  if (!seller) return res.status(200).json({ success: true, balance: 0, pendingPayout: 0, total: 0, page: 1, pages: 1, transactions: [] });

  const ledger = [...seller.walletLedger]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(skip, skip + Number(limit))
    .map((entry) => ({
      ...(entry.toObject ? entry.toObject() : entry),
      balanceAfter: entry.balance,
      status: entry.source,
    }));

  res.status(200).json({
    success        : true,
    balance        : seller.walletBalance,
    pendingPayout  : seller.pendingPayout,
    total          : seller.walletLedger.length,
    page           : Number(page),
    pages          : Math.ceil(seller.walletLedger.length / Number(limit)),
    transactions   : ledger,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PAYOUTS
───────────────────────────────────────────────────────────────────────────── */

//* Request a payout from wallet balance  POST /api/v1/sellers/me/payouts
exports.requestPayout = asyncHandler(async (req, res, next) => {
  const { amount, payoutMethod, notes } = req.body;

  if (!amount || amount <= 0) return next(new ErrorHandler("Valid payout amount is required.", 400));

  const seller = await Seller.findOne({ userId: req.user._id }).select("+bankDetails.accountNumber bankDetails walletBalance pendingPayout minPayoutAmount payouts");
  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  if (seller.verificationStatus !== "approved") {
    return next(new ErrorHandler("Your account must be verified before requesting a payout.", 403));
  }
  if (!seller.bankDetails?.isVerified) {
    return next(new ErrorHandler("Bank account must be verified before requesting a payout.", 403));
  }
  if (amount < seller.minPayoutAmount) {
    return next(new ErrorHandler(`Minimum payout amount is $${seller.minPayoutAmount}.`, 400));
  }
  if (amount > seller.walletBalance) {
    return next(new ErrorHandler("Insufficient wallet balance.", 400));
  }

  // Prevent duplicate pending request
  const hasPending = seller.payouts.some((p) => p.status === "pending" || p.status === "processing");
  if (hasPending) {
    return next(new ErrorHandler("A payout request is already in progress.", 409));
  }

  const payout = {
    amount,
    currency      : "INR",
    status        : "pending",
    payoutMethod  : payoutMethod || "neft",
    notes,
    bankSnapshot  : {
      accountHolder : seller.bankDetails.accountHolder,
      accountNumber : seller.bankDetails.accountNumber,
      ifscCode      : seller.bankDetails.ifscCode,
      bankName      : seller.bankDetails.bankName,
    },
    requestedAt : new Date(),
  };

  seller.payouts.push(payout);
  seller.walletBalance -= amount;
  seller.walletLedger.push({
    type        : "debit",
    amount,
    balance     : seller.walletBalance,
    source      : "payout",
    description : `Payout requested via ${payoutMethod || "neft"}`,
    referenceId : payout._id?.toString(),
  });

  await seller.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, payout: seller.payouts[seller.payouts.length - 1] });
});

//* Get seller's payout history  GET /api/v1/sellers/me/payouts
exports.getMyPayouts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const seller = await Seller.findOne({ userId: req.user._id }).select("payouts");
  if (!seller) return res.status(200).json({ success: true, total: 0, page: 1, pages: 1, data: [] });

  let payouts = [...seller.payouts].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  if (status) payouts = payouts.filter((p) => p.status === status);

  res.status(200).json({
    success : true,
    total   : payouts.length,
    page    : Number(page),
    pages   : Math.ceil(payouts.length / Number(limit)),
    data    : payouts.slice(skip, skip + Number(limit)),
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   WAREHOUSES
───────────────────────────────────────────────────────────────────────────── */

//* Get all warehouses of the seller  GET /api/v1/sellers/me/warehouses
exports.getWarehouses = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("warehouses");
  if (!seller) return res.status(200).json({ success: true, warehouses: [] });

  res.status(200).json({ success: true, warehouses: seller.warehouses });
});

//* Add a new warehouse  POST /api/v1/sellers/me/warehouses
exports.addWarehouse = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("warehouses");
  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));

  if (!seller.warehouses) seller.warehouses = [];

  if (seller.warehouses.length >= 10) {
    return next(new ErrorHandler("Maximum of 10 warehouses allowed.", 400));
  }

  // If first warehouse, set as default
  if (seller.warehouses.length === 0) req.body.isDefault = true;

  seller.warehouses.push({ ...req.body, createdAt: new Date() });
  await seller.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, warehouses: seller.warehouses });
});

//* Update an existing warehouse  PUT /api/v1/sellers/me/warehouses/:warehouseId
exports.updateWarehouse = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("warehouses");
  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));
  if (!seller.warehouses) seller.warehouses = [];

  const warehouse = seller.warehouses.id(req.params.warehouseId);
  if (!warehouse) return next(new ErrorHandler("Warehouse not found.", 404));

  const ALLOWED = ["name", "code", "address", "contactPhone", "contactEmail", "gstNumber", "isActive", "operatingHours"];
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) warehouse[f] = req.body[f]; });

  await seller.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, warehouses: seller.warehouses });
});

//* Delete (deactivate) a warehouse  DELETE /api/v1/sellers/me/warehouses/:warehouseId
exports.deleteWarehouse = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("warehouses");
  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));
  if (!seller.warehouses) seller.warehouses = [];

  const warehouse = seller.warehouses.id(req.params.warehouseId);
  if (!warehouse) return next(new ErrorHandler("Warehouse not found.", 404));

  if (warehouse.isDefault && seller.warehouses.filter((w) => w.isActive).length > 1) {
    return next(new ErrorHandler("Cannot delete the default warehouse. Set another as default first.", 400));
  }

  warehouse.isActive = false;
  await seller.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Warehouse deactivated.", warehouses: seller.warehouses });
});

//* Set a warehouse as the default  PATCH /api/v1/sellers/me/warehouses/:warehouseId/default
exports.setDefaultWarehouse = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id }).select("warehouses");
  if (!seller) return next(new ErrorHandler("Seller profile not found.", 404));
  if (!seller.warehouses) seller.warehouses = [];

  const warehouse = seller.warehouses.id(req.params.warehouseId);
  if (!warehouse) return next(new ErrorHandler("Warehouse not found.", 404));

  seller.warehouses.forEach((w) => { w.isDefault = false; });
  warehouse.isDefault = true;
  await seller.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Default warehouse updated.", warehouses: seller.warehouses });
});

/* ─────────────────────────────────────────────────────────────────────────────
   SELLER ANALYTICS
───────────────────────────────────────────────────────────────────────────── */

//* Get seller analytics summary from cache  GET /api/v1/sellers/me/analytics
exports.getSellerAnalytics = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id });
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  const { period = "30d" } = req.query;
  const end = new Date();
  const start = new Date();
  
  if (period === "7d") start.setDate(start.getDate() - 7);
  else if (period === "90d") start.setDate(start.getDate() - 90);
  else start.setDate(start.getDate() - 30); // default 30d

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const matchPeriod = { sellerId: seller._id, createdAt: { $gte: start, $lte: end } };

  const [
    generalStatsAgg,
    statusAgg,
    topProductsAgg,
    revenueByDayAgg
  ] = await Promise.all([
    // General Stats
    Order.aggregate([
      { $match: matchPeriod },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          deliveredOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0] } },
          returnedOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "returns"] }, 1, 0] } },
          revenue: {
            $sum: {
              $cond: [
                { $in: ["$orderStatus", ["delivered"]] },
                "$pricing.total",
                0
              ]
            }
          },
          productsSold: {
            $sum: {
              $cond: [
                { $in: ["$orderStatus", ["delivered"]] },
                { $sum: "$items.quantity" },
                0
              ]
            }
          }
        }
      }
    ]),
    
    // Status breakdown
    Order.aggregate([
      { $match: matchPeriod },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
    ]),

    // Top Products
    Order.aggregate([
      { $match: { ...matchPeriod, orderStatus: "delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          imageUrl: { $first: "$items.image" },
          salesCount: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.subtotal" }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
      {
        $project: {
          productId: "$_id",
          name: 1,
          imageUrl: 1,
          salesCount: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]),

    // Revenue by Day
    Order.aggregate([
      { $match: { ...matchPeriod, orderStatus: "delivered" } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$pricing.total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ])
  ]);

  const stats = generalStatsAgg[0] || {
    totalOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    revenue: 0,
    productsSold: 0
  };

  const aov = stats.deliveredOrders > 0 ? stats.revenue / stats.deliveredOrders : 0;
  const returnsRate = stats.deliveredOrders > 0 ? (stats.returnedOrders / stats.deliveredOrders) * 100 : 0;
  
  // Fill missing dates in revenue array
  const revenueByDayMap = new Map();
  revenueByDayAgg.forEach(r => revenueByDayMap.set(r._id, r));
  
  const revenueByDay = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    revenueByDay.push({
      date: dateStr,
      revenue: revenueByDayMap.get(dateStr)?.revenue || 0,
      orders: revenueByDayMap.get(dateStr)?.orders || 0
    });
  }

  const ordersByStatus = {};
  statusAgg.forEach(s => { ordersByStatus[s._id] = s.count; });

  res.status(200).json({
    success: true,
    data: {
      period: { start, end },
      revenue: stats.revenue,
      orders: stats.totalOrders,
      averageOrderValue: aov,
      productsSold: stats.productsSold,
      conversionRate: 0, // Placeholder as we do not track unique visitor sessions
      returnsRate,
      topProducts: topProductsAgg,
      revenueByDay,
      ordersByStatus
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — SELLER MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */

//* Get all sellers with filters and pagination (admin)  GET /api/v1/sellers/admin
exports.adminGetAllSellers = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20,
    verificationStatus, sellerLevel, businessType,
    isActive, search,
    sortBy = "createdAt", order = "desc",
  } = req.query;

  const filter = { deletedAt: null };
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (sellerLevel)        filter.sellerLevel         = sellerLevel;
  if (businessType)       filter.businessType        = businessType;
  if (isActive !== undefined) filter.isActive        = isActive === "true";

  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [
      { businessName    : re },
      { businessEmail   : re },
      { gstNumber       : re },
      { panNumber       : re },
      { "store.name"    : re },
    ];
  }

  const skip      = (Number(page) - 1) * Number(limit);
  const direction = order === "asc" ? 1 : -1;

  const [sellers, total] = await Promise.all([
    Seller.find(filter).sort({ [sortBy]: direction }).skip(skip).limit(Number(limit)),
    Seller.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : sellers,
  });
});

//* Get a single seller by ID in full detail (admin)  GET /api/v1/sellers/admin/:id
exports.adminGetSeller = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findById(req.params.id).select("+bankDetails.accountNumber");
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  res.status(200).json({ success: true, data: seller });
});

//* Verify seller — approve or reject with remarks (admin)  PATCH /api/v1/sellers/admin/:id/verify
exports.verifySeller = asyncHandler(async (req, res, next) => {
  const { status, remarks } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return next(new ErrorHandler(`status must be "approved" or "rejected".`, 400));
  }

  const seller = await Seller.findById(req.params.id);
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  seller.verificationStatus  = status;
  seller.verificationRemarks = remarks;
  seller.verifiedBy          = req.user._id;
  seller.verifiedAt          = new Date();

  if (status === "approved") {
    if (!seller.store) seller.store = {};
    seller.store.isVerified   = true;
    seller.onboardingStep     = "completed";
    
    // Auto-approve all pending documents if the seller is approved
    if (seller.documents && seller.documents.length > 0) {
      seller.documents.forEach(doc => {
        if (doc.status !== "approved") {
          doc.status = "approved";
          doc.reviewedBy = req.user._id;
          doc.reviewedAt = new Date();
        }
      });
    }
  }

  await seller.save({ validateBeforeSave: false });

  await Config.create({
    type: "audit_log",
    audit: {
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`,
      adminEmail: req.user.email,
      action: "verify_seller",
      targetType: "seller",
      targetId: String(seller._id),
      description: `Seller KYC ${status}. Remarks: ${remarks || 'None'}`,
    }
  });

  await Notification.create({
    userId: seller.userId,
    type: status === "approved" ? "seller_verified" : "general",
    title: `Account ${status === "approved" ? "Verified" : "Rejected"}`,
    message: status === "approved" 
      ? "Your seller account has been verified!" 
      : `Your seller account verification was rejected. Remarks: ${remarks || 'None'}`,
    actionUrl: "/seller/dashboard"
  });

  res.status(200).json({ success: true, message: `Seller ${status}.`, verificationStatus: seller.verificationStatus });
});

//* Suspend a seller account (admin)  PATCH /api/v1/sellers/admin/:id/suspend
exports.suspendSeller = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return next(new ErrorHandler("Suspension reason is required.", 400));

  const seller = await Seller.findById(req.params.id);
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  seller.verificationStatus = "suspended";
  seller.suspensionReason   = reason;
  seller.suspendedAt        = new Date();
  seller.isActive           = false;
  await seller.save({ validateBeforeSave: false });

  await Config.create({
    type: "audit_log",
    audit: {
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`,
      adminEmail: req.user.email,
      action: "suspend_seller",
      targetType: "seller",
      targetId: String(seller._id),
      description: `Suspended seller. Reason: ${reason}`,
    }
  });

  await Notification.create({
    userId: seller.userId,
    type: "seller_suspended",
    title: "Account Suspended",
    message: `Your seller account has been suspended. Reason: ${reason}`,
  });

  res.status(200).json({ success: true, message: "Seller suspended.", data: seller });
});

//* Lift suspension and reinstate a seller (admin)  PATCH /api/v1/sellers/admin/:id/unsuspend
exports.unsuspendSeller = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  seller.verificationStatus = "approved";
  seller.suspensionReason   = undefined;
  seller.suspendedAt        = undefined;
  seller.isActive           = true;
  await seller.save({ validateBeforeSave: false });

  await Config.create({
    type: "audit_log",
    audit: {
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`,
      adminEmail: req.user.email,
      action: "unsuspend_seller",
      targetType: "seller",
      targetId: String(seller._id),
      description: `Reinstated suspended seller.`,
    }
  });

  await Notification.create({
    userId: seller.userId,
    type: "seller_unsuspended",
    title: "Account Reinstated",
    message: "Your seller account has been reinstated. You can now resume your operations.",
    actionUrl: "/seller/dashboard"
  });

  res.status(200).json({ success: true, message: "Seller reinstated.", data: seller });
});

//* Soft-delete a seller account (admin)  DELETE /api/v1/sellers/admin/:id
exports.deleteSeller = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  seller.isActive   = false;
  seller.deletedAt  = new Date();
  seller.verificationStatus = "rejected";
  await seller.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Seller account soft-deleted." });
});

//* Update KYC document status — approve or reject (admin)  PATCH /api/v1/sellers/admin/:id/documents/:docId/status
exports.updateDocumentStatus = asyncHandler(async (req, res, next) => {
  const { status, remarks } = req.body;
  const ALLOWED = ["pending", "under_review", "approved", "rejected"];

  if (!ALLOWED.includes(status)) return next(new ErrorHandler(`Invalid document status "${status}".`, 400));

  const seller = await Seller.findById(req.params.id).select("documents userId verificationStatus");
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  const doc = seller.documents.id(req.params.docId);
  if (!doc) return next(new ErrorHandler("Document not found.", 404));

  doc.status     = status;
  doc.remarks    = remarks;
  doc.reviewedBy = req.user._id;
  doc.reviewedAt = new Date();

  // If a document is approved, approve the entire seller so they can add products
  if (status === "approved") {
    seller.verificationStatus = "approved";
    seller.verifiedAt = new Date();
    seller.verifiedBy = req.user._id;
    
    if (!seller.store) seller.store = {};
    seller.store.isVerified = true;
    seller.onboardingStep = "completed";
    
    // Auto-approve all other pending documents
    if (seller.documents && seller.documents.length > 0) {
      seller.documents.forEach(d => {
        if (d.status !== "approved") {
          d.status = "approved";
          d.reviewedBy = req.user._id;
          d.reviewedAt = new Date();
        }
      });
    }
  } else if (status === "rejected") {
    seller.verificationStatus = "rejected";
    seller.verificationRemarks = remarks || "One or more KYC documents were rejected.";
    seller.verifiedBy = req.user._id;
    seller.verifiedAt = new Date();
    if (seller.store) seller.store.isVerified = false;
  }

  await seller.save({ validateBeforeSave: false });

  await Config.create({
    type: "audit_log",
    audit: {
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`,
      adminEmail: req.user.email,
      action: "update_document",
      targetType: "seller",
      targetId: String(seller._id),
      description: `Updated document (${doc.type}) status to ${status}. Remarks: ${remarks || 'None'}`,
    }
  });

  await Notification.create({
    userId: seller.userId,
    type: status === "approved" ? "kyc_approved" : (status === "rejected" ? "kyc_rejected" : "general"),
    title: `Document ${status === "approved" ? "Approved" : (status === "rejected" ? "Rejected" : "Updated")}`,
    message: `Your ${doc.type} document has been marked as ${status}.${status === "rejected" && remarks ? ` Reason: ${remarks}` : ''}`,
    actionUrl: "/seller/profile"
  });

  res.status(200).json({ success: true, document: doc });
});

//* Verify seller bank account (admin)  PATCH /api/v1/sellers/admin/:id/bank/verify
exports.verifyBankDetails = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  if (!seller.bankDetails?.accountHolder) {
    return next(new ErrorHandler("No bank details found for this seller.", 404));
  }

  seller.bankDetails.isVerified = true;
  seller.bankDetails.verifiedAt = new Date();
  await seller.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Bank account verified." });
});

//* Update seller commission rate (admin)  PATCH /api/v1/sellers/admin/:id/commission
exports.updateCommissionRate = asyncHandler(async (req, res, next) => {
  const { commissionRate } = req.body;

  if (commissionRate === undefined || commissionRate < 0 || commissionRate > 100) {
    return next(new ErrorHandler("commissionRate must be between 0 and 100.", 400));
  }

  const seller = await Seller.findByIdAndUpdate(
    req.params.id,
    { $set: { commissionRate } },
    { new: true }
  ).select("businessName commissionRate");

  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  res.status(200).json({ success: true, commissionRate: seller.commissionRate });
});

//* Promote or demote seller tier level (admin)  PATCH /api/v1/sellers/admin/:id/level
exports.updateSellerLevel = asyncHandler(async (req, res, next) => {
  const { sellerLevel } = req.body;
  const ALLOWED = ["bronze", "silver", "gold", "platinum"];

  if (!ALLOWED.includes(sellerLevel)) {
    return next(new ErrorHandler(`sellerLevel must be one of: ${ALLOWED.join(", ")}.`, 400));
  }

  const seller = await Seller.findByIdAndUpdate(
    req.params.id,
    { $set: { sellerLevel } },
    { new: true }
  ).select("businessName sellerLevel");

  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  res.status(200).json({ success: true, sellerLevel: seller.sellerLevel });
});

//* Process a seller payout request — approve, reject or mark processed (admin)  PATCH /api/v1/sellers/admin/:id/payouts/:payoutId/status
exports.processPayoutAdmin = asyncHandler(async (req, res, next) => {
  const { status, referenceId, failureReason, taxDeducted, notes } = req.body;
  const ALLOWED = ["pending", "processing", "processed", "failed", "on_hold"];

  if (!ALLOWED.includes(status)) return next(new ErrorHandler(`Invalid payout status "${status}".`, 400));

  const seller = await Seller.findById(req.params.id).select("payouts walletBalance walletLedger pendingPayout");
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  const payout = seller.payouts.id(req.params.payoutId);
  if (!payout) return next(new ErrorHandler("Payout not found.", 404));

  const prevStatus = payout.status;
  payout.status      = status;
  payout.processedBy = req.user._id;
  if (referenceId)   payout.referenceId  = referenceId;
  if (failureReason) payout.failureReason = failureReason;
  if (taxDeducted !== undefined) {
    payout.taxDeducted = taxDeducted;
    payout.netAmount   = payout.amount - taxDeducted;
  }
  if (notes) payout.notes = notes;

  if (status === "processed") {
    payout.processedAt   = new Date();
    seller.pendingPayout = Math.max(0, (seller.pendingPayout || 0) - payout.amount);
    seller.walletLedger.push({
      type        : "debit",
      amount      : payout.netAmount || payout.amount,
      balance     : seller.walletBalance,
      source      : "payout",
      description : `Payout processed. Ref: ${referenceId || "—"}`,
      referenceId : payout._id.toString(),
    });
  }

  // If failed, refund back to wallet
  if (status === "failed" && prevStatus !== "failed") {
    seller.walletBalance += payout.amount;
    seller.walletLedger.push({
      type        : "credit",
      amount      : payout.amount,
      balance     : seller.walletBalance,
      source      : "adjustment",
      description : `Payout failed — amount refunded to wallet.`,
      referenceId : payout._id.toString(),
    });
  }

  await seller.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, payout });
});

//* Manually adjust seller wallet balance (admin)  PATCH /api/v1/sellers/admin/:id/wallet/adjust
exports.adminAdjustWallet = asyncHandler(async (req, res, next) => {
  const { type, amount, source, description, referenceId } = req.body;

  if (!["credit", "debit"].includes(type)) {
    return next(new ErrorHandler(`type must be "credit" or "debit".`, 400));
  }
  if (!amount || amount <= 0) return next(new ErrorHandler("Valid amount is required.", 400));

  const seller = await Seller.findById(req.params.id).select("walletBalance walletLedger pendingPayout");
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  if (type === "debit" && seller.walletBalance < amount) {
    return next(new ErrorHandler("Insufficient wallet balance.", 400));
  }

  seller.walletBalance = type === "credit"
    ? seller.walletBalance + amount
    : seller.walletBalance - amount;

  seller.walletLedger.push({
    type,
    amount,
    balance     : seller.walletBalance,
    source      : source || "adjustment",
    description : description || `Admin ${type} adjustment`,
    referenceId,
  });

  await seller.save({ validateBeforeSave: false });

  res.status(200).json({
    success       : true,
    message       : "Wallet adjusted.",
    walletBalance : seller.walletBalance,
  });
});

//* Refresh seller analytics cache (admin)  PATCH /api/v1/sellers/admin/:id/analytics/refresh
exports.refreshAnalyticsCache = asyncHandler(async (req, res, next) => {
  const {
    totalRevenue30d, totalOrders30d, conversionRate,
    avgOrderValue, topProductId, pendingOrders, cancelRate,
  } = req.body;

  const seller = await Seller.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        "analyticsCache.totalRevenue30d" : totalRevenue30d,
        "analyticsCache.totalOrders30d"  : totalOrders30d,
        "analyticsCache.conversionRate"  : conversionRate,
        "analyticsCache.avgOrderValue"   : avgOrderValue,
        "analyticsCache.topProductId"    : topProductId,
        "analyticsCache.pendingOrders"   : pendingOrders,
        "analyticsCache.cancelRate"      : cancelRate,
        "analyticsCache.lastUpdated"     : new Date(),
      },
    },
    { new: true }
  ).select("analyticsCache businessName");

  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  res.status(200).json({ success: true, analyticsCache: seller.analyticsCache });
});

/* ─────────────────────────────────────────────────────────────────────────────
   SELLER DASHBOARD
───────────────────────────────────────────────────────────────────────────── */

//* Get seller dashboard summary  GET /api/v1/sellers/me/dashboard
exports.getSellerDashboard = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ userId: req.user._id, deletedAt: null });
  if (!seller) return next(new ErrorHandler("Seller not found.", 404));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    todayOrdersCount,
    todayOrdersRevenueAgg,
    pendingOrdersCount,
    productsStats,
    lowStockProducts,
    recentOrders
  ] = await Promise.all([
    Order.countDocuments({ sellerId: seller._id, createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Order.aggregate([
      { $match: { sellerId: seller._id, createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } }
    ]),
    Order.countDocuments({ sellerId: seller._id, orderStatus: { $in: ["pending", "confirmed", "processing", "packed"] } }),
    Product.aggregate([
      { $match: { sellerId: seller._id, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalActive: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          totalDraft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
          pendingApproval: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          hidden: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $eq: ["$totalStock", 0] }, 1, 0] } },
        }
      }
    ]),
    Product.find({ sellerId: seller._id, "variants.totalStock": { $lt: 5 }, deletedAt: null })
      .select("name sku variants")
      .limit(5),
    Order.find({ sellerId: seller._id }).sort({ createdAt: -1 }).limit(5)
  ]);

  const todayRevenue = todayOrdersRevenueAgg.length > 0 ? todayOrdersRevenueAgg[0].total : 0;
  const pStats = productsStats[0] || { totalActive: 0, totalDraft: 0, pendingApproval: 0, hidden: 0, outOfStock: 0 };
  
  const processedPayouts = seller.payouts?.filter(p => p.status === "processed") || [];
  const lastPayoutDate = processedPayouts.length > 0 
    ? processedPayouts.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt))[0].processedAt 
    : null;

  res.status(200).json({
    success: true,
    seller,
    todayOrders: todayOrdersCount,
    todayRevenue,
    pendingOrders: pendingOrdersCount,
    products: {
      active: pStats.totalActive,
      draft: pStats.totalDraft,
      outOfStock: pStats.outOfStock,
      hidden: pStats.hidden,
      pendingApproval: pStats.pendingApproval
    },
    lowStockCount: pStats.outOfStock, // Map lowStockCount directly to out of stock for dashboard card
    lowStockProducts: lowStockProducts.map(p => {
      const lowVariant = p.variants?.find(v => v.totalStock < 5) || p.variants?.[0];
      return {
        name: p.name,
        variantLabel: lowVariant ? `${lowVariant.color || ''} ${lowVariant.size || ''}`.trim() : '',
        variantSku: lowVariant?.sku || p.sku,
        stock: lowVariant?.totalStock || 0
      };
    }),
    walletBalance: seller.walletBalance || 0,
    totalEarnings: seller.totalEarnings || 0,
    pendingPayout: seller.pendingPayout || 0,
    lastPayoutDate,
    recentOrders
  });
});