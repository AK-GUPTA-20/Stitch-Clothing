// src/lib/types/order.types.ts

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'dispatched'
  | 'shipped'
  | 'partially_shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returns'
  | 'return_requested'
  | 'return_in_progress'
  | 'return_approved'
  | 'return_rejected'
  | 'return_picked'
  | 'return_received'
  | 'exchange_requested'
  | 'refund_initiated'
  | 'refund_completed'
  | 'failed'
  | 'on_hold';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cod_pending'
  | 'cod_verified';

export type PaymentMethod =
  | 'card'
  | 'upi'
  | 'netbanking'
  | 'wallet'
  | 'cod'
  | 'emi'
  | 'razorpay'
  | 'stripe'
  | 'paypal';

export type RefundStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed';

export type ReturnStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'picked_up'
  | 'received'
  | 'refund_initiated';

export type OrderItemStatus =
  | 'pending'
  | 'active'
  | 'confirmed'
  | 'packed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'exchanged'
  | 'refunded';

// ─── Sub-models ───────────────────────────────────────────────────────────────

export interface OrderAddress {
  _id?: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label?: string;
  gstin?: string;
}

export interface OrderItemVariant {
  _id?: string;
  sku?: string;
  color?: string | { name?: string; hexCode?: string };
  size?: string | { label?: string; value?: string };
  price?: number;
}

export interface OrderItem {
  _id: string;
  productId: string;
  variantId?: string;
  productName: string;
  productSlug?: string;
  productImage?: string;
  variant?: OrderItemVariant;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  tax?: number;
  status: OrderItemStatus;
  cancelledAt?: string;
  cancelReason?: string;
  isReturnable?: boolean;
  returnWindowExpiresAt?: string;
  sellerId?: string;
  sellerName?: string;
  customisation?: {
    type?: string;
    text?: string;
    extraCharge?: number;
  };
}

export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency?: string;
  transactionId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  paidAt?: string;
  failureReason?: string;
  codVerifiedAt?: string;
  codVerifiedBy?: string;
  refundedAmount?: number;
  refundedAt?: string;
}

export interface OrderTracking {
  courier?: string;
  awbNumber?: string;
  trackingUrl?: string;
  dispatchedAt?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  updates?: {
    status: string;
    description?: string;
    location?: string;
    timestamp: string;
  }[];
}

export interface OrderPricing {
  subtotal: number;
  discount?: number;
  couponDiscount?: number;
  couponCode?: string;
  tax?: number;
  shippingCharge?: number;
  packagingCharge?: number;
  walletDeducted?: number;
  loyaltyPointsUsed?: number;
  loyaltyPointsValue?: number;
  total: number;
  currency?: string;
}

export interface RefundItem {
  orderItemId: string;
  quantity?: number;
  reason?: string;
  amount?: number;
}

export interface RefundRequest {
  _id: string;
  orderId: string;
  userId?: string;
  items?: RefundItem[];
  reason: string;
  status: RefundStatus;
  amount: number;
  method?: PaymentMethod | string;
  transactionId?: string;
  notes?: string;
  adminNote?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface ReturnRequest {
  reason: string;
  status: ReturnStatus;
  items?: {
    orderItemId: string;
    quantity?: number;
    images?: string[];
    condition?: string;
  }[];
  pickupAddress?: OrderAddress;
  pickupScheduled?: string;
  pickedUpAt?: string;
  receivedAt?: string;
  adminNote?: string;
  requestedAt?: string;
}

// ─── Main Order ───────────────────────────────────────────────────────────────

export interface Order {
  _id: string;
  orderId: string; // human-readable ref e.g. "ORD-2024-001"
  userId: string;
  sellerId?: string;
  items: OrderItem[];
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress;
  payment: OrderPayment;
  pricing: OrderPricing;
  tracking?: OrderTracking;
  status: OrderStatus;
  statusHistory?: {
    status: OrderStatus;
    timestamp: string;
    /** Alias for timestamp — used by OrderTimeline component */
    updatedAt?: string;
    role: string;
    updatedBy?: string;
  }[];
  returnRequest?: ReturnRequest;
  refunds?: RefundRequest[];
  notes?: string;
  adminNote?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  isGift?: boolean;
  giftMessage?: string;
  loyaltyPointsEarned?: number;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnRequests: number;
  pendingRefunds: number;
  totalRefunded: number;
  averageOrderValue?: number;
  todayOrders?: number;
  weekOrders?: number;
  monthOrders?: number;
  revenueByDay?: { date: string; revenue: number; orders: number }[];
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface OrderResponse {
  success: boolean;
  order: Order;
  message?: string;
}

export interface OrderListResponse {
  success: boolean;
  orders: Order[];
  data?: Order[];
  total?: number;
  page?: number;
  pages?: number;
  limit?: number;
  message?: string;
}

export interface OrderAnalyticsResponse {
  success: boolean;
  analytics: OrderAnalytics;
  message?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoiceUrl?: string;
  invoiceNumber?: string;
  order?: Order;
  message?: string;
}

export interface RefundListResponse {
  success: boolean;
  refunds: RefundRequest[];
  total?: number;
  message?: string;
}

export interface BasicOrderResponse {
  success: boolean;
  message?: string;
}

// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    customisation?: {
      type?: string;
      text?: string;
    };
  }[];
  shippingAddressId?: string;
  shippingAddress?: OrderAddress;
  billingAddressId?: string;
  billingAddress?: OrderAddress;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  useWalletBalance?: boolean;
  useLoyaltyPoints?: number;
  isGift?: boolean;
  giftMessage?: string;
  notes?: string;
}

export interface CancelOrderPayload {
  reason?: string;
}

export interface CancelOrderItemPayload {
  reason?: string;
}

export interface RequestReturnPayload {
  reason: string;
  items?: {
    orderItemId: string;
    quantity?: number;
    images?: string[];
    condition?: string;
  }[];
  pickupAddress?: OrderAddress;
  pickupScheduled?: string;
}

export interface RequestRefundPayload {
  reason: string;
  items?: RefundItem[];
  method?: string;
  notes?: string;
}

export interface VerifyPaymentPayload {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionId?: string;
  gatewayResponse?: Record<string, any>;
}

export interface UpdatePaymentStatusPayload {
  status: PaymentStatus;
  transactionId?: string;
  notes?: string;
}

export interface VerifyCODPayload {
  notes?: string;
}

export interface DispatchOrderPayload {
  courier: string;
  awbNumber: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface UpdateTrackingPayload {
  courier?: string;
  awbNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  status?: string;
  location?: string;
  description?: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

export interface AdminCancelOrderPayload {
  reason: string;
}

export interface UpdateRefundStatusPayload {
  status: RefundStatus;
  adminNote?: string;
  transactionId?: string;
}

export interface UpdateReturnStatusPayload {
  status: ReturnStatus;
  adminNote?: string;
  pickupScheduled?: string;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus | string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  sort?: string;
}
