import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  Shield,
  Leaf,
  Award,
  Truck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion";
import { SeoHead } from "@/components/common/SeoHead";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useProductContext } from "@/lib/context/ProductContext";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { GetProductsParams } from "@/lib/types/product.types";
import { getCategoryLabel } from "@/lib/utils";

// ── Custom Icons ────────────────────────────────────────────────────────────────

const Instagram = ({ size = 24, className, ...props }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// ── Constants ───────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Hoodies", "Tees", "Outerwear", "Bottoms", "Accessories"];
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating", label: "Highest Rated" },
];

const SOCIAL_IMAGES = [
  { src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80", tall: true },
  { src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80", tall: false },
  { src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80", tall: false },
  { src: "https://images.unsplash.com/photo-1550614000-4b95d4ebf5c2?w=600&q=80", tall: true },
];

const PHILOSOPHY_FEATURES = [
  { icon: Leaf, label: "100% Organic", desc: "Certified natural fibers across every category." },
  { icon: Shield, label: "Ethical Labor", desc: "Fair wages guaranteed in all partner factories." },
  { icon: Award, label: "Built to Last", desc: "Reinforced stitching and premium hardware." },
  { icon: Truck, label: "Carbon Neutral", desc: "Offsetting 100% of our global shipping footprint." },
];

const MARQUEE_ITEMS = [
  { icon: Truck, text: "Complimentary Global Shipping" },
  { icon: Shield, text: "60-Day Returns" },
  { icon: Leaf, text: "100% Traceable Supply Chain" },
  { icon: Sparkles, text: "Handcrafted Quality" },
];

// ── Utility: Parallax hook ──────────────────────────────────────────────────────

function useParallax(multiplier = 0.02) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    const handleMouseMove = (e: MouseEvent) => {
      const x = (window.innerWidth / 2 - e.clientX) * multiplier;
      const y = (window.innerHeight / 2 - e.clientY) * multiplier;
      setOffset({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [multiplier]);
  return offset;
}

// ── Stagger animation config ────────────────────────────────────────────────────

const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } } };
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6 } } };

