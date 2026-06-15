import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Shield, Star, Package, Truck, Clock, RefreshCcw, ThumbsUp, ArrowRight, Store, CheckCircle2 } from 'lucide-react';
import { sellerService } from '@/lib/api/sellerService';
import Loading from '../Loading';

export default function PublicSellerProfile({ slug }: { slug: string }) {
  const { data: sellerRes, isLoading: isSellerLoading } = useQuery({
    queryKey: ['publicSeller', slug],
    queryFn: () => sellerService.getSellerBySlug(slug),
    enabled: !!slug,
  });

  const { data: analyticsRes, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['publicSellerAnalytics', slug],
    queryFn: () => sellerService.getPublicAnalytics(slug),
    enabled: !!slug,
  });

  if (isSellerLoading || isAnalyticsLoading) {
    return <Loading />;
  }

  const seller = (sellerRes as any)?.data ?? sellerRes;
  const analyticsData = (analyticsRes as any)?.data ?? analyticsRes;
  const metrics = analyticsData?.metrics;

  if (!seller || !metrics) {
    return null;
  }

  const store = seller.store || {};
  const isVerified = seller.verificationStatus === 'approved' || seller.status === 'verified';
  
  return (
    <div className="bg-stone-50 rounded-2xl p-6 md:p-8 mt-12 border border-stone-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
            {store.logo ? (
              <img loading="lazy" decoding="async" src={store.logo} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-6 h-6 text-stone-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold font-sans text-stone-900">{store.name || seller.businessName}</h3>
              {isVerified && (
                <Shield className="w-4 h-4 text-sky-500" fill="currentColor" />
              )}
            </div>
            {store.tagline && (
              <p className="text-sm text-stone-500 font-sans mt-0.5">{store.tagline}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-sm text-amber-500">
                <Star className="w-4 h-4" fill="currentColor" />
                <span className="font-medium text-stone-900">{metrics.averageProductRating || 'New'}</span>
                {metrics.totalReviews > 0 && <span className="text-stone-400">({metrics.totalReviews})</span>}
              </div>
              <span className="w-1 h-1 rounded-full bg-stone-300" />
              <span className="text-sm text-stone-500">
                {metrics.ordersDelivered > 50 ? '50+ Orders' : `${metrics.ordersDelivered} Orders`}
              </span>
            </div>
          </div>
        </div>
        
        <Link href={`/store/${slug}`} className="btn-primary whitespace-nowrap group text-sm px-6 py-2.5 w-full md:w-auto text-center">
          Visit Store
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-stone-100 flex flex-col items-center text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
          <span className="text-xl font-display">{metrics.deliverySuccessRate}%</span>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Success Rate</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-100 flex flex-col items-center text-center">
          <Clock className="w-5 h-5 text-sky-500 mb-2" />
          <span className="text-xl font-display">{metrics.averageDeliveryTimeDays}d</span>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Avg Delivery</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-100 flex flex-col items-center text-center">
          <RefreshCcw className="w-5 h-5 text-indigo-500 mb-2" />
          <span className="text-xl font-display">{metrics.returnRate}%</span>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Return Rate</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-100 flex flex-col items-center text-center">
          <Package className="w-5 h-5 text-rose-400 mb-2" />
          <span className="text-xl font-display">{metrics.activeProducts}</span>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-sans mt-1">Active Products</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-stone-100 text-sm font-sans text-stone-600">
        <div className="flex items-start gap-3">
          <ThumbsUp className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
          <p>
            <strong>Why buy from this seller?</strong>{' '}
            {isVerified && "Verified Business. "} 
            {Number(metrics.returnRate) < 5 && "Low Return Rate. "}
            {Number(metrics.deliverySuccessRate) > 95 && "High Delivery Success. "}
            {metrics.ordersDelivered > 100 && "Trusted Seller with over 100 successful deliveries."}
          </p>
        </div>
      </div>
    </div>
  );
}
