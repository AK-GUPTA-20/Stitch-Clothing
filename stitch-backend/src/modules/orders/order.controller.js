"use strict";

const asyncHandler = require("../../middleware/asyncHandler");
const ErrorHandler    = require("../../middleware/error");
const Product         = require("../../models/Product");
const Order           = require("../../models/Order");
const Seller          = require("../../models/Seller");
const User            = require("../../models/User");
const Config          = require("../../models/Config");
const mongoose        = require("mongoose");

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

const CANCELLABLE_STATUSES  = ["pending", "confirmed"];
const RETURNABLE_STATUSES   = ["delivered"];
const SELLER_FLOW_STATUSES  = {
  confirm  : { from: ["pending"],     to: "confirmed"  },
  process  : { from: ["confirmed"],   to: "processing" },
  pack     : { from: ["processing"],  to: "packed"     },
  dispatch : { from: ["packed"],      to: "dispatched" },
  deliver  : { from: ["dispatched"],  to: "delivered"  },
};

function _pushStatusHistory(order, status, userId, role = "system") {
  order._updatedBy = userId;
  order.statusHistory.push({ status, updatedBy: userId, role, timestamp: new Date() });
}

function _hasLedgerEntry(entries, { type, source, referenceId, amount }) {
  return entries.some((entry) => {
    if (type && entry.type !== type) return false;
    if (source && entry.source !== source) return false;
    if (referenceId && entry.referenceId?.toString() !== referenceId.toString()) return false;
    if (amount !== undefined && Number(entry.amount) !== Number(amount)) return false;
    return true;
  });
}

async function _settleSellerWallet(order, session) {
  const settlementReferenceId = order._id.toString();
  let seller = await Seller.findById(order.sellerId).session(session);
  if (!seller) {
    // Fallback: If order.sellerId matches User ID instead of Seller ID
    seller = await Seller.findOne({ userId: order.sellerId }).session(session);
  }
  if (!seller) return false;

  const amount = Number(order.pricing?.total || order.payment?.amount || 0);
  if (amount <= 0) return false;

  if (order.isSellerSettled || _hasLedgerEntry(seller.walletLedger || [], { type: "credit", source: "order_settlement", referenceId: settlementReferenceId, amount })) {
    order.isSellerSettled = true;
    return false;
  }

  if (order.payment?.status === "refunded" || order.payment?.status === "partial_refund") {
    return false;
  }

  seller.walletBalance = (seller.walletBalance || 0) + amount;
  seller.walletLedger.push({
    type: "credit",
    amount,
    balance: seller.walletBalance,
    source: "order_settlement",
    referenceId: settlementReferenceId,
    description: `Settlement for Order ${order.orderId || order._id}`,
    createdAt: new Date(),
  });

  seller.markModified("walletLedger");
  await seller.save({ session, validateBeforeSave: false });
  order.isSellerSettled = true;
  return true;
}

async function _processRefund(order, session, { amount: explicitAmount } = {}) {
  const referenceId = order._id.toString();
  const amount = Number(explicitAmount ?? order.pricing?.total ?? order.payment?.amount ?? 0);
  if (amount <= 0) return 0;

  let seller = null;
  if (order.isSellerSettled) {
    seller = await Seller.findById(order.sellerId).session(session);
    if (!seller) {
      // Fallback: If order.sellerId matches User ID instead of Seller ID
      seller = await Seller.findOne({ userId: order.sellerId }).session(session);
    }
  }
  const user = await User.findById(order.userId).session(session);

  if (order.isRefundDeducted) {
    return amount;
  }

  if (seller && !_hasLedgerEntry(seller.walletLedger || [], { type: "debit", source: "refund_deduction", referenceId, amount })) {
    seller.walletBalance = (seller.walletBalance || 0) - amount;
    seller.walletLedger.push({
      type: "debit",
      amount,
      balance: seller.walletBalance,
      source: "refund_deduction",
      referenceId,
      description: `Refund deduction for Order ${order.orderId || order._id}`,
      createdAt: new Date(),
    });
    seller.markModified("walletLedger");
    await seller.save({ session, validateBeforeSave: false });
  }

  if (user && !_hasLedgerEntry(user.walletTransactions || [], { type: "credit", source: "order_refund", referenceId, amount })) {
    user.walletBalance = (user.walletBalance || 0) + amount;
    user.walletTransactions.push({
      type: "credit",
      amount,
      balance: user.walletBalance,
      source: "order_refund",
      referenceId,
      description: `Refund for Order ${order.orderId || order._id}`,
      createdAt: new Date(),
    });
    user.markModified("walletTransactions");
    await user.save({ session });
  }

  order.isRefundDeducted = true;
  order.payment.refundedAmount = Math.max(order.payment.refundedAmount || 0, amount);
  order.payment.refundedAt = new Date();
  if (order.payment.amount && amount < Number(order.payment.amount)) {
    order.payment.status = "partial_refund";
  }

  return amount;
}

