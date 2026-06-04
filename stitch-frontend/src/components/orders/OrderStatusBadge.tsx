// src/components/orders/OrderStatusBadge.tsx
import React from 'react';
import { OrderStatus, PaymentStatus, RefundStatus, ReturnStatus, OrderItemStatus } from '@/lib/types/order.types';
import {
  Clock, CheckCircle2, Package, Truck, MapPin, CircleCheck,
  XCircle, RotateCcw, AlertCircle, DollarSign, RefreshCcw
} from 'lucide-react';

// ─── Status Config ─────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending:            { label: 'Pending',           className: 'bg-amber-50 text-amber-700 border-amber-200',    icon: Clock },
  placed:             { label: 'Order Placed',      className: 'bg-amber-50 text-amber-700 border-amber-200',    icon: Clock },
  confirmed:          { label: 'Confirmed',          className: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle2 },
  processing:         { label: 'Processing',         className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: RefreshCcw },
  packed:             { label: 'Packed',             className: 'bg-violet-50 text-violet-700 border-violet-200', icon: Package },
  dispatched:         { label: 'Dispatched',         className: 'bg-sky-50 text-sky-700 border-sky-200',          icon: Truck },
  shipped:            { label: 'Shipped',            className: 'bg-sky-50 text-sky-700 border-sky-200',          icon: Truck },
  partially_shipped:  { label: 'Partially Shipped',  className: 'bg-sky-50 text-sky-700 border-sky-200',          icon: Truck },
  out_for_delivery:   { label: 'Out for Delivery',   className: 'bg-cyan-50 text-cyan-700 border-cyan-200',       icon: MapPin },
  delivered:          { label: 'Delivered',          className: 'bg-green-50 text-green-700 border-green-200',    icon: CircleCheck },
  cancelled:          { label: 'Cancelled',          className: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle },
  returns:            { label: 'Returns',            className: 'bg-orange-50 text-orange-700 border-orange-200', icon: RotateCcw },
  return_requested:   { label: 'Return Requested',   className: 'bg-orange-50 text-orange-700 border-orange-200', icon: RotateCcw },
  return_in_progress: { label: 'Return In Progress', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: RotateCcw },
  return_approved:    { label: 'Return Approved',    className: 'bg-orange-50 text-orange-600 border-orange-200', icon: CheckCircle2 },
  return_rejected:    { label: 'Return Rejected',    className: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle },
  return_picked:      { label: 'Return Picked',      className: 'bg-orange-50 text-orange-700 border-orange-200', icon: Package },
  return_received:    { label: 'Return Received',    className: 'bg-stone-100 text-stone-700 border-stone-200',   icon: Package },
  exchange_requested: { label: 'Exchange Requested', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: RotateCcw },
  refund_initiated:   { label: 'Refund Initiated',   className: 'bg-teal-50 text-teal-700 border-teal-200',       icon: DollarSign },
  refund_completed:   { label: 'Refund Completed',   className: 'bg-green-50 text-green-700 border-green-200',    icon: CircleCheck },
  failed:             { label: 'Failed',             className: 'bg-red-50 text-red-700 border-red-200',          icon: AlertCircle },
  on_hold:            { label: 'On Hold',            className: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: AlertCircle },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, StatusConfig> = {
  pending:             { label: 'Payment Pending',    className: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },
  paid:                { label: 'Paid',               className: 'bg-green-50 text-green-700 border-green-200',   icon: CircleCheck },
  failed:              { label: 'Payment Failed',     className: 'bg-red-50 text-red-700 border-red-200',         icon: XCircle },
  refunded:            { label: 'Refunded',           className: 'bg-teal-50 text-teal-700 border-teal-200',      icon: RotateCcw },
  partially_refunded:  { label: 'Partial Refund',     className: 'bg-cyan-50 text-cyan-700 border-cyan-200',      icon: RotateCcw },
  cod_pending:         { label: 'COD — Pending',      className: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },
  cod_verified:        { label: 'COD — Collected',    className: 'bg-green-50 text-green-700 border-green-200',   icon: CircleCheck },
};

