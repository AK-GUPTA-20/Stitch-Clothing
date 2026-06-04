// src/pages/notifications.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/api/userService';
import Loading from '@/components/Loading';
import Footer from '@/components/Footer';
import { Bell, CheckCheck, Trash2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';

type Notification = {
  _id?: string;
  title: string;
  body: string;
  type: string;
  isRead?: boolean;
  createdAt?: string;
  data?: { actionUrl?: string };
};

const PER_PAGE = 20;

const TYPE_COLORS: Record<string, string> = {
  order:      'bg-blue-50 text-blue-600',
  promotion:  'bg-accent/10 text-[#7a5e1a]',
  system:     'bg-stone-100 text-stone-500',
  loyalty:    'bg-purple-50 text-purple-600',
  security:   'bg-red-50 text-red-500',
  default:    'bg-stone-100 text-stone-500',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (p: number, onlyUnread: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await userService.getNotifications(p, PER_PAGE, onlyUnread);
      setNotifications(res.notifications ?? []);
      setUnreadCount(res.unreadCount ?? 0);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchNotifications(page, unreadOnly);
  }, [authLoading, user, page, unreadOnly, fetchNotifications, router]);

  const handleMarkRead = async (id: string) => {
    try {
      await userService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await userService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await userService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotal((t) => t - 1);
    } catch { /* silent */ }
  };

  if (authLoading) return <Loading />;
  if (!user) return null;

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <Head>
        <title>Notifications | STITCH</title>
      </Head>
      <div className="min-h-screen bg-stone-50 pt-header">
        {/* Top bar */}
        <div className="bg-white border-b border-stone-100">
          <div className="container-page">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/profile" className="text-stone-400 hover:text-stone-900 transition-colors">
                  <ChevronLeft size={18} />
                </Link>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-stone-500 hover:text-stone-900 transition-colors font-sans disabled:opacity-50"
                >
                  <CheckCheck size={14} />
                  {markingAll ? 'Marking…' : 'Mark all read'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="container-page py-8">
          {/* Filter toggle */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setUnreadOnly(false); setPage(1); }}
              className={`px-4 py-2 text-[11px] tracking-widest uppercase font-sans font-medium rounded-lg transition-colors ${!unreadOnly ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
            >
              All
            </button>
            <button
              onClick={() => { setUnreadOnly(true); setPage(1); }}
              className={`px-4 py-2 text-[11px] tracking-widest uppercase font-sans font-medium rounded-lg transition-colors ${unreadOnly ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 font-sans mb-4">{error}</div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array(6).fill(null).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-stone-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-stone-100 rounded w-3/4" />
                      <div className="h-2.5 bg-stone-100 rounded w-1/2" />
                      <div className="h-2 bg-stone-100 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-20 text-center">
              <Bell size={36} strokeWidth={1.2} className="text-stone-300 mx-auto mb-4" />
              <p className="font-display text-2xl font-light text-stone-400 italic mb-2">
                {unreadOnly ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p className="text-sm text-stone-400 font-sans">
                {unreadOnly ? 'No unread notifications.' : "We'll notify you about orders, offers, and more."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => {
                const typeColor = TYPE_COLORS[notif.type] ?? TYPE_COLORS.default;
                return (
                  <div
                    key={notif._id}
                    className={`bg-white border rounded-xl p-5 flex items-start gap-4 transition-colors ${
                      !notif.isRead ? 'border-stone-300 shadow-sm' : 'border-stone-100'
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 shrink-0">
                      {!notif.isRead
                        ? <Circle size={8} className="fill-stone-900 text-stone-900" />
                        : <Circle size={8} className="text-stone-200" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-sans font-medium uppercase tracking-[0.1em] px-2 py-0.5 rounded-md ${typeColor}`}>
                          {notif.type || 'system'}
                        </span>
                        <span className="text-[10px] text-stone-400 font-sans">
                          {new Date(notif.createdAt || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-stone-900 font-sans">{notif.title}</p>
                      <p className="text-xs text-stone-500 font-sans mt-0.5 leading-relaxed">{notif.body}</p>
                      {notif.data?.actionUrl && (
                        <Link href={notif.data.actionUrl} className="text-[11px] text-stone-700 underline underline-offset-2 hover:text-stone-900 transition-colors font-sans mt-1.5 inline-block">
                          View details →
                        </Link>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif._id as string)}
                          className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all"
                          aria-label="Mark as read"
                          title="Mark as read"
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif._id as string)}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        aria-label="Delete notification"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <p className="text-xs text-stone-400 font-sans">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
                <span className="text-xs font-sans text-stone-600 px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
}
