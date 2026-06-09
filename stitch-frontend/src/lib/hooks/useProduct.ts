// src/lib/hooks/useProduct.ts
import { useState, useEffect, useCallback } from 'react';
import { productService } from '../api/productService';
import { Product } from '../types/product.types';
import { products as staticProducts } from '../data/products';

interface UseProductResult {
  product: Product | null;
  related: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function toColorLabel(color: any): string {
  if (typeof color === 'string') return color;
  if (color && typeof color === 'object') {
    return color.name ?? color.slug ?? '';
  }
  return '';
}

function toColorHex(color: any, fallback = '#ccc'): string {
  if (color && typeof color === 'object') {
    return color.hex ?? color.hexCode ?? fallback;
  }
  return fallback;
}

function toSizeLabel(size: any): string {
  if (typeof size === 'string') return size;
  if (size && typeof size === 'object') {
    return size.label ?? size.value ?? size.name ?? '';
  }
  return '';
}

function normalise(p: Product): Product {
  const price = p.basePrice !== undefined ? p.basePrice : p.price;
  const compareAtPrice = p.salePrice !== undefined ? p.salePrice : p.compareAtPrice;
  const colors = p.colors && p.colors.length > 0
    ? p.colors.map((color: any) => ({
        name: toColorLabel(color),
        slug: color?.slug,
        hex: toColorHex(color),
        hexCode: toColorHex(color),
      }))
    : [...new Map(
        (p.variants || [])
          .filter((v: any) => v.color)
          .map((v: any) => {
            const colorName = toColorLabel(v.color);
            const colorHex = v.colorHex ?? toColorHex(v.color);
            return [colorName, { name: colorName, hex: colorHex, hexCode: colorHex }];
          })
      ).values()] as any;

  const sizes = p.sizes && p.sizes.length > 0
    ? p.sizes.map((size: any) => toSizeLabel(size)).filter(Boolean)
    : [...new Set((p.variants || []).map((v: any) => toSizeLabel(v.size)).filter(Boolean))] as string[];

  return {
    ...p,
    id: p.id || (typeof p._id === 'string' ? p._id : (p._id as { $oid?: string })?.$oid) || '',
    price,
    compareAtPrice,
    colors,
    sizes,
    image: p.image || (p.images?.[0]?.url ?? ''),
    inStock: p.inStock ?? (p.totalStock !== undefined ? p.totalStock > 0 : true),
  };
}

function normStatic(p: any): Product {
  return {
    ...p,
    _id: p.id,
    status: 'approved' as const,
    images: (p.images || [p.image]).map((url: string, i: number) => ({
      _id: `static-${i}`,
      url,
      isPrimary: i === 0,
      order: i,
    })),
    variants: [],
  };
}

function toRouteId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return toRouteId(value[0]);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.$oid === 'string') return record.$oid;
    if (typeof record.id === 'string') return record.id;
    if (typeof record._id === 'string') return record._id;
  }
  return '';
}

/**
 * Fetches a single product by ID (API _id or legacy slug fallback).
 * On mount also fires a view-tracking PATCH (fire-and-forget).
 * Falls back to static local data when the API is unreachable.
 */
export function useProduct(id: string | undefined): UseProductResult {
  const normalizedId = toRouteId(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!normalizedId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Try API first
        const res = await productService.getProductById(normalizedId);
        if (cancelled) return;
        const p = normalise((res as any).data || (res as any).product || res);
        setProduct(p);

        // Extract string ID safely from MongoIdLike
        const stringId = typeof p._id === 'string' ? p._id : (p._id as { $oid?: string })?.$oid ?? p.id ?? '';

        // Fire view tracking (fire-and-forget)
        productService.trackView(stringId).catch(() => {});

        // Fetch related
        try {
          const relRes = await productService.getRelatedProducts(stringId, 4);
          if (!cancelled) setRelated((relRes.data || relRes.products || []).map(normalise));
        } catch {
          if (!cancelled) {
            setRelated(
              staticProducts
                .filter((sp) => sp.id !== normalizedId)
                .slice(0, 4)
                .map(normStatic)
            );
          }
        }
      } catch {
        // Offline: fall back to static data by matching id as slug or _id
        const fallback = staticProducts.find((sp) => sp.id === normalizedId);
        if (fallback && !cancelled) {
          setProduct(normStatic(fallback));
          setRelated(
            staticProducts
              .filter((sp) => sp.id !== normalizedId)
              .slice(0, 4)
              .map(normStatic)
          );
        } else if (!cancelled) {
          setError('Product not found.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [normalizedId, tick]);

  return { product, related, loading, error, refetch };
}