export const ORDER_ITEM_STATUS_CONFIG: Record<OrderItemStatus, StatusConfig> = {
  pending:          { label: 'Pending',           className: 'bg-amber-50 text-amber-700 border-amber-200',    icon: Clock },
  active:           { label: 'Active',            className: 'bg-green-50 text-green-700 border-green-200',    icon: CircleCheck },
  confirmed:        { label: 'Confirmed',          className: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle2 },
  packed:           { label: 'Packed',             className: 'bg-violet-50 text-violet-700 border-violet-200', icon: Package },
  dispatched:       { label: 'Dispatched',         className: 'bg-sky-50 text-sky-700 border-sky-200',          icon: Truck },
  delivered:        { label: 'Delivered',          className: 'bg-green-50 text-green-700 border-green-200',    icon: CircleCheck },
  cancelled:        { label: 'Cancelled',          className: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle },
  return_requested: { label: 'Return Requested',   className: 'bg-orange-50 text-orange-700 border-orange-200', icon: RotateCcw },
  returned:         { label: 'Returned',           className: 'bg-stone-100 text-stone-700 border-stone-200',   icon: RotateCcw },
  exchanged:        { label: 'Exchanged',          className: 'bg-stone-100 text-stone-600 border-stone-200',   icon: RotateCcw },
  refunded:         { label: 'Refunded',           className: 'bg-teal-50 text-teal-700 border-teal-200',       icon: DollarSign },
};

export const REFUND_STATUS_CONFIG: Record<RefundStatus, StatusConfig> = {
  pending:    { label: 'Pending',    className: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },
  approved:   { label: 'Approved',  className: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle2 },
  rejected:   { label: 'Rejected',  className: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle },
  processing: { label: 'Processing',className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: RefreshCcw },
  completed:  { label: 'Completed', className: 'bg-green-50 text-green-700 border-green-200',    icon: CircleCheck },
  failed:     { label: 'Failed',    className: 'bg-red-50 text-red-700 border-red-200',          icon: AlertCircle },
};

export const RETURN_STATUS_CONFIG: Record<ReturnStatus, StatusConfig> = {
  pending:          { label: 'Return Requested', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: RotateCcw },
  approved:         { label: 'Return Approved',  className: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle2 },
  rejected:         { label: 'Return Rejected',  className: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle },
  picked_up:        { label: 'Picked Up',        className: 'bg-violet-50 text-violet-700 border-violet-200', icon: Package },
  received:         { label: 'Received',         className: 'bg-stone-100 text-stone-700 border-stone-200',   icon: Package },
  refund_initiated: { label: 'Refund Initiated', className: 'bg-teal-50 text-teal-700 border-teal-200',       icon: DollarSign },
};

// ─── Component ─────────────────────────────────────────────────────────────────

interface OrderStatusBadgeProps {
  status: OrderStatus | PaymentStatus | RefundStatus | ReturnStatus | OrderItemStatus | string;
  type?: 'order' | 'payment' | 'refund' | 'return' | 'item';
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function OrderStatusBadge({
  status,
  type = 'order',
  size = 'md',
  showIcon = true,
  className = '',
}: OrderStatusBadgeProps) {
  let config: StatusConfig | undefined;
  const safeStatus = typeof status === 'string' ? status : '';

  if (type === 'order') config = ORDER_STATUS_CONFIG[safeStatus as OrderStatus] || ORDER_ITEM_STATUS_CONFIG[safeStatus as OrderItemStatus];
  else if (type === 'payment') config = PAYMENT_STATUS_CONFIG[safeStatus as PaymentStatus];
  else if (type === 'refund') config = REFUND_STATUS_CONFIG[safeStatus as RefundStatus];
  else if (type === 'return') config = RETURN_STATUS_CONFIG[safeStatus as ReturnStatus];
  else if (type === 'item') config = ORDER_ITEM_STATUS_CONFIG[safeStatus as OrderItemStatus];

  if (!config) {
    config = {
      label: safeStatus ? safeStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown Status',
      className: 'bg-stone-100 text-stone-600 border-stone-200',
      icon: AlertCircle,
    };
  }

  const { label, className: statusClass, icon: Icon } = config;

  const sizeClass = size === 'sm'
    ? 'text-[9px] px-1.5 py-0.5 tracking-[0.1em]'
    : 'text-[10px] px-2 py-1 tracking-[0.12em]';

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-md font-sans font-medium uppercase ${sizeClass} ${statusClass} ${className}`}
    >
      {showIcon && <Icon size={size === 'sm' ? 9 : 10} />}
      {label}
    </span>
  );
}
