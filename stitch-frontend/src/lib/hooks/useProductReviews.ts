// src/lib/hooks/useProductReviews.ts
import { useState, useEffect, useCallback } from 'react';
import { productService } from '../api/productService';
import {
  ProductReview,
  GetReviewsParams,
  SubmitReviewPayload,
  ReplyToReviewPayload,
  UpdateReviewStatusPayload,
} from '../types/product.types';

interface UseProductReviewsResult {
  reviews: ProductReview[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  averageRating: number;
  total: number;
  /** Submit a new review */
  submitReview: (data: SubmitReviewPayload) => Promise<void>;
  /** Toggle helpful on a review */
  markHelpful: (reviewId: string) => Promise<void>;
  /** Delete a review (owner / admin) */
  deleteReview: (reviewId: string) => Promise<void>;
  /** Reply to a review (seller / admin) */
  replyToReview: (reviewId: string, data: ReplyToReviewPayload) => Promise<void>;
  /** Change review moderation status (admin) */
  updateReviewStatus: (reviewId: string, data: UpdateReviewStatusPayload) => Promise<void>;
  /** Reload reviews */
  refetch: () => void;
}

/**
 * Manages all review operations for a product:
 * fetching, submitting, helpful, delete, reply, status.
 */
export function useProductReviews(
  productId: string | undefined,
  params?: GetReviewsParams
): UseProductReviewsResult {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const mergeUniqueReviews = useCallback((incoming: ProductReview[]) => {
    const byId = new Map<string, ProductReview>();

    for (const review of incoming) {
      byId.set(String(review._id), review);
    }

    return Array.from(byId.values());
  }, []);

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    productService
      .getReviews(productId, params)
      .then((res) => {
        if (cancelled) return;
        setReviews(mergeUniqueReviews(res.reviews || []));
        setTotal(res.pagination?.total ?? res.total ?? (res.reviews || []).length);
        setAverageRating(res.averageRating ?? 0);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load reviews.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, tick]);

  // ── Submit review ──────────────────────────────────────────────────────────
  const submitReview = useCallback(async (data: SubmitReviewPayload) => {
    if (!productId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await productService.submitReview(productId, data);
      setReviews((prev) => {
        const reviewId = String(res.review._id);
        const alreadyPresent = prev.some((review) => String(review._id) === reviewId);
        if (!alreadyPresent) {
          setTotal((t) => t + 1);
        }
        return mergeUniqueReviews([res.review, ...prev]);
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [productId, mergeUniqueReviews]);

  // ── Mark helpful ───────────────────────────────────────────────────────────
  const markHelpful = useCallback(async (reviewId: string) => {
    if (!productId) return;
    // Optimistic update
    setReviews((prev) =>
      prev.map((r) =>
        r._id === reviewId
          ? { ...r, helpfulCount: r.helpfulCount + 1 }
          : r
      )
    );
    try {
      await productService.markHelpful(productId, reviewId);
    } catch {
      // Revert on failure
      setReviews((prev) =>
        prev.map((r) =>
          r._id === reviewId
            ? { ...r, helpfulCount: Math.max(0, r.helpfulCount - 1) }
            : r
        )
      );
    }
  }, [productId]);

  // ── Delete review ──────────────────────────────────────────────────────────
  const deleteReview = useCallback(async (reviewId: string) => {
    if (!productId) return;
    try {
      await productService.deleteReview(productId, reviewId);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete review.');
      throw err;
    }
  }, [productId]);

  // ── Reply to review ────────────────────────────────────────────────────────
  const replyToReview = useCallback(
    async (reviewId: string, data: ReplyToReviewPayload) => {
      if (!productId) return;
      try {
        const res = await productService.replyToReview(productId, reviewId, data);
        setReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? res.review : r))
        );
      } catch (err: any) {
        setError(err?.message || 'Failed to post reply.');
        throw err;
      }
    },
    [productId]
  );

  // ── Update review status (admin) ───────────────────────────────────────────
  const updateReviewStatus = useCallback(
    async (reviewId: string, data: UpdateReviewStatusPayload) => {
      if (!productId) return;
      try {
        const res = await productService.updateReviewStatus(productId, reviewId, data);
        setReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? res.review : r))
        );
      } catch (err: any) {
        setError(err?.message || 'Failed to update review status.');
        throw err;
      }
    },
    [productId]
  );

  return {
    reviews,
    loading,
    submitting,
    error,
    averageRating,
    total,
    submitReview,
    markHelpful,
    deleteReview,
    replyToReview,
    updateReviewStatus,
    refetch,
  };
}
