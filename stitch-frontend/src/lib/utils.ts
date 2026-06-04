// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind Merge ────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Label Helpers ─────────────────────────────────────────────────────────────
export function getCategoryLabel(category: unknown): string {
  if (!category) return "";
  if (typeof category === "string") return category;
  if (typeof category === "object" && category !== null) {
    const obj = category as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
  }
  return String(category);
}

export function getColorLabel(color: unknown): string {
  if (!color) return "";
  if (typeof color === "string") return color;
  if (typeof color === "object" && color !== null) {
    const obj = color as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.label === "string") return obj.label;
  }
  return String(color);
}

export function getSizeLabel(size: unknown): string {
  if (!size) return "";
  if (typeof size === "string") return size;
  if (typeof size === "object" && size !== null) {
    const obj = size as Record<string, unknown>;
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj.name === "string") return obj.name;
  }
  return String(size);
}

// ── Slug Generation ───────────────────────────────────────────────────────────
export function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Query String Builder ──────────────────────────────────────────────────────
/**
 * Converts a params object into a URL query string.
 * Omits undefined, null, and empty-string values.
 *
 * Extracted from orderService.ts / productService.ts (DRY).
 *
 * @example toQuery({ page: 1, status: 'active' }) → '?page=1&status=active'
 */
export function toQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

// ── Currency Formatting ───────────────────────────────────────────────────────
/**
 * Formats a number as an Indian Rupee amount.
 * @example formatCurrency(1299) → '$1,299'
 * @example formatCurrency(1299.5) → '$1,299.50'
 */
export function formatCurrency(
  amount: number,
  currency = "INR",
  locale = "en-IN"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

// ── Date Formatting ───────────────────────────────────────────────────────────
/**
 * Formats an ISO date string into a human-readable format.
 * @example formatDate('2024-01-15T10:30:00Z') → '15 Jan 2024'
 */
export function formatDate(
  dateStr: string | undefined | null,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", options).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/**
 * Formats a date as a relative time string.
 * @example formatRelativeDate('2024-01-14T10:30:00Z') → '2 days ago'
 */
export function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

// ── Object ID Helpers ─────────────────────────────────────────────────────────
/**
 * Generates a deterministic 24-char hex string from a seed string.
 * Used ONLY for mapping static/offline fallback product data to Mongo-like IDs.
 *
 * WARNING: This is NOT a cryptographic hash and ONLY suitable for
 * deterministic display IDs in offline/demo mode — never for real data.
 */
export function getDeterministicObjectId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  let hex = Math.abs(hash).toString(16);
  while (hex.length < 24) {
    hex += Math.abs(hash ^ (hex.length * 100)).toString(16);
  }
  return hex.substring(0, 24);
}

// ── Image Validation Helpers ────────────────────────────────────────────────
/**
 * Safely extracts and validates images from a product.
 * Filters out invalid or localhost images and ensures a fallback is provided.
 */
export function getValidImages(product: any, fallback = "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80"): string[] {
  let images: string[] = [];
  
  if (product?.images && product.images.length > 0) {
    images = product.images.map((img: any) => (typeof img === 'object' ? img.url : img));
  } else if (product?.image) {
    images = [product.image];
  }

  // Filter out localhost/invalid images
  images = images.filter(img => img && typeof img === 'string' && !img.includes('localhost'));

  if (images.length === 0) {
    images = [fallback];
  }

  return images;
}
