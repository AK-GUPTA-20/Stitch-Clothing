import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Store,
  LogOut,
  X,
  ChevronRight,
  Shield,
  Menu
} from 'lucide-react';

import {
  Settings,
  Webhook,
  FileText,
  Activity,
  Database
} from 'lucide-react';

const navigation = [
  { name: 'Users & Dashboard', href: '/admin', icon: Users },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Sellers', href: '/admin/sellers', icon: Store },
  { name: 'Settings', href: '/admin/settings/general', icon: Settings },
  { name: 'Content Pages', href: '/admin/content', icon: FileText },
  { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
  { name: 'Advanced Configs', href: '/admin/configs', icon: Database },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [router.pathname]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 text-stone-300
          flex flex-col shrink-0
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="h-16 flex items-center justify-between px-5 border-b border-stone-800 shrink-0">
            <Link href="/admin" className="flex items-center gap-2 font-display text-sm font-semibold tracking-[0.3em] text-white uppercase">
              STITCH
              <span className="text-[9px] tracking-widest text-blue-400 bg-stone-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Shield size={10} /> ADMIN
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-stone-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-stone-800 bg-stone-950/30 shrink-0">
            <p className="text-xs font-semibold text-white truncate leading-tight">
              {user.name}
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5 truncate">{user.email}</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const active = router.pathname === item.href || (item.href !== '/admin' && router.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all
                    ${active
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
                    }
                  `}
                >
                  <item.icon size={16} className={active ? 'text-blue-400' : 'text-stone-500 group-hover:text-stone-400'} />
                  {item.name}
                  {active && <ChevronRight size={14} className="ml-auto text-stone-600" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-stone-800 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-stone-400 hover:bg-stone-800/50 hover:text-stone-200 transition-all"
            >
              <LogOut size={16} className="text-stone-500" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 bg-stone-900 flex items-center px-4 border-b border-stone-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-stone-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="ml-3 text-xs font-semibold tracking-widest text-white uppercase">{title}</span>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
