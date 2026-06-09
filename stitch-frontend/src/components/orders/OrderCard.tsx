// src/components/orders/OrderCard.tsx
import React from 'react';
import Link from 'next/link';
import { Order } from '@/lib/types/order.types';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderTimeline } from './OrderTimeline';
import { Package, ChevronRight, MapPin, Truck, RotateCcw, FileText, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  onCancel?: (order: Order) => void;
  onReturn?: (order: Order) => void;
  onRefund?: (order: Order) => void;
  onViewInvoice?: (order: Order) => void;
  expanded?: boolean;
  onToggle?: () => void;
}



function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];
const RETURNABLE_STATUSES = ['delivered'];
const REFUNDABLE_STATUSES = ['delivered', 'return_received'];

export function OrderCard({
  order,
  onCancel,
  onReturn,
  onRefund,
  onViewInvoice,
  expanded = false,
  onToggle,
}: OrderCardProps) {
  const orderStatus = order.status || (order as any).orderStatus;

  const canCancel = CANCELLABLE_STATUSES.includes(orderStatus);
  const canReturn = RETURNABLE_STATUSES.includes(orderStatus) && 
    order.items.some(item => item.isReturnable);
  const canRefund = REFUNDABLE_STATUSES.includes(orderStatus);
  const hasTracking = order.tracking?.awbNumber;

  const primaryImage = order.items[0]?.productImage;
  const extraItemCount = order.items.length - 1;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-stone-300 transition-all group">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Product thumbnails */}
          <div className="flex -space-x-2 shrink-0">
            {order.items.slice(0, 3).map((item, idx) => (
              <div
                key={item._id}
                className="w-10 h-10 rounded-lg border-2 border-white bg-stone-100 overflow-hidden"
                style={{ zIndex: 3 - idx }}
              >
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={14} className="text-stone-300" />
                  </div>
                )}
              </div>
            ))}
            {order.items.length > 3 && (
              <div className="w-10 h-10 rounded-lg border-2 border-white bg-stone-200 flex items-center justify-center" style={{ zIndex: 0 }}>
                <span className="text-[10px] font-sans font-medium text-stone-600">+{order.items.length - 3}</span>
              </div>
            )}
          </div>

          {/* Order info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-stone-900">{order.orderId}</span>
              <OrderStatusBadge status={orderStatus} size="sm" showIcon={false} />
            </div>
            <p className="text-[11px] text-stone-400 font-sans mt-0.5">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatCurrency(order.pricing.total, order.pricing.currency)} · {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <ChevronRight
          size={16}
          className={`text-stone-300 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-stone-100 animate-slide-in-up">
          {/* Compact Timeline */}
          <div className="px-5 py-4 border-b border-stone-50">
            <OrderTimeline
              currentStatus={orderStatus}
              statusHistory={order.statusHistory}
              returnRequest={order.returnRequest}
              compact
            />
          </div>

          {/* Items */}
          <div className="divide-y divide-stone-50">
            {order.items.map((item) => {
              const colorVal = typeof item.variant?.color === 'object'
                ? item.variant?.color?.name
                : item.variant?.color;
              const sizeVal = typeof item.variant?.size === 'object'
                ? item.variant?.size?.label || item.variant?.size?.value
                : item.variant?.size;

              return (
                <div key={item._id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-14 h-16 bg-stone-50 rounded-lg overflow-hidden shrink-0 border border-stone-100">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={18} className="text-stone-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-900 font-sans line-clamp-1">{item.productName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {colorVal && (
                        <span className="text-[10px] text-stone-400 font-sans">{colorVal}</span>
                      )}
                      {sizeVal && (
                        <span className="text-[10px] text-stone-400 font-sans">Size: {sizeVal}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-stone-400 font-sans">Qty: {item.quantity}</span>
                      <span className="text-xs font-medium text-stone-700 font-sans">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <OrderStatusBadge status={item.status} type="item" size="sm" showIcon={false} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Summary */}
          <div className="px-5 py-4 bg-stone-50/50 border-t border-stone-100">
            <div className="space-y-1.5">
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
                  <span>Coupon ({order.pricing.couponCode})</span>
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
              <div className="flex justify-between text-sm font-semibold text-stone-900 font-sans pt-2 border-t border-stone-200">
                <span>Total</span>
                <span>{formatCurrency(order.pricing.total, order.pricing.currency)}</span>
              </div>
            </div>
          </div>

          {/* Shipping + Payment info */}
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100">
            {/* Shipping Address */}
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-2">Shipping To</p>
              <div className="flex items-start gap-2">
                <MapPin size={12} className="text-stone-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-stone-600 font-sans leading-relaxed">
                  <p className="font-medium text-stone-900">{order.shippingAddress.recipientName}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p>{order.shippingAddress.phone}</p>
                </div>
              </div>
            </div>

            {/* Tracking */}
            {hasTracking && (
              <div>
                <p className="text-[9px] tracking-[0.18em] uppercase text-stone-400 font-sans font-medium mb-2">Tracking</p>
                <div className="flex items-start gap-2">
                  <Truck size={12} className="text-stone-400 mt-0.5 shrink-0" />
                  <div className="text-[11px] text-stone-600 font-sans">
                    <p className="font-medium text-stone-900">{order.tracking!.courier}</p>
                    <p className="font-mono text-[10px]">{order.tracking!.awbNumber}</p>
                    {order.tracking?.trackingUrl && (
                      <a
                        href={order.tracking.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-dark transition-colors text-[10px] underline"
                      >
                        Track Package
                      </a>
                    )}
                    {order.tracking?.estimatedDelivery && (
                      <p className="text-stone-400 mt-0.5">
                        Est. {formatDate(order.tracking.estimatedDelivery)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-stone-100 flex flex-wrap gap-2">
            <Link
              href={`/orders/${order._id}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 hover:border-stone-400 px-3 py-1.5 rounded-lg"
            >
              View Details
            </Link>

            {onViewInvoice && order.invoiceUrl && (
              <button
                onClick={() => onViewInvoice(order)}
                className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 hover:border-stone-400 px-3 py-1.5 rounded-lg"
              >
                <FileText size={11} />
                Invoice
              </button>
            )}

            {canReturn && onReturn && (
              <button
                onClick={() => onReturn(order)}
                className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-stone-600 hover:text-orange-600 transition-colors border border-stone-200 hover:border-orange-200 px-3 py-1.5 rounded-lg"
              >
                <RotateCcw size={11} />
                Return
              </button>
            )}

            {canRefund && onRefund && (
              <button
                onClick={() => onRefund(order)}
                className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-stone-600 hover:text-teal-600 transition-colors border border-stone-200 hover:border-teal-200 px-3 py-1.5 rounded-lg"
              >
                Refund
              </button>
            )}

            {canCancel && onCancel && (
              <button
                onClick={() => onCancel(order)}
                className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-red-500 hover:text-red-700 transition-colors border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg ml-auto"
              >
                <X size={11} />
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
