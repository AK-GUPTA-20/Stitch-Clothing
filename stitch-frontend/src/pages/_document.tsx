// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" data-scroll-behavior="smooth" className="overflow-x-hidden">
      <Head>
        {/* ── Charset & Viewport ───────────────────────────────────────────── */}
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#1c1917" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* ── SEO ─────────────────────────────────────────────────────────── */}
        <meta
          name="description"
          content="Considered clothing for the modern wardrobe. Minimal design, premium organic materials, made to last."
        />
        <meta name="author" content="Stitch" />
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="premium clothing, sustainable fashion, minimal design, organic materials" />

        {/* ── Open Graph ──────────────────────────────────────────────────── */}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:url" content="https://stitch.com" />
        <meta property="og:site_name" content="STITCH" />
        <meta property="og:title" content="STITCH — Premium Minimal Clothing" />
        <meta
          property="og:description"
          content="Considered clothing for the modern wardrobe. Minimal design, premium organic materials, made to last."
        />
        <meta
          property="og:image"
          content="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="STITCH — Premium clothing collection" />

        {/* ── Twitter Card ─────────────────────────────────────────────────── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@stitchstore" />
        <meta name="twitter:title" content="STITCH — Premium Minimal Clothing" />
        <meta
          name="twitter:description"
          content="Considered clothing for the modern wardrobe."
        />
        <meta
          name="twitter:image"
          content="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80"
        />

        {/* ── Preconnect to CDNs ───────────────────────────────────────────── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* ── Canonical & Alternate ────────────────────────────────────────── */}
        <link rel="canonical" href="https://stitch.com" />
      </Head>
      <body className="bg-stone-50 text-stone-900 antialiased overflow-x-hidden">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
