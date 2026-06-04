// src/lib/types/product.types.ts

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ProductStatus = 'draft' | 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'archived' | 'suspended';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type StockUpdateType = 'set' | 'increment' | 'decrement';
export type ProductGender = 'men' | 'women' | 'unisex' | 'kids' | 'baby';
export type ProductFit = 'slim' | 'regular' | 'loose' | 'oversized' | string;
export type ProductImageType = 'front' | 'back' | 'detail' | 'lifestyle' | 'size_chart';
export type ProductModel3DStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type ProductModel3DFormat = 'glb' | 'gltf' | 'obj' | 'fbx' | 'usdz';
export type ProductModel3DLod = 'high' | 'medium' | 'low';
export type ProductCustomizationType = 'embroidery' | 'monogram' | 'print' | 'patch' | 'alteration';

// Supports both normal API JSON and Mongo Extended JSON ($oid/$date)
export type MongoIdLike = string;
export type MongoDateLike = string;

// ─── Sub-models ───────────────────────────────────────────────────────────────

export interface ProductColor {
  name?: string;
  slug?: string;
  hexCode?: string;
  rgbCode?: {
    r: number;
    g: number;
    b: number;
  };
  textureUrl?: string;
  family?: string;
  // Legacy support
  hex?: string;
}

export interface ProductSize {
  label?: string;
  value?: string;
  system?: 'IN' | 'EU' | 'US' | 'UK' | 'INT';
  measurements?: {
    chest?: { min?: number; max?: number };
    waist?: { min?: number; max?: number };
    hips?: { min?: number; max?: number };
    length?: { min?: number; max?: number };
    unit?: string;
  };
  equivalents?: {
    EU?: string;
    US?: string;
    UK?: string;
  };
  position?: number;
}

export interface ProductCategory {
  id?: MongoIdLike;
  name: string;
  slug: string;
  parentId?: MongoIdLike;
  parentName?: string;
  breadcrumb?: { id?: MongoIdLike; name?: string }[];
}

export interface ProductBrand {
  id?: string;
  name?: string;
  slug?: string;
  logoUrl?: string;
}

export interface ProductImage {
  _id: MongoIdLike;
  url: string;
  alt?: string;
  position?: number;
  isDefault?: boolean;
  isPrimary?: boolean;
  type?: ProductImageType;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  createdAt?: string;
}

export interface ProductWarehouseStock {
  _id?: string;
  warehouseId: string;
  warehouseName?: string;
  quantity?: number;
  reserved?: number;
}

export interface ProductTexture3D {
  type?: 'diffuse' | 'normal' | 'ao' | 'roughness' | 'metalness' | 'emissive';
  url: string;
  resolution?: string;
}

export interface ProductViewerCamera {
  fov?: number;
  near?: number;
  far?: number;
  initialPosition?: { x?: number; y?: number; z?: number };
  target?: { x?: number; y?: number; z?: number };
}

export interface ProductViewerLighting {
  ambientIntensity?: number;
  directionalIntensity?: number;
  hdriMap?: string;
  shadows?: boolean;
}

export interface ProductViewerConfig {
  camera?: ProductViewerCamera;
  lighting?: ProductViewerLighting;
  autoRotate?: boolean;
  rotateSpeed?: number;
  background?: string;
  allowFullscreen?: boolean;
  allowZoom?: boolean;
  allowPan?: boolean;
  enableAR?: boolean;
}

export interface ProductModel3D {
  fileUrl?: string;
  format?: ProductModel3DFormat;
  fileSize?: number;
  status?: ProductModel3DStatus;
  processingError?: string;
  polyCount?: number;
  textureResolution?: string;
  lod?: ProductModel3DLod;
  textures?: ProductTexture3D[];
  viewerConfig?: ProductViewerConfig;
  previewImageUrl?: string;
  uploadedAt?: string;
  readyAt?: string;
}

export interface ProductCustomizationOption {
  _id?: string;
  type?: ProductCustomizationType;
  label?: string;
  isRequired?: boolean;
  extraCharge?: number;
  maxLength?: number;
  options?: string[];
}

export interface ProductReviewSellerReply {
  text?: string;
  repliedAt?: string;
  isEdited?: boolean;
  editedAt?: string;
}

export interface ProductReviewAuthor {
  _id: MongoIdLike;
  name: string;
  avatar?: string;
}

export interface ProductReviewImage {
  url: string;
}

