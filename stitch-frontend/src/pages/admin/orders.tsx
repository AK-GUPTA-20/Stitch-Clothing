// src/pages/admin/orders.tsx
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { orderService } from '@/lib/api/orderService';
import {
  Order, OrderStatus, OrderAnalytics, RefundRequest, RefundStatus, ReturnStatus,
  UpdateOrderStatusPayload, UpdateRefundStatusPayload, UpdateReturnStatusPayload,
} from '@/lib/types/order.types';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import Loading from '@/components/Loading';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Shield, Search, RefreshCw, X, AlertCircle, ChevronLeft, ChevronRight,
  Package, TrendingUp, CheckCircle2, XCircle, RotateCcw, DollarSign,
  ShoppingBag, Eye, FileText, Truck, Ban, SlidersHorizontal, Calendar,
  ArrowUpDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────



function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 20;

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'packed', 'dispatched', 'shipped',
  'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'return_approved',
  'return_rejected', 'return_picked', 'return_received', 'refund_initiated',
  'refund_completed', 'failed', 'on_hold',
];

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} z-10 animate-slide-in-up max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 shrink-0">
          <h3 className="text-sm font-semibold text-stone-900 font-sans">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors p-1 btn-xs" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sublabel, icon: Icon, colorClass,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans">{label}</p>
        <p className="font-display text-2xl font-light text-stone-900">{value}</p>
        {sublabel && <p className="text-[10px] text-stone-400 font-sans">{sublabel}</p>}
      </div>
    </div>
  );
}

