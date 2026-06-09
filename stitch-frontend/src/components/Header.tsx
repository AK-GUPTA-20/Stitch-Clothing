"use client";
// src/components/Header.tsx

import React, {
  useState, useEffect, useRef, useCallback, memo,
} from "react";
import Link from "next/link";
import {
  ShoppingBag, Search, X, Menu, ChevronDown, ArrowRight,
  Heart, User, MapPin, Globe, ChevronRight, Package,
  Settings, LogOut, Crown, Gift, Truck, Phone,
  TrendingUp, Clock, Flame, Shield,
} from "lucide-react";
import { useCart } from "@/lib/context/CartContext";
import { useProfile } from "@/lib/context/ProfileContext";
import { useWishlist } from "@/lib/context/WishlistContext";
import { useConfig } from "@/lib/context/ConfigContext";
import { products } from "@/lib/data/products";
import CartDrawer from "./CartDrawer";
import { getCategoryLabel } from '@/lib/utils';
const menMega = {
  sections: [
    {
      heading: "Clothing",
      links: [
        { label: "New In", href: "/#shop", badge: "New" },
        { label: "Hoodies & Sweatshirts", href: "/#shop" },
        { label: "T-Shirts & Tops", href: "/#shop" },
        { label: "Shirts", href: "/#shop" },
        { label: "Jackets & Coats", href: "/#shop" },
        { label: "Trousers & Chinos", href: "/#shop" },
        { label: "Shorts", href: "/#shop" },
        { label: "Knitwear", href: "/#shop" },
        { label: "Suits & Blazers", href: "/#shop" },
      ],
    },
    {
      heading: "Footwear",
      links: [
        { label: "Trainers", href: "/#shop" },
        { label: "Boots", href: "/#shop" },
        { label: "Loafers & Dress", href: "/#shop" },
        { label: "Sandals", href: "/#shop" },
      ],
    },
    {
      heading: "Accessories",
      links: [
        { label: "Bags & Backpacks", href: "/#shop" },
        { label: "Hats & Caps", href: "/#shop" },
        { label: "Belts", href: "/#shop" },
        { label: "Watches", href: "/#shop" },
        { label: "Sunglasses", href: "/#shop" },
        { label: "Jewellery", href: "/#shop" },
      ],
    },
  ],
  featured: [
    {
      label: "SS25 Drop",
      sublabel: "New season, new chapter",
      img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      href: "/#shop",
    },
    {
      label: "The Essentials",
      sublabel: "Wardrobe foundations",
      img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
      href: "/#shop",
    },
  ],
};

const womenMega = {
  sections: [
    {
      heading: "Clothing",
      links: [
        { label: "New In", href: "/#shop", badge: "New" },
        { label: "Dresses & Jumpsuits", href: "/#shop" },
        { label: "Tops & Blouses", href: "/#shop" },
        { label: "Knitwear & Sweatshirts", href: "/#shop" },
        { label: "Jeans & Trousers", href: "/#shop" },
        { label: "Skirts", href: "/#shop" },
        { label: "Jackets & Coats", href: "/#shop" },
        { label: "Activewear", href: "/#shop" },
        { label: "Lingerie & Nightwear", href: "/#shop" },
      ],
    },
    {
      heading: "Footwear",
      links: [
        { label: "Heels & Pumps", href: "/#shop" },
        { label: "Trainers", href: "/#shop" },
        { label: "Boots", href: "/#shop" },
        { label: "Sandals & Flats", href: "/#shop" },
      ],
    },
    {
      heading: "Accessories",
      links: [
        { label: "Handbags & Clutches", href: "/#shop" },
        { label: "Jewellery", href: "/#shop" },
        { label: "Scarves & Wraps", href: "/#shop" },
        { label: "Sunglasses", href: "/#shop" },
        { label: "Hats & Hair", href: "/#shop" },
        { label: "Belts", href: "/#shop" },
      ],
    },
  ],
  featured: [
    {
      label: "The Edit",
      sublabel: "Curated women's looks",
      img: "https://images.unsplash.com/photo-1544923246-77307dd654cb?w=400&q=80",
      href: "/#shop",
    },
    {
      label: "Summer Ready",
      sublabel: "Light, breezy, perfect",
      img: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80",
      href: "/#shop",
    },
  ],
};