export interface ProductVariant {
  _id: MongoIdLike;
  sku: string;
  barcode?: string;
  mpn?: string;
  hsn?: string;
  color?: ProductColor | string | null;
  size?: ProductSize | string | null;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  weight?: number;
  images?: string[];
  texture3dUrl?: string;
  totalStock?: number;
  reservedStock?: number;
  soldCount?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  position?: number;
  isDefault?: boolean;
  isActive?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Legacy fields for frontend compatibility
  stock?: number;
  isAvailable?: boolean;
  colorHex?: string;
  warehouseStock?: ProductWarehouseStock[];
  availableStock?: number;
  isInStock?: boolean;
}

export interface ReviewReply {
  _id: MongoIdLike;
  author: MongoIdLike | ProductReviewAuthor;
  content: string;
  createdAt: string;
}

export interface ProductReview {
  _id: MongoIdLike;
  product: MongoIdLike;
  user: MongoIdLike | ProductReviewAuthor;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  helpfulCount: number;
  status: ReviewStatus;
  reply?: ReviewReply;
  isVerifiedPurchase?: boolean;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  orderId?: string;
  orderItemId?: string;
  pros?: string[];
  cons?: string[];
  videoUrl?: string;
  sizeAccuracy?: 'runs_small' | 'true_to_size' | 'runs_large';
  language?: string;
  flagCount?: number;
  helpfulUserIds?: string[];
  isAnonymous?: boolean;
  rejectionReason?: string;
  sellerReply?: ProductReviewSellerReply;
  // Note: isVerifiedPurchase is declared once above — duplicate removed
}

export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
}

// ─── Main Product ─────────────────────────────────────────────────────────────

