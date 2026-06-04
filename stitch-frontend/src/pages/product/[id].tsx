// src/pages/product/[id].tsx
import React, { useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Footer from "@/components/Footer";
import { getCategoryLabel, getValidImages } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
import Loading from "@/components/Loading";
import PublicSellerProfile from "@/components/seller/PublicSellerProfile";
import { useProduct } from "@/lib/hooks/useProduct";
import { useProductReviews } from "@/lib/hooks/useProductReviews";
import { productService } from "@/lib/api/productService";
import { Product } from "@/lib/types/product.types";
import { useCart } from "@/lib/context/CartContext";
import { useWishlist } from "@/lib/context/WishlistContext";
import { useProfile } from "@/lib/context/ProfileContext";
import { useToast } from "@/lib/context/ToastContext";
import {
  ChevronLeft,
  Plus,
  Minus,
  Star,
  Truck,
  RotateCcw,
  Shield,
  Heart,
  Share2,
  X,
  ChevronRight,
  ChevronLeft as ChevLeft,
  ZoomIn,
  ChevronDown,
  ThumbsUp,
  MessageSquare,
  Leaf,
  Package,
  Store,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";

// ── Types & Helpers ─────────────────────────────────────────────────────────

type SizeGuideRow = {
  label: string;
  chest?: string;
  waist?: string;
  hip?: string;
  length?: string;
  unit?: string;
};

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$oid === "string") return obj.$oid;
    if (typeof obj.$date === "string") return obj.$date;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj.value === "string") return obj.value;
    if (typeof obj.slug === "string") return obj.slug;
    if (typeof obj.title === "string") return obj.title;
  }
  return "";
}

function formatDate(value: unknown): string {
  const text = toText(value);
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildSizeGuideRows(product: Product, sizes: string[]): SizeGuideRow[] {
  const fromVariants = (product.variants || [])
    .map((variant) => {
      const size = variant.size as any;
      const measurements = size?.measurements || {};
      const fmt = (m: any) =>
        m
          ? `${m.min ?? ""}${
              m.min !== undefined && m.max !== undefined ? "–" : ""
            }${m.max ?? ""}${measurements.unit ? ` ${measurements.unit}` : ""}`
          : "";
      return {
        label: size ? toText(size.label || size.value || size.name) : "",
        chest: fmt(measurements.chest),
        waist: fmt(measurements.waist),
        hip: fmt(measurements.hips),
        length: fmt(measurements.length),
        unit: measurements.unit,
      } satisfies SizeGuideRow;
    })
    .filter((row) => row.label);

  return fromVariants.length > 0 ? fromVariants : sizes.map((s) => ({ label: s }));
}

function getColorHexFromName(colorName: string): string | null {
  const n = colorName.toLowerCase().trim();
  if (n.includes("black")) return "#111";
  if (n.includes("white")) return "#FAFAF9";
  if (n.includes("gray") || n.includes("grey")) return "#78716C";
  if (n.includes("blue")) return "#3B82F6";
  if (n.includes("green")) return "#22C55E";
  if (n.includes("red")) return "#EF4444";
  if (n.includes("yellow")) return "#EAB308";
  if (n.includes("orange")) return "#F97316";
  if (n.includes("pink")) return "#EC4899";
  if (n.includes("purple")) return "#A855F7";
  if (n.includes("brown") || n.includes("tan") || n.includes("beige"))
    return "#92400E";
  if (n.includes("cream") || n.includes("ivory")) return "#FEF3C7";
  if (n.includes("navy")) return "#1E3A5F";
  if (n.includes("olive")) return "#6B6B2A";
  return null;
}

// ── Main page component ──────────────────────────────────────────────────────

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  if (!router.isReady) return <Loading />;
  const productId = Array.isArray(id) ? id[0] : typeof id === "string" ? id : "";
  return <ProductPageInner id={productId} />;
}

function ProductPageInner({ id }: { id: string }) {
  const { product, related, loading, error } = useProduct(id);

  if (loading) return <Loading />;

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
        <div className="text-center px-6">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-3">
            404
          </p>
          <p className="font-serif text-4xl font-light italic text-stone-500 mb-6">
            Product not found
          </p>
          <Link
            href="/"
            className="text-[11px] tracking-[0.25em] uppercase text-stone-900 border-b border-stone-400 pb-0.5 hover:border-stone-900 transition-colors"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetail product={product} related={related} />;
}

// ── Product detail UI ────────────────────────────────────────────────────────

