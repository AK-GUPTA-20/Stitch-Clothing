// src/pages/404.tsx
import Link from "next/link";
import Head from "next/head";
import Footer from "@/components/Footer";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 — Page Not Found | STITCH</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center pt-20 px-6">
          <div className="text-center max-w-md">
            <p className="font-display text-[120px] md:text-[180px] text-stone-100 font-light italic leading-none select-none">
              404
            </p>
            <div className="-mt-4 relative z-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">Page not found</p>
              <h1 className="font-display text-4xl text-stone-900 font-light italic mb-4">
                Lost in the wardrobe?
              </h1>
              <p className="text-sm text-stone-400 mb-8 leading-relaxed">
                The page you&apos;re looking for has moved, or never existed. Let&apos;s get you back to something good.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 bg-stone-900 text-stone-50 px-7 py-3.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-stone-800 transition-colors"
                >
                  Go Home <ArrowRight size={13} />
                </Link>
                <Link
                  href="/#shop"
                  className="inline-flex items-center justify-center gap-2 border border-stone-200 text-stone-700 px-7 py-3.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:border-stone-900 transition-colors"
                >
                  Shop All
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
