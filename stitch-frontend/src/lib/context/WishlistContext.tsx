// src/context/WishlistContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useProfile } from "./ProfileContext";
import { userService } from "@/lib/api/userService";

interface WishlistItem {
  _id?: string;
  id: string;
  name: string;
  price: number;
  image: string;
  productId?: string;
  variantId?: string;
  priceWhenAdded?: number;
  notifyOnPriceDrop?: boolean;
  addedAt?: string;
  slug?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function toRouteId(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return toRouteId(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.$oid === "string") return record.$oid;
    if (typeof record.id === "string") return record.id;
    if (typeof record._id === "string") return record._id;
    if (typeof record.productId === "string") return record.productId;
  }
  return "";
}

function normalizeWishlistItem(item: Partial<WishlistItem> & Record<string, unknown>): WishlistItem {
  const productId = toRouteId(item.productId) || toRouteId(item.id) || toRouteId(item._id);
  const populatedProduct = item.productId && typeof item.productId === "object"
    ? (item.productId as Record<string, unknown>)
    : null;
  const populatedImages = populatedProduct && Array.isArray(populatedProduct.images)
    ? (populatedProduct.images as Array<Record<string, unknown>>)
    : [];
  const firstImage = populatedImages[0];
  const image = typeof item.image === "string" && item.image
    ? item.image
    : typeof firstImage?.url === "string"
      ? firstImage.url
      : typeof populatedProduct?.image === "string"
        ? populatedProduct.image
        : "";
  const name = typeof item.name === "string" && item.name
    ? item.name
    : typeof populatedProduct?.name === "string"
      ? populatedProduct.name
      : "Product";
  const price = typeof item.price === "number"
    ? item.price
    : typeof populatedProduct?.price === "number"
      ? populatedProduct.price
      : typeof item.priceWhenAdded === "number"
        ? item.priceWhenAdded
        : 0;

  const slug = typeof item.slug === "string" && item.slug
    ? item.slug
    : typeof populatedProduct?.slug === "string"
      ? populatedProduct.slug
      : "";

  return {
    _id: typeof item._id === "string" ? item._id : undefined,
    productId,
    id: productId,
    name,
    price,
    image,
    variantId: typeof item.variantId === "string" ? item.variantId : undefined,
    addedAt: typeof item.addedAt === "string" ? item.addedAt : undefined,
    priceWhenAdded: typeof item.priceWhenAdded === "number" ? item.priceWhenAdded : undefined,
    notifyOnPriceDrop: typeof item.notifyOnPriceDrop === "boolean" ? item.notifyOnPriceDrop : undefined,
    slug,
  };
}

function mapServerWishlist(wishlist: unknown[]): WishlistItem[] {
  return wishlist.map((w) => {
    const normalized = normalizeWishlistItem(w as Record<string, unknown>);
    return {
      id: normalized.productId || normalized.id,
      productId: normalized.productId || normalized.id || '',
      name: normalized.name,
      price: normalized.price,
      image: normalized.image,
      variantId: normalized.variantId,
      addedAt: normalized.addedAt,
      slug: normalized.slug,
    };
  });
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoadingAuth, user, login } = useProfile();
  const [items, setItems] = useState<WishlistItem[]>([]);

  const storageKey = user?._id ? `stitch_wishlist_${user._id}` : null;

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isLoggedIn || !storageKey) {
      // Not logged in — load from localStorage or reset
      try {
        const saved = storageKey ? localStorage.getItem(storageKey) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          const normalized = Array.isArray(parsed)
            ? parsed.map((entry) => normalizeWishlistItem(entry as Record<string, unknown>))
            : [];
          setItems(normalized);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      }
      return;
    }

    // Logged in: fetch wishlist from backend, fallback to localStorage
    (async () => {
      try {
        const res = await userService.getWishlist();
        const serverList = res.wishlist || [];
        const mapped = mapServerWishlist(serverList as unknown[]);
        setItems(mapped);
      } catch {
        // On error, fall back to any saved local data
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            const normalized = Array.isArray(parsed)
              ? parsed.map((entry) => normalizeWishlistItem(entry as Record<string, unknown>))
              : [];
            setItems(normalized);
          } else {
            setItems([]);
          }
        } catch {
          setItems([]);
        }
      }
    })();
  }, [isLoggedIn, isLoadingAuth, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Keep local storage in sync for offline scenarios
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {}
  }, [items, storageKey]);

  const add = useCallback((item: WishlistItem) => {
    if (!isLoggedIn) {
      login();
      return;
    }

    const normalizedItem = normalizeWishlistItem(item as unknown as Record<string, unknown>);
    if (!normalizedItem.productId) return;
    setItems((prev) => {
      if (prev.some((i) => i.id === normalizedItem.productId)) return prev;
      return [
        ...prev,
        {
          ...item,
          id: normalizedItem.productId || normalizedItem.id,
          productId: normalizedItem.productId,
          name: normalizedItem.name,
          price: normalizedItem.price,
          image: normalizedItem.image,
          slug: normalizedItem.slug,
        },
      ];
    });

    // Fire-and-forget backend update
    (async () => {
      try {
        await userService.addToWishlist({
          productId: normalizedItem.productId as string,
          variantId: normalizedItem.variantId,
          priceWhenAdded: item.price,
        });
      } catch {
        // Ignore — optimistic state remains
      }
    })();
  }, [isLoggedIn, login]);

  const remove = useCallback((id: string) => {
    if (!isLoggedIn) return;

    const normalizedId = toRouteId(id);
    setItems((prev) => prev.filter((i) => i.id !== normalizedId));

    (async () => {
      try {
        await userService.removeFromWishlist(normalizedId);
      } catch {
        // Ignore
      }
    })();
  }, [isLoggedIn]);

  const toggle = useCallback((item: WishlistItem) => {
    if (!isLoggedIn) {
      login();
      return;
    }
    const exists = items.some((i) => i.id === item.id);
    if (exists) {
      remove(item.id);
    } else {
      add(item);
    }
  }, [isLoggedIn, login, items, add, remove]);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const count = items.length;

  return (
    <WishlistContext.Provider value={{ items, add, remove, toggle, has, count }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}