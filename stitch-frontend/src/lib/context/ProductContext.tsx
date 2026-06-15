// src/lib/context/ProductContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { productService } from '../api/productService';
import { getCategoryLabel } from '@/lib/utils';
import { Product, GetProductsParams } from '../types/product.types';
// Local static fallback removed

// ─── Normalise ────────────────────────────────────────────────────────────────

/**
 * Ensure every product has a consistent `id` field (API uses `_id`, static
 * data uses `id`). Also provides a fallback `image` string from `images[0]`.
 */
function normalise(p: Product): Product {
  const price = p.basePrice !== undefined ? p.basePrice : p.price;
  const compareAtPrice = p.salePrice !== undefined ? p.salePrice : p.compareAtPrice;
  const toSizeLabel = (size: any) => {
    if (typeof size === 'string') return size;
    if (size && typeof size === 'object') {
      return size.label ?? size.value ?? size.name ?? '';
    }
    return '';
  };
  const colors = p.colors && p.colors.length > 0
    ? p.colors.map((color: any) => ({
        name: typeof color === 'string' ? color : color?.name ?? color?.slug ?? '',
        slug: color?.slug,
        hex: typeof color === 'string' ? '#ccc' : (color?.hex ?? color?.hexCode ?? '#ccc'),
        hexCode: typeof color === 'string' ? '#ccc' : (color?.hexCode ?? color?.hex ?? '#ccc'),
      }))
    : [...new Map(
        (p.variants || [])
          .filter((v: any) => v.color)
          .map((v: any) => {
            const colorName = typeof v.color === 'string' ? v.color : v.color?.name ?? v.color?.slug ?? '';
            const colorHex = v.colorHex ?? (typeof v.color === 'object' && v.color ? (v.color.hex ?? v.color.hexCode) : undefined) ?? '#ccc';
            return [colorName, { name: colorName, slug: v.color?.slug, hex: colorHex, hexCode: colorHex }];
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


// ─── Context shape ────────────────────────────────────────────────────────────

interface ProductContextValue {
  /** Current product list (filtered/searched) */
  products: Product[];
  /** Featured products */
  featured: Product[];
  /** Total count for the current query */
  total: number;
  /** Loading state for list/search */
  loading: boolean;
  /** Featured-specific loading */
  featuredLoading: boolean;
  /** Last error message (null when none) */
  error: string | null;
  /** Whether data came from the local static fallback */
  isOffline: boolean;

  /** Load products with optional filter params */
  fetchProducts: (params?: GetProductsParams) => Promise<void>;
  /** Load featured products */
  fetchFeatured: () => Promise<void>;
  /** Full-text search */
  search: (q: string, params?: Omit<GetProductsParams, 'q'>) => Promise<void>;
  /** Reset list back to the last fetchProducts result */
  clearSearch: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Keep last non-search result so clearSearch can restore it
  const lastListRef = useRef<Product[]>([]);
  const lastTotalRef = useRef(0);

  // ── fetchProducts ──────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (params?: GetProductsParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProducts(params);
      const normalised = (res.data || res.products || []).map(normalise);
      setProducts(normalised);
      setTotal(res.pagination?.total ?? res.total ?? normalised.length);
      setIsOffline(false);
      lastListRef.current = normalised;
      lastTotalRef.current = res.pagination?.total ?? res.total ?? normalised.length;
    } catch (err: any) {
      setError('Failed to load products');
      setProducts([]);
      setTotal(0);
      setIsOffline(true);
      lastListRef.current = [];
      lastTotalRef.current = 0;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── fetchFeatured ──────────────────────────────────────────────────────────
  const fetchFeatured = useCallback(async () => {
    setFeaturedLoading(true);
    try {
      const res = await productService.getFeaturedProducts();
      setFeatured((res.data || res.products || []).map(normalise));
    } catch {
      // Fallback removed, just empty out or show error
      setFeatured([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  // ── search ────────────────────────────────────────────────────────────────
  const search = useCallback(async (q: string, params?: Omit<GetProductsParams, 'q'>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProducts({ search: q, ...params } as any);
      const normalised = (res.data || res.products || []).map(normalise);
      setProducts(normalised);
      setTotal(res.pagination?.total ?? res.total ?? normalised.length);
      setIsOffline(false);
    } catch {
      // Offline: handle error
      setError('Search failed. Please check your connection.');
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── clearSearch ───────────────────────────────────────────────────────────
  const clearSearch = useCallback(() => {
    setProducts(lastListRef.current);
    setTotal(lastTotalRef.current);
    setError(null);
  }, []);

  return (
    <ProductContext.Provider
      value={{
        products,
        featured,
        total,
        loading,
        featuredLoading,
        error,
        isOffline,
        fetchProducts,
        fetchFeatured,
        search,
        clearSearch,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProductContext(): ProductContextValue {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProductContext must be used inside <ProductProvider>');
  return ctx;
}
