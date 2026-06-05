// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { Inter, Cormorant_Garamond, Geist } from "next/font/google";
import "../globals.css";
import { CartProvider } from "@/lib/context/CartContext";
import { ProfileProvider } from "@/lib/context/ProfileContext";
import { WishlistProvider } from "@/lib/context/WishlistContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ProductProvider } from "@/lib/context/ProductContext";
import { ConfigProvider } from "@/lib/context/ConfigContext";
import Header from "@/components/Header";
import { cn } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { SeoHead } from "@/components/common/SeoHead";
import { useState } from "react";
import { ApiError } from "@/lib/api/apiClient";
import { useConfig } from "@/lib/context/ConfigContext";
import { useRouter } from "next/router";

// ── Google Fonts (CSS variable approach) ────────────────────────────────────
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// ── App Content ──────────────────────────────────────────────────────────────
function AppContent({ Component, pageProps }: { Component: AppProps["Component"]; pageProps: AppProps["pageProps"] }) {
  const { settings, isLoading } = useConfig();
  const router = useRouter();

  const isMaintenance = settings?.general?.maintenanceMode === true;
  const isAdmin = router.pathname.startsWith("/admin");

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">Loading STITCH</p>
        </div>
      </div>
    );
  }

  if (isMaintenance && !isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-stone-900 text-stone-50 p-6 text-center">
        <h1 className="text-3xl font-display font-light mb-4">Under Maintenance</h1>
        <p className="text-sm text-stone-400 font-sans max-w-md leading-relaxed">
          {settings?.general?.maintenanceMessage ||
            "We're currently updating our systems. Please check back later."}
        </p>
      </div>
    );
  }

  return (
    <>
      <SeoHead />
      {!isAdmin && <Header />}
      <Component {...pageProps} />
    </>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App({ Component, pageProps }: AppProps) {
  // ✅ QueryClient created inside component (not at module level) to avoid
  // shared state issues in React Strict Mode and across HMR reloads.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't retry on 4xx client errors — only on network/5xx failures
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            staleTime: 30_000, // 30 seconds default stale time
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <div
      className={cn(
        inter.variable,
        cormorant.variable,
        geist.variable,
        "font-sans overflow-x-hidden min-h-screen"
      )}
    >
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <AuthProvider>
            <ProductProvider>
              <CartProvider>
                <ProfileProvider>
                  <WishlistProvider>
                    <ToastProvider>
                      <ErrorBoundary>
                        <AppContent Component={Component} pageProps={pageProps} />
                      </ErrorBoundary>
                    </ToastProvider>
                  </WishlistProvider>
                </ProfileProvider>
              </CartProvider>
            </ProductProvider>
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </div>
  );
}
