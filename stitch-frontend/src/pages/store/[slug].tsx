import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Shield, Star, CheckCircle2, Clock, Truck, Store, RefreshCcw, Package, MessageSquare } from 'lucide-react';

import { sellerService } from '@/lib/api/sellerService';
import { productService } from '@/lib/api/productService';
import ProductCard from '@/components/ProductCard';
import Loading from '@/components/Loading';
import Footer from '@/components/Footer';

export default function StorePage() {
  const router = useRouter();
  const slug = router.query.slug as string;

  const [page, setPage] = useState(1);

  // 1. Fetch Seller Info
  const { data: sellerRes, isLoading: isSellerLoading } = useQuery({
    queryKey: ['publicSeller', slug],
    queryFn: () => sellerService.getSellerBySlug(slug),
    enabled: !!slug,
  });

  // 2. Fetch Seller Analytics
  const { data: analyticsRes, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['publicSellerAnalytics', slug],
    queryFn: () => sellerService.getPublicAnalytics(slug),
    enabled: !!slug,
  });

  const seller = sellerRes?.data;
  const metrics = analyticsRes?.metrics;
  const sellerId = seller?._id || seller?.id;

  // 3. Fetch Products belonging to seller
  const { data: productsRes, isLoading: isProductsLoading } = useQuery({
    queryKey: ['sellerProducts', sellerId, page],
    queryFn: () => productService.getProducts({ sellerId: sellerId as string, page, limit: 12 }),
    enabled: !!sellerId,
  });

  if (isSellerLoading || isAnalyticsLoading) {
    return <div className="pt-32 pb-20"><Loading /></div>;
  }

  if (!seller || !metrics) {
    return (
      <div className="pt-32 pb-20 text-center">
        <Store size={48} className="mx-auto text-stone-200 mb-4" />
        <h2 className="font-serif text-2xl text-stone-900 mb-2">Store Not Found</h2>
        <p className="text-stone-500 font-sans">The seller you are looking for does not exist or is inactive.</p>
      </div>
    );
  }

  const store = seller.store || {};
  const isVerified = seller.status === 'verified';
  const products = productsRes?.data || [];
  const totalProducts = productsRes?.total || 0;

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{store.name || seller.businessName} - Stitch</title>
        <meta name="description" content={store.description || 'Shop premium clothing on Stitch.'} />
      </Head>

      <main className="pt-24 pb-20">
        {/* ── Hero Section ──────────────────────────────────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="relative rounded-3xl overflow-hidden bg-stone-100 min-h-[280px] md:min-h-[360px] flex items-center justify-center">
            {store.coverUrl ? (
              <img src={store.coverUrl} alt="Store Banner" className="absolute inset-0 w-full h-full object-cover opacity-90" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-100" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            
            <div className="relative z-10 flex flex-col items-center text-center px-4 mt-8 md:mt-16">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl bg-white flex items-center justify-center overflow-hidden mb-4">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-10 h-10 text-stone-300" />
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-serif text-white mb-2 drop-shadow-md">
                {store.name || seller.businessName}
              </h1>
              {isVerified && (
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold uppercase tracking-widest mb-3">
                  <Shield size={12} fill="currentColor" /> Verified Brand
                </div>
              )}
              {store.description && (
                <p className="text-stone-100 font-sans max-w-xl mx-auto drop-shadow-sm text-sm md:text-base">
                  {store.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Seller Insights ─────────────────────────────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-stone-50 rounded-2xl p-6 flex flex-col items-center text-center">
              <Star className="w-6 h-6 text-amber-500 mb-3" fill="currentColor" />
              <span className="text-2xl font-display text-stone-900">{metrics.averageProductRating || 'New'}</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Average Rating</span>
            </div>
            <div className="bg-stone-50 rounded-2xl p-6 flex flex-col items-center text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-3" />
              <span className="text-2xl font-display text-stone-900">{metrics.deliverySuccessRate}%</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Delivery Success</span>
            </div>
            <div className="bg-stone-50 rounded-2xl p-6 flex flex-col items-center text-center">
              <Clock className="w-6 h-6 text-sky-500 mb-3" />
              <span className="text-2xl font-display text-stone-900">{metrics.averageDeliveryTimeDays}d</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Avg Dispatch</span>
            </div>
            <div className="bg-stone-50 rounded-2xl p-6 flex flex-col items-center text-center">
              <RefreshCcw className="w-6 h-6 text-indigo-500 mb-3" />
              <span className="text-2xl font-display text-stone-900">{metrics.returnRate}%</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Return Rate</span>
            </div>
            <div className="bg-stone-50 rounded-2xl p-6 flex flex-col items-center text-center col-span-2 md:col-span-1">
              <Package className="w-6 h-6 text-rose-400 mb-3" />
              <span className="text-2xl font-display text-stone-900">{metrics.ordersDelivered > 1000 ? '1k+' : metrics.ordersDelivered}</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Orders Delivered</span>
            </div>
          </div>
        </div>

        {/* ── Product Catalog ─────────────────────────────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between border-b border-stone-200 pb-4 mb-8">
            <div>
              <h2 className="text-2xl font-serif text-stone-900">All Products</h2>
              <p className="text-sm text-stone-400 font-sans mt-1">{totalProducts} items available</p>
            </div>
          </div>

          {isProductsLoading ? (
            <div className="py-20 text-center"><Loading /></div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-stone-200 rounded-2xl">
              <Package size={32} className="mx-auto text-stone-300 mb-4" />
              <h3 className="font-semibold text-stone-900">No products found</h3>
              <p className="text-stone-500 text-sm mt-1">This seller hasn't listed any products yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id || product._id as string} product={product as any} />
                ))}
              </div>

              {/* Pagination */}
              {totalProducts > 12 && (
                <div className="flex items-center justify-center gap-2 mt-16">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 border border-stone-200 rounded-lg text-sm disabled:opacity-50 hover:bg-stone-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-stone-500">Page {page}</span>
                  <button
                    disabled={products.length < 12}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 border border-stone-200 rounded-lg text-sm disabled:opacity-50 hover:bg-stone-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
