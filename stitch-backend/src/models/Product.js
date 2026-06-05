"use strict";

const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const colorEmbedSchema = new Schema(
  {
    name       : { type: String, trim: true },
    slug       : { type: String, trim: true, lowercase: true },
    hexCode    : { type: String, match: [/^#([A-Fa-f0-9]{6})$/, "Invalid hex color"] },
    rgbCode    : {
      r : { type: Number, min: 0, max: 255 },
      g : { type: Number, min: 0, max: 255 },
      b : { type: Number, min: 0, max: 255 },
    },
    textureUrl : { type: String },
    family     : { type: String },
  },
  { _id: false },
);

const sizeEmbedSchema = new Schema(
  {
    label        : { type: String, trim: true },
    value        : { type: String, trim: true, lowercase: true },
    system       : { type: String, enum: ["IN", "EU", "US", "UK", "INT"] },
    measurements : {
      chest  : { min: { type: Number }, max: { type: Number } },
      waist  : { min: { type: Number }, max: { type: Number } },
      hips   : { min: { type: Number }, max: { type: Number } },
      length : { min: { type: Number }, max: { type: Number } },
      unit   : { type: String, default: "cm" },
    },
    equivalents : {
      EU : { type: String },
      US : { type: String },
      UK : { type: String },
    },
    position : { type: Number, default: 0 },
  },
  { _id: false },
);

const warehouseStockSchema = new Schema(
  {
    warehouseId   : { type: Schema.Types.ObjectId, required: true },
    warehouseName : { type: String },
    quantity      : { type: Number, default: 0, min: 0 },
    reserved      : { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

const variantSchema = new Schema(
  {
    sku            : { type: String, required: true, trim: true, uppercase: true },
    barcode        : { type: String, trim: true },
    mpn            : { type: String, trim: true },
    hsn            : { type: String, trim: true },
    color          : { type: colorEmbedSchema },
    size           : { type: sizeEmbedSchema },
    price          : { type: Number, required: true, min: 0 },
    compareAtPrice : { type: Number, min: 0 },
    costPrice      : { type: Number, min: 0, select: false },
    weight         : { type: Number },
    images         : [{ type: String }],
    texture3dUrl   : { type: String },
    totalStock        : { type: Number, default: 0, min: 0 },
    reservedStock     : { type: Number, default: 0, min: 0 },
    soldCount         : { type: Number, default: 0, min: 0 },
    lowStockThreshold : { type: Number, default: 5, min: 0 },
    trackInventory    : { type: Boolean, default: true },
    allowBackorder    : { type: Boolean, default: false },
    warehouseStock    : { type: [warehouseStockSchema], default: [] },
    position   : { type: Number, default: 0 },
    isDefault  : { type: Boolean, default: false },
    isActive   : { type: Boolean, default: true },
    isArchived : { type: Boolean, default: false },
  },
  { _id: true },
);

variantSchema.virtual("availableStock").get(function () {
  return Math.max(0, this.totalStock - this.reservedStock);
});

variantSchema.virtual("isInStock").get(function () {
  return this.totalStock - this.reservedStock > 0;
});

const texture3dSchema = new Schema(
  {
    type       : { type: String, enum: ["diffuse", "normal", "ao", "roughness", "metalness", "emissive"] },
    url        : { type: String, required: true },
    resolution : { type: String },
  },
  { _id: false },
);

const viewerConfigSchema = new Schema(
  {
    camera : {
      fov             : { type: Number, default: 45 },
      near            : { type: Number, default: 0.1 },
      far             : { type: Number, default: 1000 },
      initialPosition : { x: { type: Number, default: 0 }, y: { type: Number, default: 1.5 }, z: { type: Number, default: 3 } },
      target          : { x: { type: Number, default: 0 }, y: { type: Number, default: 0.9 }, z: { type: Number, default: 0 } },
    },
    lighting : {
      ambientIntensity     : { type: Number, default: 0.5 },
      directionalIntensity : { type: Number, default: 1.2 },
      hdriMap              : { type: String, default: "studio_soft" },
      shadows              : { type: Boolean, default: true },
    },
    autoRotate      : { type: Boolean, default: true },
    rotateSpeed     : { type: Number, default: 0.5 },
    background      : { type: String, default: "#F5F5F5" },
    allowFullscreen : { type: Boolean, default: true },
    allowZoom       : { type: Boolean, default: true },
    allowPan        : { type: Boolean, default: false },
    enableAR        : { type: Boolean, default: false },
  },
  { _id: false },
);

const model3dSchema = new Schema(
  {
    fileUrl           : { type: String },
    format            : { type: String, enum: ["glb", "gltf", "obj", "fbx", "usdz"] },
    fileSize          : { type: Number },
    status            : {
      type    : String,
      enum    : ["pending", "processing", "ready", "failed"],
      default : "pending",
    },
    processingError   : { type: String },
    polyCount         : { type: Number },
    textureResolution : { type: String },
    lod               : { type: String, enum: ["high", "medium", "low"] },
    textures          : { type: [texture3dSchema], default: [] },
    viewerConfig      : { type: viewerConfigSchema, default: () => ({}) },
    previewImageUrl   : { type: String },
    uploadedAt        : { type: Date, default: Date.now },
    readyAt           : { type: Date },
  },
  { _id: false },
);

const productImageSchema = new Schema(
  {
    url       : { type: String, required: true },
    alt       : { type: String },
    position  : { type: Number, default: 0 },
    isDefault : { type: Boolean, default: false },
    type      : { type: String, enum: ["front", "back", "detail", "lifestyle", "size_chart"], default: "front" },
  },
  { _id: true },
);

const reviewSchema = new Schema(
  {
    userId            : { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName          : { type: String },
    userAvatar        : { type: String },
    orderId           : { type: String, required: true },
    orderItemId       : { type: Schema.Types.ObjectId },
    rating            : { type: Number, required: true, min: 1, max: 5 },
    title             : { type: String, required: true, trim: true, maxlength: 100 },
    body              : { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    pros              : [{ type: String }],
    cons              : [{ type: String }],
    images            : [{ type: String }],
    videoUrl          : { type: String },
    sizeAccuracy      : { type: String, enum: ["runs_small", "true_to_size", "runs_large"] },
    language          : { type: String, default: "en" },
    helpfulCount      : { type: Number, default: 0 },
    flagCount         : { type: Number, default: 0 },
    helpfulUserIds    : [{ type: Schema.Types.ObjectId }],
    isVerifiedPurchase : { type: Boolean, default: true },
    isAnonymous        : { type: Boolean, default: false },
    status             : {
      type    : String,
      enum    : ["pending", "approved", "rejected", "flagged"],
      default : "pending",
    },
    rejectionReason    : { type: String },
    sellerReply : {
      text      : { type: String, maxlength: 1000 },
      repliedAt : { type: Date },
      isEdited  : { type: Boolean, default: false },
      editedAt  : { type: Date },
    },
    createdAt : { type: Date, default: Date.now },
    updatedAt : { type: Date, default: Date.now },
  },
  { _id: true },
);

const customisationSchema = new Schema(
  {
    type        : { type: String, enum: ["embroidery", "monogram", "print", "patch", "alteration"] },
    label       : { type: String },
    isRequired  : { type: Boolean, default: false },
    extraCharge : { type: Number, default: 0 },
    maxLength   : { type: Number },
    options     : [{ type: String }],
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    name     : { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    slug     : { type: String, required: true, trim: true, lowercase: true, unique: true },
    sku      : { type: String, trim: true, uppercase: true },
    hsn      : { type: String, trim: true },
    sellerId : { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    category : {
      id         : { type: Schema.Types.ObjectId, required: true },
      name       : { type: String, required: true },
      slug       : { type: String, required: true },
      parentId   : { type: Schema.Types.ObjectId },
      parentName : { type: String },
      breadcrumb : [{ id: { type: Schema.Types.ObjectId }, name: { type: String } }],
    },
    brand : {
      id      : { type: Schema.Types.ObjectId },
      name    : { type: String },
      slug    : { type: String },
      logoUrl : { type: String },
    },
    collectionIds : [{ type: Schema.Types.ObjectId }],
    description      : { type: String, required: true, maxlength: 10000 },
    shortDescription : { type: String, maxlength: 500 },
    fabric           : { type: String, trim: true },
    careInstructions : { type: String },
    countryOfOrigin  : { type: String, required: true, default: "IN", trim: true, uppercase: true },
    gender           : { type: String, enum: ["men", "women", "unisex", "kids", "baby"] },
    occasion         : [{ type: String }],
    tags             : [{ type: String, lowercase: true, trim: true }],
    pattern          : { type: String },
    fit              : { type: String, enum: ["slim", "regular", "loose", "oversized"] },
    neckType         : { type: String },
    sleeveType       : { type: String },
    style            : { type: String },
    basePrice   : { type: Number, required: true, min: 0 },
    salePrice   : { type: Number, min: 0 },
    currency    : { type: String, default: "INR", uppercase: true },
    taxRate     : { type: Number, default: 5, min: 0 },
    taxIncluded : { type: Boolean, default: false },
    minOrderQty : { type: Number, default: 1, min: 1 },
    maxOrderQty : { type: Number, default: 10, min: 1 },
    images : { type: [productImageSchema], default: [] },
    has3DModel : { type: Boolean, default: false },
    model3D    : { type: model3dSchema },
    variants : { type: [variantSchema], default: [] },
    totalStock : { type: Number, default: 0 },
    isInStock  : { type: Boolean, default: true },
    customisationOptions : { type: [customisationSchema], default: [] },
    relatedProductIds      : [{ type: Schema.Types.ObjectId, ref: "Product" }],
    frequentlyBoughtWith   : [{ type: Schema.Types.ObjectId, ref: "Product" }],
    bundledWith            : [{
      productId   : { type: Schema.Types.ObjectId, ref: "Product" },
      bundlePrice : { type: Number },
    }],
    metaTitle       : { type: String, maxlength: 70 },
    metaDescription : { type: String, maxlength: 160 },
    metaKeywords    : [{ type: String }],
    canonicalUrl    : { type: String },
    isReturnable       : { type: Boolean, default: true },
    returnWindowDays   : { type: Number, default: 7 },
    isExchangeable     : { type: Boolean, default: true },
    exchangeWindowDays : { type: Number, default: 7 },
    isCODAvailable     : { type: Boolean, default: true },
    averageRating       : { type: Number, default: 0, min: 0, max: 5 },
    totalRatings        : { type: Number, default: 0 },
    totalReviews        : { type: Number, default: 0 },
    ratingDistribution  : {
      1 : { type: Number, default: 0 },
      2 : { type: Number, default: 0 },
      3 : { type: Number, default: 0 },
      4 : { type: Number, default: 0 },
      5 : { type: Number, default: 0 },
    },
    sizeAccuracySummary : {
      runs_small   : { type: Number, default: 0 },
      true_to_size : { type: Number, default: 0 },
      runs_large   : { type: Number, default: 0 },
    },
    reviews : { type: [reviewSchema], default: [] },
    weight     : { type: Number },
    dimensions : {
      length : { type: Number },
      width  : { type: Number },
      height : { type: Number },
    },
    status           : {
      type    : String,
      enum    : ["draft", "pending_approval", "approved", "rejected", "archived", "suspended"],
      default : "draft",
    },
    rejectionReason  : { type: String },
    approvedBy       : { type: Schema.Types.ObjectId, ref: "User" },    
    approvedAt       : { type: Date },                                  
    isFeatured       : { type: Boolean, default: false },
    isActive         : { type: Boolean, default: true },
    publishedAt      : { type: Date },

    // ── Analytics Counters (denormalized) ─────────────────────────────────────
    viewCount     : { type: Number, default: 0 },
    wishlistCount : { type: Number, default: 0 },
    salesCount    : { type: Number, default: 0 },
    shareCount    : { type: Number, default: 0 },               

    // ── Meta ──────────────────────────────────────────────────────────────────
    deletedAt : { type: Date },
  },
  {
    timestamps : true,
    toJSON     : { virtuals: true },
    toObject   : { virtuals: true },
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   VIRTUALS
───────────────────────────────────────────────────────────────────────────── */
productSchema.virtual("discountPercent").get(function () {
  if (this.salePrice && this.basePrice > 0 && this.salePrice < this.basePrice) {
    return Math.round(((this.basePrice - this.salePrice) / this.basePrice) * 100);
  }
  return 0;
});

productSchema.virtual("effectivePrice").get(function () {      
  return this.salePrice || this.basePrice;
});

productSchema.virtual("seller", {
  ref: "Seller",
  localField: "sellerId",
  foreignField: "_id",
  justOne: true
});

/* ─────────────────────────────────────────────────────────────────────────────
   PRE-SAVE HOOKS
───────────────────────────────────────────────────────────────────────────── */

/** Auto-compute totalStock and isInStock from variants */
productSchema.pre("save", function () {                    
  if (this.isModified("variants")) {
    this.totalStock = this.variants.reduce((sum, v) => {
      return v.isActive && !v.isArchived ? sum + Math.max(0, v.totalStock - v.reservedStock) : sum;
    }, 0);
    this.isInStock = this.totalStock > 0;
  }
});

/** Auto-set has3DModel when model is ready */
productSchema.pre("save", function () {                    
  if (this.isModified("model3D") && this.model3D) {
    this.has3DModel = this.model3D.status === "ready";
  }
});

/** Cap reviews to 50 most recent approved reviews */
productSchema.pre("save", function () {                    
  const approved = this.reviews.filter((r) => r.status === "approved");
  if (approved.length > 50) {
    const keep = approved.slice(-50).map((r) => r._id.toString());
    this.reviews = this.reviews.filter((r) => keep.includes(r._id.toString()));
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   INDEXES
───────────────────────────────────────────────────────────────────────────── */

productSchema.index({ "category.id": 1 });
productSchema.index({ "brand.id": 1 });
productSchema.index({ sellerId: 1, deletedAt: 1 });
productSchema.index({ sellerId: 1 });
productSchema.index({ status: 1, isActive: 1 });               
productSchema.index({ gender: 1 });
productSchema.index({ salePrice: 1 });
productSchema.index({ basePrice: 1 });                          
productSchema.index({ averageRating: -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ viewCount: -1 });                         
productSchema.index({ wishlistCount: -1 });                     
productSchema.index({ createdAt: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ isInStock: 1 });
productSchema.index({ isFeatured: 1 });                         
productSchema.index({ collectionIds: 1 });                      
productSchema.index({ name: "text", description: "text", tags: "text" });

const Product = model("Product", productSchema);

module.exports = Product;