/* ─────────────────────────────────────────────────────────────────────────────
   USER — ORDERS
───────────────────────────────────────────────────────────────────────────── */

//* Create a new order  POST /api/v1/orders
exports.createOrder = asyncHandler(async (req, res, next) => {
  if (!req.body.items || req.body.items.length === 0) {
    return next(new ErrorHandler("Order must contain at least one item.", 400));
  }

  req.body.userId   = req.user._id;
  req.body.placedAt = new Date();
  
  if (req.body.payment) {
    req.body.payment.status = "pending";
  } else {
    req.body.payment = { status: "pending" };
  }

  const productIds = [...new Set(req.body.items.map((item) => item.productId).filter(Boolean).map((value) => value.toString()))];
  const products = await Product.find({ _id: { $in: productIds }, deletedAt: null, isActive: true })
    .select("sellerId name slug sku images basePrice salePrice currency variants totalStock");

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const resolvedItems = req.body.items.map((item) => {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      throw new ErrorHandler(`Product not found for item ${item.productId}.`, 404);
    }

    const variant = product.variants.id(item.variantId);
    const sellerId = product.sellerId;
    const unitPrice = Number(item.unitPrice ?? variant?.price ?? product.salePrice ?? product.basePrice ?? 0);
    const quantity = Number(item.quantity ?? 1);
    const subtotal = Number(item.subtotal ?? unitPrice * quantity);

    return {
      productId   : product._id,
      variantId   : item.variantId || variant?._id,
      sellerId    : sellerId,
      name        : item.name || product.name,
      slug        : item.slug || product.slug,
      sku         : item.sku || variant?.sku || product.sku || `${product.slug}-${variant?._id || "ITEM"}`,
      image       : item.image || product.images?.find((img) => img.isDefault)?.url || product.images?.[0]?.url,
      color       : item.color || variant?.color,
      size        : item.size || variant?.size,
      fabric      : item.fabric || product.fabric,
      hsn         : item.hsn || product.hsn,
      quantity,
      unitPrice,
      comparePrice: item.comparePrice ?? variant?.comparePrice,
      taxRate     : item.taxRate ?? product.taxRate ?? 0,
      taxAmount   : item.taxAmount ?? 0,
      discountAmount: item.discountAmount ?? 0,
      subtotal,
      isReturnable   : item.isReturnable ?? product.isReturnable,
      returnWindowDays: item.returnWindowDays ?? product.returnWindowDays,
      isExchangeable : item.isExchangeable ?? product.isExchangeable,
      customisations  : item.customisations || item.customisation ? [item.customisation].filter(Boolean) : [],
      status          : item.status || "active",
      cancelledQty    : item.cancelledQty || 0,
      returnedQty     : item.returnedQty || 0,
      isReviewed      : item.isReviewed || false,
    };
  });

  req.body.items = resolvedItems;
  req.body.sellerId = req.body.sellerId || resolvedItems[0]?.sellerId;
  req.body.orderId = req.body.orderId || `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  if (!req.body.sellerId) {
    return next(new ErrorHandler("Unable to determine seller for this order.", 400));
  }

  const order = await Order.create(req.body);

  _pushStatusHistory(order, "placed", req.user._id, "user");
  await order.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, data: order });
});

//* Get authenticated user's orders with filter and pagination  GET /api/v1/orders/my
exports.getMyOrders = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 10,
    orderStatus, paymentStatus,
    sortBy = "placedAt", order: sortOrder = "desc",
    from, to,
  } = req.query;

  const filter = { userId: req.user._id };

  if (orderStatus)   filter.orderStatus      = orderStatus;
  if (paymentStatus) filter["payment.status"] = paymentStatus;
  if (from || to) {
    filter.placedAt = {};
    if (from) filter.placedAt.$gte = new Date(from);
    if (to)   filter.placedAt.$lte = new Date(to);
  }

  const skip      = (Number(page) - 1) * Number(limit);
  const direction = sortOrder === "asc" ? 1 : -1;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .select("-statusHistory -refunds -returnRequest -payment.gatewayResponse -payment.gatewaySignature")
      .sort({ [sortBy]: direction })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : orders,
  });
});

//* Get a single order by ID (user owns it or admin)  GET /api/v1/orders/:id
exports.getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("items.productId", "name slug images")
    .populate("items.sellerId",  "name logo");

  if (!order) return next(new ErrorHandler("Order not found.", 404));

  const isOwner = order.userId.toString() === req.user._id.toString();
  const isSeller = order.sellerId?.toString() === req.user._id?.toString();

  if (!isOwner && !isSeller && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised to view this order.", 403));
  }

  res.status(200).json({ success: true, data: order });
});

//* Get order by human-readable orderId string  GET /api/v1/orders/ref/:orderId
exports.getOrderByRef = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() });

  if (!order) return next(new ErrorHandler("Order not found.", 404));

  const isOwner = order.userId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised to view this order.", 403));
  }

  res.status(200).json({ success: true, data: order });
});

//* Cancel an order (user, only before it is shipped)  PATCH /api/v1/orders/:id/cancel
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return next(new ErrorHandler("Order not found.", 404));
  if (order.userId.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorised to cancel this order.", 403));
  }
  if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Order cannot be cancelled in status "${order.orderStatus}".`, 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.orderStatus        = "cancelled";
    order.cancellationReason = reason || "Cancelled by customer";
    order.cancelledAt        = new Date();
    order.cancelledBy        = req.user._id;

    // Mark all active items as cancelled
    order.items.forEach((item) => {
      if (item.status === "active") item.status = "cancelled";
    });

    _pushStatusHistory(order, "cancelled", req.user._id, "user");

    if (order.payment.status === "paid" || order.payment.status === "captured") {
      const refundedAmount = await _processRefund(order, session, { amount: order.pricing?.total });
      order.payment.status = refundedAmount < Number(order.payment.amount || refundedAmount) ? "partial_refund" : "refunded";
    }

    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: "Order cancelled successfully.", data: order });
});