// ═══════════════════════════════════════════════════════════════════════════════
//  HOMEPAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function HomePage() {
  const { products, loading, isOffline, fetchProducts } = useProductContext();

  // ── Shop filters ──
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeGender, setActiveGender] = useState<"all" | "men" | "women" | "unisex">("all");
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [heroVisible, setHeroVisible] = useState(false);

  const shopRef = useRef<HTMLElement>(null);
  const parallaxOffset = useParallax(0.02);

  // Hero entrance
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Fetch products from backend
  useEffect(() => {
    const params: GetProductsParams = {
      category: activeCategory !== "All" ? activeCategory.toLowerCase() : undefined,
      gender: activeGender !== "all" ? (activeGender as any) : undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1] < 500 ? priceRange[1] : undefined,
      sort: sortBy as any,
    };
    fetchProducts(params);
  }, [activeCategory, activeGender, priceRange, sortBy, fetchProducts]);

  // Client-side filtering fallback for offline mode
  const filteredProducts = useMemo(() => {
    if (!isOffline) return products;
    return products
      .filter((p) => {
        const catLabel = getCategoryLabel(p.category);
        return activeCategory === "All" || catLabel === activeCategory;
      })
      .filter((p) => {
        const productGender = (p as any).gender;
        return activeGender === "all" || productGender === activeGender || productGender === "unisex" || !productGender;
      })
      .filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "newest") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        return 0;
      });
  }, [isOffline, products, activeCategory, activeGender, priceRange, sortBy]);

  const hasActiveFilters = activeCategory !== "All" || activeGender !== "all" || priceRange[1] < 500;

  const clearFilters = () => {
    setActiveCategory("All");
    setPriceRange([0, 500]);
    setActiveGender("all");
  };

  const scrollToShop = () => shopRef.current?.scrollIntoView({ behavior: "smooth" });

  // ── Editorial parallax ──
  const editorialRef = useRef<HTMLElement>(null);
  const { scrollYProgress: editorialProgress } = useScroll({ target: editorialRef, offset: ["start end", "end start"] });
  const editorialY = useTransform(editorialProgress, [0, 1], ["0%", "20%"]);

  return (
    <>
      <SeoHead
        title="Stitch — Redefining the Classics"
        description="Premium sustainable fashion. Shop the Autumn/Winter '26 collection. Ethically made, built to last."
        url="https://stitch-shop.com"
      />

      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 overflow-x-hidden">


        {/* ═══════════════════════════════════════════════════════════════════════
            HERO SECTION — Split-screen immersive layout
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="relative h-screen min-h-[700px] max-h-[1100px] flex items-end overflow-hidden bg-stone-950">
          {/* Background image with parallax */}
          <div
            className="absolute inset-[-3%] transition-transform duration-[200ms] ease-out will-change-transform"
            style={{ transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0)` }}
          >
            <img
              loading="eager"
              decoding="async"
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2000&q=85"
              alt="Stitch Autumn/Winter collection — editorial fashion photography"
              className={`w-full h-full object-cover transition-all duration-[2.5s] ease-out ${
                heroVisible ? "opacity-50 scale-100" : "opacity-0 scale-110"
              }`}
            />
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-stone-950/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-950/30 to-transparent" />

          {/* Grain texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px" }} />

          {/* Hero content */}
          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 lg:px-10 pb-16 sm:pb-20 lg:pb-28">
            <motion.div variants={staggerContainer} initial="hidden" animate={heroVisible ? "visible" : "hidden"}>
              {/* Season tag */}
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
                <span className="w-10 h-[1.5px] bg-accent inline-block" />
                <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-accent font-semibold">
                  Autumn / Winter &apos;26
                </p>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeUp}
                className="font-serif text-[clamp(2.8rem,8vw,6.5rem)] text-white font-light leading-[1.05] mb-10 max-w-4xl tracking-tight"
              >
                Redefining <br className="hidden sm:block" />
                the{" "}
                <em className="not-italic text-accent relative inline-block">
                  classics.
                  <svg className="absolute -bottom-1 sm:-bottom-3 left-0 w-full h-2.5 text-accent opacity-50" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M0 8 Q 25 0 50 8 Q 75 16 100 8" fill="transparent" stroke="currentColor" strokeWidth="2.5" />
                  </svg>
                </em>
              </motion.h1>

              {/* Subtitle */}
              <motion.p variants={fadeUp} className="text-stone-400 text-sm sm:text-base max-w-md mb-10 leading-relaxed font-light">
                Sustainably crafted essentials designed to outlast every season. Premium materials, timeless silhouettes.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <button
                  onClick={scrollToShop}
                  className="group relative overflow-hidden bg-white text-stone-950 px-10 py-4.5 text-[11px] tracking-[0.2em] uppercase font-bold transition-all duration-500 hover:shadow-[0_0_50px_rgba(200,169,110,0.2)]"
                  aria-label="Browse the shop collection"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Shop Collection
                    <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-accent transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-0" />
                </button>

                <div className="flex gap-1">
                  {(["women", "men"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => { setActiveGender(g); scrollToShop(); }}
                      className="group flex items-center gap-3 px-5 py-4.5 text-[11px] tracking-[0.2em] uppercase font-semibold text-stone-400 hover:text-accent transition-colors duration-300"
                      aria-label={`Shop ${g}'s collection`}
                    >
                      {g}
                      <span className="block w-6 h-px bg-stone-600 group-hover:bg-accent group-hover:w-10 transition-all duration-300" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 right-8 flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer z-20 motion-safe:animate-none"
            onClick={scrollToShop}
            role="button"
            aria-label="Scroll to shop section"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && scrollToShop()}
          >
            <div className="w-[1px] h-16 bg-stone-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1/3 bg-accent motion-safe:animate-[scrollLine_2s_ease-in-out_infinite]" />
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-accent motion-safe:animate-[pulse-dot_2s_ease_infinite]" />
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════════════════════
            TRUST MARQUEE STRIP
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="border-b border-stone-800 bg-stone-900 overflow-hidden py-4 text-stone-300" role="marquee" aria-label="Brand trust indicators">
          <div className="animate-marquee motion-reduce:animate-none motion-reduce:justify-center motion-reduce:flex-wrap flex items-center">
            {Array(3).fill(null).map((_, dupeIdx) => (
              <div key={dupeIdx} className="flex items-center shrink-0">
                {MARQUEE_ITEMS.map((item, i) => (
                  <React.Fragment key={`${dupeIdx}-${i}`}>
                    <span className="flex items-center gap-2.5 mx-8 text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-semibold whitespace-nowrap">
                      <item.icon size={14} className="text-accent" />
                      {item.text}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-stone-700 shrink-0" aria-hidden="true" />
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>


        {/* ═══════════════════════════════════════════════════════════════════════
            SHOP COLLECTION
        ═══════════════════════════════════════════════════════════════════════ */}
        <section ref={shopRef} id="shop" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 scroll-mt-20">

          {/* Section header */}
          <ScrollReveal direction="up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-accent font-bold mb-3 flex items-center gap-2.5">
                  <span className="w-6 h-[1.5px] bg-accent inline-block" />
                  The Edit
                </p>
                <h2 className="font-serif text-4xl sm:text-5xl lg:text-7xl text-stone-900 font-light italic">
                  Shop Collection
                </h2>
              </div>

              {/* Filter & Sort controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`group flex items-center gap-2.5 px-5 py-3.5 text-[10px] tracking-[0.15em] uppercase font-bold border transition-all duration-300 ${
                    showFilters
                      ? "bg-stone-900 text-stone-50 border-stone-900 shadow-lg shadow-stone-900/10"
                      : "border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 bg-white"
                  }`}
                  aria-expanded={showFilters}
                  aria-controls="filter-panel"
                >
                  <SlidersHorizontal size={13} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>Filters</span>
                  {hasActiveFilters && <span className="ml-0.5 w-1.5 h-1.5 bg-accent rounded-full" aria-label="Active filters" />}
                </button>

                <div className="relative group">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-5 pr-10 py-3.5 text-[10px] tracking-[0.15em] uppercase font-bold border border-stone-200 bg-white text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                    aria-label="Sort products"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Expandable filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                id="filter-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden mb-14"
              >
                <div className="bg-white border border-stone-200 p-8 lg:p-10 shadow-sm relative">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="absolute top-5 right-5 text-stone-400 hover:text-stone-900 transition-colors p-2 hover:bg-stone-100 rounded-full"
                    aria-label="Close filter panel"
                  >
                    <X size={16} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
                    {/* Gender */}
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-bold mb-5">Department</p>
                      <div className="flex flex-col gap-3">
                        {(["all", "men", "women", "unisex"] as const).map((g) => (
                          <label key={g} className="flex items-center gap-3.5 cursor-pointer group">
                            <div className={`w-4.5 h-4.5 border-2 flex items-center justify-center transition-colors rounded-sm ${
                              activeGender === g ? "border-accent bg-accent" : "border-stone-300 group-hover:border-stone-500"
                            }`}>
                              {activeGender === g && <span className="block w-2 h-2 bg-white rounded-[1px]" />}
                            </div>
                            <input type="radio" name="gender" className="sr-only" checked={activeGender === g} onChange={() => setActiveGender(g)} />
                            <span className={`text-xs uppercase tracking-widest transition-colors ${
                              activeGender === g ? "text-stone-900 font-bold" : "text-stone-500 group-hover:text-stone-900"
                            }`}>
                              {g}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-bold mb-5">Category</p>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2.5 text-[10px] tracking-widest uppercase font-bold transition-all duration-200 border ${
                              activeCategory === cat
                                ? "bg-stone-900 text-stone-50 border-stone-900"
                                : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900"
                            }`}
                            aria-pressed={activeCategory === cat}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-bold mb-5">Price Range</p>
                      <div className="px-1 mt-6">
                        <input
                          type="range"
                          min={0}
                          max={500}
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                          className="w-full"
                          aria-label={`Maximum price: $${priceRange[1]}`}
                        />
                        <div className="flex justify-between items-center mt-5">
                          <span className="text-xs font-bold text-stone-700 border border-stone-200 px-3.5 py-2 bg-stone-50">${priceRange[0]}</span>
                          <span className="text-stone-300 text-xs">—</span>
                          <span className="text-xs font-bold text-stone-700 border border-stone-200 px-3.5 py-2 bg-stone-50">${priceRange[1]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-stone-500">
                      Showing <strong className="text-stone-900">{filteredProducts.length}</strong> results
                    </p>
                    <button
                      onClick={clearFilters}
                      className="text-[10px] tracking-[0.2em] uppercase font-bold text-stone-400 hover:text-stone-900 transition-colors border-b border-transparent hover:border-stone-900 pb-0.5"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter tags */}
          <AnimatePresence>
            {hasActiveFilters && !showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-wrap items-center gap-2.5 mb-10"
              >
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold mr-1">Active:</span>
                {activeGender !== "all" && (
                  <span className="flex items-center gap-2 bg-white border border-stone-200 px-3.5 py-2 text-[10px] uppercase tracking-widest font-bold text-stone-700 hover:border-stone-400 transition-colors">
                    {activeGender}
                    <X size={11} className="cursor-pointer text-stone-400 hover:text-red-500 transition-colors" onClick={() => setActiveGender("all")} role="button" aria-label={`Remove ${activeGender} filter`} />
                  </span>
                )}
                {activeCategory !== "All" && (
                  <span className="flex items-center gap-2 bg-white border border-stone-200 px-3.5 py-2 text-[10px] uppercase tracking-widest font-bold text-stone-700 hover:border-stone-400 transition-colors">
                    {activeCategory}
                    <X size={11} className="cursor-pointer text-stone-400 hover:text-red-500 transition-colors" onClick={() => setActiveCategory("All")} role="button" aria-label={`Remove ${activeCategory} filter`} />
                  </span>
                )}
                {priceRange[1] < 500 && (
                  <span className="flex items-center gap-2 bg-white border border-stone-200 px-3.5 py-2 text-[10px] uppercase tracking-widest font-bold text-stone-700 hover:border-stone-400 transition-colors">
                    Under ${priceRange[1]}
                    <X size={11} className="cursor-pointer text-stone-400 hover:text-red-500 transition-colors" onClick={() => setPriceRange([0, 500])} role="button" aria-label="Remove price filter" />
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product grid */}
          {loading ? (
            <ProductSkeletonGrid count={8} cols={4} />
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14">
              {filteredProducts.map((product, idx) => (
                <ScrollReveal key={product.id || (product._id as any)?.$oid || (product._id as string) || idx} delay={Math.min(idx * 0.04, 0.4)}>
                  <ProductCard product={product as any} />
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="py-28 flex flex-col items-center justify-center text-center bg-white border border-dashed border-stone-200">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6 text-stone-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif text-stone-900 mb-3 italic">Nothing to see here</h3>
              <p className="text-stone-500 text-sm max-w-md mb-8 leading-relaxed">
                We couldn&apos;t find any products matching your criteria. Try broadening your search or exploring our new arrivals.
              </p>
              <button
                onClick={clearFilters}
                className="bg-stone-900 text-white px-8 py-4 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-accent transition-colors duration-300"
              >
                Reset Filters
              </button>
            </div>
          )}
        </section>


        {/* ═══════════════════════════════════════════════════════════════════════
            EDITORIAL / LOOKBOOK
        ═══════════════════════════════════════════════════════════════════════ */}
        <section ref={editorialRef} className="relative h-[85vh] min-h-[600px] overflow-hidden">
          {/* Parallax background */}
          <motion.div className="absolute inset-0 bg-stone-900" style={{ y: editorialY }}>
            <img
              loading="lazy"
              decoding="async"
              src="https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=2000&q=85"
              alt="Editorial lookbook campaign"
              className="w-full h-[120%] object-cover opacity-75"
            />
          </motion.div>

          {/* Multi-stop gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 via-50% to-stone-950/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/40 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end px-6 lg:px-10 pb-16 lg:pb-24 max-w-[1440px] mx-auto">
            <ScrollReveal direction="up" className="max-w-2xl">
              <p className="text-[10px] tracking-[0.5em] uppercase text-accent font-semibold mb-5 flex items-center gap-4">
                <span className="w-10 h-[1.5px] bg-accent inline-block" />
                Editorial Campaign
              </p>
              <h2 className="font-serif text-[clamp(2.5rem,7vw,6rem)] text-white font-light italic mb-6 leading-[1.05]">
                Winter <br />Shadows.
              </h2>
              <p className="text-stone-300 text-sm sm:text-base mb-10 font-light leading-relaxed max-w-lg">
                Explore our latest collection shot in the remote highlands. Emphasizing texture, natural tones, and uncompromising warmth.
              </p>
              <Link
                href="/lookbook"
                className="group inline-flex items-center gap-3 bg-white/95 backdrop-blur-sm text-stone-900 px-9 py-4.5 text-[11px] tracking-[0.2em] uppercase font-bold hover:bg-accent hover:text-white transition-all duration-400"
              >
                Explore Lookbook
                <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </Link>
            </ScrollReveal>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════════════════════
            BRAND PHILOSOPHY
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="bg-stone-100 py-24 lg:py-36">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
              {/* Image + testimonial */}
              <ScrollReveal direction="right">
                <div className="relative">
                  <img
                    loading="lazy"
                    decoding="async"
                    src="https://images.unsplash.com/photo-1489987707023-afc827633c5d?w=1000&q=80"
                    alt="Stitch craftsmanship — artisan working on premium garment"
                    className="w-full aspect-[4/5] object-cover shadow-2xl shadow-stone-900/8"
                  />

                  {/* Glassmorphism testimonial card */}
                  <div className="absolute -bottom-8 -right-4 lg:-right-8 bg-white/80 backdrop-blur-xl p-8 shadow-2xl shadow-stone-900/10 max-w-xs hidden md:block border border-white/50">
                    <div className="flex gap-1.5 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={11} className="fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="font-serif text-xl italic text-stone-900 mb-4 leading-snug">
                      &ldquo;True sustainability is longevity. Buying pieces that outlast trends.&rdquo;
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-stone-300" />
                      Head of Design
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Philosophy content */}
              <ScrollReveal direction="left">
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 font-bold mb-5 flex items-center gap-3">
                    <Leaf size={14} className="text-green-600" />
                    Our Philosophy
                  </p>
                  <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-stone-900 font-light leading-tight mb-7">
                    Buy less, <br />
                    <span className="italic text-accent">choose well.</span>
                  </h2>
                  <p className="text-base text-stone-600 leading-relaxed mb-12 max-w-md">
                    We reject the cycle of fast fashion. Every Stitch piece is meticulously designed with premium, low-impact materials intended to be the last version of that garment you ever need to buy.
                  </p>

                  {/* Feature cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-7 mb-12">
                    {PHILOSOPHY_FEATURES.map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex gap-4 group">
                        <div className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-accent border border-stone-100 group-hover:bg-accent group-hover:text-white group-hover:border-accent group-hover:shadow-md transition-all duration-300">
                          <Icon size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-1.5">{label}</h4>
                          <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/pages/about-us"
                    className="group inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-stone-900 border-b-2 border-stone-900 pb-1 hover:text-accent hover:border-accent transition-colors duration-300"
                  >
                    Read our full story
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════════════════════
            SOCIAL FEED — As Seen On You
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
            {/* Section header */}
            <div className="text-center mb-14">
              <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 font-bold mb-4">Community</p>
              <h2 className="font-serif text-4xl sm:text-5xl text-stone-900 font-light italic mb-5">As Seen On You</h2>
              <a
                href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"}
                className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-accent transition-colors duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={15} />
                @stitch_studio
              </a>
            </div>

            {/* Masonry-style grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {SOCIAL_IMAGES.map((img, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <div className={`group relative overflow-hidden bg-stone-100 cursor-pointer ${
                    img.tall ? "aspect-[3/4]" : "aspect-square"
                  }`}>
                    <img
                      loading="lazy"
                      decoding="async"
                      src={img.src}
                      alt={`Community style post ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/40 transition-all duration-400 flex flex-col items-center justify-center gap-2">
                      <Instagram
                        size={28}
                        className="text-white opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 delay-75"
                      />
                      <span className="text-white text-[10px] tracking-widest uppercase font-semibold opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 delay-150">
                        @stitch_studio
                      </span>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>


        <Footer />
      </div>
    </>
  );
}