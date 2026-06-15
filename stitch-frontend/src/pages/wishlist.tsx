"use client";
// src/app/wishlist/page.tsx

import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import { useWishlist } from "@/lib/context/WishlistContext";
import { useCart } from "@/lib/context/CartContext";
import { formatCurrency, getValidImage } from "@/lib/utils";
import { useToast } from "@/lib/context/ToastContext";
import { useProfile } from "@/lib/context/ProfileContext";
import { Heart, ShoppingBag, ArrowRight, X } from "lucide-react";
import Loading from "@/components/Loading";

export default function WishlistPage() {
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth } = useProfile();
  const { items, remove } = useWishlist();
  const { add, setIsOpen } = useCart();
  const toast = useToast();

  React.useEffect(() => {
    if (!isLoadingAuth && !isLoggedIn) {
      router.replace("/login?next=/wishlist");
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  if (isLoadingAuth || !isLoggedIn) {
    return <Loading />;
  }

  const handleMoveToCart = (item: typeof items[0]) => {
    add({ ...item, size: "M", color: "Default" });
    remove(item.id);
    setIsOpen(true);
    toast.success("Moved to Bag", `${item.name} moved to your shopping bag.`);
  };

  const getWishlistProductId = (item: (typeof items)[number]) => {
    if (typeof item.productId === "string" && item.productId) return item.productId;
    if (typeof item.id === "string" && item.id) return item.id;
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-12">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">Your</p>
            <h1 className="font-display text-5xl text-stone-900 font-light italic">Wishlist</h1>
            {items.length > 0 && (
              <p className="text-sm text-stone-400 mt-2">{items.length} {items.length === 1 ? "item" : "items"} saved</p>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-24">
              <div className="h-20 w-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6">
                <Heart size={32} strokeWidth={1} className="text-stone-300" />
              </div>
              <h2 className="font-display text-3xl text-stone-900 font-light italic mb-3">
                Nothing saved yet
              </h2>
              <p className="text-sm text-stone-400 mb-8 max-w-sm mx-auto">
                Tap the heart on any product to save it here for later.
              </p>
              <Link
                href="/allproducts"
                className="inline-flex items-center gap-2 bg-stone-900 text-stone-50 px-8 py-4 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-stone-800 transition-colors"
              >
                Browse Products <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                {items.map((item) => (
                  <div key={item.id} className="group relative flex flex-col">
                    <Link href={`/product/${item.slug || getWishlistProductId(item)}`} className="block relative bg-stone-100 aspect-[3/4] overflow-hidden">
                      {item.image ? (
                        <img loading="lazy" decoding="async"
                          src={getValidImage(item.image)}
                          alt={item.name}
                          className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300 text-[10px] tracking-[0.25em] uppercase">
                          No Image
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); remove(item.id); toast.info("Removed from Wishlist", `${item.name} removed.`); }}
                        className="absolute top-3 right-3 h-8 w-8 bg-stone-50 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label={`Remove ${item.name} from wishlist`}
                      >
                        <X size={14} />
                      </button>
                    </Link>
                    <div className="mt-3">
                      <Link href={`/product/${item.slug || getWishlistProductId(item)}`}>
                        <h3 className="text-xs font-medium text-stone-900 hover:text-stone-500 transition-colors">{item.name}</h3>
                      </Link>
                      <p className="text-xs text-stone-500 mt-0.5">₹{item.price}</p>
                      <button
                        onClick={() => handleMoveToCart(item)}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border border-stone-200 text-[10px] tracking-widest uppercase font-medium text-stone-700 hover:bg-stone-900 hover:text-stone-50 hover:border-stone-900 transition-colors"
                      >
                        <ShoppingBag size={12} strokeWidth={1.5} /> Add to Bag
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-stone-100 flex justify-center">
                <Link
                  href="/allproducts"
                  className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-stone-500 border-b border-stone-300 pb-0.5 hover:text-stone-900 hover:border-stone-900 transition-colors"
                >
                  Continue Shopping <ArrowRight size={12} />
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}