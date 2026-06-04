"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import Footer from "@/components/Footer";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { useProductContext } from "@/lib/context/ProductContext";
import { Product, GetProductsParams } from "@/lib/types/product.types";
import { categories, sortOptions } from "@/lib/data/products";
import { getCategoryLabel } from "@/lib/utils";
import { useCart } from "@/lib/context/CartContext";
import { useToast } from "@/lib/context/ToastContext";
import { useWishlist } from "@/lib/context/WishlistContext";
import { useRouter } from "next/router";
import {
  SlidersHorizontal, X, ChevronDown, ArrowLeft, Grid3X3, LayoutList,
  Search, WifiOff, Sparkles, Check, ShoppingBag, Heart, ZoomIn, 
  ChevronRight, ChevronLeft, Plus, Minus, Info, ArrowUpRight
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

// ============================================================================
// 1. ADVANCED CUSTOM HOOKS
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      const direction = scrollY > lastScrollY ? "down" : "up";
      if (direction !== scrollDirection && (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)) {
        setScrollDirection(direction);
      }
      setLastScrollY(scrollY > 0 ? scrollY : 0);
    };
    window.addEventListener("scroll", updateScrollDirection);
    return () => window.removeEventListener("scroll", updateScrollDirection);
  }, [scrollDirection, lastScrollY]);

  return scrollDirection;
}

function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);
  return mousePosition;
}

// ============================================================================
// 2. STATIC UI DATA & TYPES
// ============================================================================

const GENDER_OPTIONS = [
  { value: "all", label: "Everything", count: 142 },
  { value: "men", label: "Menswear", count: 68 },
  { value: "women", label: "Womenswear", count: 74 },
] as const;

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "OS"];
const COLORS = [
  { name: "Onyx", hex: "#1a1a1a" },
  { name: "Bone", hex: "#e3dac9" },
  { name: "Olive", hex: "#556b2f" },
  { name: "Navy", hex: "#000080" },
  { name: "Rust", hex: "#b7410e" },
  { name: "Stone", hex: "#8b8c89" }
];
const MATERIALS = ["Organic Cotton", "Merino Wool", "Recycled Cashmere", "Linen", "Tencel", "Heavyweight Jersey"];

// ============================================================================
// 3. INLINE PREMIUM COMPONENTS (Bespoke UI)
// ============================================================================