//* Cancel a single item in an order (user, before shipped)  PATCH /api/v1/orders/:id/items/:itemId/cancel
exports.cancelOrderItem = asyncHandler(async (req, res, next) => {
  const { quantity, reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return next(new ErrorHandler("Order not found.", 404));
  if (order.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }
  if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot cancel items when order is "${order.orderStatus}".`, 400));
  }

  const item = order.items.id(req.params.itemId);
  if (!item || item.status !== "active") return next(new ErrorHandler("Item not found or already cancelled.", 404));

  const cancelQty = quantity || item.quantity;
  if (cancelQty > item.quantity - item.cancelledQty) {
    return next(new ErrorHandler("Cancel quantity exceeds available quantity.", 400));
  }

  item.cancelledQty += cancelQty;
  if (item.cancelledQty >= item.quantity) item.status = "cancelled";

  // Check if all items are cancelled
  const allCancelled = order.items.every((i) => i.status === "cancelled");
  if (allCancelled) {
    order.orderStatus        = "cancelled";
    order.cancellationReason = reason || "All items cancelled by customer";
    order.cancelledAt        = new Date();
    order.cancelledBy        = req.user._id;
    _pushStatusHistory(order, "cancelled", req.user._id, "user");

    if (order.payment.status === "paid" || order.payment.status === "captured") {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const refundedAmount = await _processRefund(order, session, { amount: order.pricing?.total });
        order.payment.status = refundedAmount < Number(order.payment.amount || refundedAmount) ? "partial_refund" : "refunded";
        await order.save({ session, validateBeforeSave: false });
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }

      return res.status(200).json({ success: true, message: "Item cancelled.", data: order });
    }
  }

  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Item cancelled.", data: order });
});

/* ─────────────────────────────────────────────────────────────────────────────
   USER — RETURN & REFUND
───────────────────────────────────────────────────────────────────────────── */

//* Request a return or exchange for a delivered order  POST /api/v1/orders/:id/return
exports.requestReturn = asyncHandler(async (req, res, next) => {
  const { type, reason, description, images, pickupDate, pickupAddress, exchangeProductId, exchangeVariantId } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.userId.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorised.", 403));
  }
  if (!RETURNABLE_STATUSES.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Returns can only be requested for delivered orders.`, 400));
  }
  if (order.returnRequest?.status && order.returnRequest.status !== "rejected") {
    return next(new ErrorHandler("A return/exchange request already exists for this order.", 409));
  }

  order.returnRequest = {
    type,
    reason,
    description,
    images        : images || [],
    pickupDate,
    pickupAddress : pickupAddress || order.shippingAddress,
    exchangeProductId,
    exchangeVariantId,
    requestedAt   : new Date(),
    status        : "requested",
  };

  order.orderStatus = "returns";
  _pushStatusHistory(order, "requested", req.user._id, "user");
  await order.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, message: `${type === "exchange" ? "Exchange" : "Return"} request submitted.`, data: order });
});

