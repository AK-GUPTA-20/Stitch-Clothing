// src/lib/api/orderService.ts
import { apiClient } from './apiClient';
import { toQuery } from '@/lib/utils';
import {
  OrderResponse,
  OrderListResponse,
  OrderAnalyticsResponse,
  InvoiceResponse,
  RefundListResponse,
  BasicOrderResponse,
  CreateOrderPayload,
  CancelOrderPayload,
  CancelOrderItemPayload,
  RequestReturnPayload,
  RequestRefundPayload,
  VerifyPaymentPayload,
  UpdatePaymentStatusPayload,
  VerifyCODPayload,
  DispatchOrderPayload,
  UpdateTrackingPayload,
  UpdateOrderStatusPayload,
  AdminCancelOrderPayload,
  UpdateRefundStatusPayload,
  UpdateReturnStatusPayload,
  GetOrdersParams,
} from '../types/order.types';

// ─── Order Service ─────────────────────────────────────────────────────────────

export const orderService = {

  // ══════════════════════════════════════════════════════════════════════════
  // 3.1  User — Order CRUD
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/orders
   * Create a new order for the authenticated user.
   */
  createOrder: (payload: CreateOrderPayload) =>
    apiClient.post<OrderResponse>('/api/v1/orders', payload),

  /**
   * GET /api/v1/orders/my
   * Get the authenticated user's own orders with optional filters.
   */
  getMyOrders: (params?: GetOrdersParams) =>
    apiClient.get<OrderListResponse>(`/api/v1/orders/my${toQuery(params as any)}`),

  /**
   * GET /api/v1/orders/ref/:orderId
   * Get an order by its human-readable reference ID (e.g. "ORD-2024-001").
   */
  getOrderByRef: (orderId: string) =>
    apiClient.get<OrderResponse>(`/api/v1/orders/ref/${encodeURIComponent(orderId)}`),

  /**
   * GET /api/v1/orders/:id
   * Get full order detail by MongoDB _id.
   */
  getOrderById: (id: string) =>
    apiClient.get<OrderResponse>(`/api/v1/orders/${id}`),

  /**
   * PATCH /api/v1/orders/:id/cancel
   * Cancel an order (only if in a cancellable state).
   */
  cancelOrder: (id: string, payload?: CancelOrderPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/cancel`, payload ?? {}),

  /**
   * PATCH /api/v1/orders/:id/items/:itemId/cancel
   * Cancel a specific item within an order.
   */
  cancelOrderItem: (id: string, itemId: string, payload?: CancelOrderItemPayload) =>
    apiClient.patch<OrderResponse>(
      `/api/v1/orders/${id}/items/${itemId}/cancel`,
      payload ?? {}
    ),

  // ══════════════════════════════════════════════════════════════════════════
  // 3.2  User — Return & Refund
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/orders/:id/return
   * Request a return for an order.
   */
  requestReturn: (id: string, payload: RequestReturnPayload) =>
    apiClient.post<OrderResponse>(`/api/v1/orders/${id}/return`, payload),

  /**
   * POST /api/v1/orders/:id/refund
   * Request a refund for an order or specific items.
   */
  requestRefund: (id: string, payload: RequestRefundPayload) =>
    apiClient.post<OrderResponse>(`/api/v1/orders/${id}/refund`, payload),

  /**
   * GET /api/v1/orders/:id/invoice
   * Retrieve the invoice for an order.
   */
  getInvoice: (id: string) =>
    apiClient.get<InvoiceResponse>(`/api/v1/orders/${id}/invoice`),

  /**
   * GET /api/v1/orders/:id/refunds
   * List all refund requests associated with an order.
   */
  getRefunds: (id: string) =>
    apiClient.get<RefundListResponse>(`/api/v1/orders/${id}/refunds`),

  // ══════════════════════════════════════════════════════════════════════════
  // 3.3  Payment
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/orders/:id/payment/verify
   * Verify payment after a gateway callback (e.g. Razorpay signature check).
   */
  verifyPayment: (id: string, payload: VerifyPaymentPayload) =>
    apiClient.post<OrderResponse>(`/api/v1/orders/${id}/payment/verify`, payload),

  /**
   * PATCH /api/v1/orders/:id/payment/status
   * Manually update payment status (admin/webhook use).
   */
  updatePaymentStatus: (id: string, payload: UpdatePaymentStatusPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/payment/status`, payload),

  /**
   * PATCH /api/v1/orders/:id/payment/cod/verify
   * Mark a COD order as payment-collected by delivery agent.
   */
  verifyCOD: (id: string, payload?: VerifyCODPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/payment/cod/verify`, payload ?? {}),

  // ══════════════════════════════════════════════════════════════════════════
  // 3.4  Seller Flow
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/orders/seller
   * Get all orders belonging to the authenticated seller.
   */
  getSellerOrders: (params?: GetOrdersParams) =>
    apiClient.get<OrderListResponse>(`/api/v1/orders/seller${toQuery(params as any)}`),

  /**
   * PATCH /api/v1/orders/:id/confirm
   * Seller confirms a pending order.
   */
  confirmOrder: (id: string) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/confirm`, {}),

  /**
   * PATCH /api/v1/orders/:id/process
   * Seller moves order to processing state.
   */
  processOrder: (id: string) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/process`, {}),

  /**
   * PATCH /api/v1/orders/:id/pack
   * Seller marks an order as packed and ready for dispatch.
   */
  markPacked: (id: string) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/pack`, {}),

  /**
   * PATCH /api/v1/orders/:id/dispatch
   * Seller dispatches the order with courier details.
   */
  dispatchOrder: (id: string, payload: DispatchOrderPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/dispatch`, payload),

  /**
   * PATCH /api/v1/orders/:id/tracking
   * Update tracking information for a dispatched order.
   */
  updateTracking: (id: string, payload: UpdateTrackingPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/tracking`, payload),

  /**
   * PATCH /api/v1/orders/:id/seller/cancel
   * Seller cancels an order (before shipped).
   */
  sellerCancelOrder: (id: string, payload: { reason: string }) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/seller/cancel`, payload),

  /**
   * PATCH /api/v1/orders/:id/seller/deliver
   * Seller marks an order as delivered.
   */
  sellerMarkDelivered: (id: string) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/seller/deliver`, {}),

  /**
   * PATCH /api/v1/orders/:id/seller/status
   * Seller updates the order status.
   */
  sellerUpdateStatus: (id: string, status: string) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/seller/status`, { status }),

  /**
   * PATCH /api/v1/orders/:id/seller/return
   * Seller updates a return request status.
   */
  sellerUpdateReturnStatus: (id: string, payload: UpdateReturnStatusPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/seller/return`, payload),

  // ══════════════════════════════════════════════════════════════════════════
  // 3.5  Admin — Order Management
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/orders/analytics
   * Retrieve order analytics and metrics (admin only).
   */
  getOrderAnalytics: () =>
    apiClient.get<OrderAnalyticsResponse>('/api/v1/orders/analytics'),

  /**
   * GET /api/v1/orders
   * List all orders across all users (admin only) with filters.
   */
  getAllOrders: (params?: GetOrdersParams) =>
    apiClient.get<OrderListResponse>(`/api/v1/orders${toQuery(params as any)}`),

  /**
   * PATCH /api/v1/orders/:id/status
   * Manually update an order's status (admin).
   */
  updateOrderStatus: (id: string, payload: UpdateOrderStatusPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/status`, payload),

  /**
   * PATCH /api/v1/orders/:id/deliver
   * Mark an order as delivered (admin/logistics).
   */
  markDelivered: (id: string) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/deliver`, {}),

  /**
   * PATCH /api/v1/orders/:id/invoice
   * Generate/regenerate the invoice PDF for an order (admin).
   */
  generateInvoice: (id: string) =>
    apiClient.patch<InvoiceResponse>(`/api/v1/orders/${id}/invoice`, {}),

  /**
   * PATCH /api/v1/orders/:id/admin/cancel
   * Admin force-cancel an order with a reason.
   */
  adminCancelOrder: (id: string, payload: AdminCancelOrderPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/admin/cancel`, payload),

  // ══════════════════════════════════════════════════════════════════════════
  // 3.6  Admin — Refund & Return
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * PATCH /api/v1/orders/:id/refunds/:refundId/status
   * Approve, reject, or process a specific refund request (admin).
   */
  updateRefundStatus: (
    id: string,
    refundId: string,
    payload: UpdateRefundStatusPayload
  ) =>
    apiClient.patch<OrderResponse>(
      `/api/v1/orders/${id}/refunds/${refundId}/status`,
      payload
    ),

  /**
   * PATCH /api/v1/orders/:id/return/status
   * Update the return request status (admin).
   */
  updateReturnStatus: (id: string, payload: UpdateReturnStatusPayload) =>
    apiClient.patch<OrderResponse>(`/api/v1/orders/${id}/return/status`, payload),

  /**
   * GET /api/v1/orders/seller/analytics
   * Retrieve order analytics and metrics for the authenticated seller.
   */
  getSellerOrderAnalytics: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<OrderAnalyticsResponse>(`/api/v1/orders/seller/analytics${toQuery(params)}`),
};