// ─── Order Detail Modal ────────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
  onUpdateStatus,
  onMarkDelivered,
  onGenerateInvoice,
  onAdminCancel,
  onUpdateRefundStatus,
  onUpdateReturnStatus,
  refunds,
}: {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (status: OrderStatus, note?: string) => void;
  onMarkDelivered: () => void;
  onGenerateInvoice: () => void;
  onAdminCancel: (reason: string) => void;
  onUpdateRefundStatus: (refundId: string, status: RefundStatus, note?: string) => void;
  onUpdateReturnStatus: (status: ReturnStatus, note?: string) => void;
  refunds: RefundRequest[];
}) {
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusNote, setStatusNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>(order.returnRequest?.status ?? 'pending');
  const [returnNote, setReturnNote] = useState('');
  const [activeSection, setActiveSection] = useState<'status' | 'refunds' | 'return' | 'cancel'>('status');

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  return (
    <Modal title={`Order — ${order.orderId}`} onClose={onClose} wide>
      <div className="space-y-6">
        {/* Header info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={labelClass}>Status</p>
            <OrderStatusBadge status={order.status} />
          </div>
          <div>
            <p className={labelClass}>Payment</p>
            <OrderStatusBadge status={order.payment.status} type="payment" size="sm" />
          </div>
          <div>
            <p className={labelClass}>Date</p>
            <p className="text-xs text-stone-700 font-sans">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className={labelClass}>Total</p>
            <p className="text-sm font-semibold text-stone-900 font-sans">{formatCurrency(order.pricing.total)}</p>
          </div>
        </div>

        {/* Customer */}
        <div>
          <p className={labelClass}>Customer & Ship To</p>
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 text-[11px] font-sans text-stone-700 space-y-0.5">
            <p className="font-semibold text-stone-900">{order.shippingAddress.recipientName}</p>
            <p>{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
            <p>{order.shippingAddress.phone}</p>
          </div>
        </div>

        {/* Items summary */}
        <div>
          <p className={labelClass}>Items ({order.items.length})</p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {order.items.map(item => (
              <div key={item._id} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-stone-900 font-sans line-clamp-1">{item.productName}</p>
                  <p className="text-[10px] text-stone-400 font-sans">Qty {item.quantity}</p>
                </div>
                <p className="text-xs font-semibold text-stone-900 font-sans shrink-0 ml-2">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="border-t border-stone-100 pt-4">
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-4 overflow-x-auto">
            {(['status', 'refunds', 'return', 'cancel'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSection(tab)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-sans font-medium uppercase tracking-wider transition-all ${activeSection === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {tab === 'status' ? 'Update Status' : tab === 'refunds' ? `Refunds (${refunds.length})` : tab === 'return' ? 'Return' : 'Cancel'}
              </button>
            ))}
          </div>

          {/* Update Status */}
          {activeSection === 'status' && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className={inputClass}
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Note <span className="normal-case tracking-normal text-stone-400">(optional)</span></label>
                <input type="text" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className={inputClass} placeholder="Reason for status change…" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus(newStatus, statusNote || undefined)}
                  disabled={newStatus === order.status}
                  className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-40"
                >
                  Update Status
                </button>
                {!['delivered', 'cancelled', 'refund_completed'].includes(order.status) && (
                  <button
                    onClick={onMarkDelivered}
                    className="px-4 py-2.5 bg-green-600 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark Delivered
                  </button>
                )}
                <button
                  onClick={onGenerateInvoice}
                  className="px-4 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors"
                  title="Generate Invoice"
                >
                  <FileText size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Refunds */}
          {activeSection === 'refunds' && (
            <div className="space-y-3">
              {refunds.length === 0 ? (
                <p className="text-sm text-stone-400 font-sans text-center py-4">No refund requests for this order.</p>
              ) : (
                refunds.map((refund) => (
                  <RefundManageRow key={refund._id} refund={refund} onUpdateStatus={(status, note) => onUpdateRefundStatus(refund._id, status, note)} />
                ))
              )}
            </div>
          )}

          {/* Return */}
          {activeSection === 'return' && (
            <div className="space-y-3">
              {!order.returnRequest ? (
                <p className="text-sm text-stone-400 font-sans text-center py-4">No return request for this order.</p>
              ) : (
                <>
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 text-[11px] font-sans space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Current Status</span>
                      <OrderStatusBadge status={order.returnRequest.status ?? 'pending'} type="return" size="sm" />
                    </div>
                    <p className="text-stone-700"><span className="text-stone-400">Reason: </span>{order.returnRequest.reason}</p>
                    {order.returnRequest.adminNote && <p className="text-stone-500 italic">{order.returnRequest.adminNote}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Update Return Status</label>
                    <select value={returnStatus} onChange={(e) => setReturnStatus(e.target.value as ReturnStatus)} className={inputClass}>
                      {(['pending', 'approved', 'rejected', 'picked_up', 'received', 'refund_initiated'] as ReturnStatus[]).map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Admin Note</label>
                    <input type="text" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} className={inputClass} placeholder="Message to customer…" />
                  </div>
                  <button
                    onClick={() => onUpdateReturnStatus(returnStatus, returnNote || undefined)}
                    className="w-full py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    Update Return Status
                  </button>
                </>
              )}
            </div>
          )}

          {/* Cancel */}
          {activeSection === 'cancel' && (
            <div className="space-y-3">
              {['cancelled', 'refund_completed', 'delivered'].includes(order.status) ? (
                <p className="text-sm text-stone-400 font-sans text-center py-4">This order cannot be cancelled in its current state.</p>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-sm text-red-700 font-sans">Admin cancel will force-cancel this order regardless of its current state.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Reason <span className="text-red-400">*</span></label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-none`}
                      placeholder="Reason for cancellation…"
                      required
                    />
                  </div>
                  <button
                    onClick={() => cancelReason && onAdminCancel(cancelReason)}
                    disabled={!cancelReason}
                    className="w-full py-2.5 bg-red-600 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                    Admin Cancel Order
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Refund Manage Row ────────────────────────────────────────────────────────

function RefundManageRow({
  refund,
  onUpdateStatus,
}: {
  refund: RefundRequest;
  onUpdateStatus: (status: RefundStatus, note?: string) => void;
}) {
  const [status, setStatus] = useState<RefundStatus>(refund.status);
  const [note, setNote] = useState(refund.adminNote ?? '');
  const inputClass = 'w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all';

  return (
    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-stone-500">#{refund._id.slice(-8).toUpperCase()}</p>
          <p className="text-xs text-stone-700 font-sans">{refund.reason}</p>
          <p className="text-[10px] text-stone-400 font-sans">{formatCurrency(refund.amount)} · {formatDate(refund.requestedAt)}</p>
        </div>
        <OrderStatusBadge status={refund.status} type="refund" size="sm" />
      </div>
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RefundStatus)}
          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-[11px] text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all"
        >
          {(['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'] as RefundStatus[]).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-[11px] text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all" placeholder="Admin note…" />
        <button
          onClick={() => onUpdateStatus(status, note || undefined)}
          disabled={status === refund.status && !note}
          className="px-3 py-2 bg-stone-900 text-white text-[10px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-40 shrink-0"
        >
          Update
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToast();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<OrderAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detail/Modals ─────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderRefunds, setOrderRefunds] = useState<RefundRequest[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await orderService.getOrderAnalytics();
      setAnalytics(res.analytics);
    } catch { /* silent */ }
    finally { setAnalyticsLoading(false); }
  }, []);

  const fetchOrders = useCallback(async (p: number, status: string, q: string, start: string, end: string, payment: string) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { page: p, limit: PER_PAGE };
      if (status) params.status = status;
      if (q) params.search = q;
      if (start) params.startDate = start;
      if (end) params.endDate = end;
      if (payment) params.paymentStatus = payment;
      const res = await orderService.getAllOrders(params);
      setOrders(res.data ?? res.orders ?? []);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && user.role !== 'admin') { router.push('/'); return; }
    if (user?.role === 'admin') {
      fetchAnalytics();
      fetchOrders(page, statusFilter, search, startDate, endDate, paymentFilter);
    }
  }, [authLoading, user, page, statusFilter, startDate, endDate, paymentFilter, router, fetchAnalytics, fetchOrders]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchOrders(1, statusFilter, val, startDate, endDate, paymentFilter), 400);
  };

  // ── Open detail ─────────────────────────────────────────────────────────────

  const openDetail = async (order: Order) => {
    setSelectedOrder(order);
    setOrderRefunds([]);
    if (order.refunds && order.refunds.length > 0) {
      try {
        const res = await orderService.getRefunds(order._id);
        setOrderRefunds(res.refunds ?? []);
      } catch { /* silent */ }
    }
  };

  const closeDetail = () => {
    setSelectedOrder(null);
    setOrderRefunds([]);
  };

  const refreshOrderInList = (updated: Order) => {
    setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
    if (selectedOrder?._id === updated._id) setSelectedOrder(updated);
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleUpdateStatus = async (status: OrderStatus, note?: string) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const payload: UpdateOrderStatusPayload = { status, note };
      const res = await orderService.updateOrderStatus(selectedOrder._id, payload);
      refreshOrderInList((res as any).order || res);
      toast.success('Status updated', `Order is now ${status.replace(/_/g, ' ')}`);
    } catch (err: any) {
      toast.error('Update failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await orderService.markDelivered(selectedOrder._id);
      refreshOrderInList((res as any).order || res);
      toast.success('Marked as delivered');
    } catch (err: any) {
      toast.error('Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await orderService.generateInvoice(selectedOrder._id);
      if (res.invoiceUrl) window.open(res.invoiceUrl, '_blank');
      else toast.info('Invoice', 'Invoice is being generated.');
      if ((res as any).order || res) refreshOrderInList((res as any).order || res);
    } catch (err: any) {
      toast.error('Invoice failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminCancel = async (reason: string) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await orderService.adminCancelOrder(selectedOrder._id, { reason });
      refreshOrderInList((res as any).order || res);
      toast.success('Order cancelled', reason);
    } catch (err: any) {
      toast.error('Cancel failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRefundStatus = async (refundId: string, status: RefundStatus, note?: string) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const payload: UpdateRefundStatusPayload = { status, adminNote: note };
      const res = await orderService.updateRefundStatus(selectedOrder._id, refundId, payload);
      refreshOrderInList((res as any).order || res);
      // Re-fetch refunds
      const refRes = await orderService.getRefunds(selectedOrder._id);
      setOrderRefunds(refRes.refunds ?? []);
      toast.success('Refund status updated');
    } catch (err: any) {
      toast.error('Update failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateReturnStatus = async (status: ReturnStatus, note?: string) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const payload: UpdateReturnStatusPayload = { status, adminNote: note };
      const res = await orderService.updateReturnStatus(selectedOrder._id, payload);
      refreshOrderInList((res as any).order || res);
      toast.success('Return status updated');
    } catch (err: any) {
      toast.error('Update failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading) return <Loading />;
  if (!user || user.role !== 'admin') return null;

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <AdminLayout title="Orders">
      <Head>
        <title>Admin — Orders | STITCH</title>
        <meta name="description" content="Admin order management dashboard" />
      </Head>

      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Analytics */}
          {analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(8).fill(null).map((_, i) => (
                <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5 animate-pulse">
                  <div className="h-3 bg-stone-100 rounded w-24 mb-3" />
                  <div className="h-7 bg-stone-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Total Orders" value={analytics.totalOrders.toLocaleString('en-IN')} icon={ShoppingBag} colorClass="bg-blue-50 text-blue-600" />
              <MetricCard label="Revenue" value={formatCurrency(analytics.totalRevenue)} sublabel="All time" icon={TrendingUp} colorClass="bg-green-50 text-green-600" />
              <MetricCard label="Pending" value={analytics.pendingOrders} sublabel="Need action" icon={Package} colorClass="bg-amber-50 text-amber-600" />
              <MetricCard label="Delivered" value={analytics.deliveredOrders.toLocaleString('en-IN')} icon={CheckCircle2} colorClass="bg-emerald-50 text-emerald-600" />
              <MetricCard label="In Transit" value={analytics.shippedOrders} icon={Truck} colorClass="bg-sky-50 text-sky-600" />
              <MetricCard label="Cancelled" value={analytics.cancelledOrders} icon={XCircle} colorClass="bg-red-50 text-red-500" />
              <MetricCard label="Return Requests" value={analytics.returnRequests} icon={RotateCcw} colorClass="bg-orange-50 text-orange-600" />
              <MetricCard label="Pending Refunds" value={analytics.pendingRefunds} sublabel={`${formatCurrency(analytics.totalRefunded)} refunded`} icon={DollarSign} colorClass="bg-teal-50 text-teal-600" />
            </div>
          ) : null}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                id="admin-order-search"
                type="text"
                placeholder="Search order ID, customer, product…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all"
              />
              {search && (
                <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 btn-xs" aria-label="Clear">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>

            {/* Payment Status */}
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all"
            >
              <option value="">All Payments</option>
              <option value="pending">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Payment Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cod_pending">COD Pending</option>
              <option value="cod_verified">COD Verified</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="pl-8 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all"
                  title="From date"
                />
              </div>
              <span className="text-stone-300">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all"
                title="To date"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => { fetchAnalytics(); fetchOrders(page, statusFilter, search, startDate, endDate, paymentFilter); }}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors btn-xs"
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </button>

            {/* Clear Filters */}
            {(statusFilter || search || startDate || endDate || paymentFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setSearch(''); setStartDate(''); setEndDate(''); setPaymentFilter(''); setPage(1); }}
                className="px-4 py-2.5 text-stone-500 text-[11px] font-sans uppercase tracking-wider hover:text-stone-900 transition-colors btn-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 font-sans flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    {['Order', 'Customer', 'Items', 'Amount', 'Payment', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(8).fill(null).map((_, i) => (
                      <tr key={i} className="border-b border-stone-50">
                        {Array(8).fill(null).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-3 bg-stone-100 rounded animate-pulse" style={{ width: `${40 + (j * 9) % 45}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-stone-400 font-sans text-sm">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const primaryImage = order.items[0]?.productImage;
                      return (
                        <tr key={order._id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                          {/* Order */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-100 overflow-hidden shrink-0">
                                {primaryImage
                                  ? <img loading="lazy" decoding="async" src={primaryImage} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center"><Package size={12} className="text-stone-300" /></div>
                                }
                              </div>
                              <p className="text-[11px] font-mono font-semibold text-stone-900">{order.orderId}</p>
                            </div>
                          </td>
                          {/* Customer */}
                          <td className="px-5 py-4">
                            <p className="text-xs font-medium text-stone-700 font-sans">{order.shippingAddress.recipientName}</p>
                            <p className="text-[10px] text-stone-400 font-sans">{order.shippingAddress.city}</p>
                          </td>
                          {/* Items */}
                          <td className="px-5 py-4">
                            <p className="text-xs text-stone-600 font-sans">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                          </td>
                          {/* Amount */}
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-stone-900 font-sans whitespace-nowrap">{formatCurrency(order.pricing.total)}</p>
                          </td>
                          {/* Payment */}
                          <td className="px-5 py-4">
                            <OrderStatusBadge status={order.payment.status} type="payment" size="sm" showIcon={false} />
                          </td>
                          {/* Status */}
                          <td className="px-5 py-4">
                            <OrderStatusBadge status={order.status} size="sm" showIcon={false} />
                          </td>
                          {/* Date */}
                          <td className="px-5 py-4">
                            <p className="text-[10px] text-stone-500 font-sans whitespace-nowrap">{formatDate(order.createdAt)}</p>
                          </td>
                          {/* Actions */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => openDetail(order)}
                              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all btn-xs"
                              title="Manage order"
                            >
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-stone-100">
                <p className="text-xs text-stone-400 font-sans">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total} orders
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-xs" aria-label="Previous">
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-xs font-sans text-stone-600 px-1">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-xs" aria-label="Next">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

      {/* Order Detail & Management Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={closeDetail}
          onUpdateStatus={handleUpdateStatus}
          onMarkDelivered={handleMarkDelivered}
          onGenerateInvoice={handleGenerateInvoice}
          onAdminCancel={handleAdminCancel}
          onUpdateRefundStatus={handleUpdateRefundStatus}
          onUpdateReturnStatus={handleUpdateReturnStatus}
          refunds={orderRefunds}
        />
      )}
      </div>
    </AdminLayout>
  );
}