function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { add } = useCart();
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();
  const { isLoggedIn, login } = useProfile();
  const toast = useToast();
  const productId = toText(product._id) || product.id || "";

  const getColorLabel = (color: unknown) => {
    if (typeof color === "string") return color;
    if (color && typeof color === "object") {
      const c = color as { name?: string; slug?: string };
      return c.name ?? c.slug ?? "";
    }
    return "";
  };

  const getColorHex = (color: unknown, fallback = "#ccc") => {
    if (color && typeof color === "object") {
      const c = color as { hexCode?: string; hex?: string };
      return c.hexCode ?? c.hex ?? fallback;
    }
    return fallback;
  };

  const getSizeLabel = (size: unknown) => {
    if (typeof size === "string") return size;
    if (size && typeof size === "object") {
      const s = size as { label?: string; value?: string; name?: string };
      return s.label ?? s.value ?? s.name ?? "";
    }
    return "";
  };

  const {
    reviews,
    loading: reviewsLoading,
    submitting,
    averageRating,
    total: reviewTotal,
    submitReview,
    markHelpful,
    deleteReview,
  } = useProductReviews(productId);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0]?.name ?? getColorLabel(product.variants[0]?.color)
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string>("description");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    name: "",
    rating: 5,
    text: "",
  });
  const [hoveredStar, setHoveredStar] = useState(0);

  const addToBagRef = useRef<HTMLDivElement>(null);
  const isAddToBagInView = useInView(addToBagRef, {
    margin: "0px 0px -100px 0px",
  });

  const wishlist = inWishlist(productId);

  const handleToggleWishlist = () => {
    if (!isLoggedIn) {
      toast.info("Sign in required", "Please sign in to save items.");
      login();
      return;
    }
    toggleWishlist({
      id: productId,
      name: product.name,
      price: product.price,
      image: getValidImages(product)[0] || "",
      productId,
    });
    toast[wishlist ? "info" : "success"](
      wishlist ? "Removed from Wishlist" : "Saved to Wishlist",
      `${product.name} ${wishlist ? "removed" : "saved"}.`
    );
  };

  const images: string[] = getValidImages(product);

  const sizes: string[] =
    product.sizes && product.sizes.length > 0
      ? product.sizes.map((size) => getSizeLabel(size)).filter(Boolean)
      : [
          ...new Set(
            product.variants.map((v) => getSizeLabel(v.size)).filter(Boolean)
          ),
        ];

  const colors =
    product.colors && product.colors.length > 0
      ? product.colors
      : [
          ...new Map(
            product.variants
              .filter((v) => v.color)
              .map((v) => {
                const colorName =
                  getColorLabel(v.color) || (v as any).colorStr || "";
                return [
                  colorName,
                  {
                    name: colorName,
                    hex: v.colorHex ?? getColorHex(v.color),
                  },
                ];
              })
          ).values(),
        ];

  const handleAdd = () => {
    if (!selectedSize && sizes.length > 0) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2500);
      return;
    }
    for (let i = 0; i < qty; i++) {
      add({
        id: toText(product._id) || product.id || "",
        name: product.name,
        price: product.price,
        image: images[0] || "",
        size: selectedSize,
        color: selectedColor,
      });
    }
    toast.success(
      "Added to Bag",
      `${qty}× ${product.name}${selectedSize ? ` (${selectedSize})` : ""} added.`
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleShare = async () => {
    productService.trackShare(productId).catch(() => {});
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
      toast.success("Link Copied", "Product link copied to clipboard.");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewForm.text) return;
    try {
      await submitReview({
        rating: newReviewForm.rating,
        content: newReviewForm.text,
      });
      toast.success("Review Submitted", "Thank you for your feedback.");
      setNewReviewForm({ name: "", rating: 5, text: "" });
      setShowReviewForm(false);
    } catch {
      toast.error?.("Error", "Could not submit review. Please try again.");
    }
  };

  const displayRating = averageRating || product.rating || 0;
  const sizeGuideRows = buildSizeGuideRows(product, sizes);
  const currencyCode = toText(product.currency) || "INR";
  const formatMoney = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currencyCode} ${value.toLocaleString()}`;
    }
  };

  const discountAmount =
    (product.compareAtPrice || product.originalPrice) &&
    (product.compareAtPrice || product.originalPrice)! - product.price;

  const discountPct =
    discountAmount && product.compareAtPrice
      ? Math.round((discountAmount / product.compareAtPrice) * 100)
      : null;

  // Accordion data
  const factRows = [
    { label: "Brand", value: toText(product.brand) || "Unbranded" },
    { label: "SKU", value: toText(product.sku) || "—" },
    { label: "Gender", value: toText(product.gender) || "—" },
    { label: "Fabric", value: toText(product.fabric) || "—" },
    { label: "Fit", value: toText(product.fit) || "—" },
    {
      label: "Country of origin",
      value: toText(product.countryOfOrigin) || "—",
    },
    { label: "HSN", value: toText(product.hsn) || "—" },
    {
      label: "Tax",
      value: product.taxIncluded
        ? `Included (${product.taxRate ?? 0}%)`
        : `${product.taxRate ?? 0}% extra`,
    },
    { label: "Stock", value: `${product.totalStock ?? 0} units` },
    { label: "Published", value: formatDate(product.publishedAt) || "—" },
  ].filter((row) => row.value && row.value !== "—");

  const policyRows = [
    {
      label: "Returns",
      value: product.isReturnable
        ? `${product.returnWindowDays ?? 0} day window`
        : "Non-returnable",
    },
    {
      label: "Exchange",
      value: product.isExchangeable
        ? `${product.exchangeWindowDays ?? 0} day window`
        : "Non-exchangeable",
    },
    {
      label: "Cash on delivery",
      value: product.isCODAvailable ? "Available" : "Not available",
    },
  ];

  const tagList = [
    ...(product.tags || []),
    ...(product.occasion || []),
    ...(product.metaKeywords || []),
  ].filter(Boolean);

  const descriptionSections = [
    {
      id: "description",
      title: "Description",
      content: (
        <p className="text-[13px] text-stone-500 leading-[1.75] mb-5 font-light">
          {product.description}
        </p>
      ),
    },
    product.shortDescription
      ? {
          id: "shortDescription",
          title: "Overview",
          content: (
            <p className="text-[13px] text-stone-500 leading-[1.75] mb-5 font-light">
              {product.shortDescription}
            </p>
          ),
        }
      : null,
    product.details && product.details.length > 0
      ? {
          id: "details",
          title: "Details & Features",
          content: (
            <ul className="space-y-2.5 text-[13px] text-stone-500 mb-5">
              {product.details.map((d) => (
                <li key={d} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="leading-relaxed font-light">{d}</span>
                </li>
              ))}
            </ul>
          ),
        }
      : null,
    (product.care && product.care.length > 0) || product.careInstructions
      ? {
          id: "care",
          title: "Care Instructions",
          content: (
            <ul className="space-y-2.5 text-[13px] text-stone-500 mb-5">
              {product.careInstructions && (
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="leading-relaxed font-light">
                    {product.careInstructions}
                  </span>
                </li>
              )}
              {(product.care || []).map((c) => (
                <li key={c} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="leading-relaxed font-light">{c}</span>
                </li>
              ))}
            </ul>
          ),
        }
      : null,
    {
      id: "facts",
      title: "Product Details",
      content: (
        <div className="grid grid-cols-2 gap-px bg-stone-100 mb-5 border border-stone-100">
          {factRows.map((row) => (
            <div key={row.label} className="bg-white px-4 py-3">
              <p className="text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold mb-1">
                {row.label}
              </p>
              <p className="text-[12px] text-stone-700 font-medium">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "policies",
      title: "Shipping & Returns",
      content: (
        <div className="space-y-3 mb-5">
          {policyRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0"
            >
              <p className="text-[11px] tracking-wider uppercase text-stone-500 font-medium">
                {row.label}
              </p>
              <p className="text-[12px] text-stone-700 font-medium">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    tagList.length > 0
      ? {
          id: "tags",
          title: "Tags",
          content: (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] tracking-[0.2em] uppercase border border-stone-200 px-2.5 py-1 text-stone-400 bg-stone-50"
                >
                  {tag}
                </span>
              ))}
            </div>
          ),
        }
      : null,
    product.seller && typeof product.seller === "object"
      ? null // Rendered separately as a banner
      : null,
  ].filter(Boolean) as Array<{ id: string; title: string; content: React.ReactNode }>;

  return (
    <>
      <Head>
        <title>{product.name} | STITCH</title>
        <meta name="description" content={product.description} />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#F7F5F2]">
        <main className="flex-1 pt-[var(--h-main-nav,0px)]">

          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-stone-100/80 sticky top-0 z-30">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <nav className="flex items-center gap-3 text-[8.5px] tracking-[0.35em] uppercase text-stone-400 flex-wrap">
                <Link href="/" className="hover:text-stone-800 transition-colors duration-150">
                  Home
                </Link>
                <span className="text-stone-200 text-[10px]">/</span>
                <Link
                  href="/allproducts"
                  className="hover:text-stone-800 transition-colors duration-150"
                >
                  {getCategoryLabel(product.category)}
                </Link>
                <span className="text-stone-200 text-[10px]">/</span>
                <span className="text-stone-700 font-medium truncate max-w-[200px]">
                  {product.name}
                </span>
              </nav>
            </div>
          </div>

          {/* ── Product Layout ───────────────────────────────────────────── */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] gap-10 lg:gap-16 xl:gap-24">

              {/* ── Image Gallery ─────────────────────────────────────── */}
              <div className="flex gap-3">
                {/* Thumbnail strip */}
                {images.length > 1 && (
                  <div className="hidden md:flex flex-col gap-2.5 w-[76px] shrink-0">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        aria-label={`View image ${i + 1}`}
                        onClick={() => setActiveImage(i)}
                        className={`aspect-[3/4] overflow-hidden transition-all duration-300 rounded-sm ${
                          activeImage === i
                            ? "ring-2 ring-stone-800 ring-offset-2 opacity-100 shadow-md"
                            : "opacity-40 hover:opacity-70 hover:ring-1 hover:ring-stone-400 hover:ring-offset-1"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image */}
                <div className="flex-1">
                  <div
                    className="relative bg-gradient-to-br from-stone-50 to-stone-100 aspect-[4/5] overflow-hidden cursor-zoom-in group rounded-xl shadow-[0_2px_40px_rgba(0,0,0,0.06)]"
                    onClick={() => setZoomed(true)}
                  >
                    <img
                      src={images[activeImage] || ""}
                      alt={product.name}
                      className="w-full h-full object-contain p-6 sm:p-10 transition-transform duration-700 group-hover:scale-[1.04]"
                    />

                    {/* Tag badge */}
                    {product.tag && (
                      <div className="absolute top-4 left-4">
                        <span
                          className={`text-[8.5px] tracking-[0.3em] uppercase font-bold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm ${
                            product.tag === "Sale"
                              ? "bg-red-600/90 text-white"
                              : product.tag === "New"
                              ? "bg-emerald-700/90 text-white"
                              : "bg-stone-900/85 text-stone-50"
                          }`}
                        >
                          {product.tag}
                        </span>
                      </div>
                    )}

                    {/* Discount badge */}
                    {discountPct && (
                      <div className="absolute top-4 right-4">
                        <span className="text-[8.5px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-sm text-white shadow-sm">
                          −{discountPct}%
                        </span>
                      </div>
                    )}

                    {/* Zoom hint */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                      <div className="bg-white/95 backdrop-blur-md rounded-lg px-2.5 py-2 shadow-md flex items-center gap-1.5">
                        <ZoomIn size={11} className="text-stone-500" />
                        <span className="text-[8px] tracking-[0.2em] uppercase text-stone-500 font-medium">Zoom</span>
                      </div>
                    </div>

                    {/* Prev / Next arrows */}
                    {images.length > 1 && (
                      <>
                        <button
                          aria-label="Previous image"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImage((p) => Math.max(0, p - 1));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md rounded-full p-2.5 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all duration-200 z-10 hover:bg-white shadow-md hover:scale-105"
                        >
                          <ChevLeft size={14} className="text-stone-700" />
                        </button>
                        <button
                          aria-label="Next image"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImage((p) =>
                              Math.min(images.length - 1, p + 1)
                            );
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md rounded-full p-2.5 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all duration-200 z-10 hover:bg-white shadow-md hover:scale-105"
                        >
                          <ChevronRight size={14} className="text-stone-700" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Mobile dot indicators */}
                  {images.length > 1 && (
                    <div className="flex gap-1.5 justify-center mt-3 md:hidden">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          aria-label={`View image ${i + 1}`}
                          onClick={() => setActiveImage(i)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            activeImage === i
                              ? "w-5 bg-stone-900"
                              : "w-1.5 bg-stone-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Sustainability note */}
                  {product.material && (
                    <div className="mt-4 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100/80 px-4 py-3 rounded-lg">
                      <Leaf size={13} className="text-emerald-600 shrink-0" />
                      <p className="text-[9.5px] tracking-[0.22em] uppercase text-emerald-700 font-semibold">
                        {product.material}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Product Info ──────────────────────────────────────── */}
              <div className="flex flex-col lg:sticky lg:top-[calc(var(--h-header,112px)+2rem)] lg:self-start lg:max-h-[calc(100vh-var(--h-header,112px)-4rem)] lg:overflow-y-auto scrollbar-hide">

                {/* Header */}
                <div className="mb-6 pb-6 border-b border-stone-100">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-[8.5px] tracking-[0.45em] uppercase text-stone-400 font-semibold mt-1">
                      {getCategoryLabel(product.category)}
                    </p>
                    <div className="flex items-center gap-1 bg-stone-50 border border-stone-100 rounded-full px-3 py-1.5">
                      <button
                        aria-label={
                          wishlist
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                        onClick={handleToggleWishlist}
                        className={`transition-all duration-200 p-0.5 ${
                          wishlist
                            ? "text-red-500 scale-110"
                            : "text-stone-400 hover:text-red-400 hover:scale-110"
                        }`}
                      >
                        <Heart
                          size={15}
                          fill={wishlist ? "currentColor" : "none"}
                        />
                      </button>
                      <span className="w-px h-3 bg-stone-200 mx-1" />
                      <button
                        aria-label="Share product"
                        onClick={handleShare}
                        className="text-stone-400 hover:text-stone-700 transition-all duration-200 hover:scale-110 p-0.5"
                      >
                        <Share2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h1 className="font-serif text-[clamp(1.8rem,3.5vw,2.8rem)] text-stone-900 font-light leading-[1.08] tracking-[-0.02em] mb-2" style={{ fontStyle: "italic" }}>
                    {product.name}
                  </h1>

                  {product.subtitle && (
                    <p className="text-sm text-stone-400 mb-3 font-light">
                      {product.subtitle}
                    </p>
                  )}

                  {product.seller && typeof product.seller === "object" && (
                    <div className="mt-3 mb-1 flex items-center gap-2">
                       <span className="text-[9px] text-stone-400 uppercase tracking-widest">By</span>
                       <Link 
                         href={(product.seller as any).store?.slug ? `/store/` + (product.seller as any).store.slug : "#"} 
                         className="text-[11.5px] font-semibold text-stone-700 hover:text-stone-900 transition-colors flex items-center gap-1.5 border-b border-dashed border-stone-300 hover:border-stone-600 pb-0.5"
                       >
                         <Store size={11} className="text-stone-400" />
                         {(product.seller as any).store?.name || (product.seller as any).businessName || "Independent Boutique"} 
                       </Link>
                    </div>
                  )}

                  {/* Rating */}
                  {(displayRating > 0 || reviewTotal > 0) && (
                    <div className="flex items-center gap-2.5 mt-3">
                      <div className="flex items-center gap-0.5">
                        {Array(5)
                          .fill(null)
                          .map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={
                                i < Math.round(displayRating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-stone-200 fill-stone-200"
                              }
                            />
                          ))}
                      </div>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {displayRating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-stone-300">·</span>
                      <span className="text-[11px] text-stone-400">
                        {reviewsLoading ? "…" : `${reviewTotal} reviews`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-7 py-4 border-b border-stone-100">
                  <span className="text-[2rem] font-light text-stone-900 tracking-tight tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(product.price)}
                  </span>
                  {discountAmount && (
                    <>
                      <span className="text-sm text-stone-400 line-through tabular-nums font-light">
                        {formatMoney(
                          (product.compareAtPrice ||
                            product.originalPrice)!
                        )}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wide">
                        Save {formatMoney(discountAmount)}
                      </span>
                    </>
                  )}
                </div>

                {/* Color selector */}
                {colors.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[9px] tracking-[0.35em] uppercase text-stone-400 font-semibold">
                        Colour
                      </p>
                      <p className="text-[11px] text-stone-600 font-medium capitalize">
                        {selectedColor}
                      </p>
                    </div>
                    <div className="flex gap-2.5 flex-wrap">
                      {colors.map((c) => {
                        const hex =
                          c.hex ||
                          getColorHexFromName(c.name) ||
                          "#ccc";
                        const isSelected = selectedColor === c.name;
                        return (
                          <button
                            key={c.name}
                            onClick={() => setSelectedColor(c.name)}
                            title={c.name}
                            aria-label={`Select colour ${c.name}`}
                            style={{ backgroundColor: hex }}
                            className={`h-8 w-8 rounded-full transition-all duration-200 border-2 ${
                              isSelected
                                ? "border-stone-900 shadow-[0_0_0_2px_white,0_0_0_4px_#1c1917]"
                                : "border-white shadow-sm hover:scale-110"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size selector */}
                {sizes.length > 0 && (
                  <div className="mb-7">
                    <div className="flex items-center justify-between mb-3">
                      <p
                        className={`text-[9px] tracking-[0.35em] uppercase font-semibold transition-colors duration-200 ${
                          sizeError ? "text-red-500" : "text-stone-400"
                        }`}
                      >
                        {sizeError ? "Please select a size" : "Size"}
                      </p>
                      <button
                        onClick={() => setShowSizeGuide(true)}
                        className="text-[9.5px] text-stone-400 hover:text-stone-800 transition-colors border-b border-dashed border-stone-300 hover:border-stone-600 pb-0.5"
                      >
                        Size guide
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size);
                            setSizeError(false);
                          }}
                          className={`h-11 px-5 text-[11px] font-semibold tracking-wider rounded-lg border transition-all duration-200 ${
                            selectedSize === size
                              ? "bg-stone-900 text-stone-50 border-stone-900 shadow-md shadow-stone-900/20"
                              : sizeError
                              ? "border-red-300 text-stone-400 hover:border-red-400 rounded-lg"
                              : "border-stone-200 bg-white text-stone-600 hover:border-stone-700 hover:text-stone-900 hover:shadow-sm"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {product.fit && (
                      <p className="text-[10px] text-stone-400 mt-2.5 italic font-light">
                        {product.fit} fit
                      </p>
                    )}
                  </div>
                )}

                {/* Qty + Add to Bag */}
                <div ref={addToBagRef} className="flex gap-2.5 mb-5">
                  <div className="flex items-center border border-stone-200 bg-white rounded-xl overflow-hidden">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="px-3.5 h-12 text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-9 text-center text-[13px] font-semibold text-stone-900 tabular-nums select-none">
                      {qty}
                    </span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => setQty((q) => q + 1)}
                      className="px-3.5 h-12 text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={handleAdd}
                    className={`flex-1 h-12 text-[10px] tracking-[0.3em] uppercase font-bold transition-all duration-300 rounded-xl shadow-sm ${
                      added
                        ? "bg-emerald-700 text-white shadow-emerald-700/20 shadow-md"
                        : "bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.99] hover:shadow-md hover:shadow-stone-900/20"
                    }`}
                  >
                    {added ? "Added ✓" : "Add to Bag"}
                  </button>

                  <button
                    aria-label={wishlist ? "Remove from wishlist" : "Save to wishlist"}
                    onClick={handleToggleWishlist}
                    className={`h-12 px-3.5 border transition-all duration-200 rounded-xl ${
                      wishlist
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-stone-200 bg-white text-stone-400 hover:border-stone-400 hover:text-stone-700"
                    }`}
                  >
                    <Heart size={15} fill={wishlist ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 mb-7">
                  {[
                    {
                      icon: Truck,
                      label: "Delivery",
                      sub: "Free over $150",
                      ok: true,
                    },
                    {
                      icon: RotateCcw,
                      label: "Returns",
                      sub: product.isReturnable
                        ? `${product.returnWindowDays ?? 0} days`
                        : "Final sale",
                      ok: !!product.isReturnable,
                    },
                    {
                      icon: Package,
                      label: "COD",
                      sub: product.isCODAvailable ? "Available" : "Unavailable",
                      ok: !!product.isCODAvailable,
                    },
                  ].map(({ icon: Icon, label, sub, ok }) => (
                    <div
                      key={label}
                      className="text-center bg-white border border-stone-100/80 py-4 px-2 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${ok ? "bg-stone-100" : "bg-stone-50"}`}>
                        <Icon
                          size={15}
                          strokeWidth={1.5}
                          className={ok ? "text-stone-700" : "text-stone-300"}
                        />
                      </div>
                      <p className="text-[8.5px] font-bold tracking-widest uppercase text-stone-600 mb-0.5">
                        {label}
                      </p>
                      <p
                        className={`text-[9.5px] ${
                          ok ? "text-stone-400" : "text-stone-300"
                        }`}
                      >
                        {sub}
                      </p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* ── Structured Product Details ──────────────────────────────── */}
          <div className="border-t border-stone-100 bg-white py-14 sm:py-20">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-12 flex items-end justify-between">
                <div>
                  <p className="text-[8.5px] tracking-[0.45em] uppercase text-stone-400 mb-2 font-semibold">
                    Discover More
                  </p>
                  <h3 className="font-serif text-3xl sm:text-4xl text-stone-900 font-light" style={{ fontStyle: "italic" }}>
                    Product Details
                  </h3>
                </div>
                <div className="hidden sm:block w-24 h-px bg-gradient-to-l from-stone-200 to-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-14">
                {descriptionSections.map((sec) => (
                  <div key={sec.id}>
                    <div className="flex items-center gap-3 mb-5">
                      <h4 className="text-[9.5px] tracking-[0.3em] uppercase font-bold text-stone-800">
                        {sec.title}
                      </h4>
                      <div className="flex-1 h-px bg-stone-100" />
                    </div>
                    <div className="[&>div]:mb-0 [&>p]:mb-0 [&>ul]:mb-0">
                      {sec.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Seller Profile Banner ────────────────────────────────────── */}
          {product.seller && typeof product.seller === "object" && (
            <div className="bg-[#F7F5F2] py-10 pb-16">
              <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white border border-stone-100 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-8 sm:gap-12 shadow-sm hover:shadow-md transition-shadow">
                  <div className="shrink-0">
                    {(product.seller as any).store?.logo ? (
                      <img
                        src={(product.seller as any).store.logo}
                        alt="Seller Logo"
                        className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover shadow-sm border border-stone-100"
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shadow-sm">
                        <span className="text-5xl text-stone-300 font-serif italic font-light">
                          {((product.seller as any).store?.name || (product.seller as any).businessName || "S")[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight font-light">
                        {(product.seller as any).store?.name || (product.seller as any).businessName || "Independent Boutique"}
                      </h4>
                      {((product.seller as any).verificationStatus === 'approved' || (product.seller as any).status === 'verified') && (
                        <Shield size={20} className="text-emerald-500 fill-emerald-500/10" />
                      )}
                    </div>
                    
                    <p className="text-[13px] text-stone-500 font-light max-w-lg mb-6 leading-relaxed">
                      {(product.seller as any).store?.description || "Providing high-quality fashion pieces with meticulous attention to detail and craftsmanship. We ensure every piece meets the highest standards."}
                    </p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3 mb-8">
                      {(product.seller as any).averageRating > 0 && (
                        <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-semibold text-amber-600">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span>{(product.seller as any).averageRating.toFixed(1)} Rating</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-semibold text-stone-400">
                        <Package size={14} className="text-stone-300" />
                        <span>Premium Quality</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-semibold text-stone-400">
                        <Shield size={14} className="text-stone-300" />
                        <span>Authentic</span>
                      </div>
                    </div>
                    
                    {/* Fallback link if store.slug doesn't exist, we link to home or hide button */}
                    {(product.seller as any).store?.slug ? (
                      <Link
                        href={`/store/${(product.seller as any).store.slug}`}
                        className="px-8 py-3.5 bg-stone-900 text-white text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/20"
                      >
                        Visit Boutique
                      </Link>
                    ) : (
                       <div className="px-8 py-3.5 bg-stone-100 text-stone-400 text-[10px] tracking-[0.3em] uppercase font-bold cursor-not-allowed">
                        Boutique Currently Offline
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Reviews ─────────────────────────────────────────────────── */}
          <div className="border-t border-stone-200/70 bg-white py-14 sm:py-20">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
                  <div>
                    <p className="text-[9px] tracking-[0.4em] uppercase text-stone-400 mb-2 font-semibold">
                      Customer Reviews
                    </p>
                    <h3
                      className="font-serif text-4xl text-stone-900 font-light mb-3"
                      style={{ fontStyle: "italic" }}
                    >
                      What people say
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-0.5">
                        {Array(5)
                          .fill(null)
                          .map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < Math.round(displayRating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-stone-200 fill-stone-200"
                              }
                            />
                          ))}
                      </div>
                      <span className="text-sm font-semibold text-stone-900">
                        {displayRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-stone-400">
                        ({reviewTotal} reviews)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className={`text-[10px] tracking-[0.3em] uppercase font-semibold px-5 py-3 border transition-all duration-200 self-start ${
                      showReviewForm
                        ? "bg-stone-900 text-stone-50 border-stone-900"
                        : "border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900"
                    }`}
                  >
                    {showReviewForm ? "Cancel" : "Write a Review"}
                  </button>
                </div>

                {/* Review form */}
                <AnimatePresence>
                  {showReviewForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mb-10 p-6 border border-stone-200 bg-[#F7F5F2]">
                        <h4 className="text-[10px] tracking-[0.3em] uppercase font-semibold text-stone-700 mb-5">
                          Share Your Experience
                        </h4>
                        <form onSubmit={handleReviewSubmit} className="space-y-5">
                          <div>
                            <label className="block text-[9px] uppercase tracking-widest text-stone-400 font-semibold mb-2">
                              Rating
                            </label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  aria-label={`Rate ${star} stars`}
                                  onMouseEnter={() => setHoveredStar(star)}
                                  onMouseLeave={() => setHoveredStar(0)}
                                  onClick={() =>
                                    setNewReviewForm((p) => ({
                                      ...p,
                                      rating: star,
                                    }))
                                  }
                                >
                                  <Star
                                    size={22}
                                    className={`transition-colors ${
                                      star <=
                                      (hoveredStar || newReviewForm.rating)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-stone-200 fill-stone-200"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-widest text-stone-400 font-semibold mb-2">
                              Your Review
                            </label>
                            <textarea
                              required
                              rows={4}
                              value={newReviewForm.text}
                              onChange={(e) =>
                                setNewReviewForm((p) => ({
                                  ...p,
                                  text: e.target.value,
                                }))
                              }
                              placeholder="Describe the fit, quality, and material…"
                              className="w-full px-4 py-3 text-[13px] border border-stone-200 bg-white focus:outline-none focus:border-stone-500 resize-none font-light text-stone-700 placeholder:text-stone-300 transition-colors"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-stone-900 text-stone-50 text-[10px] tracking-[0.3em] uppercase font-semibold hover:bg-stone-800 transition-colors disabled:opacity-40"
                          >
                            {submitting ? "Submitting…" : "Submit Review"}
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Review list */}
                {reviewsLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="animate-pulse py-6 border-b border-stone-100"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-9 w-9 rounded-full bg-stone-100" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 bg-stone-100 rounded" />
                            <div className="h-2.5 w-20 bg-stone-50 rounded" />
                          </div>
                        </div>
                        <div className="h-3 w-full bg-stone-50 rounded mb-1.5 ml-12" />
                        <div className="h-3 w-2/3 bg-stone-50 rounded ml-12" />
                      </div>
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="py-14 text-center">
                    <MessageSquare
                      size={28}
                      className="text-stone-200 mx-auto mb-3"
                    />
                    <p className="text-stone-400 text-sm font-light">
                      No reviews yet. Be the first to share your thoughts.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {reviews.map((review) => {
                      const userName =
                        typeof review.user === "object"
                          ? (review.user as any).name
                          : "Anonymous";
                      return (
                        <div key={toText(review._id)} className="py-7">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-[11px] font-semibold text-stone-500 flex-shrink-0">
                                {(userName || "A")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[12px] font-semibold text-stone-800">
                                  {userName}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-stone-400">
                                    {new Date(
                                      review.createdAt
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                    })}
                                  </p>
                                  {review.isVerifiedPurchase && (
                                    <span className="text-[9px] text-emerald-600 border border-emerald-200 px-1.5 py-0.5 tracking-widest uppercase font-medium">
                                      Verified
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                  <Star
                                    key={i}
                                    size={11}
                                    className={
                                      i < review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-stone-200 fill-stone-200"
                                    }
                                  />
                                ))}
                            </div>
                          </div>

                          {review.title && (
                            <p className="text-[12px] font-semibold text-stone-800 pl-12 mb-1">
                              {review.title}
                            </p>
                          )}
                          <p className="text-[13px] text-stone-500 leading-relaxed pl-12 font-light">
                            {review.content}
                          </p>

                          {review.reply && (
                            <div className="mt-3.5 ml-12 pl-4 border-l-2 border-stone-100">
                              <p className="text-[9px] font-semibold text-stone-400 tracking-[0.3em] uppercase mb-1">
                                Seller Reply
                              </p>
                              <p className="text-[12px] text-stone-500 font-light leading-relaxed">
                                {review.reply.content}
                              </p>
                            </div>
                          )}

                          {review.status === "approved" && (
                            <div className="flex items-center gap-4 pl-12 mt-4">
                              <button
                                onClick={() => markHelpful(toText(review._id))}
                                className="flex items-center gap-1.5 text-[10px] text-stone-300 hover:text-stone-600 transition-colors"
                              >
                                <ThumbsUp size={11} />
                                Helpful
                                {review.helpfulCount > 0 &&
                                  ` (${review.helpfulCount})`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Related Products ─────────────────────────────────────────── */}
          {related.length > 0 && (
            <div className="bg-[#F7F5F2] py-14 sm:py-20 border-t border-stone-200/50">
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <p className="text-[9px] tracking-[0.4em] uppercase text-stone-400 mb-2 font-semibold">
                      You may also like
                    </p>
                    <h3
                      className="font-serif text-3xl sm:text-4xl text-stone-900 font-light"
                      style={{ fontStyle: "italic" }}
                    >
                      Related Pieces
                    </h3>
                  </div>
                  <Link
                    href="/allproducts"
                    className="text-[9px] tracking-[0.3em] uppercase text-stone-400 hover:text-stone-700 border-b border-stone-200 hover:border-stone-500 pb-0.5 transition-colors"
                  >
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                  {related.slice(0, 4).map((p) => (
                    <ProductCard
                      key={toText(p._id) || p.id}
                      product={p as any}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />

        {/* ── Size Guide Modal ────────────────────────────────────────────── */}
        <AnimatePresence>
          {showSizeGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
                onClick={() => setShowSizeGuide(false)}
              />
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="relative bg-white w-full max-w-lg z-10 shadow-2xl"
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
                  <div>
                    <h3 className="text-[10px] tracking-[0.3em] uppercase font-semibold text-stone-700">
                      Size Guide
                    </h3>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {product.name}
                    </p>
                  </div>
                  <button
                    aria-label="Close size guide"
                    onClick={() => setShowSizeGuide(false)}
                    className="text-stone-400 hover:text-stone-900 transition-colors p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-stone-100">
                        {["Size", "Chest", "Waist", "Hip", "Length"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left pb-3 font-semibold text-stone-400 tracking-[0.25em] uppercase text-[9px]"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {sizeGuideRows.map((row) => (
                        <tr
                          key={row.label}
                          className={`transition-colors ${
                            selectedSize === row.label ? "bg-stone-50" : ""
                          }`}
                        >
                          <td className="py-3 font-semibold text-stone-900 text-[11px]">
                            {row.label}
                            {selectedSize === row.label && (
                              <span className="ml-2 text-[8px] tracking-widest uppercase text-amber-600 font-bold">
                                Selected
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-stone-500">
                            {row.chest || "—"}
                          </td>
                          <td className="py-3 text-stone-500">
                            {row.waist || "—"}
                          </td>
                          <td className="py-3 text-stone-500">
                            {row.hip || "—"}
                          </td>
                          <td className="py-3 text-stone-500">
                            {row.length || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-stone-400 mt-5 leading-relaxed font-light">
                    All measurements are approximate and may vary slightly by
                    style.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Lightbox ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {zoomed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-stone-950/95 flex items-center justify-center p-6 sm:p-12 cursor-zoom-out"
              onClick={() => setZoomed(false)}
            >
              <button
                aria-label="Close"
                className="absolute top-5 right-5 text-stone-500 hover:text-stone-50 transition-colors p-2"
              >
                <X size={20} />
              </button>
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                src={images[activeImage]}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              {images.length > 1 && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(i);
                      }}
                      className={`h-1 rounded-full transition-all ${
                        activeImage === i
                          ? "w-6 bg-stone-300"
                          : "w-1.5 bg-stone-600"
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Sticky Add to Bag (when main button is off-screen) ─────────── */}
        <AnimatePresence>
          {!isAddToBagInView && (
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 sm:px-6 py-3.5 z-40 flex items-center justify-between gap-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
            >
              <div className="hidden sm:flex items-center gap-4 min-w-0">
                <img
                  src={images[0] || ""}
                  alt={product.name}
                  className="w-12 h-12 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-stone-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-[11px] text-stone-500 tabular-nums">
                    {formatMoney(product.price)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {selectedSize && (
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-[9px] tracking-widest uppercase text-stone-400">
                      Size
                    </span>
                    <span className="text-[11px] font-semibold text-stone-900 border border-stone-200 px-2 py-0.5">
                      {selectedSize}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!selectedSize && sizes.length > 0) {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      setSizeError(true);
                    } else {
                      handleAdd();
                    }
                  }}
                  className={`flex-1 sm:flex-none sm:w-48 h-11 text-[10px] tracking-[0.3em] uppercase font-bold transition-all duration-200 ${
                    added
                      ? "bg-emerald-700 text-white"
                      : "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99]"
                  }`}
                >
                  {added ? "Added ✓" : sizes.length > 0 && !selectedSize ? "Select a Size" : "Add to Bag"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}