//* Request a refund for an order or specific items  POST /api/v1/orders/:id/refund
exports.requestRefund = asyncHandler(async (req, res, next) => {
  const { reason, description, items, images, refundTo } = req.body;

  if (!reason) return next(new ErrorHandler("reason is required.", 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.userId.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  const allowedStatuses = ["delivered", "cancelled", "returned"];
  if (!allowedStatuses.includes(order.orderStatus)) {
    return next(new ErrorHandler("Refund cannot be requested for this order status.", 400));
  }

  // Compute refund amount from items or whole order
  let amount = 0;
  if (items && items.length > 0) {
    for (const ri of items) {
      const item = order.items.id(ri.orderItemId);
      if (item) amount += (item.unitPrice * ri.quantity);
    }
  } else {
    amount = order.pricing.total;
  }

  if (amount <= 0) {
    return next(new ErrorHandler("Refund amount must be greater than zero.", 400));
  }

  const activeRefund = order.refunds.find((refund) => ["requested", "under_review", "approved", "processing", "processed"].includes(refund.status));
  if (activeRefund) {
    const sameItems = JSON.stringify(activeRefund.items || []) === JSON.stringify(items || []);
    const sameRequest = activeRefund.reason === reason && Number(activeRefund.amount || 0) === Number(amount) && (activeRefund.refundTo || "original_payment") === (refundTo || "original_payment") && sameItems;
    if (sameRequest) {
      return res.status(200).json({ success: true, message: "Refund request already exists.", refund: activeRefund });
    }
    return next(new ErrorHandler("A refund request already exists for this order.", 409));
  }

  order.refunds.push({
    reason,
    description,
    items       : items || [],
    images      : images || [],
    amount,
    refundTo    : refundTo || "original_payment",
    status      : "requested",
    requestedAt : new Date(),
  });

  await order.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, message: "Refund request submitted.", refund: order.refunds[order.refunds.length - 1] });
});

//* Get invoice download URL for an order  GET /api/v1/orders/:id/invoice
exports.getInvoice = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).select("userId invoice orderId payment.status");
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  const isOwner = order.userId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }
  if (!order.invoice?.url) {
    return next(new ErrorHandler("Invoice not yet generated for this order.", 404));
  }

  res.status(200).json({ success: true, invoice: order.invoice });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PAYMENT
───────────────────────────────────────────────────────────────────────────── */

//* Verify and capture gateway payment (Razorpay / Stripe)  POST /api/v1/orders/:id/payment/verify
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { gatewayOrderId, gatewayPaymentId, gatewaySignature, transactionId } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.payment.status === "paid" || order.payment.status === "captured") {
    return next(new ErrorHandler("Payment already verified for this order.", 400));
  }

  // Signature verification would happen here via gateway SDK
  // e.g. Razorpay: crypto.createHmac('sha256', secret).update(`${gatewayOrderId}|${gatewayPaymentId}`).digest('hex')
  // Keeping it provider-agnostic — call gateway service layer before this

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.payment.gatewayOrderId   = gatewayOrderId;
    order.payment.gatewayPaymentId = gatewayPaymentId;
    order.payment.gatewaySignature = gatewaySignature;
    order.payment.transactionId    = transactionId;
    order.payment.status           = "paid";
    order.payment.paidAt           = new Date();

    // Instantly credit seller for online payments
    if (order.payment.method !== "cod") {
      await _settleSellerWallet(order, session);
    }

    if (order.orderStatus === "placed") {
      order.orderStatus = "confirmed";
      _pushStatusHistory(order, "confirmed", req.user._id, "system");
    }

    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: "Payment verified.", paymentStatus: order.payment.status });
});

//* Update payment status manually (admin)  PATCH /api/v1/orders/:id/payment/status
exports.updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { status, transactionId, failureReason, failureCode } = req.body;

  const ALLOWED = ["pending", "authorized", "captured", "paid", "failed", "refunded", "partial_refund", "cancelled"];
  if (!ALLOWED.includes(status)) return next(new ErrorHandler(`Invalid payment status "${status}".`, 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.payment.status        = status;
    if (transactionId)  order.payment.transactionId  = transactionId;
    if (failureReason)  order.payment.failureReason  = failureReason;
    if (failureCode)    order.payment.failureCode     = failureCode;
    if (status === "paid" || status === "captured") {
      order.payment.paidAt = new Date();
      if (order.payment.method !== "cod") {
        await _settleSellerWallet(order, session);
      }
    }

    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, paymentStatus: order.payment.status });
});

//* Verify COD payment on delivery (admin / delivery agent)  PATCH /api/v1/orders/:id/payment/cod/verify
exports.verifyCOD = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.payment.method !== "cod") {
    return next(new ErrorHandler("This order is not a COD order.", 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.isCODVerified        = true;
    order.codVerifiedAt        = new Date();
    order.codVerifiedBy        = req.user._id;
    order.payment.status       = "paid";
    order.payment.paidAt       = new Date();
    order.orderStatus          = "delivered";
    order.tracking             = { ...order.tracking, deliveredAt: new Date() };

    _pushStatusHistory(order, "delivered", req.user._id, "admin");
    await _settleSellerWallet(order, session);
    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: "COD payment verified and order marked delivered.", paymentStatus: order.payment.status, orderStatus: order.orderStatus });
});

/* ─────────────────────────────────────────────────────────────────────────────
   SELLER FLOW
───────────────────────────────────────────────────────────────────────────── */