// --- A. Enhanced Product Card ---
const EnhancedProductCard = ({ product, onQuickView, isMobile }: { product: any, onQuickView: (p: any) => void, isMobile: boolean }) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { add } = useCart();
  const toast = useToast();
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();

  // Dynamic images from product gallery
  const productImages = product.images && product.images.length > 0
    ? product.images.map((img: any) => typeof img === 'object' ? img.url : img)
    : [product.image || "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80"];
  
  const images = [...productImages];
  while (images.length < 3) {
    images.push(images[0] || "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80");
  }

  // Dynamic sizes from product
  const rawSizes = product.sizes || (product.variants || []).map((v: any) => v.size?.label || v.size?.value).filter(Boolean);
  const uniqueSizes = [...new Set(rawSizes)] as string[];
  const sizes = uniqueSizes.length > 0 ? uniqueSizes : ['S', 'M', 'L', 'XL'];

  // Dynamic colors from product
  const rawColors = product.colors || (product.variants || []).map((v: any) => v.color).filter(Boolean);
  const uniqueColorsMap = new Map();
  rawColors.forEach((c: any) => {
    const name = typeof c === 'object' ? c.name : c;
    const hex = typeof c === 'object' ? c.hexCode || c.hex : null;
    if (name && !uniqueColorsMap.has(name)) {
      uniqueColorsMap.set(name, { name, hex: hex || '#cccccc' });
    }
  });
  const productColors = Array.from(uniqueColorsMap.values());
  const colors = productColors.length > 0 ? productColors : COLORS.slice(0, 3);
  const extraColors = colors.length > 3 ? colors.length - 3 : 0;

  const wishlisted = inWishlist(product.id || product._id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id || product._id,
      name: product.name,
      price: product.price,
      image: images[0],
    });
    if (wishlisted) {
      toast.info("Removed from Wishlist", `${product.name} removed from saved items.`);
    } else {
      toast.success("Saved to Wishlist", `${product.name} saved to wishlist.`);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    const colorName = colors[0]?.name || "Onyx";
    add({
      id: product.id || product._id,
      name: product.name,
      price: product.price,
      image: images[0],
      size: size,
      color: colorName,
    });
    toast.success("Added to Bag", `${product.name} (${size} / ${colorName}) has been added.`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/product/${product.id || product._id}`);
  };

  return (
    <div 
      className="group flex flex-col relative cursor-pointer"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => { if (!isMobile) { setIsHovered(false); setActiveImage(0); } }}
      onClick={handleCardClick}
    >
      <div className="relative aspect-[3/4] bg-zinc-100 overflow-hidden mb-5">
        <img
          src={images[activeImage]}
          alt={product.name}
          className={`w-full h-full object-cover object-center transition-transform duration-1000 ease-out ${isHovered && !isMobile ? 'scale-105' : 'scale-100'}`}
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {product.isNew && (
            <span className="bg-zinc-900 text-white text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 backdrop-blur-md">
              New Arrival
            </span>
          )}
          {product.stock < 10 && product.stock > 0 && (
            <span className="bg-red-900/90 text-white text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 backdrop-blur-md">
              Low Stock
            </span>
          )}
        </div>

        {/* Quick Add Button - Mobile Only */}
        {isMobile && (
          <button 
            onClick={(e) => handleQuickAdd(e, sizes[0] || "S")}
            className="absolute bottom-3 right-3 h-9 w-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-900 shadow-lg border border-zinc-200/40 active:bg-zinc-900 active:text-white transition-colors z-20"
          >
            <ShoppingBag size={14} />
          </button>
        )}

        {/* Hover Actions Overlay - Desktop Only */}
        {!isMobile && (
          <div className={`absolute inset-0 bg-zinc-900/10 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute top-4 right-4 flex flex-col gap-2 transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 delay-100">
              <button 
                onClick={handleWishlist}
                className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors shadow-lg"
              >
                <Heart size={16} className={wishlisted ? "fill-red-500 text-red-500" : ""} />
              </button>
              <button 
                onClick={() => onQuickView(product)}
                className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors shadow-lg"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Inline Image Pagination */}
            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-200 z-20">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onMouseEnter={() => setActiveImage(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeImage === idx ? 'w-6 bg-zinc-900' : 'w-1.5 bg-zinc-400'}`}
                />
              ))}
            </div>

            {/* Quick Add Sizes */}
            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-150">
              <div className="bg-white/95 backdrop-blur-md p-3 shadow-xl">
                <p className="text-[9px] tracking-[0.2em] uppercase text-zinc-500 font-bold mb-2 text-center">Quick Add Size</p>
                <div className="flex justify-center gap-1.5">
                  {sizes.slice(0, 4).map(size => (
                    <button 
                      key={size}
                      onClick={(e) => handleQuickAdd(e, size)}
                      className="h-8 flex-1 border border-zinc-200 text-xs font-semibold text-zinc-600 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 px-1">
        <div className="flex items-start justify-between gap-4 mb-2">
          <Link 
            href={`/product/${product.id || product._id}`} 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCardClick(e);
            }}
            className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-1"
          >
            {product.name}
          </Link>
          <span className="text-sm font-medium text-zinc-900 tabular-nums">${product.price}</span>
        </div>
        
        <p className="text-xs text-zinc-500 mb-4">{getCategoryLabel(product.category)}</p>
        
        {/* Color Swatches */}
        <div className="flex items-center gap-2 mt-auto">
          {colors.slice(0, 3).map((color, i) => (
            <div key={i} className="h-3.5 w-3.5 rounded-full border border-zinc-200 p-[1px] hover:border-zinc-900 transition-colors cursor-pointer">
              <div className="h-full w-full rounded-full" style={{ backgroundColor: color.hex }} title={color.name} />
            </div>
          ))}
          {extraColors > 0 && (
            <span className="text-[10px] text-zinc-400 ml-1">+{extraColors} color{extraColors !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- B. Quick View Modal ---
const QuickViewModal = ({ product, isOpen, onClose }: { product: any, isOpen: boolean, onClose: () => void }) => {
  const { items, add, updateQty } = useCart();
  const toast = useToast();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Dynamic images from product gallery
  const productImages = product?.images && product.images.length > 0
    ? product.images.map((img: any) => typeof img === 'object' ? img.url : img)
    : [product?.image || "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80"];

  const images = [...productImages];
  while (images.length < 3) {
    images.push(images[0] || "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80");
  }

  // Dynamic sizes from product
  const rawSizes = product?.sizes || (product?.variants || []).map((v: any) => v.size?.label || v.size?.value).filter(Boolean);
  const uniqueSizes = [...new Set(rawSizes)] as string[];
  const sizes = uniqueSizes.length > 0 ? uniqueSizes : ['S', 'M', 'L', 'XL'];

  // Dynamic colors from product
  const rawColors = product?.colors || (product?.variants || []).map((v: any) => v.color).filter(Boolean);
  const uniqueColorsMap = new Map();
  rawColors.forEach((c: any) => {
    const name = typeof c === 'object' ? c.name : c;
    const hex = typeof c === 'object' ? c.hexCode || c.hex : null;
    if (name && !uniqueColorsMap.has(name)) {
      uniqueColorsMap.set(name, { name, hex: hex || '#cccccc' });
    }
  });
  const colors = Array.from(uniqueColorsMap.values());
  const activeColor = colors[0]?.name || "Onyx";

  // Reset modal state when product changes
  useEffect(() => {
    if (product) {
      const pRawSizes = product.sizes || (product.variants || []).map((v: any) => v.size?.label || v.size?.value).filter(Boolean);
      const pUniqueSizes = [...new Set(pRawSizes)] as string[];
      const pSizes = pUniqueSizes.length > 0 ? pUniqueSizes : ['S', 'M', 'L', 'XL'];
      setSelectedSize(pSizes[0] || null);
      setActiveImage(0);
      setQty(1);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleAddToBag = () => {
    if (!selectedSize) {
      toast.error("Size Required", "Please select a size before adding to bag.");
      return;
    }

    const itemData = {
      id: product.id || product._id,
      name: product.name,
      price: product.price,
      image: images[0],
      size: selectedSize,
      color: activeColor,
    };

    const existingItem = items.find(
      (i) => i.id === itemData.id && i.size === selectedSize && i.color === activeColor
    );

    if (existingItem) {
      updateQty(itemData.id, selectedSize, activeColor, existingItem.quantity + qty);
    } else {
      add(itemData);
      if (qty > 1) {
        updateQty(itemData.id, selectedSize, activeColor, qty);
      }
    }

    toast.success("Added to Bag", `${qty}x ${product.name} (${selectedSize} / ${activeColor}) has been added.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[70vh] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Close Btn */}
        <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur-sm rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all shadow-sm">
          <X size={20} />
        </button>

        {/* Gallery Section */}
        <div className="w-full md:w-1/2 bg-zinc-50 flex flex-col h-[50%] md:h-full relative group">
          <div className="flex-1 relative overflow-hidden">
            <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover object-center absolute inset-0" />
            <button className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-md flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm" onClick={() => setActiveImage(prev => prev === 0 ? images.length - 1 : prev - 1)}>
              <ChevronLeft size={20} />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-md flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm" onClick={() => setActiveImage(prev => prev === images.length - 1 ? 0 : prev + 1)}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="h-24 bg-white border-t border-zinc-100 flex p-3 gap-3 overflow-x-auto">
            {images.map((img, idx) => (
              <button key={idx} onClick={() => setActiveImage(idx)} className={`h-full aspect-square relative border-2 transition-all ${activeImage === idx ? 'border-zinc-900' : 'border-transparent hover:border-zinc-300'}`}>
                <img src={img} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 h-[50%] md:h-full overflow-y-auto p-8 lg:p-12 flex flex-col">
          <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-400 font-bold mb-3">{getCategoryLabel(product.category)}</p>
          <h2 className="font-serif text-3xl text-zinc-900 mb-4">{product.name}</h2>
          <p className="text-xl font-medium text-zinc-900 mb-6 tabular-nums">${product.price.toFixed(2)}</p>
          <p className="text-sm text-zinc-600 leading-relaxed mb-8">{product.description || "Thoughtfully designed and crafted from premium organic materials to endure through seasons and trends."}</p>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-900">Select Size</span>
              <button className="text-[10px] underline text-zinc-500 hover:text-zinc-900 transition-colors">Size Guide</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {sizes.map(size => (
                <button key={size} onClick={() => setSelectedSize(size)} className={`py-3 text-xs font-semibold border transition-all ${selectedSize === size ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-900'}`}>
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mb-10">
            <div className="flex items-center border border-zinc-200 w-32">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"><Minus size={14}/></button>
              <input type="text" value={qty} readOnly className="flex-1 w-full text-center text-sm font-semibold text-zinc-900 outline-none" />
              <button onClick={() => setQty(qty + 1)} className="w-10 h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"><Plus size={14}/></button>
            </div>
            <button onClick={handleAddToBag} className="flex-1 bg-zinc-900 text-white flex items-center justify-center gap-2 text-[11px] tracking-[0.2em] uppercase font-bold hover:bg-zinc-800 transition-colors shadow-lg">
              <ShoppingBag size={14} /> Add to Bag
            </button>
          </div>

          <div className="mt-auto border-t border-zinc-100 pt-6">
            <Link href={`/product/${product.id || product._id}`} className="flex items-center justify-between group py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">View Full Details</span>
              <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN PAGE COMPONENT
// ============================================================================

export default function AllProductsPage() {
  const { products, loading, isOffline, fetchProducts, search } = useProductContext();
  const mousePos = useMousePosition();
  const scrollDir = useScrollDirection();

  // Primary State
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeGender, setActiveGender] = useState<"all" | "men" | "women">("all");
  const [sortBy, setSortBy] = useState("featured");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const [pageVisible, setPageVisible] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  // Advanced Filter State
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  // Quick View State
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 380);

  // Initialize visibility
  useEffect(() => {
    const t = setTimeout(() => setPageVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Lock body scroll logic
  useEffect(() => {
    if (isDrawerOpen || quickViewProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isDrawerOpen, quickViewProduct]);

  // Initial Data Fetch
  useEffect(() => {
    const params: GetProductsParams = {
      sortBy: sortBy.includes('price') ? 'price' : (sortBy === 'rating' ? 'rating' : 'createdAt'),
      order: sortBy === 'price-asc' ? 'asc' : 'desc',
    } as any;
    fetchProducts(params);
  }, []); // Run once on mount

  // Complex filtering logic block
  useEffect(() => {
    const baseParams: any = {
      category: activeCategory !== 'All' ? activeCategory.toLowerCase() : undefined,
      gender: activeGender !== 'all' ? activeGender : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 500 ? priceRange[1] : undefined,
      sortBy: sortBy.includes('price') ? 'price' : (sortBy === 'rating' ? 'rating' : 'createdAt'),
      order: sortBy === 'price-asc' ? 'asc' : 'desc',
    };

    if (debouncedSearch.trim()) {
      search(debouncedSearch, baseParams);
    } else {
      fetchProducts(baseParams);
    }
  }, [debouncedSearch, activeCategory, activeGender, priceRange, sortBy, fetchProducts, search]);

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p: any) => {
      const rawSizes = p.sizes || (p.variants || []).map((v: any) => v.size?.label || v.size?.value).filter(Boolean);
      rawSizes.forEach((s: any) => {
        if (typeof s === 'string') sizeSet.add(s);
      });
    });
    const parsedSizes = Array.from(sizeSet);
    const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "OS"];
    parsedSizes.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA > -1 && idxB > -1) return idxA - idxB;
      if (idxA > -1) return -1;
      if (idxB > -1) return 1;
      return a.localeCompare(b);
    });
    return parsedSizes.length > 0 ? parsedSizes : SIZES;
  }, [products]);

  const availableColors = useMemo(() => {
    const colorMap = new Map<string, { name: string; hex: string }>();
    products.forEach((p: any) => {
      const rawColors = p.colors || (p.variants || []).map((v: any) => v.color).filter(Boolean);
      rawColors.forEach((c: any) => {
        const name = typeof c === 'object' ? c.name : c;
        const hex = typeof c === 'object' ? c.hexCode || c.hex : null;
        if (name) {
          colorMap.set(name, { name, hex: hex || '#cccccc' });
        }
      });
    });
    const parsedColors = Array.from(colorMap.values());
    return parsedColors.length > 0 ? parsedColors : COLORS;
  }, [products]);

  const genderCounts = useMemo(() => {
    const all = products.length;
    const men = products.filter((p: any) => p.gender === "men").length;
    const women = products.filter((p: any) => p.gender === "women").length;
    return { all, men, women };
  }, [products]);

  const filtered = useMemo(() => {
    let result = products as Product[];
    
    // Core filtering
    result = result.filter(p => {
      const catMatch = activeCategory === "All" || getCategoryLabel(p.category) === activeCategory;
      const genMatch = activeGender === "all" || (p as any).gender === activeGender || !(p as any).gender;
      const priceMatch = p.price >= priceRange[0] && p.price <= priceRange[1];
      
      // Sizes filter
      let sizeMatch = true;
      if (selectedSizes.length > 0) {
        const pRawSizes = p.sizes || (p.variants || []).map((v: any) => v.size?.label || v.size?.value).filter(Boolean);
        const pSizes = [...new Set(pRawSizes)] as string[];
        sizeMatch = pSizes.some(s => selectedSizes.includes(s));
      }

      // Colors filter
      let colorMatch = true;
      if (selectedColors.length > 0) {
        const pRawColors = p.colors || (p.variants || []).map((v: any) => v.color).filter(Boolean);
        const pColors = pRawColors.map((c: any) => typeof c === 'object' ? c.name : c).filter(Boolean);
        colorMatch = pColors.some(c => selectedColors.includes(c));
      }

      return catMatch && genMatch && priceMatch && sizeMatch && colorMatch;
    });

    return result;
  }, [products, activeCategory, activeGender, priceRange, selectedSizes, selectedColors]);

  const activeFiltersCount = 
    (activeCategory !== "All" ? 1 : 0) + 
    (activeGender !== "all" ? 1 : 0) + 
    (priceRange[1] < 500 || priceRange[0] > 0 ? 1 : 0) +
    selectedSizes.length + selectedColors.length + selectedMaterials.length;

  const resetFilters = () => {
    setActiveCategory("All");
    setActiveGender("all");
    setPriceRange([0, 500]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedMaterials([]);
    setSearchQuery("");
  };

  const toggleArrayItem = (arr: string[], item: string, setFn: (val: string[]) => void) => {
    setFn(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  return (
    <>
      <Head>
        <title>The Archive — Stitch</title>
        <meta name="description" content="Browse the full Stitch collection — premium organic clothing." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#F9F9F8] font-sans selection:bg-zinc-900 selection:text-white relative">
        
        {/* ── Cinematic Parallax Hero ────────────────────────────────────── */}
        <section className="relative bg-zinc-950 overflow-hidden min-h-[55vh] flex items-center justify-center">
          {/* Dynamic Parallax Background Map based on Mouse Position */}
          <div 
            className="absolute inset-0 z-0 transition-transform duration-[2000ms] ease-out opacity-40 mix-blend-luminosity"
            style={{ transform: `translate(${(mousePos.x - window.innerWidth / 2) * -0.01}px, ${(mousePos.y - window.innerHeight / 2) * -0.01}px) scale(1.05)` }}
          >
            <img
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2400&q=85"
              alt="Archive Background"
              className="w-full h-full object-cover object-[center_30%]"
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/10 z-0" />
          
          {/* Atmospheric Orbs */}
          <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-zinc-700/20 rounded-full blur-[140px] mix-blend-screen pointer-events-none animate-pulse" />
          <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] bg-zinc-600/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />

          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 lg:px-12 pt-28 pb-20 flex flex-col items-center text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-[9px] tracking-[0.4em] uppercase text-zinc-400 hover:text-white transition-all duration-300 mb-12 group">
              <ArrowLeft size={12} className="group-hover:-translate-x-1.5 transition-transform duration-300 ease-out" />
              <span className="relative">Return to Entry<span className="absolute bottom-0 left-0 w-full h-px bg-white transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" /></span>
            </Link>

            <div className={`transition-all duration-1000 ease-out flex flex-col items-center ${pageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
              <div className="flex items-center gap-4 mb-8">
                <span className="block h-px w-10 bg-zinc-700" />
                <p className="text-[10px] tracking-[0.6em] uppercase text-zinc-300 font-semibold flex items-center gap-2">
                  <Sparkles size={10} className="text-zinc-500"/> FW25 Master Archive
                </p>
                <span className="block h-px w-10 bg-zinc-700" />
              </div>

              <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] text-white font-light tracking-tighter mb-8 leading-[0.85]">
                The <em className="italic text-zinc-500 mr-4">Complete</em>
                <br /> Wardrobe
              </h1>
              
              <p className="text-zinc-400 text-sm md:text-base font-light tracking-wide max-w-lg leading-relaxed">
                Explore our full spectrum of thoughtfully engineered garments. Built for endurance, designed for life.
              </p>

              {isOffline && (
                <div className="mt-10 flex items-center gap-3 text-red-400 text-[10px] tracking-widest uppercase border border-red-900/40 bg-red-950/20 px-6 py-3 rounded-full backdrop-blur-md">
                  <WifiOff size={12} /> Working in Offline Cache
                </div>
              )}
            </div>
          </div>
          
          {/* Scroll Cue Line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-24 bg-zinc-800 overflow-hidden">
            <div className="w-full h-1/2 bg-zinc-500 animate-[scrollLine_2s_ease-in-out_infinite]" />
          </div>
        </section>

        {/* ── Smart Sticky Action Bar ────────────────────────────────────── */}
        <div 
          className={`sticky z-40 bg-[#F9F9F8]/85 backdrop-blur-2xl border-b border-zinc-200/60 shadow-[0_4px_40px_rgba(0,0,0,0.03)] transition-all duration-500 ${
            scrollDir === 'down' ? '-top-32' : 'top-0'
          }`}
        >
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between py-5 gap-5">
              
              {/* Search Block */}
              <div className="relative flex items-center w-full md:max-w-[32rem] group">
                <div className="absolute inset-0 bg-white rounded-full border border-zinc-200 group-focus-within:border-zinc-900 shadow-sm transition-all duration-300" />
                <div className="relative pl-6 pr-4 py-4 flex items-center w-full">
                  <Search size={16} className="text-zinc-400 group-focus-within:text-zinc-900 transition-colors mr-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search objects, tones, materials..."
                    className="w-full text-xs tracking-wider bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-zinc-900 transition-colors bg-zinc-100 rounded-full p-1.5"><X size={12} /></button>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="relative flex items-center justify-center gap-3 px-6 py-4 rounded-full text-[10px] tracking-[0.2em] uppercase font-bold transition-all duration-300 bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_8px_20px_rgba(0,0,0,0.12)] flex-1 sm:flex-initial"
                >
                  <SlidersHorizontal size={14} />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-900 border-2 border-zinc-900 text-[9px] font-black">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <div className="relative group flex-1 sm:flex-initial">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none w-full pl-6 pr-10 py-4 rounded-full text-[10px] tracking-[0.2em] uppercase font-bold bg-white border border-zinc-200 text-zinc-900 hover:border-zinc-900 transition-all cursor-pointer focus:outline-none shadow-sm"
                  >
                    {sortOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                  <ChevronDown size={12} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-900 pointer-events-none" />
                </div>

                <div className="hidden lg:flex items-center gap-1 bg-white border border-zinc-200 rounded-full p-1.5 shadow-sm">
                  <button onClick={() => setGridCols(3)} className={`p-2.5 rounded-full transition-all duration-300 ${gridCols === 3 ? "bg-zinc-100 text-zinc-900 shadow-inner" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"}`}>
                    <LayoutList size={16} />
                  </button>
                  <button onClick={() => setGridCols(4)} className={`p-2.5 rounded-full transition-all duration-300 ${gridCols === 4 ? "bg-zinc-100 text-zinc-900 shadow-inner" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"}`}>
                    <Grid3X3 size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Active Filters Ribbon */}
            {activeFiltersCount > 0 && (
               <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-hide">
                 <span className="text-[9px] tracking-widest uppercase font-bold text-zinc-400 mr-2 shrink-0">Active:</span>
                 {activeCategory !== "All" && (
                   <span className="shrink-0 flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-full text-[10px] font-semibold text-zinc-700 shadow-sm"><span className="text-zinc-400">Cat:</span> {activeCategory} <button onClick={()=>setActiveCategory('All')}><X size={10} className="hover:text-red-500"/></button></span>
                 )}
                 {activeGender !== "all" && (
                   <span className="shrink-0 flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-full text-[10px] font-semibold text-zinc-700 shadow-sm"><span className="text-zinc-400">Dept:</span> {activeGender} <button onClick={()=>setActiveGender('all')}><X size={10} className="hover:text-red-500"/></button></span>
                 )}
                 {selectedColors.map(c => (
                   <span key={c} className="shrink-0 flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-full text-[10px] font-semibold text-zinc-700 shadow-sm"><span className="text-zinc-400">Color:</span> {c} <button onClick={()=>toggleArrayItem(selectedColors, c, setSelectedColors)}><X size={10} className="hover:text-red-500"/></button></span>
                 ))}
                 <button onClick={resetFilters} className="shrink-0 text-[9px] uppercase tracking-widest font-bold text-red-500 hover:text-red-700 ml-2">Clear All</button>
               </div>
            )}
          </div>
        </div>

        {/* ── Main Product Grid Area ─────────────────────────────────────── */}
        <div className="flex-1 max-w-[1440px] mx-auto w-full px-6 lg:px-12 py-16">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
            <h2 className="font-serif text-3xl md:text-4xl text-zinc-900 italic">Curated Results</h2>
            <p className="text-xs text-zinc-500 tracking-widest font-medium uppercase tabular-nums">
              {loading ? <span className="animate-pulse">Curating...</span> : `${filtered.length} Objects Displayed`}
            </p>
          </div>

          {loading ? (
            <ProductSkeletonGrid count={gridCols === 4 ? 8 : 6} cols={gridCols} />
          ) : filtered.length > 0 ? (
            <ScrollReveal direction="up">
              <div className={`grid gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-16 transition-all duration-700 ease-in-out ${gridCols === 4 ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3"}`}>
                {filtered.map((product) => (
                  <EnhancedProductCard 
                    key={product.id || (product as any)._id} 
                    product={product} 
                    onQuickView={setQuickViewProduct}
                    isMobile={isMobile}
                  />
                ))}
              </div>
              
              {/* Pagination Mock */}
              <div className="mt-24 flex justify-center">
                <button className="border border-zinc-300 text-zinc-900 px-12 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all duration-300 shadow-sm hover:shadow-xl">
                  Load More Objects
                </button>
              </div>
            </ScrollReveal>
          ) : (
            // Empty State
            <div className="py-40 flex flex-col items-center text-center bg-white rounded-[3rem] border border-zinc-100 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="h-24 w-24 bg-zinc-50 rounded-full flex items-center justify-center mb-10 relative shadow-inner">
                <Info size={32} className="text-zinc-300" />
              </div>
              <p className="font-serif text-5xl text-zinc-900 italic mb-6 relative">Zero Matches</p>
              <p className="text-base text-zinc-500 tracking-wide mb-12 max-w-lg leading-relaxed relative">
                Your highly specific curation returned zero objects from the archive. We suggest broadening your filter parameters.
              </p>
              <button onClick={resetFilters} className="relative inline-flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase font-bold text-white bg-zinc-900 px-12 py-5 rounded-full hover:bg-zinc-800 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1">
                <X size={14} /> Reset Curation
              </button>
            </div>
          )}
        </div>

        {/* ── Editorial Newsletter Block ─────────────────────────────────── */}
        <section className="bg-zinc-900 py-24 lg:py-32 border-t border-zinc-800">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-6 flex items-center gap-3">
                  <span className="block w-8 h-px bg-zinc-700" /> Dispatch
                </p>
                <h3 className="font-serif text-5xl md:text-6xl text-white font-light tracking-tight mb-8">
                  Join the <em className="italic text-zinc-400">Syndicate</em>
                </h3>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-md font-light">
                  Receive early access to new collections, exclusive archive sales, and editorial musings on enduring design.
                </p>
              </div>
              <div className="relative">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input type="email" placeholder="Email Address" className="w-full bg-zinc-800/50 border border-zinc-700 text-white px-8 py-5 focus:outline-none focus:border-white transition-colors" />
                  <button className="bg-white text-zinc-900 px-10 py-5 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors whitespace-nowrap shadow-lg">
                    Subscribe
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-6 tracking-wide">
                  By subscribing, you agree to our Terms of Service and Privacy Policy. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer hideNewsletter={true} />

        {/* ── Multi-Select Filter Drawer (Bespoke) ─────────────────────── */}
        <div className={`fixed inset-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isDrawerOpen ? "visible" : "invisible"}`}>
          <div className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity duration-700 ${isDrawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsDrawerOpen(false)} />
          
          <div className={`absolute top-0 right-0 h-full w-full max-w-[480px] bg-white shadow-2xl transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-7 border-b border-zinc-100 bg-white/90 backdrop-blur-xl sticky top-0 z-10">
              <div>
                <h3 className="font-serif text-3xl text-zinc-900 italic mb-1">Curation</h3>
                <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 font-bold">{filtered.length} Objects Match</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="h-12 w-12 flex items-center justify-center bg-zinc-50 text-zinc-500 rounded-full hover:text-zinc-900 hover:bg-zinc-100 transition-colors shadow-inner">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-10 space-y-14">
              
              {/* Department Block */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-900 font-bold mb-6">Department</p>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "all" as const, label: "Everything", count: genderCounts.all },
                    { value: "men" as const, label: "Menswear", count: genderCounts.men },
                    { value: "women" as const, label: "Womenswear", count: genderCounts.women },
                  ].map((g) => (
                    <button key={g.value} onClick={() => setActiveGender(g.value)} className={`group flex items-center justify-between p-4 border rounded-xl transition-all ${activeGender === g.value ? "border-zinc-900 bg-zinc-900 text-white shadow-lg" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"}`}>
                      <span className="text-sm font-semibold tracking-wide">{g.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activeGender === g.value ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"}`}>{g.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Silhouettes */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-900 font-bold mb-6">Silhouettes (Category)</p>
                <div className="flex flex-wrap gap-3">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-3 rounded-full text-xs tracking-wider font-semibold border transition-all duration-300 ${activeCategory === cat ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-900 font-bold mb-6 flex items-center justify-between">
                  Tones
                  {selectedColors.length > 0 && <button onClick={()=>setSelectedColors([])} className="text-zinc-400 hover:text-red-500 lowercase underline text-[9px]">clear</button>}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {availableColors.map(color => {
                    const isActive = selectedColors.includes(color.name);
                    return (
                      <button key={color.name} onClick={() => toggleArrayItem(selectedColors, color.name, setSelectedColors)} className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${isActive ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 hover:border-zinc-300'}`}>
                        <div className="h-5 w-5 rounded-full border border-zinc-200 shadow-inner" style={{ backgroundColor: color.hex }} />
                        <span className={`text-xs font-medium ${isActive ? 'text-zinc-900' : 'text-zinc-500'}`}>{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-900 font-bold mb-6 flex items-center justify-between">
                  Measurements
                  {selectedSizes.length > 0 && <button onClick={()=>setSelectedSizes([])} className="text-zinc-400 hover:text-red-500 lowercase underline text-[9px]">clear</button>}
                </p>
                <div className="flex flex-wrap gap-3">
                  {availableSizes.map(size => (
                    <button key={size} onClick={() => toggleArrayItem(selectedSizes, size, setSelectedSizes)} className={`h-12 w-12 flex items-center justify-center rounded-xl text-xs font-bold border transition-all ${selectedSizes.includes(size) ? 'border-zinc-900 bg-zinc-900 text-white shadow-md' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Limits */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-900 font-bold">Investment Limit</p>
                  <p className="text-sm font-black text-zinc-900 tabular-nums">${priceRange[1]}.00</p>
                </div>
                <div className="relative pt-2 pb-6">
                  <div className="absolute top-1/2 left-0 w-full h-1.5 bg-zinc-100 rounded-full -translate-y-1/2" />
                  <div className="absolute top-1/2 left-0 h-1.5 bg-zinc-900 rounded-full -translate-y-1/2 transition-all duration-75" style={{ width: `${(priceRange[1] / 500) * 100}%` }} />
                  <input type="range" min={0} max={500} step={10} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} className="w-full relative z-10 h-8 opacity-0 cursor-pointer" />
                  <div className="absolute top-1/2 w-6 h-6 bg-white border-[3px] border-zinc-900 rounded-full -translate-y-1/2 pointer-events-none shadow-lg transition-all duration-75" style={{ left: `calc(${(priceRange[1] / 500) * 100}% - 12px)` }} />
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-6 border-t border-zinc-100 bg-white/90 backdrop-blur-xl flex gap-4">
              <button onClick={resetFilters} className="flex-1 py-5 text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-900 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
                Reset
              </button>
              <button onClick={() => setIsDrawerOpen(false)} className="flex-[2] py-5 text-[10px] tracking-[0.2em] uppercase font-bold text-white bg-zinc-900 rounded-full hover:bg-zinc-800 shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                View {filtered.length} Results <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick View Modal Portal ────────────────────────────────────── */}
        <QuickViewModal 
          product={quickViewProduct} 
          isOpen={!!quickViewProduct} 
          onClose={() => setQuickViewProduct(null)} 
        />

      </div>
    </>
  );
}

// Ensure you have ArrowRight from lucide-react if needed, or replace it.
import { ArrowRight } from "lucide-react";