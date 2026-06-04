'use client';
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SellerLayout } from '@/components/seller/SellerLayout';
import {
  useGetMe,
  useGetDashboard,
  useGetWallet,
  useGetWarehouses,
} from '@/lib/hooks/useSeller';
import {
  Package,
  ShoppingBag,
  WalletCards,
  AlertTriangle,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Warehouse,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const { data: sellerData, isLoading: sellerLoading } = useGetMe();
  const { data: dashboardData, isLoading: dashLoading } = useGetDashboard();
  const { data: walletData } = useGetWallet();
  const { data: warehousesData } = useGetWarehouses();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seller = sellerData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dashboard = dashboardData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wallet = walletData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const warehouses: any[] = (warehousesData as any)?.warehouses ?? [];

  const isLoading = sellerLoading || dashLoading;

  // ── Stat cards ─────────────────────────────────────────────────────────────

  const stats = [
    {
      label: 'Pending Orders',
      value:
        dashboard?.pendingOrders !== undefined
          ? String(dashboard.pendingOrders)
          : '—',
      sub: 'Need action',
      href: '/seller/orders',
      icon: ShoppingBag,
      cls: 'bg-amber-50 border-amber-100 text-amber-900',
    },
    {
      label: 'Wallet Balance',
      value: formatINR(wallet?.balance ?? dashboard?.walletBalance ?? 0),
      sub: 'Available',
      href: '/seller/wallet',
      icon: WalletCards,
      cls: 'bg-white border-stone-200 text-stone-900',
    },
    {
      label: 'Products',
      value:
        seller?.totalProducts !== undefined
          ? String(seller.totalProducts)
          : '—',
      sub:
        dashboard?.pendingApprovalProducts != null &&
        dashboard.pendingApprovalProducts > 0
          ? `${dashboard.pendingApprovalProducts} pending approval`
          : 'In catalog',
      href: '/seller/products',
      icon: Package,
      cls: 'bg-white border-stone-200 text-stone-900',
    },
    {
      label: 'Low Stock',
      value:
        dashboard?.lowStockCount !== undefined
          ? String(dashboard.lowStockCount)
          : '—',
      sub: 'Items to restock',
      href: '/seller/products',
      icon: AlertTriangle,
      cls:
        (dashboard?.lowStockCount ?? 0) > 0
          ? 'bg-red-50 border-red-100 text-red-900'
          : 'bg-white border-stone-200 text-stone-900',
    },
  ];

  // ── Quick actions ──────────────────────────────────────────────────────────

  const quickActions = [
    {
      label: 'New Product',
      href: '/seller/products/new',
      icon: Plus,
      cls: 'bg-stone-900 text-white hover:bg-stone-800',
    },
    {
      label: 'View Orders',
      href: '/seller/orders',
      icon: ShoppingBag,
      cls: 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400',
    },
    {
      label: 'Payouts',
      href: '/seller/payouts',
      icon: WalletCards,
      cls: 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400',
    },
    {
      label: 'KYC Docs',
      href: '/seller/kyc',
      icon: CheckCircle2,
      cls: 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400',
    },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SellerLayout title="Dashboard">
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-28 bg-stone-100 rounded-2xl" />
            ))}
          </div>
          <div className="animate-pulse h-16 bg-stone-100 rounded-2xl" />
          <div className="animate-pulse h-64 bg-stone-100 rounded-2xl" />
        </div>
      </SellerLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Seller Dashboard | STITCH</title>
        <meta name="description" content="Manage your STITCH seller account" />
      </Head>

      <SellerLayout
        title="Dashboard"
        description={
          seller?.storeName || seller?.businessName
            ? `Welcome back, ${seller.storeName || seller.businessName}`
            : 'Seller Overview'
        }
      >
        <div className="space-y-6">
          {/* ── Verification Alert ───────────────────────────────────────── */}
          {seller && seller.status !== 'verified' && (
            <div
              className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border ${
                seller.status === 'pending'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {seller.status === 'pending' ? (
                <Clock size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-semibold">
                  {seller.status === 'pending'
                    ? 'Account Pending Verification'
                    : seller.status === 'suspended'
                    ? 'Account Suspended'
                    : seller.status === 'rejected'
                    ? 'Account Rejected'
                    : 'Verification Required'}
                </p>
                <p className="text-[11px] mt-0.5 opacity-80">
                  {seller.status === 'pending'
                    ? 'Your account is under review. Complete your KYC to speed up the process.'
                    : seller.kycRejectionReason ||
                      'Please contact support for assistance.'}
                </p>
                {seller.status === 'pending' && (
                  <Link
                    href="/seller/kyc"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold underline"
                  >
                    Complete KYC <ArrowRight size={10} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Stat Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className={`block border rounded-2xl p-5 hover:shadow-sm transition-all ${stat.cls}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon size={16} className="opacity-60" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] tracking-[0.12em] uppercase font-semibold opacity-60 mt-1">
                    {stat.label}
                  </p>
                  <p className="text-[10px] opacity-50 mt-0.5">{stat.sub}</p>
                </Link>
              );
            })}
          </div>

          {/* ── Quick Actions ────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${action.cls}`}
                >
                  <Icon size={13} />
                  {action.label}
                </Link>
              );
            })}
          </div>

          {/* ── Recent Orders ────────────────────────────────────────────── */}
          {dashboard?.recentOrders && dashboard.recentOrders.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
                <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">
                  Recent Orders
                </h3>
                <Link
                  href="/seller/orders"
                  className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900 transition-colors"
                >
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              <div className="divide-y divide-stone-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {dashboard.recentOrders.slice(0, 5).map((order: any) => (
                  <div
                    key={order._id ?? order.orderId}
                    className="px-5 py-3.5 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-stone-900">
                        {order.orderId}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-stone-800">
                        {formatINR(order.pricing?.total ?? 0)}
                      </p>
                      <p
                        className={`text-[10px] capitalize font-medium ${
                          order.status === 'delivered'
                            ? 'text-emerald-500'
                            : order.status === 'cancelled'
                            ? 'text-red-500'
                            : order.status === 'pending'
                            ? 'text-amber-500'
                            : 'text-stone-400'
                        }`}
                      >
                        {order.status?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Warehouse Prompt ─────────────────────────────────────────── */}
          {warehouses.length === 0 && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Warehouse size={16} className="text-stone-400" />
                <div>
                  <p className="text-xs font-semibold text-stone-700">
                    No warehouses configured
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Add a warehouse to manage inventory locations
                  </p>
                </div>
              </div>
              <Link
                href="/seller/warehouses"
                className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 border border-stone-300 px-3 py-1.5 rounded-lg transition-all"
              >
                <Plus size={11} /> Add Warehouse
              </Link>
            </div>
          )}
        </div>
      </SellerLayout>
    </>
  );
}
