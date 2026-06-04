"use client";

import React, { useEffect, useRef } from "react";
import Footer from "@/components/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Leaf, Shield, Plus } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { MagneticButton } from "@/components/ui/magnetic-button";

// Dummy data for lookbook shots
const lookbookShots = [
  {
    id: "lb-1",
    img: "https://images.unsplash.com/photo-1544923246-77307dd654cb?w=1600&q=85",
    title: "The Core Collection",
    subtitle: "Essentials refined for everyday wear",
    hotspots: [
      { x: 30, y: 50, label: "Classic Tee" },
      { x: 60, y: 70, label: "Essential Denim" },
    ],
  },
  {
    id: "lb-2",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85",
    title: "Urban Minimalist",
    subtitle: "Seamless transitions from work to weekend",
    hotspots: [
      { x: 45, y: 35, label: "Wool Coat" },
    ],
  },
  {
    id: "lb-3",
    img: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=1600&q=85",
    title: "Weekend Comfort",
    subtitle: "Organic cotton that breathes with you",
    hotspots: [
      { x: 50, y: 40, label: "Lounge Hoodie" },
      { x: 40, y: 80, label: "Sweatpants" },
    ],
  }
];

export default function LookbookPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  return (
    <div className="min-h-screen bg-stone-950 text-stone-50 selection:bg-accent selection:text-stone-900" ref={containerRef}>
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
        <motion.div 
          className="absolute inset-0 z-0 opacity-40"
          style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "50%"]) }}
        >
          <img 
            src="https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=1800&q=85" 
            alt="Lookbook Intro" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-stone-950/60 mix-blend-multiply" />
        </motion.div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-stone-400 mb-6 flex items-center justify-center gap-3"
          >
            <span className="text-accent">✦</span> FW 2025 Lookbook
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-[110px] font-light italic leading-[0.85] mb-8"
          >
            A Study in<br />
            <em className="not-italic text-stone-400">Restraint.</em>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-stone-400 text-sm md:text-base max-w-lg mx-auto"
          >
            Explore our latest editorial collection. Pieces designed to seamlessly integrate into your life, prioritizing structure and premium natural fabrics.
          </motion.p>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <span className="text-[9px] uppercase tracking-widest text-stone-500">Scroll</span>
          <div className="w-px h-12 bg-stone-800 relative overflow-hidden">
            <motion.div 
              animate={{ y: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute inset-0 bg-stone-300 h-1/2"
            />
          </div>
        </motion.div>
      </section>

      {/* Cinematic Parallax Shots */}
      <div className="relative bg-stone-950 z-20 pb-20 pt-10">
        {lookbookShots.map((shot, index) => (
          <ShotSection key={shot.id} shot={shot} index={index} />
        ))}
      </div>

      <Footer />
    </div>
  );
}

function ShotSection({ shot, index }: { shot: any, index: number }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 1.1]);

  return (
    <div ref={ref} className="min-h-[90vh] md:min-h-screen relative flex items-center justify-center overflow-hidden mb-10 md:mb-0">
      <motion.div style={{ y, scale }} className="absolute inset-0 z-0">
        <img 
          src={shot.img} 
          alt={shot.title} 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-stone-950/30" />
      </motion.div>

      {/* Text Content */}
      <div className="relative z-10 w-full max-w-[1440px] px-6 md:px-12 pointer-events-none flex flex-col justify-end h-full pb-20 md:pb-32">
        <ScrollReveal direction="up" delay={0.2} className="max-w-2xl pointer-events-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-300 mb-3 font-semibold">0{index + 1} — {shot.title}</p>
          <h2 className="font-display text-4xl md:text-6xl text-white font-light italic">{shot.subtitle}</h2>
        </ScrollReveal>
      </div>

      {/* Hotspots */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {shot.hotspots.map((spot: any, i: number) => (
          <div 
            key={i}
            className="absolute"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            <MagneticButton className="relative flex items-center justify-center group pointer-events-auto">
              <div className="absolute inset-0 bg-stone-100 rounded-full animate-ping opacity-20" />
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center transition-all duration-300 group-hover:bg-white group-hover:text-black">
                <Plus size={16} className="text-white group-hover:text-black transition-colors" />
              </div>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 bg-white/90 backdrop-blur-sm text-black text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 whitespace-nowrap shadow-xl">
                {spot.label}
              </div>
            </MagneticButton>
          </div>
        ))}
      </div>
    </div>
  );
}