export interface Product {
  _id: MongoIdLike;
  /** Local static data compat */
  id?: string;
  name: string;
  slug: string;
  sku?: string;
  hsn?: string;
  sellerId?: MongoIdLike;
  category: ProductCategory | string;
  brand?: ProductBrand | string;
  collectionIds?: MongoIdLike[];
  description: string;
  shortDescription?: string;
  fabric?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  gender?: ProductGender;
  occasion?: string[];
  tags?: string[];
  pattern?: string;
  fit?: ProductFit;
  neckType?: string;
  sleeveType?: string;
  style?: string;
  basePrice: number;
  salePrice?: number;
  currency?: string;
  taxRate?: number;
  taxIncluded?: boolean;
  minOrderQty?: number;
  maxOrderQty?: number;
  isReturnable?: boolean;
  returnWindowDays?: number;
  isExchangeable?: boolean;
  exchangeWindowDays?: number;
  isCODAvailable?: boolean;
  images: ProductImage[];
  has3DModel?: boolean;
  model3D?: ProductModel3D;
  variants: ProductVariant[];
  totalStock?: number;
  isInStock?: boolean;
  customisationOptions?: ProductCustomizationOption[];
  relatedProductIds?: MongoIdLike[];
  frequentlyBoughtWith?: MongoIdLike[];
  bundledWith?: { productId?: MongoIdLike; bundlePrice?: number }[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  averageRating?: number;
  totalRatings?: number;
  totalReviews?: number;
  sizeAccuracySummary?: {
    runs_small?: number;
    true_to_size?: number;
    runs_large?: number;
  };
  reviews?: ProductReview[];
  weight?: number;
  dimensions?: ProductDimensions;
  ratingDistribution?: {
    1?: number;
    2?: number;
    3?: number;
    4?: number;
    5?: number;
  };
  status: ProductStatus;
  rejectionReason?: string;
  approvedBy?: MongoIdLike;
  approvedAt?: MongoDateLike;
  isFeatured?: boolean;
  isActive?: boolean;
  publishedAt?: MongoDateLike;
  viewCount?: number;
  wishlistCount?: number;
  salesCount?: number;
  shareCount?: number;
  deletedAt?: MongoDateLike;
  createdAt?: MongoDateLike;
  updatedAt?: MongoDateLike;
  __v?: number;

  // Legacy fields for backward compatibility
  price: number;
  compareAtPrice?: number;
  originalPrice?: number;
  subtitle?: string;
  colors?: ProductColor[];
  sizes?: (string | ProductSize)[];
  material?: string;
  care?: string[];
  details?: string[];
  rating: number;
  reviewCount: number;
  inStock?: boolean;
  image?: string;
  isNew?: boolean;
  isBestseller?: boolean;
  tag?: string;
  seller?: any;
  discountPercent?: number;
  effectivePrice?: number;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface BasicResponse {
  success: boolean;
  message?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  products: Product[];
  total?: number;
  page?: number;
  pages?: number;
  count?: number;
  pagination?: PaginationMeta;
}

export interface ProductResponse {
  success: boolean;
  data: Product;
  product: Product;
}

export interface ProductSearchResponse {
  success: boolean;
  data: Product[];
  products: Product[];
  total?: number;
  page?: number;
  pages?: number;
  count?: number;
  query?: string;
  pagination?: PaginationMeta;
}

export interface ReviewListResponse {
  success: boolean;
  reviews: ProductReview[];
  pagination?: PaginationMeta;
  averageRating?: number;
  total?: number;
}

export interface ReviewResponse {
  success: boolean;
  review: ProductReview;
}

export interface VariantResponse {
  success: boolean;
  variants: ProductVariant[];
}

export interface ImageResponse {
  success: boolean;
  images: ProductImage[];
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface GetProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular';
  status?: ProductStatus;
  isFeatured?: boolean;
  sellerId?: string;
  gender?: 'men' | 'women' | 'unisex';
  tags?: string;
}

export interface SearchProductsParams {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

export interface GetReviewsParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  status?: ReviewStatus;
}

// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface CreateProductPayload {
  name: string;
  slug?: string;
  sku?: string;
  hsn?: string;
  sellerId?: string;
  category?: ProductCategory | string;
  brand?: ProductBrand | string;
  description: string;
  shortDescription?: string;
  fabric?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  gender?: ProductGender;
  occasion?: string[];
  tags?: string[];
  pattern?: string;
  fit?: ProductFit;
  neckType?: string;
  sleeveType?: string;
  style?: string;
  basePrice?: number;
  salePrice?: number;
  details?: string[];
  care?: string[]; // Legacy compat
  material?: string; // Legacy compat
  price?: number; // Legacy compat
  compareAtPrice?: number; // Legacy compat
  taxRate?: number;
  taxIncluded?: boolean;
  minOrderQty?: number;
  maxOrderQty?: number;
  isReturnable?: boolean;
  returnWindowDays?: number;
  isExchangeable?: boolean;
  exchangeWindowDays?: number;
  isCODAvailable?: boolean;
  currency?: string;
  has3DModel?: boolean;
  model3D?: ProductModel3D;
  customisationOptions?: ProductCustomizationOption[];
  relatedProductIds?: string[];
  frequentlyBoughtWith?: string[];
  bundledWith?: { productId?: string; bundlePrice?: number }[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  weight?: number;
  dimensions?: ProductDimensions;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  status?: ProductStatus;
  isFeatured?: boolean;
}

export interface CreateVariantPayload {
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  totalStock?: number;
  color?: ProductColor | string | null;
  size?: ProductSize | string | null;
  // Legacy fields
  stock?: number;
  sizeStr?: string;
  colorStr?: string;
  colorHex?: string;
  barcode?: string;
  mpn?: string;
  hsn?: string;
  weight?: number;
  images?: string[];
  texture3dUrl?: string;
  reservedStock?: number;
  soldCount?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  warehouseStock?: ProductWarehouseStock[];
  position?: number;
  isDefault?: boolean;
  isActive?: boolean;
  isArchived?: boolean;
}

export interface UpdateVariantPayload extends Partial<CreateVariantPayload> {}

export interface UpdateStockPayload {
  totalStock?: number;
  reservedStock?: number;
  warehouseStock?: ProductWarehouseStock[];
  
  // Legacy
  stock?: number;
  type?: StockUpdateType;
  reason?: string;
}

export interface ReorderImagesPayload {
  order: string[]; // ordered array of imageIds
}

export interface SubmitReviewPayload {
  rating: number;
  title?: string;
  content: string;
  images?: string[];
}

export interface ReplyToReviewPayload {
  content: string;
}

export interface UpdateModel3DPayload extends Partial<ProductModel3D> {}

export interface UpdateViewerConfigPayload extends Partial<ProductViewerConfig> {}

export interface UpdateReviewStatusPayload {
  status: ReviewStatus;
  reason?: string;
}

export interface RejectProductPayload {
  reason: string;
}

export interface BulkStatusPayload {
  ids: string[];
  status: ProductStatus;
}

export interface BulkDeletePayload {
  ids: string[];
}