const navLinks = [
  { label: "Men", href: "/#shop", mega: menMega },
  { label: "Women", href: "/#shop", mega: womenMega },
  { label: "New In", href: "/#shop", badge: "🔥" },
  { label: "All Products", href: "/allproducts" },
  { label: "Sale", href: "/#shop", badge: "Up to 50% off", badgeStyle: "sale" },
  { label: "Lookbook", href: "/lookbook", badge: "✨" },
  { label: "Customize 3D", href: "/customize", badge: "NEW" },
];

const announcements = [
  "✨ Free shipping on orders over ₹120 — Use code STITCH10 for 10% off",
  "✨ SS25 collection now live — shop before it sells out",
  "🔄 Free returns within 30 days · No questions asked",
  "🌿 100% organic materials · B Corp certified",
];

const trendingSearches = ["Linen Shirt", "Wide Leg Trousers", "Overshirt", "Essential Hoodie", "Cargo Pants"];
const recentSearches = ["White Tee", "Wool Jacket", "New Arrivals"];
const quickCategories = [
  { label: "Men", icon: "👔" },
  { label: "Women", icon: "👗" },
  { label: "New In", icon: "✨" },
  { label: "Sale", icon: "🏷️" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Top utility bar
// ─────────────────────────────────────────────────────────────────────────────

const TopUtilityBar = memo(function TopUtilityBar() {
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setAnnouncementIdx((i) => (i + 1) % announcements.length),
      4500
    );
    return () => clearInterval(id);
  }, []);



  return (
    <div className="bg-stone-900 text-stone-50 overflow-hidden flex items-center justify-between px-4 lg:px-8 h-[var(--h-utility)]">
      {/* Left: locale / currency */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-1 text-[10px] text-stone-400 tracking-wide">
          <Globe size={11} />
          <span>IN / EN</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-stone-400 tracking-wide">
          <span>INR ₹</span>
        </div>
      </div>

      {/* Centre: rotating announcements */}
      <div className="flex-1 relative h-full flex items-center justify-center overflow-hidden">
        {announcements.map((msg, i) => (
          <p
            key={i}
            className={`absolute text-[9px] sm:text-[10px] md:text-[11px] px-2 w-full overflow-hidden tracking-widest sm:tracking-[0.18em] uppercase font-medium text-center transition-all duration-500 whitespace-nowrap ${
              i === announcementIdx
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            {msg}
          </p>
        ))}
      </div>

      {/* Right: utility links */}
      <div className="hidden md:flex items-center gap-4">
        <Link
          href="/orders"
          className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-200 transition-colors tracking-wide"
        >
          <Truck size={11} />
          Track Order
        </Link>
        <Link
          href="/#help"
          className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-200 transition-colors tracking-wide"
        >
          <Phone size={11} />
          Help
        </Link>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main header
// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  const { count, isOpen, setIsOpen } = useCart();
  const { isLoggedIn, user, logout } = useProfile();
  const { count: realWishlistCount } = useWishlist();
  const { settings } = useConfig();

  const platformName = settings?.general?.platformName || "Stitch";
  const loyaltyEnabled = settings?.loyalty?.enabled !== false;
  const walletEnabled = settings?.payment?.walletEnabled !== false;

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [mobileGender, setMobileGender] = useState<"men" | "women">("men");

  const searchRef = useRef<HTMLInputElement>(null);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const userDisplayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Account";
  const userInitial = userDisplayName.charAt(0) || "U";
  const userTier = user?.loyaltyTier || "bronze";
  const userPoints = user?.loyaltyPoints ?? 0;
  const orderCount = (user as { orderCount?: number } | null | undefined)?.orderCount ?? 0;

  // Memoised search filter — avoids recomputing on unrelated renders
  const matchingProducts = React.useMemo(
    () =>
      query
        ? products
            .filter(
              (p) =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.category.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 4)
        : [],
    [query]
  );

  // Passive scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-focus search input
  useEffect(() => {
    if (searchOpen) {
      const id = setTimeout(() => searchRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [searchOpen]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, searchOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  // Profile dropdown: close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Mega menu: debounced open/close
  const openMega = useCallback((label: string) => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setMegaOpen(label);
    setProfileOpen(false);
  }, []);

  const closeMega = useCallback(() => {
    megaTimer.current = setTimeout(() => setMegaOpen(null), 160);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
  }, []);

  const activeMegaData = navLinks.find((l) => l.label === megaOpen)?.mega;

  const headerBg = scrolled
    ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-stone-200/80"
    : "bg-stone-50/90 backdrop-blur-sm border-b border-stone-100/50";

  return (
    <>
      <div className="sticky top-0 left-0 right-0 z-40">
        <TopUtilityBar />

        <header className={`left-0 right-0 transition-all duration-300 h-[var(--h-main-nav)] ${headerBg}`}>
          <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex items-center justify-between h-full gap-4">

              {/* Logo */}
              <Link
                href="/"
                className="font-display text-xl md:text-2xl font-semibold tracking-[0.4em] text-stone-900 uppercase shrink-0 hover:text-stone-600 transition-colors"
              >
                {platformName}
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center flex-1 justify-center" aria-label="Main navigation">
                <div className="flex items-center gap-0.5">
                  {navLinks.slice(0, 4).map((l) => (
                    <div
                      key={l.label}
                      className="relative"
                      onMouseEnter={() => l.mega && openMega(l.label)}
                      onMouseLeave={() => l.mega && closeMega()}
                    >
                      <Link
                        href={l.href}
                        className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[11px] tracking-[0.15em] uppercase font-semibold transition-colors duration-200 group ${
                          megaOpen === l.label
                            ? "text-stone-900"
                            : l.label === "All Products"
                            ? "text-stone-900 bg-stone-100 rounded-sm hover:bg-stone-200"
                            : "text-stone-500 hover:text-stone-900"
                        }`}
                      >
                        {l.label}
                        {l.mega && (
                          <ChevronDown
                            size={10}
                            className={`transition-transform duration-200 ${megaOpen === l.label ? "rotate-180" : ""}`}
                          />
                        )}
                        {l.badge && !l.badgeStyle && (
                          <span className="text-base leading-none">{l.badge}</span>
                        )}
                        {l.label !== "All Products" && (
                          <span
                            className={`absolute bottom-0 left-3 right-3 h-0.5 bg-stone-900 transition-transform duration-200 origin-left ${
                              megaOpen === l.label ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                            }`}
                          />
                        )}
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="w-px h-4 bg-stone-200 mx-3 shrink-0" />

                <div className="flex items-center gap-0.5">
                  {navLinks.slice(4).map((l) => (
                    <div key={l.label} className="relative">
                      <Link
                        href={l.href}
                        className={`relative flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.15em] uppercase font-semibold transition-colors duration-200 group ${
                          l.label === "Sale"
                            ? "text-red-600 hover:text-red-700"
                            : "text-stone-400 hover:text-stone-700"
                        }`}
                      >
                        {l.label}
                        {l.badge && l.badgeStyle === "sale" && (
                          <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold bg-red-600 text-white rounded-sm tracking-wider">
                            SALE
                          </span>
                        )}
                        {l.badge && !l.badgeStyle && (
                          <span className="text-base leading-none">{l.badge}</span>
                        )}
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-stone-700 transition-transform duration-200 origin-left scale-x-0 group-hover:scale-x-100" />
                      </Link>
                    </div>
                  ))}
                </div>
              </nav>

              {/* Icon cluster */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Search */}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="hidden sm:flex h-10 w-10 items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
                  aria-label="Search for products"
                >
                  <Search size={18} strokeWidth={1.5} />
                </button>

                {/* Wishlist */}
                <Link
                  href="/wishlist"
                  className="relative hidden sm:flex h-10 w-10 items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
                  aria-label={`Wishlist (${realWishlistCount} items)`}
                >
                  <Heart size={18} strokeWidth={1.5} />
                  {realWishlistCount > 0 && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                      {realWishlistCount > 9 ? "9+" : realWishlistCount}
                    </span>
                  )}
                </Link>

                {/* Profile */}
                <div ref={profileRef} className="relative hidden sm:block">
                  <button
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex h-10 items-center gap-2 px-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
                    aria-label="Account menu"
                    aria-expanded={profileOpen}
                  >
                    {isLoggedIn && user ? (
                      <div className="h-7 w-7 rounded-full avatar-gradient flex items-center justify-center text-white text-xs font-bold">
                        {userInitial}
                      </div>
                    ) : (
                      <User size={18} strokeWidth={1.5} />
                    )}
                    {isLoggedIn && user && (
                      <span className="hidden lg:block text-[11px] font-medium text-stone-700 max-w-20 truncate">
                        {userDisplayName.split(" ")[0]}
                      </span>
                    )}
                  </button>

                  {profileOpen && (
                    <div className="dropdown-enter absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-50">
                      {isLoggedIn && user ? (
                        <>
                          <div className="px-5 py-4 bg-gradient-to-br from-stone-900 to-stone-800">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full avatar-gradient flex items-center justify-center text-white text-lg font-bold shrink-0">
                                {userInitial}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{userDisplayName}</p>
                                <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tier-gold">
                                    {userTier} MEMBER
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <Crown size={13} className="text-accent" />
                                <span className="text-[11px] text-stone-300">Loyalty Points</span>
                              </div>
                              <span className="text-sm font-bold text-accent">
                                {userPoints.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="py-2">
                            {(() => {
                              const items: { icon: any; label: string; sub: string; href: string }[] = [
                                { icon: Package, label: "My Orders", sub: `${orderCount} orders`, href: "/orders" },
                                { icon: Heart, label: "Wishlist", sub: `${realWishlistCount} saved items`, href: "/wishlist" },
                              ];
                              if (loyaltyEnabled) {
                                items.push({ icon: Gift, label: "Loyalty Rewards", sub: "Redeem points", href: "/loyalty" });
                              }
                              if (walletEnabled) {
                                items.push({ icon: Crown, label: "My Wallet", sub: "Balance & transactions", href: "/wallet" });
                              }
                              items.push({ icon: MapPin, label: "Addresses", sub: "Manage delivery addresses", href: "/profile?tab=addresses" });
                              if (user.role === "admin") {
                                items.push(
                                  { icon: Shield, label: "Admin Portal", sub: "Manage users and permissions", href: "/portal/admin/seller" },
                                  { icon: Package, label: "Moderation Catalog", sub: "Approve or reject catalog items", href: "/portal/admin/seller/products" }
                                );
                              } else if (user.role === "seller") {
                                items.push(
                                  { icon: Shield, label: "Seller Portal", sub: "Manage products and sales", href: "/seller/analytics" }
                                );
                              }
                              items.push(
                                { icon: Settings, label: "Account Settings", sub: "Profile, password, preferences", href: "/profile?tab=settings" }
                              );
                              return items.map(({ icon: Icon, label, sub, href }) => (
                                <Link
                                  key={label}
                                  href={href}
                                  onClick={() => setProfileOpen(false)}
                                  className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors group"
                                >
                                  <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors shrink-0">
                                    <Icon size={14} className="text-stone-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-stone-900">{label}</p>
                                    <p className="text-[10px] text-stone-400 truncate">{sub}</p>
                                  </div>
                                  <ChevronRight size={13} className="text-stone-300 ml-auto shrink-0" />
                                </Link>
                              ));
                            })()}
                          </div>

                          <div className="border-t border-stone-100 py-2">
                            <button
                              onClick={() => { logout(); setProfileOpen(false); }}
                              className="flex items-center gap-3 px-5 py-3 w-full hover:bg-red-50 transition-colors group"
                            >
                              <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                <LogOut size={14} className="text-red-500" />
                              </div>
                              <p className="text-xs font-medium text-red-600">Sign Out</p>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="px-5 py-5">
                            <div className="h-14 w-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
                              <User size={24} strokeWidth={1} className="text-stone-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-stone-900 text-center">
                              Welcome to {platformName}
                            </h3>
                            <p className="text-[11px] text-stone-400 text-center mt-1">
                              Sign in to access your account
                            </p>
                            <div className="mt-4 space-y-2 flex flex-col">
                              <Link
                                href="/login"
                                onClick={() => setProfileOpen(false)}
                                className="w-full bg-stone-900 text-stone-50 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold hover:bg-stone-800 transition-colors rounded-lg text-center"
                              >
                                Sign In
                              </Link>
                              <Link
                                href="/register"
                                onClick={() => setProfileOpen(false)}
                                className="w-full border border-stone-200 text-stone-700 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold hover:border-stone-900 transition-colors rounded-lg text-center"
                              >
                                Create Account
                              </Link>
                            </div>
                          </div>

                          <div className="border-t border-stone-100 px-5 py-3">
                            <p className="text-[10px] text-stone-400 text-center">
                              Members earn points on every purchase
                            </p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <Crown size={10} className="text-accent" />
                              <span className="text-[10px] text-accent font-medium">
                                Join the loyalty programme
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-stone-100 py-2 px-2">
                            {[
                              { icon: Package, label: "Track My Order", href: "/orders" },
                              { icon: Truck, label: "Delivery Info", href: "/pages/shipping-returns" },
                              { icon: Phone, label: "Contact Us", href: "/pages/contact" },
                            ].map(({ icon: Icon, label, href }) => (
                              <Link
                                key={label}
                                href={href}
                                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50 rounded-lg transition-colors"
                              >
                                <Icon size={13} className="text-stone-400" />
                                <span className="text-[11px] text-stone-600">{label}</span>
                                <ChevronRight size={11} className="text-stone-300 ml-auto" />
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Cart */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="relative flex h-10 w-10 items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
                  aria-label={`Shopping cart (${count} items)`}
                >
                  <ShoppingBag size={18} strokeWidth={1.5} />
                  {count > 0 && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-stone-900 text-stone-50 text-[8px] font-bold flex items-center justify-center">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </button>

                {/* Mobile search */}
                <button
                  className="flex sm:hidden h-10 w-10 items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search for products"
                >
                  <Search size={18} strokeWidth={1.5} />
                </button>

                {/* Mobile menu toggle */}
                <button
                  className="flex lg:hidden h-10 w-10 items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Mega menu ──────────────────────────────────── */}
          {activeMegaData && (
            <div
              className="mega-menu-enter absolute left-0 right-0 bg-white shadow-2xl border-b border-stone-100 z-30"
              onMouseEnter={() => openMega(megaOpen!)}
              onMouseLeave={closeMega}
            >
              <div className="max-w-360 mx-auto px-8 py-10">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-10">
                  {activeMegaData.sections.map((section) => (
                    <div key={section.heading}>
                      <p className="text-[9px] tracking-[0.35em] uppercase text-stone-400 font-semibold mb-4">
                        {section.heading}
                      </p>
                      <ul className="space-y-2">
                        {section.links.map((link) => (
                          <li key={link.label}>
                            <Link
                              href={link.href}
                              onClick={() => setMegaOpen(null)}
                              className="flex items-center gap-2 text-[12px] text-stone-600 hover:text-stone-900 transition-colors group"
                            >
                              <span className="nav-underline">{link.label}</span>
                              {link.badge && (
                                <span className="text-[8px] font-bold text-accent border border-accent/40 px-1 py-0.5 rounded">
                                  {link.badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {/* Featured cards */}
                  <div className="flex gap-3">
                    {activeMegaData.featured.map((feat) => (
                      <Link
                        key={feat.label}
                        href={feat.href}
                        onClick={() => setMegaOpen(null)}
                        className="group relative w-44 aspect-[3/4] overflow-hidden block shrink-0"
                      >
                        <img
                          src={feat.img}
                          alt={feat.label}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/10 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white text-xs font-semibold">{feat.label}</p>
                          <p className="text-stone-300 text-[10px] mt-0.5">{feat.sublabel}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Tags row */}
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-6">
                  {["All New In", "Best Sellers", "Trending Now", "Under ₹100", "Sustainable Edit"].map((tag) => (
                    <Link
                      key={tag}
                      href="/#shop"
                      onClick={() => setMegaOpen(null)}
                      className="text-[10px] tracking-widest uppercase text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1"
                    >
                      {tag === "Trending Now" && <Flame size={10} className="text-orange-500" />}
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* ── Mobile nav drawer ─────────────────────────────── */}
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-300 lg:hidden ${
            menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!menuOpen}
        >
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          <div
            className={`absolute left-0 top-0 bottom-0 w-80 max-w-[90vw] bg-white flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="font-display text-lg font-semibold tracking-[0.35em] text-stone-900 uppercase"
              >
                {platformName}
              </Link>
              <button
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="h-9 w-9 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Auth state */}
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
              {isLoggedIn && user ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full avatar-gradient flex items-center justify-center text-white font-bold shrink-0">
                    {userInitial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{userDisplayName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Crown size={10} className="text-accent" />
                      <span className="text-[10px] text-accent font-medium">
                        {userPoints.toLocaleString()} points
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 bg-stone-900 text-stone-50 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold hover:bg-stone-800 transition-colors text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 border border-stone-200 text-stone-700 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold text-center hover:border-stone-900 transition-colors"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>

            {/* Gender tabs */}
            <div className="flex border-b border-stone-100" role="tablist">
              {(["men", "women"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setMobileGender(g)}
                  role="tab"
                  aria-selected={mobileGender === g}
                  className={`flex-1 py-3 text-[11px] tracking-[0.2em] uppercase font-semibold transition-colors ${
                    mobileGender === g
                      ? "text-stone-900 border-b-2 border-stone-900"
                      : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto">
              <div className="py-2">
                {(mobileGender === "men" ? menMega : womenMega).sections.map((section) => (
                  <div key={section.heading} className="border-b border-stone-50">
                    <button
                      onClick={() =>
                        setMobileSection(mobileSection === section.heading ? null : section.heading)
                      }
                      className="flex items-center justify-between w-full px-5 py-3.5 text-left hover:bg-stone-50 transition-colors"
                      aria-expanded={mobileSection === section.heading}
                    >
                      <span className="text-sm font-semibold text-stone-900">{section.heading}</span>
                      <ChevronDown
                        size={14}
                        className={`text-stone-400 transition-transform duration-200 ${
                          mobileSection === section.heading ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {mobileSection === section.heading && (
                      <div className="px-5 pb-3 grid grid-cols-2 gap-x-4 gap-y-1">
                        {section.links.map((link) => (
                          <Link
                            key={link.label}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="py-2.5 text-xs text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1.5"
                          >
                            {link.label}
                            {link.badge && (
                              <span className="text-[8px] font-bold text-accent border border-accent/40 px-1 py-0.5 rounded">
                                {link.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="border-b border-stone-50">
                  {[
                    { label: "🔥 New In", href: "/#shop" },
                    { label: "🛍️ All Products", href: "/allproducts" },
                    { label: "🏷️ Sale — Up to 50% off", href: "/#shop", red: true },
                    { label: "✨ Lookbook", href: "/lookbook" },
                    { label: "🎨 Customize 3D", href: "/customize" },
                  ].map(({ label, href, red }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors border-b border-stone-50 ${
                        red ? "text-red-600" : "text-stone-700"
                      }`}
                    >
                      {label}
                      <ChevronRight size={14} className="text-stone-300" />
                    </Link>
                  ))}
                </div>

                {/* In-menu search */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 border border-stone-200 px-4 py-3 rounded-lg">
                    <Search size={14} className="text-stone-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search products…"
                      className="flex-1 text-sm bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none"
                      onFocus={() => { setMenuOpen(false); setSearchOpen(true); }}
                    />
                  </div>
                </div>

                {isLoggedIn && (
                  <div className="px-5 py-3 border-t border-stone-100">
                    <p className="text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold mb-3">
                      Account
                    </p>
                    {(() => {
                      const items = [
                        { icon: Package, label: "My Orders", href: "/orders" },
                        { icon: Heart, label: "Wishlist", href: "/wishlist" },
                        { icon: Crown, label: "Loyalty Rewards", href: "/loyalty" },
                      ];
                      if (user?.role === "admin") {
                        items.push(
                          { icon: Shield, label: "Admin Portal", href: "/portal/admin/seller" },
                          { icon: Package, label: "Moderation Catalog", href: "/portal/admin/seller/products" }
                        );
                      } else if (user?.role === "seller") {
                        items.push(
                          { icon: Shield, label: "Seller Portal", href: "/seller/analytics" }
                        );
                      }
                      items.push(
                        { icon: Settings, label: "Settings", href: "/profile?tab=settings" }
                      );
                      return items.map(({ icon: Icon, label, href }) => (
                        <Link
                          key={label}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 py-3 border-b border-stone-50 last:border-0"
                        >
                          <Icon size={15} className="text-stone-400" />
                          <span className="text-sm text-stone-700">{label}</span>
                        </Link>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Footer perks */}
            <div className="border-t border-stone-100 px-5 py-4 bg-stone-50">
              <div className="flex items-center justify-around">
                {[
                  { icon: Truck, label: "Free Shipping" },
                  { icon: Package, label: "30-Day Returns" },
                  { icon: Phone, label: "24/7 Help" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <Icon size={16} className="text-stone-400" />
                    <span className="text-[9px] text-stone-500 tracking-wide">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Search overlay ────────────────────────────────── */}
        <div
          className={`fixed inset-0 z-50 transition-all duration-300 ${
            searchOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!searchOpen}
        >
          <div
            className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
            onClick={closeSearch}
          />

          <div className="relative bg-white shadow-2xl">
            <div className="max-w-4xl mx-auto px-4 sm:px-8">
              <div className="flex items-center gap-4 py-5 border-b border-stone-100">
                <Search size={20} strokeWidth={1.5} className="text-stone-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for products, brands, styles…"
                  className="flex-1 text-lg bg-transparent text-stone-900 placeholder:text-stone-300 focus:outline-none"
                  aria-label="Search input"
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  aria-label="Close search"
                  onClick={closeSearch}
                  className="text-stone-400 hover:text-stone-700 transition-colors ml-2"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="py-5">
                {!query && (
                  <>
                    <div className="flex gap-2 mb-5 flex-wrap">
                      {quickCategories.map((cat) => (
                        <button
                          key={cat.label}
                          onClick={() => setQuery(cat.label)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 hover:border-stone-700 hover:bg-stone-50 rounded-full text-xs font-medium text-stone-600 transition-colors"
                        >
                          <span>{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold mb-3 flex items-center gap-1.5">
                          <Clock size={10} />
                          Recent Searches
                        </p>
                        <div className="space-y-1">
                          {recentSearches.map((term) => (
                            <button
                              key={term}
                              onClick={() => setQuery(term)}
                              className="flex items-center gap-2 w-full py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors text-left"
                            >
                              <Clock size={12} className="text-stone-300" />
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold mb-3 flex items-center gap-1.5">
                          <TrendingUp size={10} />
                          Trending Now
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {trendingSearches.map((term, i) => (
                            <button
                              key={term}
                              onClick={() => setQuery(term)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-xs text-stone-600 hover:border-stone-700 hover:text-stone-900 transition-colors rounded-full"
                            >
                              {i === 0 && <Flame size={10} className="text-orange-500" />}
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {query && (
                  <div className="py-2">
                    <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-4">
                      Results for &ldquo;{query}&rdquo;
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {["Men's", "Women's", "Sale", "New In"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setQuery(`${query} ${cat}`)}
                          className="px-3 py-1.5 border border-stone-200 text-[11px] text-stone-600 hover:border-stone-700 transition-colors rounded-full"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-stone-100 pt-5 pb-4">
                      <p className="text-[10px] tracking-[0.25em] uppercase text-stone-400 mb-3 font-semibold">
                        Matching Products ({matchingProducts.length})
                      </p>
                      {matchingProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {matchingProducts.map((p) => (
                            <Link
                              key={p.id}
                              href={`/product/${p.id}`}
                              onClick={closeSearch}
                              className="flex items-center gap-3 p-2 hover:bg-stone-50 border border-transparent hover:border-stone-100 rounded transition-all group"
                            >
                              <div className="h-12 w-9 bg-stone-100 shrink-0 flex items-center justify-center overflow-hidden border border-stone-100">
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="h-full w-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-semibold text-stone-900 truncate leading-tight group-hover:text-accent transition-colors">
                                  {p.name}
                                </h4>
                                <p className="text-[9px] text-stone-400 uppercase tracking-wider mt-0.5">
                                  {getCategoryLabel(p.category)}
                                </p>
                                <p className="text-[11px] font-medium text-stone-700 mt-0.5">
                                  ₹{p.price}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-400 italic">No products match your query.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CartDrawer />
    </>
  );
}