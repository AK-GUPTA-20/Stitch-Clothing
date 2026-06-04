// src/pages/orders.tsx
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { orderService } from '@/lib/api/orderService';
import { Order, OrderStatus, RefundRequest, RequestReturnPayload, RequestRefundPayload } from '@/lib/types/order.types';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import {
  ChevronLeft, Search, Filter, RefreshCw, X, Package,
  RotateCcw, DollarSign, AlertCircle, ChevronLeft as Prev,
  ChevronRight as Next, ShoppingBag, FileText,
  ArrowRight,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All Orders',      value: '' },
  { label: 'Pending',         value: 'pending' },
  { label: 'Confirmed',       value: 'confirmed' },
  { label: 'Processing',      value: 'processing' },
  { label: 'Packed',          value: 'packed' },
  { label: 'Dispatched',      value: 'dispatched' },
  { label: 'Delivered',       value: 'delivered' },
  { label: 'Cancelled',       value: 'cancelled' },
  { label: 'Return / Refund', value: 'returns' },
];

// ─── Modal Component ───────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 animate-slide-in-up overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-900 font-sans">{title}</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 transition-colors p-1"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Refunds Tab ───────────────────────────────────────────────────────────────

function RefundRow({ refund }: { refund: RefundRequest }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-stone-900 font-sans">
          Refund #{refund._id.slice(-8).toUpperCase()}
        </p>
        <p className="text-[10px] text-stone-400 font-sans mt-0.5">{refund.reason}</p>
        <p className="text-[10px] text-stone-400 font-sans">
          {new Date(refund.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-stone-900 font-sans">
          ₹{refund.amount.toLocaleString('en-IN')}
        </p>
        <OrderStatusBadge status={refund.status} type="refund" size="sm" className="mt-1" />
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyOrders({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="text-center max-w-xs">
        <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6">
          <Package size={32} strokeWidth={1.2} className="text-stone-300" />
        </div>
        {filtered ? (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans mb-2">No results</p>
            <h2 className="font-display text-2xl font-light italic text-stone-900 mb-3">No orders found</h2>
            <p className="text-sm text-stone-400 font-sans leading-relaxed">
              Try adjusting your filters or search term.
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans mb-2">Nothing yet</p>
            <h2 className="font-display text-2xl font-light italic text-stone-900 mb-3">No orders placed</h2>
            <p className="text-sm text-stone-400 font-sans leading-relaxed mb-8">
              Your order history will appear here once you make your first purchase.
            </p>
            <Link
              href="/#shop"
              className="inline-flex items-center gap-2 bg-stone-900 text-stone-50 px-8 py-3.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-stone-800 transition-colors"
            >
              Start Shopping <ArrowRight size={13} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {Array(4).fill(null).map((_, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[0, 1].map(j => (
                <div key={j} className="w-10 h-10 rounded-lg bg-stone-100 border-2 border-white" />
              ))}
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-stone-100 rounded w-32" />
              <div className="h-2 bg-stone-100 rounded w-48" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ModalType = 'cancel' | 'cancel-item' | 'return' | 'refund' | null;

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToast();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'refunds'>('orders');

  // ── Refunds ─────────────────────────────────────────────────────────────────
  const [allRefunds, setAllRefunds] = useState<{ orderId: string; refunds: RefundRequest[] }[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Cancel state ─────────────────────────────────────────────────────────────
  const [cancelReason, setCancelReason] = useState('');

  // ── Return state ──────────────────────────────────────────────────────────────
  const [returnReason, setReturnReason] = useState('');
  const [returnItems, setReturnItems] = useState<{ orderItemId: string; quantity: number }[]>([]);

  // ── Refund state ──────────────────────────────────────────────────────────────
  const [refundReason, setRefundReason] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch Orders ─────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (p: number, status: string, q: string) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { page: p, limit: PER_PAGE };
      if (status) params.orderStatus = status;
      if (q) params.search = q;
      const res = await orderService.getMyOrders(params);
      setOrders(res.data ?? res.orders ?? []);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRefunds = useCallback(async (orderList: Order[]) => {
    setRefundsLoading(true);
    try {
      const results = await Promise.allSettled(
        orderList
          .filter(o => o.refunds && o.refunds.length > 0)
          .map(async (o) => {
            const res = await orderService.getRefunds(o._id);
            return { orderId: o._id, refunds: res.refunds ?? [] };
          })
      );
      const successful = results
        .filter((r): r is PromiseFulfilledResult<{ orderId: string; refunds: RefundRequest[] }> => r.status === 'fulfilled')
        .map(r => r.value);
      setAllRefunds(successful);
    } catch {
      // silent
    } finally {
      setRefundsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) fetchOrders(page, statusFilter, search);
  }, [authLoading, user, page, statusFilter, router, fetchOrders]);

  useEffect(() => {
    if (activeTab === 'refunds' && orders.length > 0) {
      fetchRefunds(orders);
    }
  }, [activeTab, orders, fetchRefunds]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchOrders(1, statusFilter, val), 400);
  };

  const openModal = (order: Order, type: ModalType) => {
    setSelectedOrder(order);
    setModal(type);
    setCancelReason('');
    setReturnReason('');
    setRefundReason('');
    if (type === 'return') {
      setReturnItems(order.items.map(i => ({ orderItemId: i._id, quantity: i.quantity })));
    }
  };

  const closeModal = () => {
    setModal(null);
    setSelectedOrder(null);
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await orderService.cancelOrder(selectedOrder._id, { reason: cancelReason || undefined });
      toast.success('Order cancelled', 'Your cancellation request has been submitted.');
      setOrders(prev =>
        prev.map(o => o._id === selectedOrder._id ? { ...o, status: 'cancelled' as OrderStatus } : o)
      );
      closeModal();
    } catch (err: any) {
      toast.error('Cancellation failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedOrder || !returnReason) return;
    setActionLoading(true);
    try {
      const payload: RequestReturnPayload = {
        reason: returnReason,
        items: returnItems,
      };
      await orderService.requestReturn(selectedOrder._id, payload);
      toast.success('Return requested', 'We will process your return shortly.');
      setOrders(prev =>
        prev.map(o => o._id === selectedOrder._id ? { ...o, status: 'return_requested' as OrderStatus } : o)
      );
      closeModal();
    } catch (err: any) {
      toast.error('Return request failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder || !refundReason) return;
    setActionLoading(true);
    try {
      const payload: RequestRefundPayload = { reason: refundReason };
      await orderService.requestRefund(selectedOrder._id, payload);
      toast.success('Refund requested', 'We will process your refund shortly.');
      closeModal();
    } catch (err: any) {
      toast.error('Refund request failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewInvoice = async (order: Order) => {
    try {
      const res = await orderService.getInvoice(order._id);
      if (res.invoiceUrl) {
        window.open(res.invoiceUrl, '_blank');
      } else {
        toast.info('Invoice', 'Invoice is being generated. Please try again shortly.');
      }
    } catch (err: any) {
      toast.error('Invoice unavailable', err.message);
    }
  };

  if (authLoading) return <Loading />;
  if (!user) return null;

  const totalPages = Math.ceil(total / PER_PAGE);
  const hasActiveFilter = !!statusFilter || !!search;
  const flatRefunds = allRefunds.flatMap(r => r.refunds);

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  return (
    <>
      <Head>
        <title>My Orders | STITCH</title>
        <meta name="description" content="View and manage your order history, returns, and refunds." />
      </Head>

      <div className="min-h-screen bg-stone-50 pt-header flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-stone-100 sticky top-(--h-header) z-10">
          <div className="container-page">
            <div className="flex items-center gap-4 h-14">
              <Link href="/profile" className="text-stone-400 hover:text-stone-900 transition-colors btn-xs" aria-label="Back to profile">
                <ChevronLeft size={18} />
              </Link>
              <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans flex-1">My Orders</p>
              {total > 0 && (
                <span className="text-[10px] text-stone-400 font-sans">{total} order{total !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 container-page py-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-6 w-fit">
            {([
              { key: 'orders', label: 'Orders', icon: ShoppingBag },
              { key: 'refunds', label: 'Refunds', icon: DollarSign },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-sans font-medium uppercase tracking-[0.12em] transition-all ${
                  activeTab === key
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="order-search"
                    type="text"
                    placeholder="Search by order ID, product…"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 btn-xs"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Refresh */}
                <button
                  onClick={() => fetchOrders(page, statusFilter, search)}
                  className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors btn-xs"
                  aria-label="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setStatusFilter(f.value); setPage(1); }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-sans font-medium uppercase tracking-widest transition-all ${
                      statusFilter === f.value
                        ? 'bg-stone-900 text-white'
                        : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-2 text-sm text-red-700 font-sans">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              {/* Orders List */}
              {loading ? (
                <OrderSkeleton />
              ) : orders.length === 0 ? (
                <EmptyOrders filtered={hasActiveFilter} />
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      expanded={expandedId === order._id}
                      onToggle={() => setExpandedId(prev => prev === order._id ? null : order._id)}
                      onCancel={(o) => openModal(o, 'cancel')}
                      onReturn={(o) => openModal(o, 'return')}
                      onRefund={(o) => openModal(o, 'refund')}
                      onViewInvoice={handleViewInvoice}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-stone-400 font-sans">
                    {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-xs"
                      aria-label="Previous page"
                    >
                      <Prev size={13} />
                    </button>
                    <span className="text-xs font-sans text-stone-600 px-2">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-xs"
                      aria-label="Next page"
                    >
                      <Next size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Refunds Tab */}
          {activeTab === 'refunds' && (
            <div className="space-y-4">
              {refundsLoading ? (
                <div className="space-y-3">
                  {Array(3).fill(null).map((_, i) => (
                    <div key={i} className="bg-white border border-stone-200 rounded-xl p-4 animate-pulse">
                      <div className="h-3 bg-stone-100 rounded w-40 mb-2" />
                      <div className="h-2 bg-stone-100 rounded w-60" />
                    </div>
                  ))}
                </div>
              ) : flatRefunds.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-xs">
                    <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6">
                      <RotateCcw size={32} strokeWidth={1.2} className="text-stone-300" />
                    </div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans mb-2">No refunds</p>
                    <h2 className="font-display text-2xl font-light italic text-stone-900">No refund requests</h2>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {flatRefunds.map((refund) => (
                    <RefundRow key={refund._id} refund={refund} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Footer />
      </div>

      {/* ── Cancel Modal ──────────────────────────────────────────────────────── */}
      {modal === 'cancel' && selectedOrder && (
        <Modal title="Cancel Order" onClose={closeModal}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-sans">
                Cancel order <strong>{selectedOrder.orderId}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div>
              <label className={labelClass}>Reason <span className="normal-case tracking-normal text-stone-400">(optional)</span></label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Why are you cancelling this order?"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Return Modal ──────────────────────────────────────────────────────── */}
      {modal === 'return' && selectedOrder && (
        <Modal title="Request Return" onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">
              Request a return for order <strong className="text-stone-900">{selectedOrder.orderId}</strong>.
              Our team will review and arrange pickup.
            </p>

            {/* Item checkboxes */}
            <div>
              <label className={labelClass}>Items to return</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedOrder.items.filter(i => i.isReturnable).map((item) => {
                  const isChecked = returnItems.some(r => r.orderItemId === item._id);
                  return (
                    <label
                      key={item._id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setReturnItems(prev => [...prev, { orderItemId: item._id, quantity: item.quantity }]);
                          } else {
                            setReturnItems(prev => prev.filter(r => r.orderItemId !== item._id));
                          }
                        }}
                        className="accent-stone-900"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-900 font-sans line-clamp-1">{item.productName}</p>
                        <p className="text-[10px] text-stone-400 font-sans">Qty: {item.quantity}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Reason for return <span className="text-red-400">*</span></label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Describe why you want to return this item…"
                required
              />
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleReturn}
                disabled={actionLoading || !returnReason || returnItems.length === 0}
                className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Submitting…' : 'Request Return'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Refund Modal ──────────────────────────────────────────────────────── */}
      {modal === 'refund' && selectedOrder && (
        <Modal title="Request Refund" onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">
              Request a refund for order <strong className="text-stone-900">{selectedOrder.orderId}</strong>.
              Amount: <strong className="text-stone-900">₹{selectedOrder.pricing.total.toLocaleString('en-IN')}</strong>
            </p>

            <div>
              <label className={labelClass}>Reason for refund <span className="text-red-400">*</span></label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Describe why you want a refund…"
                required
              />
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={actionLoading || !refundReason}
                className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Submitting…' : 'Request Refund'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
