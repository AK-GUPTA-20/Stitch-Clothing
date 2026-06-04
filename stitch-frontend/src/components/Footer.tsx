"use client";
// src/components/Footer.tsx

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MapPin, Mail, Phone, Shield, Leaf, Award,
  ChevronDown
} from "lucide-react";

type FooterLink = { label: string; href: string };
type FooterSection = Record<string, FooterLink[]>;

const footerLinks: FooterSection = {
  "Shop Men": [
    { label: "Hoodies & Sweatshirts", href: "/#shop" },
    { label: "T-Shirts & Tops", href: "/#shop" },
    { label: "Jackets & Coats", href: "/#shop" },
    { label: "Trousers & Chinos", href: "/#shop" },
    { label: "Accessories", href: "/#shop" },
    { label: "Sale", href: "/#shop" },
  ],
  "Shop Women": [
    { label: "Dresses & Jumpsuits", href: "/#shop" },
    { label: "Knitwear", href: "/#shop" },
    { label: "Jackets & Coats", href: "/#shop" },
    { label: "Jeans & Trousers", href: "/#shop" },
    { label: "Accessories", href: "/#shop" },
    { label: "Sale", href: "/#shop" },
  ],
  Help: [
    { label: "Size Guide", href: "/pages/size-guide" },
    { label: "Shipping & Returns", href: "/pages/shipping-returns" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact Us", href: "/pages/contact" },
    { label: "Order Tracking", href: "/orders" },
    { label: "Student Discount", href: "/pages/student-discount" },
  ],
  Company: [
    { label: "About Us", href: "/pages/about-us" },
    { label: "Sustainability", href: "/pages/sustainability" },
    { label: "Careers", href: "/pages/careers" },
    { label: "Journal", href: "/pages/journal" },
    { label: "Press", href: "/pages/press" },
    { label: "Affiliate Programme", href: "/pages/affiliates" },
  ],
};

const socials = [
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "Twitter / X",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.806-2.428 1.808-2.428.852 0 1.266.64 1.266 1.408 0 .858-.546 2.141-.828 3.33-.236.995.499 1.806 1.476 1.806 1.772 0 3.137-1.868 3.137-4.565 0-2.387-1.715-4.055-4.163-4.055-2.833 0-4.498 2.123-4.498 4.319 0 .854.33 1.769.74 2.269a.3.3 0 0 1 .069.283c-.076.309-.243.995-.276 1.134-.044.183-.146.222-.336.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.527-2.292-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.81a8.18 8.18 0 0 0 4.78 1.52V6.88a4.85 4.85 0 0 1-1.01-.19z" />
      </svg>
    ),
  },
];

const paymentMethods = ["VISA", "Mastercard", "AMEX", "PayPal", "Apple Pay", "Google Pay", "Klarna"];

