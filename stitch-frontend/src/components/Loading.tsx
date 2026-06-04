// src/components/Loading.tsx
"use client";

import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-stone-50 flex flex-col items-center justify-center overflow-hidden">
      <div className="relative flex flex-col items-center justify-center">
        {/* Animated "S" Rings */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Subtle spinning dashed ring */}
          <svg className="absolute inset-0 w-full h-full text-stone-200 animate-[spin_4s_linear_infinite]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
          </svg>
          
          {/* Inner accent ring */}
          <svg className="absolute inset-2 w-20 h-20 text-accent animate-[spin_2.5s_linear_infinite_reverse]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30 70" strokeLinecap="round" />
          </svg>

          {/* Core S */}
          <span className="font-display text-5xl font-light italic text-stone-900 animate-pulse select-none">
            S
          </span>
        </div>
        
        {/* Muted loading text */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-[10px] tracking-[0.4em] uppercase text-stone-400 font-medium">
            Stitch
          </p>
          <div className="flex gap-1.5">
            <div className="w-1 h-1 rounded-full bg-stone-300 animate-[bounce_1s_infinite_0ms]"></div>
            <div className="w-1 h-1 rounded-full bg-stone-300 animate-[bounce_1s_infinite_200ms]"></div>
            <div className="w-1 h-1 rounded-full bg-stone-300 animate-[bounce_1s_infinite_400ms]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
