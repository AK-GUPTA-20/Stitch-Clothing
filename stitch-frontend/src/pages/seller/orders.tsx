// src/pages/seller/orders.tsx
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { orderService } from '@/lib/api/orderService';
import { SellerLayout } from '@/components/seller/SellerLayout';
import {
  Order, OrderStatus, DispatchOrderPayload, UpdateTrackingPayload
} from '@/lib/types/order.types';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import Loading from '@/components/Loading';
import {
  Package, Truck, Search, RefreshCw, ChevronLeft, ChevronRight,
  X, CheckCircle2, AlertCircle, Eye, PackageCheck, Send,
  ArrowRight, SlidersHorizontal, MapPin, ExternalLink, ShoppingBag,
  Wallet, Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────



function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 20;

const STATUS_FILTERS = [
  { label: 'All',          value: '' },
  { label: 'Pending',      value: 'pending' },
  { label: 'Confirmed',    value: 'confirmed' },
  { label: 'Processing',   value: 'processing' },
  { label: 'Packed',       value: 'packed' },
  { label: 'Dispatched',   value: 'dispatched' },
  { label: 'Delivered',    value: 'delivered' },
  { label: 'Cancelled',    value: 'cancelled' },
  { label: 'Returns',      value: 'returns' },
];

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 animate-slide-in-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-900 font-sans">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors p-1 btn-xs" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sublabel, colorClass }: { label: string; value: number | string; sublabel?: string; colorClass: string }) {
  return (
    <div className={`rounded-2xl p-5 ${colorClass}`}>
      <p className="text-[10px] tracking-[0.18em] uppercase font-sans font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-display font-light">{value}</p>
      {sublabel && <p className="text-[11px] font-sans opacity-60 mt-0.5">{sublabel}</p>}
    </div>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  onConfirm: () => void;
  onProcess: () => void;
  onPack: () => void;
  onDispatch: () => void;
  onUpdateTracking: () => void;
  onCancel: () => void;
  onDeliver: () => void;
  onHandleReturn: () => void;
  onViewDetail: () => void;
  onStatusChange: (status: string) => void;
}

function OrderRow({
  order,
  onConfirm,
  onProcess,
  onPack,
  onDispatch,
  onUpdateTracking,
  onCancel,
  onDeliver,
  onHandleReturn,
  onViewDetail,
  onStatusChange,
}: OrderRowProps) {
  const items = order.items;
  const primaryImage = items[0]?.productImage;

  const orderStatus = order.status || (order as any).orderStatus;

  const canConfirm = orderStatus === 'pending';
  const canProcess = orderStatus === 'confirmed';
  const canPack = orderStatus === 'processing';
  const canDispatch = orderStatus === 'packed';
  const canUpdateTracking = ['dispatched'].includes(orderStatus);
  const canDeliver = ['dispatched'].includes(orderStatus);
  const canCancel = ['pending', 'confirmed'].includes(orderStatus);
  const canHandleReturn = orderStatus === 'returns';

  return (
    <tr className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
      {/* Order */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-100">
            {primaryImage ? (
              <img src={primaryImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={14} className="text-stone-300" />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-mono font-semibold text-stone-900">{order.orderId}</p>
            <p className="text-[10px] text-stone-400 font-sans">{formatDate(order.createdAt)}</p>
          </div>
        </div>
      </td>

      {/* Customer */}
      <td className="px-5 py-4">
        <p className="text-xs font-medium text-stone-700 font-sans">{order.shippingAddress.recipientName}</p>
        <p className="text-[10px] text-stone-400 font-sans">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
      </td>

      {/* Items */}
      <td className="px-5 py-4">
        <p className="text-xs text-stone-700 font-sans">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        <p className="text-[10px] text-stone-400 font-sans line-clamp-1">{items[0]?.productName}</p>
      </td>

      {/* Amount */}
      <td className="px-5 py-4">
        <p className="text-xs font-semibold text-stone-900 font-sans">{formatCurrency(order.pricing.total)}</p>
        <p className="text-[10px] text-stone-400 font-sans capitalize">{order.payment.method?.replace(/_/g, ' ')}</p>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <OrderStatusBadge status={orderStatus} size="sm" showIcon={false} />
        {order.payment.status && (
          <div className="mt-1">
            <OrderStatusBadge status={order.payment.status} type="payment" size="sm" showIcon={false} />
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onViewDetail}
            title="View detail"
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all btn-xs"
          >
            <Eye size={13} />
          </button>



          {canConfirm && (
            <button
              onClick={onConfirm}
              title="Confirm order"
              className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all btn-xs"
            >
              <CheckCircle2 size={13} />
            </button>
          )}

          {canProcess && (
            <button
              onClick={onProcess}
              title="Process order"
              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all btn-xs"
            >
              <RefreshCw size={13} />
            </button>
          )}

          {canPack && (
            <button
              onClick={onPack}
              title="Mark as packed"
              className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-all btn-xs"
            >
              <PackageCheck size={13} />
            </button>
          )}

          {canDispatch && (
            <button
              onClick={onDispatch}
              title="Dispatch order"
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-sans font-medium uppercase tracking-wider text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-all btn-xs"
            >
              <Send size={10} />
              Dispatch
            </button>
          )}

          {canUpdateTracking && (
            <button
              onClick={onUpdateTracking}
              title="Update tracking"
              className="p-1.5 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-all btn-xs"
            >
              <Truck size={13} />
            </button>
          )}

          {canDeliver && (
            <button
              onClick={onDeliver}
              title="Mark as delivered"
              className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all btn-xs"
            >
              <CheckCircle2 size={13} />
            </button>
          )}

          {canCancel && (
            <button
              onClick={onCancel}
              title="Cancel order"
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all btn-xs"
            >
              <X size={13} />
            </button>
          )}

          {canHandleReturn && (
            <button
              onClick={onHandleReturn}
              title="Process Return"
              className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all btn-xs"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Detail Slide-out ─────────────────────────────────────────────────────────

function OrderDetailPanel({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-sans">Order Detail</p>
            <p className="font-mono text-sm font-semibold text-stone-900">{order.orderId}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors p-1 btn-xs" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <OrderStatusBadge status={order.payment.status} type="payment" size="sm" />
          </div>

          {/* Timeline */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-3">Timeline</p>
              <div className="relative pl-3 border-l-2 border-stone-100 space-y-4">
                {order.statusHistory.map((historyItem, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 bg-stone-200 rounded-full border-2 border-white"></div>
                    <div className="pl-1">
                      <p className="text-xs font-semibold text-stone-900 capitalize">{historyItem.status.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-stone-500">{formatDate(historyItem.timestamp)} • by {historyItem.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-3">Items</p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-stone-50 rounded-lg border border-stone-100 overflow-hidden shrink-0">
                    {item.productImage ? (
                      <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-stone-200" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-900 font-sans line-clamp-1">{item.productName}</p>
                    <p className="text-[10px] text-stone-400 font-sans">Qty: {item.quantity} · {formatCurrency(item.totalPrice)}</p>
                    <OrderStatusBadge status={item.status} type="item" size="sm" showIcon={false} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Address */}
          <div>
            <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-2">Ship To</p>
            <div className="bg-stone-50 rounded-xl p-4 text-[11px] font-sans text-stone-700 space-y-0.5 border border-stone-100">
              <p className="font-semibold text-stone-900">{order.shippingAddress.recipientName}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Tracking */}
          {order.tracking?.awbNumber && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-2">Tracking</p>
              <div className="bg-stone-50 rounded-xl p-4 text-[11px] font-sans border border-stone-100 space-y-1">
                <p><span className="text-stone-400">Courier:</span> <span className="text-stone-900 font-medium">{order.tracking.courier}</span></p>
                <p><span className="text-stone-400">AWB:</span> <span className="font-mono text-stone-900">{order.tracking.awbNumber}</span></p>
                {order.tracking.estimatedDelivery && (
                  <p><span className="text-stone-400">Est. Delivery:</span> {formatDate(order.tracking.estimatedDelivery)}</p>
                )}
                {order.tracking.trackingUrl && (
                  <a href={order.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:text-accent-dark transition-colors mt-1">
                    <ExternalLink size={10} />
                    Track Package
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Earnings / Wallet Credit */}
          <div>
            <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-2">Earnings</p>
            {order.payment.method === 'cod' ? (
              order.status === 'delivered' ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                  <Wallet size={13} className="text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-green-800">Wallet Credited</p>
                    <p className="text-[10px] text-green-700 mt-0.5">
                      {formatCurrency(order.pricing.total)} credited to your wallet after delivery.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <Clock size={13} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-amber-800">Pending — Credit on Delivery</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      {formatCurrency(order.pricing.total)} will be credited to your wallet when this order is marked as delivered.
                    </p>
                  </div>
                </div>
              )
            ) : (
              order.payment.status === 'paid' ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                  <Wallet size={13} className="text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-green-800">Wallet Credited</p>
                    <p className="text-[10px] text-green-700 mt-0.5">
                      {formatCurrency(order.pricing.total)} credited instantly on payment confirmation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl bg-stone-50 border border-stone-100 px-4 py-3">
                  <Clock size={13} className="text-stone-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-stone-700">Awaiting Payment</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {formatCurrency(order.pricing.total)} will be credited once the online payment is confirmed.
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Pricing */}
          <div>
            <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-2">Pricing</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                <span>Subtotal</span><span>{formatCurrency(order.pricing.subtotal)}</span>
              </div>
              {(order.pricing.shippingCharge ?? 0) > 0 && (
                <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                  <span>Shipping</span><span>{formatCurrency(order.pricing.shippingCharge!)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-stone-900 font-sans pt-2 border-t border-stone-200">
                <span>Total</span><span>{formatCurrency(order.pricing.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ModalType = 'dispatch' | 'tracking' | 'cancel' | 'confirm-action' | 'return-action' | null;

type ConfirmActionPayload = { order: Order; action: 'confirm' | 'process' | 'pack' | 'deliver' };

import { useQueryClient } from '@tanstack/react-query';

export default function SellerOrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Dispatch form
  const [dispatchForm, setDispatchForm] = useState<DispatchOrderPayload>({
    courier: '', awbNumber: '', trackingUrl: '', estimatedDelivery: '',
  });

  // Tracking form
  const [trackingForm, setTrackingForm] = useState<UpdateTrackingPayload>({
    status: '', location: '', description: '',
  });

  // Cancel form
  const [cancelReason, setCancelReason] = useState('');

  // Confirmation state
  const [confirmPayload, setConfirmPayload] = useState<ConfirmActionPayload | null>(null);

  // Return state
  const [returnStatus, setReturnStatus] = useState('');
  const [returnNote, setReturnNote] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (p: number, status: string, q: string) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { page: p, limit: PER_PAGE };
      if (status) params.orderStatus = status;
      if (q) params.search = q;
      const res = await orderService.getSellerOrders(params);
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
    if (!authLoading && user && user.role !== 'seller' && user.role !== 'admin') {
      router.push('/'); return;
    }
    if (user) fetchOrders(page, statusFilter, search);
  }, [authLoading, user, page, statusFilter, router, fetchOrders]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchOrders(1, statusFilter, val), 400);
  };

  const refreshOrder = (updated: Order) => {
    setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const executeConfirmAction = async () => {
    if (!confirmPayload) return;
    const { order, action } = confirmPayload;
    setActionLoading(true);
    try {
      let res;
      if (action === 'confirm') res = await orderService.confirmOrder(order._id);
      if (action === 'process') res = await orderService.processOrder(order._id);
      if (action === 'pack') res = await orderService.markPacked(order._id);
      if (action === 'deliver') res = await orderService.sellerMarkDelivered(order._id);
      
      if (res) {
        refreshOrder((res as any).data || (res as any).order || res);
        queryClient.invalidateQueries({ queryKey: ['sellerWallet'] });
        queryClient.invalidateQueries({ queryKey: ['sellerDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        if (action === 'deliver' && order.payment.method === 'cod') {
          toast.success(
            `$${order.pricing.total.toLocaleString('en-IN')} credited to your wallet`,
            `COD amount for order ${order.orderId} has been credited to your seller wallet.`
          );
        } else {
          toast.success(`Action successful`, `Order marked as ${action}.`);
        }
      }
      setModal(null);
      setConfirmPayload(null);
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const executeGenericStatusChange = async (order: Order, newStatus: string) => {
    if (!newStatus) return;
    setActionLoading(true);
    try {
      const res = await orderService.sellerUpdateStatus(order._id, newStatus);
      if (res && ((res as any).data || (res as any).order)) {
        refreshOrder((res as any).data || (res as any).order || res);
        queryClient.invalidateQueries({ queryKey: ['sellerWallet'] });
        queryClient.invalidateQueries({ queryKey: ['sellerDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        if (newStatus === 'delivered' && order.payment.method === 'cod') {
          toast.success(
            `$${order.pricing.total.toLocaleString('en-IN')} credited to your wallet`,
            `COD amount for order ${order.orderId} has been credited to your seller wallet.`
          );
        } else {
          toast.success(`Action successful`, `Order status changed to ${newStatus}.`);
        }
      }
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const promptConfirmAction = (order: Order, action: 'confirm' | 'process' | 'pack' | 'deliver') => {
    setConfirmPayload({ order, action });
    setModal('confirm-action');
  };

  const handleReturnAction = async () => {
    if (!selectedOrder || !returnStatus) return;
    setActionLoading(true);
    try {
      const res = await orderService.sellerUpdateReturnStatus(selectedOrder._id, { status: returnStatus as any, adminNote: returnNote });
      refreshOrder((res as any).data || (res as any).order || res);
      queryClient.invalidateQueries({ queryKey: ['sellerWallet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Return status updated');
      setModal(null);
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error('Update failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!selectedOrder || !dispatchForm.courier || !dispatchForm.awbNumber) return;
    setActionLoading(true);
    try {
      const res = await orderService.dispatchOrder(selectedOrder._id, dispatchForm);
      refreshOrder((res as any).data || (res as any).order || res);
      queryClient.invalidateQueries({ queryKey: ['sellerWallet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Order dispatched', `AWB: ${dispatchForm.awbNumber}`);
      setModal(null);
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error('Dispatch failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTracking = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await orderService.updateTracking(selectedOrder._id, trackingForm);
      refreshOrder((res as any).data || (res as any).order || res);
      toast.success('Tracking updated');
      setModal(null);
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error('Update failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };


  const handleCancel = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await orderService.sellerCancelOrder(selectedOrder._id, { reason: cancelReason });
      refreshOrder((res as any).data || (res as any).order || res);
      toast.success('Order cancelled', `${selectedOrder.orderId} has been cancelled.`);
      setModal(null);
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error('Cancel failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading) return <Loading />;
  if (!user || (user.role !== 'seller' && user.role !== 'admin')) return null;

  const totalPages = Math.ceil(total / PER_PAGE);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const readyCount = orders.filter(o => o.status === 'packed').length;
  const shippedCount = orders.filter(o => o.status === 'dispatched').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  return (
    <SellerLayout title="Orders" description="Manage and fulfil your customer orders">
      <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Orders" value={total} colorClass="bg-white border border-stone-200 text-stone-900" />
            <StatCard label="Pending" value={pendingCount} sublabel="Need attention" colorClass="bg-amber-50 text-amber-900 border border-amber-100" />
            <StatCard label="Ready to Ship" value={readyCount} sublabel="Packed & waiting" colorClass="bg-violet-50 text-violet-900 border border-violet-100" />
            <StatCard label="Shipped" value={shippedCount} sublabel="In transit" colorClass="bg-sky-50 text-sky-900 border border-sky-100" />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                id="seller-order-search"
                type="text"
                placeholder="Search orders by ID, customer…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all"
              />
              {search && (
                <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 btn-xs" aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              title="Order status filter"
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all"
            >
              {STATUS_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            <button
              onClick={() => fetchOrders(page, statusFilter, search)}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors btn-xs"
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </button>
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
                    {['Order', 'Customer', 'Items', 'Amount', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(6).fill(null).map((_, i) => (
                      <tr key={i} className="border-b border-stone-50">
                        {Array(6).fill(null).map((__, j) => {
                          const widths = ["w-2/5", "w-1/2", "w-3/5", "w-2/3", "w-4/5", "w-full"];
                          return (
                            <td key={j} className="px-5 py-4">
                              <div className={`h-3 bg-stone-100 rounded animate-pulse ${widths[j] || "w-1/2"}`} />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-stone-400 font-sans text-sm">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <OrderRow
                        key={order._id}
                        order={order}
                        onConfirm={() => promptConfirmAction(order, 'confirm')}
                        onProcess={() => promptConfirmAction(order, 'process')}
                        onPack={() => promptConfirmAction(order, 'pack')}
                        onDispatch={() => {
                          setSelectedOrder(order);
                          setDispatchForm({ courier: '', awbNumber: '', trackingUrl: '', estimatedDelivery: '' });
                          setModal('dispatch');
                        }}
                        onUpdateTracking={() => {
                          setSelectedOrder(order);
                          setTrackingForm({
                            courier: order.tracking?.courier,
                            awbNumber: order.tracking?.awbNumber,
                            trackingUrl: order.tracking?.trackingUrl,
                            status: '',
                            location: '',
                            description: '',
                          });
                          setModal('tracking');
                        }}
                        onDeliver={() => promptConfirmAction(order, 'deliver')}
                        onCancel={() => {
                          setSelectedOrder(order);
                          setCancelReason('');
                          setModal('cancel');
                        }}
                        onHandleReturn={() => {
                          setSelectedOrder(order);
                          setReturnStatus('');
                          setReturnNote('');
                          setModal('return-action');
                        }}
                        onViewDetail={() => setDetailOrder(order)}
                        onStatusChange={(status) => executeGenericStatusChange(order, status)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-stone-100">
                <p className="text-xs text-stone-400 font-sans">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
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
        </div>

      {/* Order Detail Slide-out */}
      {detailOrder && <OrderDetailPanel order={detailOrder} onClose={() => setDetailOrder(null)} />}

      {/* Dispatch Modal */}
      {modal === 'dispatch' && selectedOrder && (
        <Modal title={`Dispatch — ${selectedOrder.orderId}`} onClose={() => { setModal(null); setSelectedOrder(null); }}>
          <div className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">
              Enter courier details to mark this order as dispatched.
            </p>
            <div>
              <label className={labelClass}>Courier <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={dispatchForm.courier}
                onChange={(e) => setDispatchForm(f => ({ ...f, courier: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Delhivery, BlueDart, DTDC"
              />
            </div>
            <div>
              <label className={labelClass}>AWB / Tracking Number <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={dispatchForm.awbNumber}
                onChange={(e) => setDispatchForm(f => ({ ...f, awbNumber: e.target.value }))}
                className={inputClass}
                placeholder="e.g. DL1234567890"
              />
            </div>
            <div>
              <label className={labelClass}>Tracking URL</label>
              <input
                type="url"
                value={dispatchForm.trackingUrl}
                onChange={(e) => setDispatchForm(f => ({ ...f, trackingUrl: e.target.value }))}
                className={inputClass}
                placeholder="https://track.example.com/…"
              />
            </div>
            <div>
              <label className={labelClass}>Estimated Delivery</label>
              <input
                type="date"
                value={dispatchForm.estimatedDelivery}
                onChange={(e) => setDispatchForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                className={inputClass}
                title="Estimated delivery"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModal(null); setSelectedOrder(null); }} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button
                onClick={handleDispatch}
                disabled={actionLoading || !dispatchForm.courier || !dispatchForm.awbNumber}
                className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Dispatching…' : 'Dispatch Order'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Update Tracking Modal */}
      {modal === 'tracking' && selectedOrder && (
        <Modal title={`Update Tracking — ${selectedOrder.orderId}`} onClose={() => { setModal(null); setSelectedOrder(null); }}>
          <div className="space-y-4">
            {selectedOrder.tracking?.awbNumber && (
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 text-[11px] font-sans">
                <span className="text-stone-400">Current AWB: </span>
                <span className="font-mono text-stone-900">{selectedOrder.tracking.awbNumber}</span>
              </div>
            )}
            <div>
              <label className={labelClass}>Courier</label>
              <input type="text" value={trackingForm.courier ?? ''} onChange={(e) => setTrackingForm(f => ({ ...f, courier: e.target.value }))} className={inputClass} placeholder="Courier name" title="Courier name" />
            </div>
            <div>
              <label className={labelClass}>AWB Number</label>
              <input type="text" value={trackingForm.awbNumber ?? ''} onChange={(e) => setTrackingForm(f => ({ ...f, awbNumber: e.target.value }))} className={inputClass} placeholder="Tracking number" title="Tracking number" />
            </div>
            <div>
              <label className={labelClass}>Tracking URL</label>
              <input type="url" value={trackingForm.trackingUrl ?? ''} onChange={(e) => setTrackingForm(f => ({ ...f, trackingUrl: e.target.value }))} className={inputClass} placeholder="https://…" title="Tracking URL" />
            </div>
            <div>
              <label className={labelClass}>Status Update</label>
              <input type="text" value={trackingForm.status ?? ''} onChange={(e) => setTrackingForm(f => ({ ...f, status: e.target.value }))} className={inputClass} placeholder="e.g. In Transit, Out for Delivery" title="Status update" />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input type="text" value={trackingForm.location ?? ''} onChange={(e) => setTrackingForm(f => ({ ...f, location: e.target.value }))} className={inputClass} placeholder="e.g. Mumbai Sorting Hub" title="Location" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input type="text" value={trackingForm.description ?? ''} onChange={(e) => setTrackingForm(f => ({ ...f, description: e.target.value }))} className={inputClass} placeholder="Additional tracking info" title="Description" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModal(null); setSelectedOrder(null); }} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button onClick={handleUpdateTracking} disabled={actionLoading} className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
                {actionLoading ? 'Updating…' : 'Update Tracking'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Order Modal */}
      {modal === 'cancel' && selectedOrder && (
        <Modal title={`Cancel Order — ${selectedOrder.orderId}`} onClose={() => { setModal(null); setSelectedOrder(null); }}>
          <div className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div>
              <label className={labelClass}>Reason for Cancellation <span className="text-red-400">*</span></label>
              <textarea
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={`${inputClass} min-h-[100px] resize-none`}
                placeholder="e.g. Out of stock, pricing error, requested by buyer"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModal(null); setSelectedOrder(null); }} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Back</button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
                className="flex-1 py-2.5 bg-red-500 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Action Modal */}
      {modal === 'confirm-action' && confirmPayload && (
        <Modal title="Confirm Action" onClose={() => { setModal(null); setConfirmPayload(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-stone-600 font-sans">
              Are you sure you want to mark order {confirmPayload.order.orderId} as {confirmPayload.action}?
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModal(null); setConfirmPayload(null); }} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button
                onClick={executeConfirmAction}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing…' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Return Action Modal */}
      {modal === 'return-action' && selectedOrder && (
        <Modal title={`Process Return — ${selectedOrder.orderId}`} onClose={() => { setModal(null); setSelectedOrder(null); }}>
          <div className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">
              Update the return request status.
            </p>
            <div>
              <label className={labelClass}>Status <span className="text-red-400">*</span></label>
              <select
                value={returnStatus}
                onChange={(e) => setReturnStatus(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select status...</option>
                <option value="pickup_scheduled">Pickup Scheduled</option>
                <option value="picked_up">Picked Up</option>
                <option value="received">Received</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Note (Optional)</label>
              <textarea
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-none`}
                placeholder="Internal notes or rejection reason..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModal(null); setSelectedOrder(null); }} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button
                onClick={handleReturnAction}
                disabled={actionLoading || !returnStatus}
                className="flex-1 py-2.5 bg-orange-500 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing…' : 'Update Return'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </SellerLayout>
  );
}
