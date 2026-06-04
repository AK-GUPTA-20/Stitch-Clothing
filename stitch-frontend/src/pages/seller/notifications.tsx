'use client';
import React, { useState } from 'react';
import Head from 'next/head';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Bell, CheckCircle2, AlertTriangle, Package, WalletCards, Star, Info, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/lib/context/ToastContext';

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'order',
    title: 'New Order Received',
    message: 'Order #ORD-9981 has been placed and is awaiting confirmation.',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    icon: Package,
    color: 'bg-blue-50 text-blue-500 border-blue-100'
  },
  {
    id: 'n2',
    type: 'alert',
    title: 'Low Stock Alert',
    message: 'Ribbed Regular Fit Shirt is running low on stock (2 remaining).',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
    icon: AlertTriangle,
    color: 'bg-amber-50 text-amber-500 border-amber-100'
  },
  {
    id: 'n3',
    type: 'payout',
    title: 'Payout Processed',
    message: 'Your payout of $12,500 has been successfully processed to your bank account.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    icon: WalletCards,
    color: 'bg-emerald-50 text-emerald-500 border-emerald-100'
  },
  {
    id: 'n4',
    type: 'system',
    title: 'Platform Update',
    message: 'We have updated our seller terms and conditions. Please review them.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    read: true,
    icon: Info,
    color: 'bg-stone-50 text-stone-500 border-stone-200'
  }
];

export default function SellerNotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const toast = useToast();

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All marked as read');
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.success('Notifications cleared');
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => !n.read);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <Head>
        <title>Notifications | STITCH Seller</title>
      </Head>
      <SellerLayout title="Notifications" description="Stay updated with your store activity">
        <div className="max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${filter === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${filter === 'unread' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === 'unread' ? 'bg-white/20' : 'bg-stone-300'}`}>{unreadCount}</span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleMarkAllRead} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all" title="Mark all as read">
                <Check size={16} />
              </button>
              <button onClick={handleClearAll} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Clear all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
                <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-stone-300" />
                </div>
                <p className="text-sm font-semibold text-stone-900">No notifications</p>
                <p className="text-xs text-stone-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              filtered.map(notification => {
                const Icon = notification.icon;
                return (
                  <div 
                    key={notification.id} 
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                      notification.read ? 'bg-white border-stone-200 opacity-70' : 'bg-stone-50 border-stone-300 shadow-sm'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${notification.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-4">
                        <p className={`text-sm font-semibold truncate ${notification.read ? 'text-stone-700' : 'text-stone-900'}`}>
                          {notification.title}
                        </p>
                        <p className="text-[10px] text-stone-400 font-medium whitespace-nowrap">
                          {new Date(notification.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${notification.read ? 'text-stone-500' : 'text-stone-700'}`}>
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 ml-2">
                      {!notification.read && (
                        <button onClick={() => markRead(notification.id)} className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-all" title="Mark as read">
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteNotification(notification.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SellerLayout>
    </>
  );
}