export default function Footer({ hideNewsletter = false }: { hideNewsletter?: boolean }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="border-t border-stone-100 bg-stone-50 mt-0">

      {/* ── Newsletter strip ──────────────────────────────────────────── */}
      {!hideNewsletter && (
        <div className="bg-stone-900">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              {/* Left copy */}
              <div className="flex-1 max-w-md">
                <p className="text-[10px] tracking-[0.35em] uppercase text-stone-500 mb-2 flex items-center gap-1.5">
                  <span className="text-accent">✦</span> Stay in the know
                </p>
                <h3 className="font-display text-2xl sm:text-3xl text-stone-50 font-light italic mb-2">
                  The Stitch Edit
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  New arrivals, restocks, and stories. Members get early access and exclusive offers.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  {["Early access drops", "10% off first order", "Members-only sales"].map((perk) => (
                    <p key={perk} className="text-[9px] text-stone-500 flex items-center gap-1">
                      <span className="text-accent text-[8px]">✦</span> {perk}
                    </p>
                  ))}
                </div>
              </div>

              {/* Right form */}
              <div className="w-full lg:w-auto lg:min-w-[380px]">
                {subscribed ? (
                  <div className="flex items-center gap-3 bg-stone-800 border border-stone-700 px-5 py-4">
                    <span className="text-accent text-lg">✦</span>
                    <div>
                      <p className="text-sm font-semibold text-stone-50">You&apos;re in!</p>
                      <p className="text-xs text-stone-400 mt-0.5">Check your inbox for your 10% off code.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex border border-stone-700">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="flex-1 px-4 py-3.5 text-xs bg-transparent text-stone-50 placeholder:text-stone-600 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="group px-5 py-3.5 bg-accent text-stone-900 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-accent-light transition-colors flex items-center gap-2 flex-shrink-0"
                    >
                      Join
                      <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </form>
                )}
                <p className="text-[10px] text-stone-600 mt-2">
                  No spam. Unsubscribe anytime. By subscribing, you agree to our{" "}
                  <Link href="/pages/privacy-policy" className="underline hover:text-stone-400 transition-colors">Privacy Policy</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main footer body ──────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Desktop link grid */}
        <div className="hidden md:grid md:grid-cols-6 gap-8 lg:gap-10 py-14 lg:py-16">
          {/* Brand column — spans 2 */}
          <div className="col-span-2">
            <Link
              href="/"
              className="font-display text-2xl font-semibold tracking-[0.35em] text-stone-900 uppercase block mb-4"
            >
              Stitch
            </Link>
            <p className="text-xs text-stone-400 leading-relaxed max-w-xs mb-6">
              Considered clothing for the modern wardrobe. Minimal design, premium organic materials, made to last a lifetime.
            </p>

            {/* Contact info */}
            <div className="space-y-2 mb-6">
              {[
                { icon: Mail, text: "hello@stitch.com" },
                { icon: Phone, text: "+44 (0) 20 7123 4567" },
                { icon: MapPin, text: "14 Savile Row, London W1S 3JN" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon size={12} className="text-stone-400 flex-shrink-0" />
                  <span className="text-[11px] text-stone-500">{text}</span>
                </div>
              ))}
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2.5 mb-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="h-8 w-8 flex items-center justify-center border border-stone-200 text-stone-400 hover:text-stone-900 hover:border-stone-900 transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Certifications */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "GOTS", icon: Leaf },
                { label: "OEKO-TEX", icon: Shield },
                { label: "B Corp", icon: Award },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-1 border border-stone-200 px-2.5 py-1.5 text-[9px] tracking-widest uppercase font-bold text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
                >
                  <Icon size={9} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-[10px] tracking-[0.25em] uppercase text-stone-900 font-bold mb-5">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[12px] text-stone-500 hover:text-stone-900 transition-colors leading-none"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Mobile: accordion footer ──────────────────────────────────── */}
        <div className="md:hidden py-8">
          {/* Brand block */}
          <div className="pb-6 mb-2 border-b border-stone-100">
            <Link href="/" className="font-display text-xl font-semibold tracking-[0.35em] text-stone-900 uppercase block mb-3">
              Stitch
            </Link>
            <p className="text-xs text-stone-400 leading-relaxed mb-4 max-w-xs">
              Considered clothing for the modern wardrobe. Minimal design, premium organic materials.
            </p>
            {/* Socials */}
            <div className="flex items-center gap-2 mb-4">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="h-11 w-11 flex items-center justify-center border border-stone-200 text-stone-400 hover:text-stone-900 hover:border-stone-900 transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
            {/* Certs */}
            <div className="flex items-center gap-2">
              {["GOTS", "OEKO-TEX", "B Corp"].map((cert) => (
                <div key={cert} className="border border-stone-200 px-2 py-1 text-[9px] tracking-widest uppercase font-bold text-stone-400">
                  {cert}
                </div>
              ))}
            </div>
          </div>

          {/* Accordion sections */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading} className="border-b border-stone-100">
              <button
                onClick={() => toggleSection(heading)}
                className="flex items-center justify-between w-full py-5 text-left"
              >
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-stone-900">{heading}</span>
                <ChevronDown
                  size={14}
                  className={`text-stone-400 transition-transform duration-200 ${expandedSection === heading ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSection === heading && (
                <div className="pb-4 grid grid-cols-2 gap-x-4 gap-y-2">
                  {links.map((l) => (
                    <Link key={l.label} href={l.href} className="text-[12px] text-stone-500 hover:text-stone-900 transition-colors py-0.5">
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Contact */}
          <div className="pt-6 space-y-2">
            {[
              { icon: Mail, text: "hello@stitch.com" },
              { icon: Phone, text: "+44 (0) 20 7123 4567" },
              { icon: MapPin, text: "14 Savile Row, London" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon size={12} className="text-stone-400 flex-shrink-0" />
                <span className="text-[11px] text-stone-500">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────── */}
        <div className="py-5 border-t border-stone-100">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-3 sm:mb-4">
            <p className="text-[11px] text-stone-400 text-center sm:text-left">
              © {new Date().getFullYear()} Stitch Limited. All rights reserved.
              <span className="hidden sm:inline"> Made with care in London.</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {[
                { label: "Privacy Policy", href: "/pages/privacy-policy" },
                { label: "Terms of Service", href: "/pages/terms-of-service" },
                { label: "Cookie Settings", href: "/pages/cookie-settings" },
                { label: "Accessibility", href: "/pages/accessibility" },
              ].map((l) => (
                <Link key={l.label} href={l.href} className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-stone-400 uppercase tracking-widest mr-1">We accept</span>
            {paymentMethods.map((p) => (
              <div
                key={p}
                className="border border-stone-200 px-2 py-1 text-[9px] font-bold tracking-wider text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── App download strip ────────────────────────────────────────── */}
      <div className="bg-stone-100 border-t border-stone-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-stone-500 tracking-wide">
              🛍️ Shop on the go — download the Stitch app
            </p>
            <div className="flex items-center gap-2">
              {[
                { label: "App Store", sub: "Download on the" },
                { label: "Google Play", sub: "Get it on" },
              ].map(({ label, sub }) => (
                <a
                  key={label}
                  href="#"
                  className="flex flex-col border border-stone-300 px-3 py-1.5 hover:border-stone-500 transition-colors"
                >
                  <span className="text-[8px] text-stone-400 tracking-wide">{sub}</span>
                  <span className="text-[11px] font-bold text-stone-700 leading-none mt-0.5">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}