//* Get all orders for the authenticated seller  GET /api/v1/orders/seller
exports.getSellerOrders = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20,
    orderStatus, paymentStatus,
    from, to,
    sortBy = "placedAt", order: sortOrder = "desc",
  } = req.query;

  const filter = {
    sellerId: {
      $in: [req.user.sellerId, req.user._id].filter(Boolean)
    }
  };
  if (orderStatus)   filter.orderStatus       = orderStatus;
  if (paymentStatus) filter["payment.status"] = paymentStatus;
  if (from || to) {
    filter.placedAt = {};
    if (from) filter.placedAt.$gte = new Date(from);
    if (to)   filter.placedAt.$lte = new Date(to);
  }

  const skip      = (Number(page) - 1) * Number(limit);
  const direction = sortOrder === "asc" ? 1 : -1;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .select("-payment.gatewayResponse -payment.gatewaySignature")
      .sort({ [sortBy]: direction })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : orders,
  });
});

//* Seller confirms the order  PATCH /api/v1/orders/:id/confirm
exports.confirmOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  if (!SELLER_FLOW_STATUSES.confirm.from.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot confirm order in status "${order.orderStatus}".`, 400));
  }

  order.orderStatus        = "confirmed";
  order.sellerConfirmedAt  = new Date();
  _pushStatusHistory(order, "confirmed", req.user._id, "seller");
  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Order confirmed.", orderStatus: order.orderStatus, data: order });
});

//* Seller processes the order  PATCH /api/v1/orders/:id/process
exports.processOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  if (!SELLER_FLOW_STATUSES.process.from.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot process order in status "${order.orderStatus}".`, 400));
  }

  order.orderStatus        = "processing";
  _pushStatusHistory(order, "processing", req.user._id, "seller");
  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Order moved to processing.", orderStatus: order.orderStatus, data: order });
});

//* Seller marks order as packed  PATCH /api/v1/orders/:id/pack
exports.markPacked = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  if (!SELLER_FLOW_STATUSES.pack.from.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot pack order in status "${order.orderStatus}".`, 400));
  }

  order.orderStatus     = "packed";
  order.sellerPackedAt  = new Date();
  _pushStatusHistory(order, "packed", req.user._id, "seller");
  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Order marked as packed.", orderStatus: order.orderStatus, data: order });
});

//* Seller dispatches order with tracking details  PATCH /api/v1/orders/:id/dispatch
exports.dispatchOrder = asyncHandler(async (req, res, next) => {
  const { courier, labelUrl, trackingUrl, estimatedDelivery } = req.body;
  const awb = req.body.awb || req.body.awbNumber;

  if (!courier || !awb) {
    return next(new ErrorHandler("courier and awb are required to dispatch.", 400));
  }

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  if (!SELLER_FLOW_STATUSES.dispatch.from.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot dispatch order in status "${order.orderStatus}".`, 400));
  }

  order.orderStatus          = "dispatched";
  order.sellerDispatchedAt   = new Date();
  order.tracking = {
    courier,
    awb,
    labelUrl,
    trackingUrl,
    estimatedDelivery : estimatedDelivery ? new Date(estimatedDelivery) : undefined,
    dispatchedAt      : new Date(),
  };

  _pushStatusHistory(order, "dispatched", req.user._id, "seller");
  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Order dispatched.", tracking: order.tracking, orderStatus: order.orderStatus, data: order });
});

//* Update tracking info for a dispatched order  PATCH /api/v1/orders/:id/tracking
exports.updateTracking = asyncHandler(async (req, res, next) => {
  const { courier, labelUrl, trackingUrl, estimatedDelivery } = req.body;
  const awb = req.body.awb || req.body.awbNumber;

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (!order.tracking) order.tracking = {};
  if (courier)           order.tracking.courier           = courier;
  if (awb)               order.tracking.awb               = awb;
  if (labelUrl)          order.tracking.labelUrl          = labelUrl;
  if (trackingUrl)       order.tracking.trackingUrl       = trackingUrl;
  if (estimatedDelivery) order.tracking.estimatedDelivery = new Date(estimatedDelivery);

  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, tracking: order.tracking, data: order });
});

