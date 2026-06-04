// src/lib/api/productService.ts
import { apiClient } from './apiClient';
import { toQuery } from '@/lib/utils';
import {
  ProductListResponse,
  ProductResponse,
  ProductSearchResponse,
  ReviewListResponse,
  ReviewResponse,
  VariantResponse,
  ImageResponse,
  BasicResponse,
  GetProductsParams,
  SearchProductsParams,
  GetReviewsParams,
  CreateProductPayload,
  UpdateProductPayload,
  CreateVariantPayload,
  UpdateVariantPayload,
  UpdateStockPayload,
  ReorderImagesPayload,
  SubmitReviewPayload,
  ReplyToReviewPayload,
  UpdateReviewStatusPayload,
  RejectProductPayload,
  BulkStatusPayload,
  BulkDeletePayload,
  UpdateModel3DPayload,
  UpdateViewerConfigPayload,
} from '../types/product.types';

// ─── 1.1  Public Endpoints ────────────────────────────────────────────────────

export const productService = {
  /**
   * GET /api/v1/products
   * Paginated product list with optional filters.
   */
  getProducts: (params?: GetProductsParams) =>
    apiClient.get<ProductListResponse>(`/api/v1/products${toQuery(params as any)}`),

  /**
   * GET /api/v1/products/featured
   * Returns the curated featured products.
   */
  getFeaturedProducts: () =>
    apiClient.get<ProductListResponse>('/api/v1/products/featured'),

  /**
   * GET /api/v1/products/search?q=...
   * Full-text search with optional filters.
   */
  searchProducts: (params: SearchProductsParams) =>
    apiClient.get<ProductSearchResponse>(`/api/v1/products/search${toQuery(params as any)}`),

  /**
   * GET /api/v1/products/slug/:slug
   * Fetch a single product by its URL slug.
   */
  getProductBySlug: (slug: string) =>
    apiClient.get<ProductResponse>(`/api/v1/products/slug/${encodeURIComponent(slug)}`),

  /**
   * GET /api/v1/products/seller/:sellerId
   * All products belonging to a seller (public-facing).
   */
  getProductsBySeller: (sellerId: string, params?: GetProductsParams) =>
    apiClient.get<ProductListResponse>(`/api/v1/products/seller/${sellerId}${toQuery(params as any)}`),

  /**
   * GET /api/v1/products/:id
   * Fetch full product detail by MongoDB _id.
   */
  getProductById: (id: string) =>
    apiClient.get<ProductResponse>(`/api/v1/products/${id}`),

  /**
   * GET /api/v1/products/:id/related
   * Products related to the given product.
   */
  getRelatedProducts: (id: string, limit?: number) =>
    apiClient.get<ProductListResponse>(`/api/v1/products/${id}/related${limit ? `?limit=${limit}` : ''}`),

  /**
   * PATCH /api/v1/products/:id/view
   * Increment the product view counter (fire-and-forget).
   */
  trackView: (id: string) =>
    apiClient.patch<BasicResponse>(`/api/v1/products/${id}/view`, {}),

  /**
   * PATCH /api/v1/products/:id/share
   * Increment the product share counter.
   */
  trackShare: (id: string) =>
    apiClient.patch<BasicResponse>(`/api/v1/products/${id}/share`, {}),

  // ─── 1.2  Seller / Admin CRUD ───────────────────────────────────────────────

  /**
   * POST /api/v1/products
   * Create a new product (seller/admin).
   */
  createProduct: (data: CreateProductPayload) =>
    apiClient.post<ProductResponse>('/api/v1/products', data),

  /**
   * PUT /api/v1/products/:id
   * Replace/update a product.
   */
  updateProduct: (id: string, data: UpdateProductPayload) =>
    apiClient.put<ProductResponse>(`/api/v1/products/${id}`, data),

  /**
   * DELETE /api/v1/products/:id
   * Soft-delete a product.
   */
  deleteProduct: (id: string) =>
    apiClient.delete<BasicResponse>(`/api/v1/products/${id}`),

  /**
   * PATCH /api/v1/products/:id/restore
   * Restore a soft-deleted product.
   */
  restoreProduct: (id: string) =>
    apiClient.patch<ProductResponse>(`/api/v1/products/${id}/restore`, {}),

  /**
   * PATCH /api/v1/products/:id/submit
   * Submit a draft product for admin approval.
   */
  submitProduct: (id: string) =>
    apiClient.patch<ProductResponse>(`/api/v1/products/${id}/submit`, {}),

  // ─── 1.3  Admin — Moderation ────────────────────────────────────────────────

  /**
   * PATCH /api/v1/products/:id/approve
   * Approve a pending product.
   */
  approveProduct: (id: string) =>
    apiClient.patch<ProductResponse>(`/api/v1/products/${id}/approve`, {}),

  /**
   * PATCH /api/v1/products/:id/reject
   * Reject a pending product with a reason.
   */
  rejectProduct: (id: string, payload: RejectProductPayload) =>
    apiClient.patch<ProductResponse>(`/api/v1/products/${id}/reject`, payload),

  /**
   * PATCH /api/v1/products/:id/feature
   * Toggle the featured flag on a product.
   */
  featureProduct: (id: string) =>
    apiClient.patch<{ success: boolean; isFeatured: boolean; message?: string }>(`/api/v1/products/${id}/feature`, {}),

  /**
   * PATCH /api/v1/products/bulk/status
   * Bulk update the status of multiple products.
   */
  bulkUpdateStatus: (payload: BulkStatusPayload) =>
    apiClient.patch<BasicResponse>('/api/v1/products/bulk/status', payload),

  /**
   * DELETE /api/v1/products/bulk
   * Bulk delete multiple products.
   */
  bulkDeleteProducts: (payload: BulkDeletePayload) =>
    apiClient.delete<BasicResponse>(`/api/v1/products/bulk?ids=${payload.ids.join(',')}`),

  // ─── 1.4  Product Variants ──────────────────────────────────────────────────

  /**
   * POST /api/v1/products/:id/variants
   * Add a new variant to a product.
   */
  addVariant: (productId: string, data: CreateVariantPayload) =>
    apiClient.post<VariantResponse>(`/api/v1/products/${productId}/variants`, data),

  /**
   * PUT /api/v1/products/:id/variants/:variantId
   * Update a specific variant.
   */
  updateVariant: (productId: string, variantId: string, data: UpdateVariantPayload) =>
    apiClient.put<VariantResponse>(`/api/v1/products/${productId}/variants/${variantId}`, data),

  /**
   * DELETE /api/v1/products/:id/variants/:variantId
   * Remove a specific variant.
   */
  deleteVariant: (productId: string, variantId: string) =>
    apiClient.delete<BasicResponse>(`/api/v1/products/${productId}/variants/${variantId}`),

  /**
   * PATCH /api/v1/products/:id/variants/:variantId/stock
   * Set or adjust the stock level for a variant.
   */
  updateVariantStock: (productId: string, variantId: string, data: UpdateStockPayload) =>
    apiClient.patch<VariantResponse>(
      `/api/v1/products/${productId}/variants/${variantId}/stock`,
      data
    ),

  // ─── 1.5  Product Images ────────────────────────────────────────────────────

  /**
   * POST /api/v1/products/:id/images  (multipart/form-data)
   * Upload one or more images.
   */
  uploadImages: (productId: string, formData: FormData) =>
    apiClient.uploadFile<ImageResponse>(`/api/v1/products/${productId}/images`, formData),

  /**
   * PUT /api/v1/products/:id/images/reorder
   * Reorder images by supplying an ordered array of image IDs.
   */
  reorderImages: (productId: string, payload: ReorderImagesPayload) =>
    apiClient.put<ImageResponse>(`/api/v1/products/${productId}/images/reorder`, payload),

  /**
   * DELETE /api/v1/products/:id/images/:imageId
   * Remove a single image from a product.
   */
  deleteImage: (productId: string, imageId: string) =>
    apiClient.delete<BasicResponse>(`/api/v1/products/${productId}/images/${imageId}`),

  // ─── 1.6  Product Reviews ───────────────────────────────────────────────────

  /**
   * GET /api/v1/products/:id/reviews
   * Paginated list of reviews for a product.
   */
  getReviews: (productId: string, params?: GetReviewsParams) =>
    apiClient.get<ReviewListResponse>(`/api/v1/products/${productId}/reviews${toQuery(params as any)}`),

  /**
   * POST /api/v1/products/:id/reviews
   * Submit a review (authenticated user).
   */
  submitReview: (productId: string, data: SubmitReviewPayload) =>
    apiClient.post<ReviewResponse>(`/api/v1/products/${productId}/reviews`, data),

  /**
   * PATCH /api/v1/products/:id/reviews/:reviewId/helpful
   * Mark a review as helpful (toggles).
   */
  markHelpful: (productId: string, reviewId: string) =>
    apiClient.patch<BasicResponse>(`/api/v1/products/${productId}/reviews/${reviewId}/helpful`, {}),

  /**
   * DELETE /api/v1/products/:id/reviews/:reviewId
   * Delete a review (owner or admin).
   */
  deleteReview: (productId: string, reviewId: string) =>
    apiClient.delete<BasicResponse>(`/api/v1/products/${productId}/reviews/${reviewId}`),

  /**
   * POST /api/v1/products/:id/reviews/:reviewId/reply
   * Reply to a review (seller or admin).
   */
  replyToReview: (productId: string, reviewId: string, data: ReplyToReviewPayload) =>
    apiClient.post<ReviewResponse>(`/api/v1/products/${productId}/reviews/${reviewId}/reply`, data),

  /**
   * PATCH /api/v1/products/:id/reviews/:reviewId/status
   * Update review moderation status (admin).
   */
  updateReviewStatus: (productId: string, reviewId: string, data: UpdateReviewStatusPayload) =>
    apiClient.patch<ReviewResponse>(
      `/api/v1/products/${productId}/reviews/${reviewId}/status`,
      data
    ),

  // ─── 1.7 3D Model Integrations ────────────────────────────────────────────

  /**
   * PUT /api/v1/products/:id/model3d
   * Replace or upload the 3D model metadata for a product.
   */
  updateModel3D: (productId: string, data: UpdateModel3DPayload) =>
    apiClient.put<ProductResponse>(`/api/v1/products/${productId}/model3d`, data),

  /**
   * PATCH /api/v1/products/:id/model3d/viewer-config
   * Update the 3D model viewer configuration.
   */
  updateViewerConfig: (productId: string, data: UpdateViewerConfigPayload) =>
    apiClient.patch<ProductResponse>(`/api/v1/products/${productId}/model3d/viewer-config`, data),
};
