"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCart } from "@/lib/context/CartContext";
import { useToast } from "@/lib/context/ToastContext";
import { useWishlist } from "@/lib/context/WishlistContext";
import { getCategoryLabel, getValidImages } from "@/lib/utils";
import { Product } from "@/lib/types/product.types";
import { 
  Heart, ZoomIn, ShoppingBag, X, ChevronLeft, ChevronRight, Minus, Plus, ArrowUpRight 
} from "lucide-react";

// --- constants ---
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "OS"];
const COLORS = [
  { name: "Onyx", hex: "#1a1a1a" },
  { name: "Bone", hex: "#e3dac9" },
  { name: "Olive", hex: "#556b2f" },
  { name: "Navy", hex: "#000080" },
  { name: "Rust", hex: "#b7410e" },
  { name: "Stone", hex: "#8b8c89" }
];

interface ProductCardProps {
  product: any;
}

// --- B. Quick View Modal ---
const QuickViewModal = ({ product, isOpen, onClose }: { product: any, isOpen: boolean, onClose: () => void }) => {
  const { items, add, updateQty } = useCart();
  const toast = useToast();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Dynamic images from product gallery
  const productImages = getValidImages(product);

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
      <div className="relative w-full max-w-5xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[70vh] animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Btn */}
        <button aria-label="Close"  onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur-sm rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all shadow-sm">
          <X size={20} />
        </button>

        {/* Gallery Section */}
        <div className="w-full md:w-1/2 bg-zinc-50 flex flex-col h-[50%] md:h-full relative group">
          <div className="flex-1 relative overflow-hidden">
            <img loading="lazy" decoding="async" src={images[activeImage]} alt={product.name} className="w-full h-full object-cover object-center absolute inset-0" />
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
                <img loading="lazy" decoding="async" src={img} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 h-[50%] md:h-full overflow-y-auto p-8 lg:p-12 flex flex-col">
          <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-400 font-bold mb-3">{getCategoryLabel(product.category)}</p>
          <h2 className="font-serif text-3xl text-zinc-900 mb-4">{product.name}</h2>
          <p className="text-xl font-medium text-zinc-900 mb-6 tabular-nums">₹{product.price.toFixed(2)}</p>
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
            <Link href={`/product/${product.slug || product.id || product._id}`} className="flex items-center justify-between group py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">View Full Details</span>
              <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- A. Main Product Card Component ---
function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showQuickView, setShowQuickView] = useState(false);

  const { add } = useCart();
  const toast = useToast();
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Dynamic images from product gallery
  const productImages = getValidImages(product);
  
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
      slug: product.slug,
    });
    toast.success("Added to Bag", `${product.name} (${size} / ${colorName}) has been added.`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/product/${product.slug || product.id || product._id}`);
  };

  return (
    <>
      <div 
        className="group flex flex-col relative cursor-pointer"
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => { if (!isMobile) { setIsHovered(false); setActiveImage(0); } }}
        onClick={handleCardClick}
      >
        <div className="relative aspect-[3/4] bg-zinc-100 overflow-hidden mb-5">
          <img loading="lazy" decoding="async"
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
                <button aria-label="Add to Wishlist"  
                  onClick={handleWishlist}
                  className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors shadow-lg"
                >
                  <Heart size={16} className={wishlisted ? "fill-red-500 text-red-500" : ""} />
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowQuickView(true);
                  }}
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
              href={`/product/${product.slug || product.id || product._id}`} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardClick(e);
              }}
              className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-1"
            >
              {product.name}
            </Link>
            <span className="text-sm font-medium text-zinc-900 tabular-nums">₹{product.price}</span>
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

      {/* Inline Quick View Modal */}
      <QuickViewModal 
        product={product} 
        isOpen={showQuickView} 
        onClose={() => setShowQuickView(false)} 
      />
    </>
  );
}

export default memo(ProductCard);