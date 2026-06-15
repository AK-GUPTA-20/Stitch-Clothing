'use client';
import React, { useState } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useGetAnalytics } from '@/lib/hooks/useSeller';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Star,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Formatting ───────────────────────────────────────────────────────────────

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatNum = (n: number) =>
  new Intl.NumberFormat('en-IN').format(n || 0);

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  packed: 'bg-violet-100 text-violet-700',
  dispatched: 'bg-sky-100 text-sky-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  return_requested: 'bg-orange-100 text-orange-700',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  colorClass = '',
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ElementType;
  trend?: number;
  colorClass?: string;
}) {
  return (
    <div className={`bg-white border border-stone-200 rounded-2xl p-5 ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400 font-semibold">
          {label}
        </p>
        <div className="w-8 h-8 bg-stone-50 rounded-xl flex items-center justify-center">
          <Icon size={14} className="text-stone-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      {(sublabel || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-bold ${
                trend >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sublabel && <p className="text-[10px] text-stone-400">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────

function RevenueChart({
  data,
}: {
  data: { date: string; revenue: number; orders: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-xs text-stone-400">No revenue data available</p>
      </div>
    );
  }

  // Format data for recharts
  const chartData = data.map((d) => {
    const dateObj = new Date(d.date);
    return {
      ...d,
      displayDate: dateObj.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      }),
      shortDate: dateObj.getDate().toString(),
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
          <XAxis
            dataKey={data.length <= 14 ? 'shortDate' : 'displayDate'}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#a8a29e' }}
            dy={10}
            minTickGap={20}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#a8a29e' }}
            tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
          />
          <Tooltip
            cursor={{ fill: '#f5f5f4' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-stone-200 p-3 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                      {data.displayDate}
                    </p>
                    <p className="text-sm font-bold text-stone-900">
                      {formatINR(data.revenue)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {data.orders} {data.orders === 1 ? 'order' : 'orders'}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="revenue"
            fill="#1c1917"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useGetAnalytics({ period });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = analytics as any;

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SellerLayout title="Analytics & Reports">
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse h-28 bg-stone-100 rounded-2xl" />
            ))}
          </div>
          <div className="animate-pulse h-48 bg-stone-100 rounded-2xl" />
          <div className="animate-pulse h-64 bg-stone-100 rounded-2xl" />
        </div>
      </SellerLayout>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error && !data) {
    return (
      <SellerLayout title="Analytics & Reports">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={28} className="text-red-400 mb-3" />
          <p className="text-sm font-semibold text-stone-700 mb-1">
            Could not load analytics
          </p>
          <p className="text-xs text-stone-400 mb-4">
            Check your connection and try again.
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:border-stone-400 transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </SellerLayout>
    );
  }

  // ── Data extraction ────────────────────────────────────────────────────────

  const revenue: number = data?.revenue ?? 0;
  const orders: number = data?.orders ?? 0;
  const aov: number =
    data?.averageOrderValue ?? (orders > 0 ? revenue / orders : 0);
  const productsSold: number = data?.productsSold ?? 0;
  const conversionRate: number = data?.conversionRate ?? 0;
  const returnsRate: number = data?.returnsRate ?? 0;
  const revenueByDay: { date: string; revenue: number; orders: number }[] =
    data?.revenueByDay ?? [];
  const topProducts: {
    productId?: string;
    name: string;
    salesCount?: number;
    sales?: number;
    revenue?: number;
    imageUrl?: string;
  }[] = data?.topProducts ?? data?.topPerformers ?? [];
  const ordersByStatus: Record<string, number> = data?.ordersByStatus ?? {};
  const lowStockProducts: {
    name: string;
    variantLabel?: string;
    variantSku?: string;
    stock: number;
  }[] = data?.lowStockProducts ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SellerLayout
      title="Analytics & Reports"
      description="Track your store performance and growth"
    >
      <div className="space-y-6">
        {/* ── Period Selector ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400 font-semibold mr-1">
            Period:
          </p>
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                period === p
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
          {data?.period && (
            <span className="text-[10px] text-stone-400 ml-2">
              {new Date(data.period.start).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              –{' '}
              {new Date(data.period.end).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard
            label="Revenue"
            value={formatINR(revenue)}
            sublabel={`for last ${PERIOD_LABELS[period]}`}
            icon={TrendingUp}
          />
          <KpiCard
            label="Total Orders"
            value={formatNum(orders)}
            icon={ShoppingBag}
          />
          <KpiCard
            label="Avg Order Value"
            value={formatINR(aov)}
            icon={BarChart3}
          />
          <KpiCard
            label="Products Sold"
            value={formatNum(productsSold)}
            sublabel="units"
            icon={Package}
          />
          <KpiCard
            label="Conversion Rate"
            value={`${conversionRate.toFixed(1)}%`}
            icon={ArrowUpRight}
          />
          <KpiCard
            label="Returns Rate"
            value={`${returnsRate.toFixed(1)}%`}
            icon={ArrowDownRight}
            colorClass={returnsRate > 5 ? 'border-amber-200 bg-amber-50' : ''}
          />
        </div>

        {/* ── Revenue Trend Chart ──────────────────────────────────────────── */}
        {revenueByDay.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60">
              <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">
                Revenue Trend
              </h3>
            </div>
            <div className="px-5 py-5">
              <RevenueChart data={revenueByDay} />
            </div>
          </div>
        )}

        {/* ── Bottom Grid ─────────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Top Products */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60">
              <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">
                Top Products
              </h3>
            </div>
            <div className="divide-y divide-stone-50">
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Star size={24} className="text-stone-200 mb-2" />
                  <p className="text-xs text-stone-400">No product data available</p>
                </div>
              ) : (
                topProducts.slice(0, 8).map((product, i) => (
                  <div
                    key={product.productId ?? i}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <span className="text-[11px] font-bold text-stone-400 w-5 shrink-0">
                      {i + 1}
                    </span>
                    {product.imageUrl && (
                      <img loading="lazy" decoding="async"
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-8 h-10 object-cover rounded-lg border border-stone-100 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-800 truncate">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {formatNum(product.salesCount ?? product.sales ?? 0)} sold
                      </p>
                    </div>
                    <p className="text-xs font-bold text-stone-900 shrink-0">
                      {formatINR(product.revenue ?? 0)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column: Orders by Status + Low Stock */}
          <div className="space-y-4">
            {/* Orders by Status */}
            {Object.keys(ordersByStatus).length > 0 && (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">
                    Orders by Status
                  </h3>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {Object.entries(ordersByStatus).map(([status, count]) => (
                    <div
                      key={status}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold ${
                        STATUS_COLORS[status] ?? 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-amber-600" />
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-amber-700 font-bold">
                    Low Stock Alerts
                  </h3>
                </div>
                <div className="divide-y divide-amber-100">
                  {lowStockProducts.slice(0, 5).map((item, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-amber-600">
                          {item.variantLabel ?? item.variantSku}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                        {item.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty fallback when both sections are empty */}
            {Object.keys(ordersByStatus).length === 0 &&
              lowStockProducts.length === 0 && (
                <div className="bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center py-12">
                  <BarChart3 size={24} className="text-stone-200 mb-2" />
                  <p className="text-xs text-stone-400">No additional data for this period</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
