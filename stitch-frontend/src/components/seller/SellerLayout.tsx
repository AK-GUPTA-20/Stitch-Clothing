import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { useGetMe } from '@/lib/hooks/useSeller';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingBag,
  Settings,
  FileCheck,
  Building2,
  WalletCards,
  CreditCard,
  Warehouse,
  Bell,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/seller/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/seller/analytics', icon: BarChart3 },
  { name: 'Products', href: '/seller/products', icon: Package },
  { name: 'Orders', href: '/seller/orders', icon: ShoppingBag },
  { name: 'Profile & Settings', href: '/seller/profile', icon: Settings },
  { name: 'KYC Documents', href: '/seller/kyc', icon: FileCheck },
  { name: 'Bank Details', href: '/seller/bank', icon: Building2 },
  { name: 'Wallet & Earnings', href: '/seller/wallet', icon: WalletCards },
  { name: 'Payouts', href: '/seller/payouts', icon: CreditCard },
  { name: 'Notifications', href: '/seller/notifications', icon: Bell },
];

interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  cls: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  verified: {
    label: 'Verified',
    icon: <CheckCircle2 size={10} />,
    cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  pending: {
    label: 'Pending Approval',
    icon: <Clock size={10} />,
    cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  suspended: {
    label: 'Suspended',
    icon: <AlertCircle size={10} />,
    cls: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  rejected: {
    label: 'Rejected',
    icon: <AlertCircle size={10} />,
    cls: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

function SellerStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg = STATUS_MAP[status] ?? STATUS_MAP['pending'];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase border px-1.5 py-0.5 rounded ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

interface SellerLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function SellerLayout({
  children,
  title,
  description,
  backHref,
  backLabel,
}: SellerLayoutProps) {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { data: sellerData } = useGetMe();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cast to any to allow loose field access across partial API shapes
  const seller = sellerData as any;

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'seller' && user.role !== 'admin') {
      router.push('/');
      return;
    }
    // If the seller profile doesn't exist and we're not already on the profile page, redirect them.
    // The API returns null when the profile hasn't been created yet.
    if (sellerData === null && router.pathname !== '/seller/profile') {
      router.push('/seller/profile');
    }
  }, [authLoading, user, router, sellerData]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [router.pathname]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Guard: don't render portal content for unauthorized users
  if (!user || (user.role !== 'seller' && user.role !== 'admin')) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex font-sans">
      {/* ── Mobile backdrop overlay ──────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 text-stone-300
          flex flex-col shrink-0
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-stone-800 shrink-0">
            <Link
              href="/seller/dashboard"
              className="flex items-center gap-2 font-display text-sm font-semibold tracking-[0.3em] text-white uppercase"
            >
              STITCH
              <span className="text-[9px] tracking-widest text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
                SELLER
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-stone-400 hover:text-white transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Seller identity block */}
          {seller && (
            <div className="px-4 py-3 border-b border-stone-800 bg-stone-950/30 shrink-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {seller.storeName || seller.businessName || user.name}
              </p>
              <div className="mt-1.5">
                <SellerStatusBadge status={seller.status} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="p-3 space-y-0.5 flex-1">
            {navigation.map((item) => {
              const isActive =
                router.pathname === item.href ||
                (item.href.length > 8 && router.pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-xs font-medium tracking-wide
                    transition-all duration-150 group
                    ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-sm font-semibold'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
                    }
                  `}
                >
                  <Icon
                    size={15}
                    className={
                      isActive
                        ? 'text-stone-900'
                        : 'text-stone-400 group-hover:text-stone-200 transition-colors'
                    }
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <ChevronRight size={12} className="text-stone-500 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Sidebar Footer ─────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 border-t border-stone-800 bg-stone-950/40">
          {/* User identity */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-8 w-8 rounded-full bg-stone-700 border border-stone-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name?.charAt(0)?.toUpperCase() ?? 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 py-2 px-2
                border border-stone-800 hover:border-stone-600
                text-[10px] tracking-wider uppercase font-semibold
                text-stone-400 hover:text-white
                rounded-lg transition-colors"
            >
              <ExternalLink size={11} />
              Site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-2
                bg-red-950/30 border border-red-900/30 hover:bg-red-950/50
                text-[10px] tracking-wider uppercase font-semibold
                text-red-400 hover:text-red-300
                rounded-lg transition-all"
            >
              <LogOut size={11} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top header bar */}
        <header className="h-16 bg-white border-b border-stone-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1 text-stone-500 hover:text-stone-900 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Optional back navigation */}
            {backHref && (
              <Link
                href={backHref}
                className="flex items-center gap-1.5 text-stone-400 hover:text-stone-900 transition-colors text-xs"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">{backLabel ?? 'Back'}</span>
              </Link>
            )}

            {/* Page title */}
            <div>
              <h1 className="text-sm font-semibold text-stone-900 leading-tight">
                {title}
              </h1>
              {description && (
                <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right-side badge */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[10px] font-bold tracking-widest text-stone-300 uppercase select-none">
              Seller Portal
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
