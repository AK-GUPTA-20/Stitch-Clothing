"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/Footer";
import {
  Upload,
  Sliders,
  Maximize2,
  Move,
  RefreshCcw,
  Loader2,
  X
} from "lucide-react";

// Shirt Preview SVG - color fixed, only image/decal customizable
function ShirtPreview({
  decalImage,
  decalScale,
  decalPosition,
}: {
  decalImage: string | null;
  decalScale: number;
  decalPosition: [number, number];
}) {
  const color = "#1c1917";
  // Center placement & scaling math for larger area
  // Tweak these numbers to fit the shirt graphic "nicely"
  const [x, y] = decalPosition;
  const svgWidth = 280, svgHeight = 320;

  // Base size the decal can take up
  const MAX_SIZE = 700;
  const decalW = MAX_SIZE * decalScale;
  const decalH = MAX_SIZE * decalScale;
  // Centered at chest (approximate)
  const chestCenter = { x: 140, y: 155 };
  const offsetX = x * 75;
  const offsetY = y * 70;
  const decalX = chestCenter.x - decalW / 2 + offsetX;
  const decalY = chestCenter.y - decalH / 2 + offsetY;

  return (
    <div className="flex justify-center items-center h-full w-full bg-stone-100 rounded-xl border border-stone-200 overflow-hidden relative">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 280 320"
        className="drop-shadow-lg"
      >
        {/* Shirt Base */}
        <rect
          x="35"
          y="40"
          width="0"
          height="0"
          rx="60"
          fill={color}
        />
        {/* Collar */}
        <ellipse cx="140" cy="42" rx="45" ry="18" fill="#eee" opacity={0.3} />
        {/* Decal (if provided) */}
        {decalImage && (
          <image
            href={decalImage}
            x={decalX}
            y={decalY}
            width={decalW}
            height={decalH}
            style={{ pointerEvents: "none" }}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {/* Decorative seams */}
        <ellipse cx="55" cy="110" rx="19" ry="32" fill="#fff" opacity={0.07} />
        <ellipse cx="225" cy="110" rx="19" ry="32" fill="#fff" opacity={0.07} />
      </svg>
    </div>
  );
}

export default function CustomizePage() {
  const [decalImage, setDecalImage] = useState<string | null>(null);
  const [decalScale, setDecalScale] = useState(0.4); // Larger default
  const [decalPosition, setDecalPosition] = useState<[number, number]>([0, 0]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploading(true);
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setUploading(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setDecalImage(event.target?.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveLogo = () => setDecalImage(null);
  const resetDecal = () => {
    setDecalScale(0.4);
    setDecalPosition([0, 0]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <main className="flex-1 flex flex-col lg:flex-row pt-[var(--h-main-nav)]">
        {/* Preview (left) */}
        <section className="w-full lg:w-1/2 flex items-center justify-center bg-stone-100 p-8">
          <div className="w-[320px] h-[380px] mx-auto relative">
            <ShirtPreview
              decalImage={decalImage}
              decalScale={decalScale}
              decalPosition={decalPosition}
            />
            <AnimatePresence>
              {uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-stone-100/90 flex items-center justify-center z-10"
                >
                  <Loader2 className="w-10 h-10 animate-spin text-stone-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Controls (right) */}
        <section className="w-full lg:w-1/2 bg-white shadow-2xl z-10 overflow-y-auto">
          <div className="p-8 lg:p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-medium mb-3">
                The Studio
              </p>
              <h1 className="font-display text-4xl sm:text-5xl text-stone-900 font-light italic mb-6">
                Add Artwork
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* File Upload */}
              <div>
                <h3 className="text-xs tracking-widest uppercase font-bold text-stone-900 mb-4">
                  Upload Logo
                </h3>
                <label
                  className={`flex flex-col items-center justify-center w-full h-36 border-2 border-stone-200 border-dashed rounded-xl cursor-pointer bg-stone-50 hover:bg-stone-100 transition-colors relative`}
                >
                  <div className="flex flex-col items-center justify-center pt-6 pb-6">
                    <Upload className="w-7 h-7 mb-3 text-stone-400" />
                    <p className="text-xs text-stone-500 font-medium">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-stone-400 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    tabIndex={-1}
                  />
                </label>
                {decalImage && (
                  <div className="flex items-center gap-2 mt-2">
                    <img loading="lazy" decoding="async"
                      src={decalImage}
                      alt="Logo preview"
                      className="w-12 h-12 object-contain rounded border bg-white"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      type="button"
                      className="p-1 rounded-full border border-stone-300 hover:bg-stone-100"
                      title="Remove Logo"
                      aria-label="Remove uploaded logo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Position Controls */}
              {decalImage && (
                <div className="space-y-7 bg-stone-50 p-6 rounded-xl border border-stone-100">
                  <h3 className="text-xs tracking-widest uppercase font-bold text-stone-900 flex items-center gap-2">
                    <Sliders size={14} /> Adjust Placement
                  </h3>
                  {/* Scale */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-stone-500">
                      <span className="flex items-center gap-2">
                        <Maximize2 size={12} /> Scale
                      </span>
                      <span>{Math.round(decalScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.7"
                      step="0.01"
                      value={decalScale}
                      onChange={(e) => setDecalScale(parseFloat(e.target.value))}
                      className="w-full accent-stone-900 h-1 bg-stone-200 rounded appearance-none cursor-pointer"
                    />
                  </div>
                  {/* Position X */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-stone-500">
                      <span className="flex items-center gap-2">
                        <Move size={13} /> Horizontal
                      </span>
                      <span>{decalPosition[0].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={decalPosition[0]}
                      onChange={(e) =>
                        setDecalPosition([
                          parseFloat(e.target.value),
                          decalPosition[1],
                        ])
                      }
                      className="w-full accent-stone-900 h-1 bg-stone-200 rounded appearance-none cursor-pointer"
                    />
                  </div>
                  {/* Position Y */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-stone-500">
                      <span className="flex items-center gap-2">
                        <Move size={13} className="rotate-90" /> Vertical
                      </span>
                      <span>{decalPosition[1].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={decalPosition[1]}
                      onChange={(e) =>
                        setDecalPosition([
                          decalPosition[0],
                          parseFloat(e.target.value),
                        ])
                      }
                      className="w-full accent-stone-900 h-1 bg-stone-200 rounded appearance-none cursor-pointer"
                    />
                  </div>
                  {/* Reset button */}
                  <button
                    onClick={resetDecal}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] tracking-widest uppercase font-bold text-stone-500 border border-stone-200 hover:bg-stone-200 hover:text-stone-900 transition-colors rounded-md"
                  >
                    <RefreshCcw size={12} /> Reset to Default
                  </button>
                </div>
              )}
            </motion.div>

            {/* Action Bar */}
            <div className="mt-12 pt-8 border-t border-stone-100">
              <button
                className="w-full bg-stone-900 text-stone-50 py-4 text-[11px] tracking-[0.2em] uppercase font-bold hover:bg-stone-800 transition-colors shadow-xl shadow-stone-900/20"
                type="button"
              >
                Confirm & Add to Bag — ₹85
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}