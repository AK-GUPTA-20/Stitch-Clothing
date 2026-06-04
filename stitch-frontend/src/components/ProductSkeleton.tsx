// src/components/ProductSkeleton.tsx
import React from 'react';

interface ProductSkeletonProps {
  count?: number;
  className?: string;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      {/* Image placeholder */}
      <div className="bg-stone-200 aspect-[3/4] w-full mb-3" />
      {/* Category */}
      <div className="h-2.5 bg-stone-200 rounded w-16 mb-2" />
      {/* Name */}
      <div className="h-3.5 bg-stone-200 rounded w-3/4 mb-1.5" />
      {/* Subtitle */}
      <div className="h-2.5 bg-stone-100 rounded w-1/2 mb-3" />
      {/* Price row */}
      <div className="flex items-center gap-2">
        <div className="h-3.5 bg-stone-200 rounded w-14" />
        <div className="h-2.5 bg-stone-100 rounded w-10" />
      </div>
    </div>
  );
}

/**
 * Renders `count` skeleton cards matching the ProductCard dimensions.
 * Drop this in place of a product grid while data is loading.
 */
export default function ProductSkeleton({ count = 8, className = '' }: ProductSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={className}>
          <SkeletonCard />
        </div>
      ))}
    </>
  );
}

/**
 * Convenience wrapper that renders skeletons inside a grid identical to the
 * product listing grids used on home and allproducts pages.
 */
export function ProductSkeletonGrid({ count = 8, cols = 4 }: { count?: number; cols?: 3 | 4 }) {
  const gridClass =
    cols === 4
      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-5 lg:gap-x-6 gap-y-8 sm:gap-y-10'
      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-5 lg:gap-x-6 gap-y-8 sm:gap-y-10';

  return (
    <div className={gridClass}>
      <ProductSkeleton count={count} />
    </div>
  );
}