//* Seller cancels an order  PATCH /api/v1/orders/:id/seller/cancel
exports.sellerCancelOrder = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return next(new ErrorHandler("Cancellation reason is required.", 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

// A seller can only cancel before the order is processed.
  if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot cancel an order in "${order.orderStatus}" status.`, 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.orderStatus         = "cancelled";
    order.cancellationReason  = reason;
    order.cancelledAt         = new Date();
    order.cancelledBy         = req.user._id;

    order.items.forEach((item) => {
      if (item.status === "active") item.status = "cancelled";
    });

    _pushStatusHistory(order, "cancelled", req.user._id, "seller");

    if (order.payment.status === "paid" || order.payment.status === "captured") {
      const refundedAmount = await _processRefund(order, session, { amount: order.pricing?.total });
      order.payment.status = refundedAmount < Number(order.payment.amount || refundedAmount) ? "partial_refund" : "refunded";
    }

    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: "Order cancelled by seller.", data: order });
});

//* Seller marks order as delivered (e.g. self-shipping)  PATCH /api/v1/orders/:id/seller/deliver
exports.sellerDeliverOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  if (!SELLER_FLOW_STATUSES.deliver.from.includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot mark as delivered from status "${order.orderStatus}".`, 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.orderStatus          = "delivered";
    order.tracking             = { ...order.tracking, deliveredAt: new Date() };
    _pushStatusHistory(order, "delivered", req.user._id, "seller");
    
    if (order.payment.method === "cod" && order.payment.status !== "paid") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
    }
    await _settleSellerWallet(order, session);

    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: "Order marked as delivered.", orderStatus: order.orderStatus, data: order });
});

//* Seller generically updates order status  PATCH /api/v1/orders/:id/seller/status
exports.sellerUpdateStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const VALID = [
    "pending", "confirmed", "processing", "packed", "dispatched", "shipped",
    "out_for_delivery", "delivered", "cancelled", "returns"
  ];

  if (!VALID.includes(status)) {
    return next(new ErrorHandler(`Invalid order status "${status}".`, 400));
  }

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString()) {
    return next(new ErrorHandler("Not authorised to update this order.", 403));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.orderStatus = status;
    if (status === "delivered") order.tracking = { ...order.tracking, deliveredAt: new Date() };
    if (status === "cancelled") {
      order.cancelledAt = new Date();
      order.cancelledBy = req.user._id;
    }

    _pushStatusHistory(order, status, req.user._id, "seller");

    if (status === "delivered") {
      if (order.payment.method === "cod" && order.payment.status !== "paid") {
        order.payment.status = "paid";
        order.payment.paidAt = new Date();
      }
      await _settleSellerWallet(order, session);
    } else if (status === "returns" && order.returnRequest && order.returnRequest.status === "completed") {
      await _processRefund(order, session);
    }

    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: `Order status changed to ${status}.`, orderStatus: order.orderStatus, data: order });
});

//* Seller updates return request status  PATCH /api/v1/orders/:id/seller/return
exports.sellerUpdateReturnStatus = asyncHandler(async (req, res, next) => {
  const { status, adminNote, pickupDate, resolvedAt } = req.body;

  const ALLOWED = ["requested", "pickup_scheduled", "picked_up", "received", "approved", "rejected", "completed"];
  if (!ALLOWED.includes(status)) return next(new ErrorHandler(`Invalid return status "${status}".`, 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.sellerId?.toString() !== req.user.sellerId?.toString() && order.sellerId?.toString() !== req.user._id?.toString() && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  if (!order.returnRequest) return next(new ErrorHandler("No return request found for this order.", 404));

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.returnRequest.status    = status;
    if (adminNote)  order.returnRequest.adminNote  = adminNote;
    if (pickupDate) order.returnRequest.pickupDate = new Date(pickupDate);
    if (resolvedAt || status === "completed" || status === "rejected") {
      order.returnRequest.resolvedAt = resolvedAt ? new Date(resolvedAt) : new Date();
    }

    if (["pickup_scheduled", "picked_up", "received", "approved", "completed"].includes(status)) {
      order.orderStatus = "returns";
    }

    if (status === "completed") {
      await _processRefund(order, session);
    }

    _pushStatusHistory(order, status, req.user._id, "seller");
    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, returnRequest: order.returnRequest, orderStatus: order.orderStatus, data: order });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — ORDER MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */

//* Get all orders with full filters and pagination (admin)  GET /api/v1/orders
exports.getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20,
    orderStatus, paymentStatus, paymentMethod,
    userId, sellerId,
    from, to,
    minAmount, maxAmount,
    search,
    sortBy = "placedAt", order: sortOrder = "desc",
  } = req.query;

  const filter = {};
  if (orderStatus)   filter.orderStatus        = orderStatus;
  if (paymentStatus) filter["payment.status"]  = paymentStatus;
  if (paymentMethod) filter["payment.method"]  = paymentMethod;
  if (userId)        filter.userId             = userId;
  if (sellerId)      filter.sellerId           = sellerId;
  if (search) {
    filter.$or = [
      { orderId        : new RegExp(search, "i") },
      { "items.name"   : new RegExp(search, "i") },
      { "items.sku"    : new RegExp(search, "i") },
    ];
  }
  if (from || to) {
    filter.placedAt = {};
    if (from) filter.placedAt.$gte = new Date(from);
    if (to)   filter.placedAt.$lte = new Date(to);
  }
  if (minAmount || maxAmount) {
    filter["pricing.total"] = {};
    if (minAmount) filter["pricing.total"].$gte = parseFloat(minAmount);
    if (maxAmount) filter["pricing.total"].$lte = parseFloat(maxAmount);
  }

  const skip      = (Number(page) - 1) * Number(limit);
  const direction = sortOrder === "asc" ? 1 : -1;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .select("-payment.gatewayResponse -payment.gatewaySignature")
      .sort({ [sortBy]: direction })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : orders,
  });
});

