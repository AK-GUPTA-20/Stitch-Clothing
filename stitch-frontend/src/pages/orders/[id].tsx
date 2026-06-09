// src/pages/orders/[id].tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { orderService } from '@/lib/api/orderService';
import {
  Order, OrderStatus, RefundRequest,
  RequestReturnPayload, RequestRefundPayload, CancelOrderItemPayload
} from '@/lib/types/order.types';
import { OrderStatusBadge, PAYMENT_STATUS_CONFIG } from '@/components/orders/OrderStatusBadge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import {
  ChevronLeft, Package, MapPin, CreditCard, Truck, FileText,
  RotateCcw, DollarSign, X, Download, ExternalLink, AlertCircle,
  CheckCircle2, Clock, Tag, Copy, Check,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────



function formatDate(dateStr: string, full = false) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: full ? 'long' : 'short',
    year: 'numeric',
    ...(full ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-stone-100">
        <Icon size={14} className="text-stone-400" />
        <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-sans font-medium">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 animate-slide-in-up overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-900 font-sans">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors p-1" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="text-stone-300 hover:text-stone-600 transition-colors p-1 btn-xs"
      aria-label="Copy"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ModalType = 'cancel' | 'return' | 'refund' | null;

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState<ModalType>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [returnItems, setReturnItems] = useState<{ orderItemId: string; quantity: number }[]>([]);

  const fetchOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await orderService.getOrderById(orderId);
      setOrder(res.order);

      // Fetch refunds if applicable
      if (res.order?.refunds && res.order.refunds.length > 0) {
        try {
          const refRes = await orderService.getRefunds(orderId);
          setRefunds(refRes.refunds ?? []);
        } catch { /* silent */ }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user && id) fetchOrder(id);
  }, [authLoading, user, id, router, fetchOrder]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const openModal = (type: ModalType) => {
    setModal(type);
    setCancelReason('');
    setReturnReason('');
    setRefundReason('');
    if (type === 'return' && order) {
      setReturnItems(order.items.filter(i => i.isReturnable).map(i => ({ orderItemId: i._id, quantity: i.quantity })));
    }
  };
  const closeModal = () => { setModal(null); setActionLoading(false); };

  const handleCancel = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await orderService.cancelOrder(order._id, { reason: cancelReason || undefined });
      setOrder(res.order);
      toast.success('Order cancelled');
      closeModal();
    } catch (err: any) {
      toast.error('Cancellation failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order || !returnReason) return;
    setActionLoading(true);
    try {
      const payload: RequestReturnPayload = { reason: returnReason, items: returnItems };
      const res = await orderService.requestReturn(order._id, payload);
      setOrder(res.order);
      toast.success('Return requested', 'We will review and arrange pickup.');
      closeModal();
    } catch (err: any) {
      toast.error('Return request failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!order || !refundReason) return;
    setActionLoading(true);
    try {
      const payload: RequestRefundPayload = { reason: refundReason };
      await orderService.requestRefund(order._id, payload);
      toast.success('Refund requested', 'We will process your refund shortly.');
      closeModal();
      fetchOrder(order._id);
    } catch (err: any) {
      toast.error('Refund request failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelItem = async (itemId: string) => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await orderService.cancelOrderItem(order._id, itemId, { reason: 'Cancelled by customer' });
      setOrder(res.order);
      toast.success('Item cancelled', 'The item has been cancelled from your order.');
    } catch (err: any) {
      toast.error('Cancellation failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewInvoice = async () => {
    if (!order) return;
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

  const handleSimulatePayment = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const payload = {
        gatewayOrderId: `pay_${Math.random().toString(36).substring(2, 9)}`,
        gatewayPaymentId: `pay_id_${Math.random().toString(36).substring(2, 9)}`,
        gatewaySignature: `sig_${Math.random().toString(36).substring(2, 9)}`,
        transactionId: `tx_${Math.random().toString(36).substring(2, 9)}`,
      };
      await orderService.verifyPayment(order._id, payload as any);
      toast.success('Payment Verified', 'Payment was simulated and verified successfully.');
      fetchOrder(order._id);
    } catch (err: any) {
      toast.error('Payment Verification Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) return <Loading />;
  if (!user) return null;

  if (error || !order) {
    return (
      <div className="min-h-screen pt-header flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="text-stone-300 mx-auto mb-4" />
          <p className="text-stone-600 font-sans mb-4">{error || 'Order not found'}</p>
          <Link href="/orders" className="text-sm font-sans text-accent hover:text-accent-dark transition-colors">
            ← Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canReturn = order.status === 'delivered' && order.items.some(i => i.isReturnable);
  const canRefund = ['delivered', 'return_received'].includes(order.status);
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment.status];
  const PayIcon = paymentConfig?.icon;

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  return (
    <>
      <Head>
        <title>Order {order.orderId} | STITCH</title>
        <meta name="description" content={`Order details for ${order.orderId}`} />
      </Head>

      <div className="min-h-screen bg-stone-50 pt-header flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-stone-100 sticky top-[var(--h-header)] z-10">
          <div className="container-page">
            <div className="flex items-center gap-4 h-14">
              <Link href="/orders" className="text-stone-400 hover:text-stone-900 transition-colors btn-xs" aria-label="Back to orders">
                <ChevronLeft size={18} />
              </Link>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans hidden sm:block">Order</p>
                <span className="font-mono text-sm font-semibold text-stone-900">{order.orderId}</span>
                <CopyButton text={order.orderId} />
              </div>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
          </div>
        </div>

        <div className="flex-1 container-page py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left column — main content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Order Status Timeline */}
              <SectionCard title="Order Progress" icon={Clock}>
                <OrderTimeline
                  currentStatus={order.status}
                  statusHistory={order.statusHistory}
                />
              </SectionCard>

              {/* Order Items */}
              <SectionCard title="Items" icon={Package}>
                <div className="divide-y divide-stone-50 -mx-5">
                  {order.items.map((item) => {
                    const colorVal = typeof item.variant?.color === 'object'
                      ? item.variant?.color?.name
                      : item.variant?.color;
                    const sizeVal = typeof item.variant?.size === 'object'
                      ? item.variant?.size?.label || item.variant?.size?.value
                      : item.variant?.size;

                    return (
                      <div key={item._id} className="px-5 py-4 flex items-start gap-4">
                        <div className="w-16 h-20 bg-stone-50 rounded-xl overflow-hidden border border-stone-100 shrink-0">
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-stone-200" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-stone-900 font-sans line-clamp-2">{item.productName}</p>
                              {item.productSlug && (
                                <Link
                                  href={`/product/${item.productSlug}`}
                                  className="text-[10px] text-accent hover:text-accent-dark font-sans transition-colors"
                                >
                                  View product ↗
                                </Link>
                              )}
                            </div>
                            <OrderStatusBadge status={item.status} type="item" size="sm" showIcon={false} className="shrink-0" />
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {colorVal && (
                              <span className="text-[10px] text-stone-500 font-sans bg-stone-50 px-2 py-0.5 rounded-md">
                                Color: {colorVal}
                              </span>
                            )}
                            {sizeVal && (
                              <span className="text-[10px] text-stone-500 font-sans bg-stone-50 px-2 py-0.5 rounded-md">
                                Size: {sizeVal}
                              </span>
                            )}
                            {item.variant?.sku && (
                              <span className="text-[10px] text-stone-400 font-mono">
                                SKU: {item.variant.sku}
                              </span>
                            )}
                          </div>
                          {item.customisation && (
                            <div className="mt-2 flex items-center gap-1.5 bg-accent/5 border border-accent/20 rounded-lg px-2.5 py-1.5">
                              <Tag size={10} className="text-accent shrink-0" />
                              <span className="text-[10px] text-stone-700 font-sans">
                                {item.customisation.type}: {item.customisation.text}
                                {item.customisation.extraCharge && ` (+₹${item.customisation.extraCharge})`}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[11px] text-stone-400 font-sans">
                              {formatCurrency(item.unitPrice)} × {item.quantity}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-stone-900 font-sans">
                                {formatCurrency(item.totalPrice)}
                              </span>
                              {['pending', 'confirmed'].includes(item.status) && (
                                <button
                                  onClick={() => handleCancelItem(item._id)}
                                  disabled={actionLoading}
                                  className="flex items-center gap-1 px-2 py-1 text-[9px] font-sans font-medium uppercase tracking-wider text-red-500 border border-red-100 hover:border-red-300 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                                  title="Cancel this item"
                                >
                                  <X size={9} /> Cancel Item
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              {/* Tracking */}
              {order.tracking?.awbNumber && (
                <SectionCard title="Tracking" icon={Truck}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className={labelClass}>Courier</p>
                      <p className="text-sm font-medium text-stone-900 font-sans">{order.tracking.courier}</p>
                    </div>
                    <div>
                      <p className={labelClass}>AWB Number</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-stone-900">{order.tracking.awbNumber}</p>
                        <CopyButton text={order.tracking.awbNumber} />
                      </div>
                    </div>
                    {order.tracking.estimatedDelivery && (
                      <div>
                        <p className={labelClass}>Est. Delivery</p>
                        <p className="text-sm text-stone-900 font-sans">{formatDate(order.tracking.estimatedDelivery)}</p>
                      </div>
                    )}
                    {order.tracking.dispatchedAt && (
                      <div>
                        <p className={labelClass}>Dispatched</p>
                        <p className="text-sm text-stone-900 font-sans">{formatDate(order.tracking.dispatchedAt)}</p>
                      </div>
                    )}
                  </div>
                  {order.tracking.trackingUrl && (
                    <a
                      href={order.tracking.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] font-sans font-medium uppercase tracking-[0.12em] text-white bg-stone-900 px-4 py-2.5 rounded-lg hover:bg-stone-800 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Track Package
                    </a>
                  )}

                  {/* Tracking updates */}
                  {order.tracking.updates && order.tracking.updates.length > 0 && (
                    <div className="mt-5 border-t border-stone-100 pt-5 space-y-3">
                      {order.tracking.updates.map((update, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-stone-400 mt-1.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-stone-700 font-sans">{update.status}</p>
                            {update.description && <p className="text-[10px] text-stone-400 font-sans">{update.description}</p>}
                            {update.location && <p className="text-[10px] text-stone-400 font-sans">{update.location}</p>}
                            <p className="text-[10px] text-stone-400 font-sans">{formatDate(update.timestamp, true)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Return Request */}
              {order.returnRequest && (
                <SectionCard title="Return Request" icon={RotateCcw}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-stone-600 font-sans">{order.returnRequest.reason}</p>
                      {order.returnRequest.status && (
                        <OrderStatusBadge status={order.returnRequest.status} type="return" size="sm" />
                      )}
                    </div>
                    {order.returnRequest.adminNote && (
                      <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                        <p className="text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans mb-1">Admin Note</p>
                        <p className="text-xs text-stone-700 font-sans">{order.returnRequest.adminNote}</p>
                      </div>
                    )}
                    {order.returnRequest.pickupScheduled && (
                      <p className="text-[11px] text-stone-500 font-sans">
                        Pickup scheduled: {formatDate(order.returnRequest.pickupScheduled)}
                      </p>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Refunds */}
              {refunds.length > 0 && (
                <SectionCard title="Refunds" icon={DollarSign}>
                  <div className="space-y-3">
                    {refunds.map((refund) => (
                      <div key={refund._id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <div>
                          <p className="text-[10px] font-mono text-stone-500">#{refund._id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-stone-700 font-sans mt-0.5">{refund.reason}</p>
                          <p className="text-[10px] text-stone-400 font-sans">{formatDate(refund.requestedAt)}</p>
                          {refund.adminNote && (
                            <p className="text-[10px] text-stone-500 font-sans mt-1 italic">{refund.adminNote}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-stone-900">{formatCurrency(refund.amount)}</p>
                          <OrderStatusBadge status={refund.status} type="refund" size="sm" className="mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Right column — summary */}
            <div className="space-y-6">

              {/* Order Summary */}
              <SectionCard title="Order Summary" icon={Tag}>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                    <span>Order Date</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                    <span>Items</span>
                    <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="border-t border-stone-100 pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.pricing.subtotal)}</span>
                    </div>
                    {(order.pricing.discount ?? 0) > 0 && (
                      <div className="flex justify-between text-[11px] text-green-600 font-sans">
                        <span>Discount</span>
                        <span>−{formatCurrency(order.pricing.discount!)}</span>
                      </div>
                    )}
                    {(order.pricing.couponDiscount ?? 0) > 0 && (
                      <div className="flex justify-between text-[11px] text-green-600 font-sans">
                        <span>Coupon {order.pricing.couponCode && `(${order.pricing.couponCode})`}</span>
                        <span>−{formatCurrency(order.pricing.couponDiscount!)}</span>
                      </div>
                    )}
                    {(order.pricing.shippingCharge ?? 0) > 0 && (
                      <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                        <span>Shipping</span>
                        <span>{formatCurrency(order.pricing.shippingCharge!)}</span>
                      </div>
                    )}
                    {(order.pricing.tax ?? 0) > 0 && (
                      <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                        <span>Tax</span>
                        <span>{formatCurrency(order.pricing.tax!)}</span>
                      </div>
                    )}
                    {(order.pricing.walletDeducted ?? 0) > 0 && (
                      <div className="flex justify-between text-[11px] text-blue-600 font-sans">
                        <span>Wallet</span>
                        <span>−{formatCurrency(order.pricing.walletDeducted!)}</span>
                      </div>
                    )}
                    {(order.pricing.loyaltyPointsValue ?? 0) > 0 && (
                      <div className="flex justify-between text-[11px] text-amber-600 font-sans">
                        <span>Loyalty Points ({order.pricing.loyaltyPointsUsed} pts)</span>
                        <span>−{formatCurrency(order.pricing.loyaltyPointsValue!)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-semibold text-stone-900 font-sans pt-3 border-t border-stone-100">
                      <span>Total</span>
                      <span>{formatCurrency(order.pricing.total, order.pricing.currency)}</span>
                    </div>
                  </div>

                  {order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-2">
                      <CheckCircle2 size={12} className="text-amber-600 shrink-0" />
                      <span className="text-[10px] text-amber-700 font-sans">
                        +{order.loyaltyPointsEarned} loyalty points earned
                      </span>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Payment */}
              <SectionCard title="Payment" icon={CreditCard}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-stone-900 font-sans capitalize">
                        {order.payment.method?.replace(/_/g, ' ')}
                      </p>
                      {order.payment.transactionId && (
                        <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                          {order.payment.transactionId}
                        </p>
                      )}
                    </div>
                    <OrderStatusBadge status={order.payment.status} type="payment" size="sm" />
                  </div>

                  {order.payment.paidAt && (
                    <div className="flex justify-between text-[11px] text-stone-500 font-sans">
                      <span>Paid on</span>
                      <span>{formatDate(order.payment.paidAt)}</span>
                    </div>
                  )}
                  {(order.payment.refundedAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-[11px] text-teal-600 font-sans">
                      <span>Refunded</span>
                      <span>{formatCurrency(order.payment.refundedAmount!)}</span>
                    </div>
                  )}
                  {order.payment.failureReason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                      <p className="text-[10px] text-red-700 font-sans">{order.payment.failureReason}</p>
                    </div>
                  )}
                  {order.payment.status === 'pending' && order.payment.method !== 'cod' && (
                    <button
                      onClick={handleSimulatePayment}
                      disabled={actionLoading}
                      className="w-full mt-3 py-2.5 bg-stone-900 text-white text-[11px] font-sans font-medium uppercase tracking-[0.12em] rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CreditCard size={12} />
                      {actionLoading ? 'Processing...' : 'Pay & Verify Now (Simulate)'}
                    </button>
                  )}
                </div>
              </SectionCard>

              {/* Shipping Address */}
              <SectionCard title="Shipping Address" icon={MapPin}>
                <div className="text-[12px] text-stone-600 font-sans leading-relaxed space-y-0.5">
                  <p className="font-semibold text-stone-900 text-sm">{order.shippingAddress.recipientName}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  {order.shippingAddress.landmark && <p className="text-stone-400">{order.shippingAddress.landmark}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                  <p>{order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
                  <p className="mt-2 text-stone-900 font-medium">{order.shippingAddress.phone}</p>
                  {order.shippingAddress.gstin && (
                    <p className="text-[10px] text-stone-400 font-mono mt-1">GSTIN: {order.shippingAddress.gstin}</p>
                  )}
                </div>
              </SectionCard>

              {/* Actions */}
              <div className="space-y-2">
                {order.invoiceUrl && (
                  <button
                    onClick={handleViewInvoice}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-stone-200 text-stone-700 text-[11px] font-sans font-medium uppercase tracking-[0.12em] rounded-xl hover:border-stone-400 hover:bg-stone-50 transition-all"
                  >
                    <Download size={13} />
                    Download Invoice
                  </button>
                )}

                {canReturn && (
                  <button
                    onClick={() => openModal('return')}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-orange-200 text-orange-600 text-[11px] font-sans font-medium uppercase tracking-[0.12em] rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all"
                  >
                    <RotateCcw size={13} />
                    Request Return
                  </button>
                )}

                {canRefund && (
                  <button
                    onClick={() => openModal('refund')}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-teal-200 text-teal-600 text-[11px] font-sans font-medium uppercase tracking-[0.12em] rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all"
                  >
                    <DollarSign size={13} />
                    Request Refund
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => openModal('cancel')}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-red-100 text-red-600 text-[11px] font-sans font-medium uppercase tracking-[0.12em] rounded-xl hover:border-red-300 hover:bg-red-50 transition-all"
                  >
                    <X size={13} />
                    Cancel Order
                  </button>
                )}

                {order.isGift && order.giftMessage && (
                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mt-4">
                    <p className="text-[9px] tracking-[0.18em] uppercase text-accent font-sans font-medium mb-1.5">Gift Message</p>
                    <p className="text-xs text-stone-700 font-sans italic">"{order.giftMessage}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* Cancel Modal */}
      {modal === 'cancel' && (
        <Modal title="Cancel Order" onClose={closeModal}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-sans">
                Cancel order <strong>{order.orderId}</strong>? This cannot be undone.
              </p>
            </div>
            <div>
              <label className={labelClass}>Reason <span className="normal-case tracking-normal text-stone-400">(optional)</span></label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Why are you cancelling?"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Keep</button>
              <button onClick={handleCancel} disabled={actionLoading} className="flex-1 py-2.5 bg-red-600 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {actionLoading ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Return Modal */}
      {modal === 'return' && (
        <Modal title="Request Return" onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Items to return</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {order.items.filter(i => i.isReturnable).map((item) => {
                  const checked = returnItems.some(r => r.orderItemId === item._id);
                  return (
                    <label key={item._id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}`}>
                      <input type="checkbox" checked={checked} onChange={(e) => {
                        if (e.target.checked) setReturnItems(p => [...p, { orderItemId: item._id, quantity: item.quantity }]);
                        else setReturnItems(p => p.filter(r => r.orderItemId !== item._id));
                      }} className="accent-stone-900" />
                      <span className="text-xs font-sans text-stone-800 line-clamp-1 flex-1">{item.productName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass}>Reason <span className="text-red-400">*</span></label>
              <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Why are you returning?" required />
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button onClick={handleReturn} disabled={actionLoading || !returnReason || returnItems.length === 0} className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
                {actionLoading ? 'Submitting…' : 'Request Return'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Refund Modal */}
      {modal === 'refund' && (
        <Modal title="Request Refund" onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">
              Amount: <strong className="text-stone-900">{formatCurrency(order.pricing.total)}</strong>
            </p>
            <div>
              <label className={labelClass}>Reason <span className="text-red-400">*</span></label>
              <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Why are you requesting a refund?" required />
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button onClick={handleRefund} disabled={actionLoading || !refundReason} className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
                {actionLoading ? 'Submitting…' : 'Request Refund'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
