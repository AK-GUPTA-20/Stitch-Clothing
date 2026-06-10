import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  Shield,
  Leaf,
  Award,
  Truck
} from "lucide-react";

// --- CUSTOM ICONS ---
const Instagram = ({ size = 24, className, ...props }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useProductContext } from "@/lib/context/ProductContext";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { Product, GetProductsParams } from "@/lib/types/product.types";
import { getCategoryLabel } from "@/lib/utils";

// --- CONSTANTS ---
const CATEGORIES = ["All", "Hoodies", "Tees", "Outerwear", "Bottoms", "Accessories"];
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
];

const SOCIAL_IMAGES = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
  "https://images.unsplash.com/photo-1550614000-4b95d4ebf5c2?w=600&q=80",
];

// --- UTILITY HOOKS ---
function useParallax(multiplier = 0.05) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
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

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const { products, loading, isOffline, fetchProducts } = useProductContext();

  // Shop State
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeGender, setActiveGender] = useState<"all" | "men" | "women" | "unisex">("all");
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [heroVisible, setHeroVisible] = useState(false);
  
  const shopRef = useRef<HTMLElement>(null);
  const parallaxOffset = useParallax(0.02);

  // Trigger initial hero animation
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Fetch products from backend dynamically
  useEffect(() => {
    const params: GetProductsParams = {
      category: activeCategory !== 'All' ? activeCategory.toLowerCase() : undefined,
      gender: activeGender !== 'all' ? (activeGender as any) : undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1] < 500 ? priceRange[1] : undefined,
      sort: sortBy as any,
    };
    fetchProducts(params);
  }, [activeCategory, activeGender, priceRange, sortBy, fetchProducts]);

  // Client-side filtering fallback for offline mode
  const filteredProducts = isOffline
    ? products
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
        })
    : products;

  // Global styles for animations and custom scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes marquee {
        0% { transform: translateX(0%); }
        100% { transform: translateX(-50%); }
      }
      .animate-marquee {
        display: flex;
        width: 200%;
        animation: marquee 25s linear infinite;
      }
      .animate-marquee:hover {
        animation-play-state: paused;
      }
      @keyframes scrollLine {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(250%); }
      }
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #fafaf9; 
      }
      ::-webkit-scrollbar-thumb {
        background: #d6d3d1; 
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #a8a29e; 
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      body {
        font-family: 'Inter', sans-serif;
        background-color: #fafaf9;
      }
      .magnetic-btn {
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .magnetic-btn:hover {
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 overflow-x-hidden">
      


      {/* ── HERO SECTION ──────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[750px] flex items-end overflow-hidden bg-stone-950">
        {/* Parallax Background */}
        <div 
          className="absolute inset-[-5%] bg-stone-900 transition-transform duration-100 ease-out"
          style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }}
        >
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2000&q=85"
            alt="Hero Background"
            className={`w-full h-full object-cover opacity-60 transition-transform duration-[3s] ease-out ${
              heroVisible ? "scale-100" : "scale-110"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/30 to-stone-900/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/70 via-stone-950/20 to-transparent" />
        </div>

        {/* Decorative Badge */}
        <div className={`absolute top-1/4 right-[10%] lg:right-[20%] z-20 w-32 h-32 rounded-full border border-white/20 backdrop-blur-md bg-white/5 flex items-center justify-center transition-all duration-1000 delay-700 animate-[spin_20s_linear_infinite] ${heroVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
           <svg viewBox="0 0 100 100" className="w-24 h-24 absolute inset-0 m-auto text-white fill-current">
              <path id="curve" d="M 50,50 m -35,0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="transparent"/>
              <text fontSize="11" letterSpacing="3" className="uppercase font-bold"><textPath href="#curve">· Discover the new standard ·</textPath></text>
           </svg>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 lg:px-8 pb-20 lg:pb-32">
          <div className={`transition-all duration-1000 delay-300 ease-out ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
            <div className="flex items-center gap-4 mb-6">
              <span className="w-12 h-[2px] bg-amber-500 inline-block"></span>
              <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-amber-500 font-bold">
                Autumn / Winter '26
              </p>
            </div>

            <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[120px] text-white font-light leading-[1.1] sm:leading-[0.9] mb-10 max-w-5xl tracking-tight drop-shadow-lg">
              Redefining <br className="hidden sm:block" />
              the <em className="not-italic text-amber-500 relative inline-block">
                classics.
                <svg className="absolute -bottom-2 sm:-bottom-4 left-0 w-full h-3 text-amber-500 opacity-60" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4"/></svg>
              </em>
            </h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <button
                onClick={() => shopRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="magnetic-btn group relative overflow-hidden bg-white text-stone-950 px-10 py-5 text-[11px] tracking-[0.2em] uppercase font-bold transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Shop Collection <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-stone-200 transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500 ease-out z-0"></div>
              </button>

              <div className="flex gap-4 w-full sm:w-auto">
                <button
                  onClick={() => { setActiveGender("women"); shopRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                  className="group flex items-center gap-3 px-6 py-5 text-[11px] tracking-[0.2em] uppercase font-bold text-white hover:text-amber-500 transition-colors"
                >
                  Women <span className="block w-8 h-px bg-white group-hover:bg-amber-500 transition-colors"></span>
                </button>
                <button
                  onClick={() => { setActiveGender("men"); shopRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                  className="group flex items-center gap-3 px-6 py-5 text-[11px] tracking-[0.2em] uppercase font-bold text-white hover:text-amber-500 transition-colors"
                >
                  Men <span className="block w-8 h-px bg-white group-hover:bg-amber-500 transition-colors"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Cue Indicator */}
        <div className="absolute bottom-10 right-10 flex flex-col items-center gap-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer z-20" onClick={() => shopRef.current?.scrollIntoView({ behavior: "smooth" })}>
          <span className="text-[9px] uppercase tracking-widest text-white writing-vertical-rl transform rotate-180 font-bold">Scroll</span>
          <div className="h-20 w-px bg-stone-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-white animate-[scrollLine_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* ── INFO STRIP ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-stone-200 bg-stone-900 overflow-hidden py-3 text-stone-300">
        <div className="animate-marquee flex items-center">
          {Array(8).fill(null).map((_, i) => (
            <div key={i} className="flex items-center gap-10 mx-10 text-[10px] tracking-[0.25em] uppercase font-bold whitespace-nowrap">
              <span className="flex items-center gap-2"><Truck size={14} className="text-amber-500"/> Complimentary Global Shipping</span>
              <span className="flex items-center gap-2"><Shield size={14} className="text-amber-500"/> 60-Day Returns</span>
              <span className="flex items-center gap-2"><Leaf size={14} className="text-amber-500"/> 100% Traceable Supply Chain</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SHOP SECTION ──────────────────────────────────────────────────────────── */}
      <section ref={shopRef} id="shop" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 scroll-mt-20">
        
        {/* Section Header */}
        <ScrollReveal direction="up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-amber-600 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-600 rounded-full"></span> The Edit
              </p>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-7xl text-stone-900 font-light italic">Shop Collection</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`group flex items-center gap-2 px-6 py-4 text-[10px] tracking-[0.15em] uppercase font-bold border transition-all duration-300 ${
                  showFilters
                    ? "bg-stone-900 text-stone-50 border-stone-900 shadow-xl shadow-stone-900/10"
                    : "border-stone-300 text-stone-700 hover:border-stone-900 hover:text-stone-900 bg-white"
                }`}
              >
                <SlidersHorizontal size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>Filters {filteredProducts.length < products.length && <span className="ml-1 w-2 h-2 inline-block bg-amber-500 rounded-full"></span>}</span>
              </button>
              
              <div className="relative group">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-6 pr-12 py-4 text-[10px] tracking-[0.15em] uppercase font-bold border border-stone-300 bg-white text-stone-700 hover:border-stone-900 transition-colors cursor-pointer focus:outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400 group-hover:text-stone-900 pointer-events-none transition-colors" />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Dynamic Expandable Filter Panel */}
        <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showFilters ? 'max-h-[600px] opacity-100 mb-16' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="bg-white border border-stone-200 p-8 lg:p-10 rounded-sm shadow-sm relative">
            <button onClick={() => setShowFilters(false)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors bg-stone-100 p-2 rounded-full hover:bg-stone-200">
              <X size={16} />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
              {/* Gender Filter */}
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-bold mb-5 flex items-center gap-2"><span className="w-1 h-1 bg-stone-400 rounded-full"></span> Department</p>
                <div className="flex flex-col gap-3">
                  {(["all", "men", "women", "unisex"] as const).map((g) => (
                    <label key={g} className="flex items-center gap-4 cursor-pointer group">
                      <div className={`w-5 h-5 border flex items-center justify-center transition-colors rounded-sm ${activeGender === g ? 'border-amber-600 bg-amber-600' : 'border-stone-300 group-hover:border-stone-500'}`}>
                        {activeGender === g && <span className="block w-2.5 h-2.5 bg-white rounded-sm" />}
                      </div>
                      <input type="radio" name="gender" className="hidden" checked={activeGender === g} onChange={() => setActiveGender(g)} />
                      <span className={`text-xs uppercase tracking-widest ${activeGender === g ? 'text-stone-900 font-bold' : 'text-stone-500 group-hover:text-stone-900'}`}>
                        {g}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-bold mb-5 flex items-center gap-2"><span className="w-1 h-1 bg-stone-400 rounded-full"></span> Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2.5 text-[10px] tracking-widest uppercase font-bold transition-all border ${
                        activeCategory === cat
                          ? "bg-stone-900 text-stone-50 border-stone-900 shadow-md"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-bold mb-5 flex items-center gap-2"><span className="w-1 h-1 bg-stone-400 rounded-full"></span> Price Range</p>
                <div className="px-2 mt-8">
                  <input
                    type="range"
                    min={0}
                    max={500}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                  />
                  <div className="flex justify-between items-center mt-6">
                    <span className="text-xs font-bold text-stone-700 border border-stone-200 px-4 py-2 bg-stone-50 rounded-sm">${priceRange[0]}</span>
                    <span className="text-stone-300">—</span>
                    <span className="text-xs font-bold text-stone-700 border border-stone-200 px-4 py-2 bg-stone-50 rounded-sm">${priceRange[1]}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-stone-500 font-medium">Showing <strong className="text-stone-900">{filteredProducts.length}</strong> Results</p>
              <button
                onClick={() => { setActiveCategory("All"); setPriceRange([0, 500]); setActiveGender("all"); }}
                className="text-[10px] tracking-[0.2em] uppercase font-bold text-stone-400 hover:text-stone-900 transition-colors border-b border-transparent hover:border-stone-900 pb-1"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(activeCategory !== "All" || activeGender !== "all" || priceRange[1] < 500) && !showFilters && (
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mr-2">Active:</span>
            {activeGender !== "all" && (
              <span className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-stone-700 shadow-sm">
                {activeGender} <X size={12} className="cursor-pointer text-stone-400 hover:text-red-500 transition-colors" onClick={() => setActiveGender("all")} />
              </span>
            )}
            {activeCategory !== "All" && (
              <span className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-stone-700 shadow-sm">
                {activeCategory} <X size={12} className="cursor-pointer text-stone-400 hover:text-red-500 transition-colors" onClick={() => setActiveCategory("All")} />
              </span>
            )}
            {priceRange[1] < 500 && (
              <span className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-stone-700 shadow-sm">
                Under ${priceRange[1]} <X size={12} className="cursor-pointer text-stone-400 hover:text-red-500 transition-colors" onClick={() => setPriceRange([0, 500])} />
              </span>
            )}
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <ProductSkeletonGrid count={8} cols={4} />
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-16">
            {filteredProducts.map((product, idx) => (
              <ScrollReveal key={product.id || (product._id as any)?.$oid || (product._id as string) || idx} delay={idx * 0.05}>
                <ProductCard product={product as any} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center bg-white border border-dashed border-stone-300 rounded-sm">
            <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center mb-6 text-stone-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif text-stone-900 mb-3 italic">Nothing to see here</h3>
            <p className="text-stone-500 text-sm max-w-md mb-8 leading-relaxed">We couldn't find any products matching your exact criteria. Try broadening your search or exploring our new arrivals.</p>
            <button
              onClick={() => { setActiveCategory("All"); setPriceRange([0, 500]); setActiveGender("all"); }}
              className="bg-stone-900 text-white px-8 py-4 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-amber-600 transition-colors shadow-lg"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* ── EDITORIAL / LOOKBOOK SECTION ──────────────────────────────────────────── */}
      <section className="relative h-[90vh] overflow-hidden">
        <div className="absolute inset-0 bg-stone-900">
          <img 
            src="https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=2000&q=85" 
            alt="Lookbook" 
            className="w-full h-full object-cover opacity-80"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/40 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end text-left px-6 lg:px-20 pb-20 lg:pb-32 max-w-[1440px] mx-auto">
          <ScrollReveal direction="up" className="max-w-2xl">
            <p className="text-[10px] tracking-[0.5em] uppercase text-amber-500 font-bold mb-6 flex items-center gap-4">
              <span className="w-12 h-[1px] bg-amber-500 inline-block"></span>
              Editorial Campaign
            </p>
            <h2 className="font-serif text-5xl sm:text-7xl md:text-8xl text-white font-light italic mb-8 drop-shadow-lg leading-[1.1]">
              Winter <br/>Shadows.
            </h2>
            <p className="text-stone-300 text-sm sm:text-base mb-10 font-light leading-relaxed max-w-lg">
              Explore our latest collection shot in the remote highlands. Emphasizing texture, natural tones, and uncompromising warmth for the modern nomad.
            </p>
            <button className="group inline-flex items-center gap-4 bg-white text-stone-900 px-10 py-5 text-[11px] tracking-[0.25em] uppercase font-bold hover:bg-amber-500 hover:text-white transition-all duration-300">
              Explore Lookbook <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </ScrollReveal>
        </div>
      </section>

      {/* ── BRAND PHILOSOPHY ──────────────────────────────────────────── */}
      <section className="bg-stone-100 py-24 lg:py-40">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <ScrollReveal direction="right">
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1489987707023-afc827633c5d?w=1000&q=80" alt="Craftsmanship" className="w-full aspect-[4/5] object-cover rounded-sm shadow-2xl shadow-stone-900/10" />
                <div className="absolute -bottom-10 -right-10 bg-white p-10 shadow-2xl max-w-sm hidden md:block">
                  <div className="flex gap-2 mb-4">
                    <Star size={12} className="fill-amber-500 text-amber-500"/>
                    <Star size={12} className="fill-amber-500 text-amber-500"/>
                    <Star size={12} className="fill-amber-500 text-amber-500"/>
                    <Star size={12} className="fill-amber-500 text-amber-500"/>
                    <Star size={12} className="fill-amber-500 text-amber-500"/>
                  </div>
                  <p className="font-serif text-2xl italic text-stone-900 mb-4 leading-snug">"True sustainability is longevity. Buying pieces that outlast trends."</p>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-stone-400"></span> Head of Design
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="left">
              <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 font-bold mb-6 flex items-center gap-3">
                <Leaf size={14} className="text-green-600" />
                Our Philosophy
              </p>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-7xl text-stone-900 font-light leading-tight mb-8">
                Buy less, <br />
                <span className="italic text-amber-600">choose well.</span>
              </h2>
              <p className="text-base text-stone-600 leading-relaxed mb-12 max-w-md">
                We reject the cycle of fast fashion. Every Stitch piece is meticulously designed with premium, low-impact materials intended to be the last version of that garment you ever need to buy.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                {[
                  { icon: Leaf, label: "100% Organic", desc: "Certified natural fibers across all categories." },
                  { icon: Shield, label: "Ethical Labor", desc: "Fair wages guaranteed in all partner factories." },
                  { icon: Award, label: "Built to Last", desc: "Reinforced stitching and premium hardware." },
                  { icon: Truck, label: "Carbon Neutral", desc: "Offsetting 100% of our global shipping." },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex gap-5 group">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2">{label}</h4>
                      <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a href="/pages/about-us" className="group inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-stone-900 border-b-2 border-stone-900 pb-1 hover:text-amber-600 hover:border-amber-600 transition-colors">
                Read our full story <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── SOCIAL FEED / AS SEEN ON ────────────────────────────────────────── */}
      <section className="py-24 bg-white border-t border-stone-100">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 font-bold mb-4">Community</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-stone-900 font-light italic mb-4">As Seen On You</h2>
            <a href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"} className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-amber-600 transition-colors">
              <Instagram size={14} /> @stitch_studio
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SOCIAL_IMAGES.map((img, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="group relative aspect-square overflow-hidden bg-stone-100 cursor-pointer">
                  <img src={img} alt="Social feed post" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/40 transition-colors duration-300 flex items-center justify-center">
                    <Instagram size={32} className="text-white opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300" />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}