//* Update order status to any valid enum value (admin)  PATCH /api/v1/orders/:id/status
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, note } = req.body;

  const VALID = [
    "placed", "confirmed", "processing", "partially_shipped", "shipped",
    "out_for_delivery", "delivered", "cancelled",
    "return_requested", "return_in_progress", "returned", "exchange_requested",
  ];

  if (!VALID.includes(status)) return next(new ErrorHandler(`Invalid order status "${status}".`, 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.orderStatus = status;
    if (note)          order.notes = note;

    if (status === "delivered")  order.tracking = { ...order.tracking, deliveredAt: new Date() };
    if (status === "cancelled") {
      order.cancelledAt = new Date();
      order.cancelledBy = req.user._id;
    }

    _pushStatusHistory(order, status, req.user._id, "admin");
    
    if (status === "delivered") {
      if (order.payment.method === "cod" && order.payment.status !== "paid") {
        order.payment.status = "paid";
        order.payment.paidAt = new Date();
      }
      await _settleSellerWallet(order, session);
    } else if (status === "returns" && order.returnRequest && order.returnRequest.status === "completed") {
      await _processRefund(order, session);
    }
    
    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, orderStatus: order.orderStatus, data: order });
});

//* Mark order as delivered (admin / delivery agent)  PATCH /api/v1/orders/:id/deliver
exports.markDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (!["shipped", "out_for_delivery"].includes(order.orderStatus)) {
    return next(new ErrorHandler(`Cannot mark as delivered from status "${order.orderStatus}".`, 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.orderStatus          = "delivered";
    order.tracking             = { ...order.tracking, deliveredAt: new Date() };
    _pushStatusHistory(order, "delivered", req.user._id, "admin");

    if (order.payment.method === "cod" && order.payment.status !== "paid") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
    }

    await _settleSellerWallet(order, session);
    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: "Order marked as delivered." });
});

//* Generate and attach invoice to an order (admin / seller)  PATCH /api/v1/orders/:id/invoice
exports.generateInvoice = asyncHandler(async (req, res, next) => {
  const { number, url } = req.body;
  if (!url) return next(new ErrorHandler("Invoice URL is required.", 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  order.invoice = {
    number      : number || `INV-${order.orderId}`,
    url,
    generatedAt : new Date(),
  };
  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, invoice: order.invoice });
});

//* Admin cancels an order with reason  PATCH /api/v1/orders/:id/admin/cancel
exports.adminCancelOrder = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return next(new ErrorHandler("Cancellation reason is required.", 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (order.orderStatus === "delivered" || order.orderStatus === "returned") {
    return next(new ErrorHandler(`Cannot cancel a ${order.orderStatus} order.`, 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    order.orderStatus         = "cancelled";
    order.cancellationReason  = reason;
    order.cancelledAt         = new Date();
    order.cancelledBy         = req.user._id;

    order.items.forEach((item) => {
      if (item.status === "active") item.status = "cancelled";
    });

    _pushStatusHistory(order, "cancelled", req.user._id, "admin");

    if (order.payment.status === "paid" || order.payment.status === "captured") {
      const refundedAmount = await _processRefund(order, session, { amount: order.pricing?.total });
      order.payment.status = refundedAmount < Number(order.payment.amount || refundedAmount) ? "partial_refund" : "refunded";
    }

    await order.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: "Order cancelled by admin.", data: order });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — REFUND MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */

//* Get all refund requests for an order (admin)  GET /api/v1/orders/:id/refunds
exports.getRefunds = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).select("orderId refunds userId");
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  const isOwner = order.userId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorised.", 403));
  }

  res.status(200).json({ success: true, refunds: order.refunds });
});

