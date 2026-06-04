"use client";
// src/components/CartDrawer.tsx

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  X, Plus, Minus, ShoppingBag, ArrowRight,
  Truck, Gift, Sparkles, Tag,
} from "lucide-react";
import { useCart } from "@/lib/context/CartContext";
import { getColorLabel, getSizeLabel } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";

import { useConfig } from "@/lib/context/ConfigContext";

// use shared label helpers from src/lib/utils.ts

const upsells = [
  {
    id: "canvas-cap",
    name: "Canvas Cap",
    price: 48,
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=200&q=70",
  },
  {
    id: "ribbed-longsleeve",
    name: "Ribbed Longsleeve",
    price: 88,
    image: "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?w=200&q=70",
  },
];

// ── Reusable quantity stepper ──────────────────────────────────────────────
function QtyButton({
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="h-8 w-8 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all active:scale-90 rounded-sm"
    >
      {children}
    </button>
  );
}

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, remove, updateQty, total, count, add, clear } = useCart();
  const { settings } = useConfig();
  
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const FREE_SHIPPING_THRESHOLD = settings?.shipping?.freeShippingAbove || 120;

  const toFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
  const discount = promoApplied ? total * 0.1 : 0;
  const finalTotal = total - discount;

  // Lock body scroll when open (overflow-x-only — drawer scroll still works)
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (isOpen) {
      html.style.overflowX = "hidden";
      body.style.overflowX = "hidden";
    } else {
      html.style.overflowX = "";
      body.style.overflowX = "";
    }
    return () => {
      html.style.overflowX = "";
      body.style.overflowX = "";
    };
  }, [isOpen]);

  const applyPromo = useCallback(() => {
    if (promoCode.trim().toLowerCase() === "stitch10") {
      setPromoApplied(true);
      setPromoError(false);
    } else {
      setPromoError(true);
      setTimeout(() => setPromoError(false), 2000);
    }
  }, [promoCode]);

  const clearPromo = useCallback(() => {
    setPromoApplied(false);
    setPromoCode("");
    setPromoError(false);
  }, []);

  // Variants
  const drawerVariants: any = {
    hidden: { x: "100%", opacity: 0.8 },
    visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 36 } },
    exit: { x: "100%", opacity: 0, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, x: 40, filter: "blur(4px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 26 } },
    exit: { opacity: 0, x: -30, filter: "blur(3px)", transition: { duration: 0.2 } },
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
            aria-label="Close cart"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-sm bg-stone-50 flex flex-col shadow-2xl h-screen max-h-screen"
            style={{ maxWidth: 448 }}
          >
            {/* ── Header ────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={15} strokeWidth={1.5} className="text-stone-600" />
                <span className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-900">
                  Your Bag
                </span>
                <AnimatePresence mode="wait">
                  {count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className="text-[11px] text-stone-400 ml-0.5"
                    >
                      ({count} {count === 1 ? "item" : "items"})
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all active:scale-90"
                aria-label="Close cart"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            {/* ── Free shipping bar ─────────────────────────────── */}
            <AnimatePresence>
              {count > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <div className="px-6 py-3 bg-stone-100 border-b border-stone-200">
                    {toFreeShipping > 0 ? (
                      <>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Truck size={11} className="text-stone-500" />
                          <p className="text-[10px] text-stone-600">
                            Add{" "}
                            <span className="font-semibold">₹{toFreeShipping.toFixed(2)}</span>{" "}
                            more for free shipping
                          </p>
                        </div>
                        <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-stone-900 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5"
                      >
                        <Sparkles size={11} className="text-green-600" />
                        <p className="text-[10px] text-green-700 font-semibold">
                          Free shipping unlocked — you've earned it!
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Items (scrollable) ───────────────────────────── */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 text-center px-6"
                >
                  <div className="h-16 w-16 bg-stone-100 rounded-full flex items-center justify-center">
                    <ShoppingBag size={28} strokeWidth={1} className="text-stone-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Your bag is empty</p>
                    <p className="text-xs text-stone-400 mt-1">Add something you love</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-xs tracking-widest uppercase border-b border-stone-900 pb-0.5 hover:text-stone-500 hover:border-stone-500 transition-colors mt-2"
                  >
                    Continue Shopping
                  </button>
                </motion.div>
              ) : (
                <div className="px-6 py-2">
                  <motion.div
                    className="divide-y divide-stone-100"
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
                  >
                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.div
                          key={`${item.id}-${item.size}-${item.color}`}
                          layout
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="py-5 flex gap-4"
                        >
                          {/* Image */}
                          <Link
                            href={`/product/${item.id}`}
                            onClick={() => setIsOpen(false)}
                            className="flex-shrink-0 relative overflow-hidden bg-stone-100 w-20 h-28 block group"
                            aria-label={`View ${item.name}`}
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </Link>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/product/${item.id}`}
                                onClick={() => setIsOpen(false)}
                                className="text-[12px] font-semibold text-stone-900 hover:text-stone-500 transition-colors leading-snug line-clamp-2"
                              >
                                {item.name}
                              </Link>
                              <button
                                onClick={() => remove(item.id, item.size, item.color)}
                                className="flex-shrink-0 h-6 w-6 flex items-center justify-center text-stone-300 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-all active:scale-90 mt-0.5"
                                aria-label={`Remove ${item.name}`}
                              >
                                <X size={12} />
                              </button>
                            </div>

                            <p className="text-[10px] text-stone-400 mt-1 tracking-wide">
                              {getSizeLabel(item.size)} · {getColorLabel(item.color)}
                            </p>

                            <div className="flex items-center justify-between mt-3">
                              {/* Quantity stepper */}
                              <div className="flex items-center border border-stone-200 rounded-sm">
                                <QtyButton
                                  aria-label="Decrease quantity"
                                  onClick={() => updateQty(item.id, item.size, item.color, item.quantity - 1)}
                                >
                                  <Minus size={10} />
                                </QtyButton>
                                <motion.span
                                  key={item.quantity}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-xs font-semibold w-7 text-center text-stone-900 select-none"
                                >
                                  {item.quantity}
                                </motion.span>
                                <QtyButton
                                  aria-label="Increase quantity"
                                  onClick={() => updateQty(item.id, item.size, item.color, item.quantity + 1)}
                                >
                                  <Plus size={10} />
                                </QtyButton>
                              </div>

                              {/* Line price */}
                              <motion.p
                                key={item.quantity}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-xs font-semibold text-stone-900"
                              >
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </motion.p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {/* You may also like */}
                  <div className="py-5 border-t border-stone-100">
                    <p className="text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold mb-3">
                      You may also like
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x scroll-smooth">
                      {upsells.map((u) => (
                        <div key={u.id} className="flex-shrink-0 w-28 snap-start group">
                          <div className="aspect-square bg-stone-100 overflow-hidden mb-2 relative">
                            <img
                              src={u.image}
                              alt={u.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <p className="text-[10px] font-semibold text-stone-900 leading-tight">{u.name}</p>
                          <p className="text-[10px] text-stone-500">₹{u.price}</p>
                          <button
                            onClick={() =>
                              add({
                                id: u.id,
                                name: u.name,
                                price: u.price,
                                image: u.image,
                                size: "M",
                                color: "Default",
                              })
                            }
                            className="mt-2 w-full text-[9px] tracking-widest uppercase border border-stone-200 py-1.5 hover:bg-stone-900 hover:text-stone-50 hover:border-stone-900 transition-all duration-200 text-stone-600 active:scale-95"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────────── */}
            <AnimatePresence>
              {items.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-5 border-t border-stone-100 space-y-3.5 flex-shrink-0 bg-stone-50 relative z-10"
                >
                  {/* Promo code */}
                  {!promoApplied ? (
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          placeholder="Promo code"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoError(false);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                          className={`w-full pl-8 pr-3 py-2.5 text-xs border bg-transparent placeholder:text-stone-400 focus:outline-none transition-colors ${
                            promoError
                              ? "border-red-300 focus:border-red-400"
                              : "border-stone-200 focus:border-stone-500"
                          }`}
                          aria-label="Promo code input"
                        />
                        <AnimatePresence>
                          {promoError && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute -bottom-4 left-0 text-[9px] text-red-500"
                            >
                              Invalid code
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                      <button
                        onClick={applyPromo}
                        className="px-3.5 py-2.5 border border-stone-200 text-[10px] tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-all active:scale-95"
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2.5 rounded-sm"
                    >
                      <div className="flex items-center gap-1.5">
                        <Gift size={11} className="text-green-600" />
                        <p className="text-[10px] text-green-700 font-semibold">
                          STITCH10 — 10% off applied!
                        </p>
                      </div>
                      <button
                        onClick={clearPromo}
                        className="text-green-500 hover:text-green-800 transition-colors"
                        aria-label="Remove promo code"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}

                  {/* Order summary */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-stone-500">Subtotal</span>
                      <span className="text-xs font-semibold text-stone-900">₹{total.toFixed(2)}</span>
                    </div>
                    <AnimatePresence>
                      {promoApplied && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex justify-between items-center overflow-hidden"
                        >
                          <span className="text-[11px] text-green-600">Discount (10%)</span>
                          <span className="text-xs font-semibold text-green-600">
                            -₹{discount.toFixed(2)}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-stone-500">Shipping</span>
                      <span className="text-[11px] text-stone-500">
                        {total >= FREE_SHIPPING_THRESHOLD ? (
                          <span className="text-green-600 font-semibold">Free</span>
                        ) : (
                          "Calculated at checkout"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-stone-100">
                      <span className="text-xs tracking-widest uppercase text-stone-500 font-semibold">Total</span>
                      <motion.span
                        key={finalTotal.toFixed(2)}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-bold text-stone-900"
                      >
                        ₹{finalTotal.toFixed(2)}
                      </motion.span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/checkout"
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center justify-center gap-2 w-full bg-stone-900 text-stone-50 py-4 text-[11px] tracking-[0.2em] uppercase font-semibold hover:bg-stone-800 transition-colors active:scale-[0.99]"
                  >
                    Checkout
                    <ArrowRight
                      size={13}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </Link>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 text-center text-[10px] tracking-widest uppercase text-stone-400 hover:text-stone-700 transition-colors py-2 border border-stone-200 hover:border-stone-400 active:scale-95"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="flex-1 text-center text-[10px] tracking-widest uppercase text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors py-2 border border-red-200 hover:border-red-400 active:scale-95"
                    >
                      Clear Cart
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Clear confirm sheet ─────────────────────────── */}
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-end"
                  style={{ background: "rgba(28,25,23,0.45)" }}
                >
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 340, damping: 34 }}
                    className="w-full bg-white rounded-t-2xl px-6 pt-6 pb-8"
                  >
                    <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-6" />
                    <p className="text-sm font-semibold text-stone-900 mb-1">Clear your cart?</p>
                    <p className="text-xs text-stone-500 mb-6">
                      All items will be removed. This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 py-3 border border-stone-200 text-stone-900 text-[11px] tracking-[0.15em] uppercase font-semibold hover:bg-stone-50 transition-colors active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          clear();
                          setShowClearConfirm(false);
                          setPromoApplied(false);
                          setPromoCode("");
                        }}
                        className="flex-1 py-3 bg-red-600 text-white text-[11px] tracking-[0.15em] uppercase font-semibold hover:bg-red-700 transition-colors active:scale-95"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}