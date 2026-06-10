const asyncHandler = require("../middleware/asyncHandler");
const ErrorHandler = require("../middleware/error");
const pick = require("../utils/pick");
const Promotion = require("../models/Promotion");

// @desc    Create a promotion
// @route   POST /api/v1/promotions
// @access  Admin
exports.createPromotion = asyncHandler(async (req, res, next) => {
  const ALLOWED_PROMOTION_FIELDS = ["code", "discountType", "discountValue", "minOrderValue", "maxDiscount", "validFrom", "validUntil", "usageLimit"];
  const safeData = pick(req.body, ALLOWED_PROMOTION_FIELDS);
  const promotion = await Promotion.create(safeData);
  res.status(201).json({ success: true, data: promotion });
});

// @desc    Get all promotions
// @route   GET /api/v1/promotions
// @access  Public
exports.getPromotions = asyncHandler(async (req, res, next) => {
  const promotions = await Promotion.find({ isActive: true });
  res.status(200).json({ success: true, count: promotions.length, data: promotions });
});

// @desc    Get single promotion
// @route   GET /api/v1/promotions/:id
// @access  Public
exports.getPromotionById = asyncHandler(async (req, res, next) => {
  const promotion = await Promotion.findById(req.params.id);

  if (!promotion) {
    return next(new ErrorHandler("Promotion not found", 404));
  }

  res.status(200).json({ success: true, data: promotion });
});

// @desc    Update promotion
// @route   PUT /api/v1/promotions/:id
// @access  Admin
exports.updatePromotion = asyncHandler(async (req, res, next) => {
  const ALLOWED_PROMOTION_FIELDS = ["code", "discountType", "discountValue", "minOrderValue", "maxDiscount", "validFrom", "validUntil", "usageLimit", "isActive"];
  const updates = pick(req.body, ALLOWED_PROMOTION_FIELDS);
  const promotion = await Promotion.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!promotion) {
    return next(new ErrorHandler("Promotion not found", 404));
  }

  res.status(200).json({ success: true, data: promotion });
});

// @desc    Delete promotion
// @route   DELETE /api/v1/promotions/:id
// @access  Admin
exports.deletePromotion = asyncHandler(async (req, res, next) => {
  const promotion = await Promotion.findById(req.params.id);

  if (!promotion) {
    return next(new ErrorHandler("Promotion not found", 404));
  }

  promotion.isActive = false;
  await promotion.save();

  res.status(200).json({ success: true, data: {} });
});