//* Update refund status — approve, reject, process (admin)  PATCH /api/v1/orders/:id/refunds/:refundId/status
exports.updateRefundStatus = asyncHandler(async (req, res, next) => {
  const { status, adminNote, rejectionReason, gatewayRefundId } = req.body;

  const ALLOWED = ["requested", "under_review", "approved", "rejected", "processing", "processed", "failed"];
  if (!ALLOWED.includes(status)) return next(new ErrorHandler(`Invalid refund status "${status}".`, 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  const refund = order.refunds.id(req.params.refundId);
  if (!refund) return next(new ErrorHandler("Refund request not found.", 404));

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (status === "processed" || status === "approved") {
      if (order.returnRequest && !["approved", "completed", "received", "picked_up"].includes(order.returnRequest.status)) {
         return next(new ErrorHandler("Refunds can only be processed after a valid return request is approved.", 400));
      }
      refund.resolvedAt = new Date();
    }
    
    refund.status      = status;
    refund.processedBy = req.user._id;

    if (adminNote)        refund.adminNote        = adminNote;
    if (rejectionReason)  refund.rejectionReason  = rejectionReason;
    if (gatewayRefundId)  refund.gatewayRefundId  = gatewayRefundId;

    if (status === "processed") {
      refund.processedAt  = new Date();
      const refundedAmount = await _processRefund(order, session, { amount: refund.amount });
      order.payment.refundedAmount = Math.max(order.payment.refundedAmount || 0, refundedAmount);
      order.payment.status = refundedAmount < Number(order.payment.amount || refundedAmount) ? "partial_refund" : "refunded";
    }

    await order.save({ session, validateBeforeSave: false });

    await Config.create([{
      type: "audit_log",
      audit: {
        adminId: req.user._id,
        adminName: `${req.user.firstName} ${req.user.lastName}`,
        adminEmail: req.user.email,
        action: "update_refund_status",
        targetType: "order",
        targetId: String(order._id),
        description: `Updated refund ${refund._id} status to ${status} for Order ${order.orderId}`,
      }
    }], { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, refund });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — RETURN MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */

//* Update return / exchange request status (admin)  PATCH /api/v1/orders/:id/return/status
exports.updateReturnStatus = asyncHandler(async (req, res, next) => {
  const { status, adminNote, pickupDate, resolvedAt } = req.body;

  const ALLOWED = ["requested", "pickup_scheduled", "picked_up", "received", "approved", "rejected", "completed"];
  if (!ALLOWED.includes(status)) return next(new ErrorHandler(`Invalid return status "${status}".`, 400));

  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));

  if (!order.returnRequest) return next(new ErrorHandler("No return request found for this order.", 404));

  order.returnRequest.status    = status;
  if (adminNote)  order.returnRequest.adminNote  = adminNote;
  if (pickupDate) order.returnRequest.pickupDate = new Date(pickupDate);
  if (resolvedAt || status === "completed" || status === "rejected") {
    order.returnRequest.resolvedAt = resolvedAt ? new Date(resolvedAt) : new Date();
  }

  // Sync order status
  if (["pickup_scheduled", "picked_up", "received", "approved", "completed"].includes(status)) {
    order.orderStatus = "returns";
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (status === "completed") {
      const refundedAmount = await _processRefund(order, session);
      order.payment.refundedAmount = Math.max(order.payment.refundedAmount || 0, refundedAmount);
      order.payment.status = refundedAmount < Number(order.payment.amount || refundedAmount) ? "partial_refund" : "refunded";
    }

    _pushStatusHistory(order, order.orderStatus, req.user._id, "admin");
    await order.save({ session, validateBeforeSave: false });

    await Config.create([{
      type: "audit_log",
      audit: {
        adminId: req.user._id,
        adminName: `${req.user.firstName} ${req.user.lastName}`,
        adminEmail: req.user.email,
        action: "update_return_status",
        targetType: "order",
        targetId: String(order._id),
        description: `Updated return request status to ${status} for Order ${order.orderId}`,
      }
    }], { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, returnRequest: order.returnRequest });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — ANALYTICS
───────────────────────────────────────────────────────────────────────────── */

//* Get order analytics summary (admin)  GET /api/v1/orders/analytics
exports.getOrderAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const dateFilter = {};
  if (from || to) {
    dateFilter.placedAt = {};
    if (from) dateFilter.placedAt.$gte = new Date(from);
    if (to)   dateFilter.placedAt.$lte = new Date(to);
  }

  const [
    totalOrders,
    totalRevenue,
    statusBreakdown,
    paymentBreakdown,
    topSelling,
  ] = await Promise.all([
    Order.countDocuments(dateFilter),

    Order.aggregate([
      { $match: { ...dateFilter, "payment.status": { $in: ["paid", "captured"] } } },
      { $group: { _id: null, total: { $sum: "$pricing.total" }, avg: { $avg: "$pricing.total" } } },
    ]),

    Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$payment.method", count: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
      { $sort: { revenue: -1 } },
    ]),

    Order.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      { $match: { "items.status": "active" } },
      { $group: { _id: "$items.productId", name: { $first: "$items.name" }, totalSold: { $sum: "$items.quantity" }, revenue: { $sum: "$items.subtotal" } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.status(200).json({
    success : true,
    data    : {
      totalOrders,
      totalRevenue       : totalRevenue[0]?.total || 0,
      averageOrderValue  : totalRevenue[0]?.avg   || 0,
      statusBreakdown,
      paymentBreakdown,
      topSellingProducts : topSelling,
    },
  });
});
