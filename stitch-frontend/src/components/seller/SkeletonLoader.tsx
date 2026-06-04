import React from 'react';

function SkeletonBlock({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-stone-100 rounded-lg ${className}`} style={style} />;
}

export function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
      <SkeletonBlock className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-10 w-full" />
      ))}
      <SkeletonBlock className="h-10 w-32" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="border-b border-stone-100 px-5 py-4">
        <SkeletonBlock className="h-3 w-1/4" />
      </div>
      <div className="divide-y divide-stone-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="px-5 py-4 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((__, j) => (
              <SkeletonBlock
                key={j}
                className="h-3"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  const colClass =
    count <= 2
      ? 'grid-cols-2'
      : count === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={`grid gap-4 ${colClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
          <SkeletonBlock className="h-3 w-1/2" />
          <SkeletonBlock className="h-8 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default SkeletonBlock;
