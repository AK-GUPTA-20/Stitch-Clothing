"use client";
// src/app/checkout/page.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/context/CartContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import {
  getColorLabel,
  getSizeLabel,
  getValidImages,
  getValidImage,
  formatCurrency,
} from "@/lib/utils";
import { orderService } from "@/lib/api/orderService";
import { productService } from "@/lib/api/productService";
import { Address } from "@/lib/types/user.types";
import { apiClient } from "@/lib/api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Lock,
  Truck,
  Check,
  ArrowLeft,
  Wallet,
  Clock,
  Tag,
  X,
  ShieldCheck,
  RefreshCw,
  MapPin,
  CreditCard,
  Package,
  Smartphone,
  Building2,
  Banknote,
  Star,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { useConfig } from "@/lib/context/ConfigContext";
import { z } from "zod";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type Step = "information" | "shipping" | "payment" | "confirmation";

const steps: { key: Step; label: string }[] = [
  { key: "information", label: "Information" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
];

// INR prices
const shippingOptions = [
  {
    id: "standard",
    label: "Standard Shipping",
    sub: "5–7 business days",
    price: 0,
    threshold: 999,
    icon: <Truck size={15} />,
  },
  {
    id: "express",
    label: "Express Shipping",
    sub: "2–3 business days",
    price: 99,
    icon: <Package size={15} />,
  },
  {
    id: "overnight",
    label: "Overnight Shipping",
    sub: "Next business day",
    price: 199,
    icon: <Clock size={15} />,
  },
];

type OnlineSubMethod = "upi" | "card" | "netbanking";
type CheckoutPaymentMode = "online" | "offline";

type PreparedCartLine = {
  productId: string;
  variantId: string;
  name: string;
  slug?: string;
  sku: string;
  image: string;
  color?: { name?: string; hexCode?: string };
  size?: { label?: string; value?: string };
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type PreparedOrder = {
  items: PreparedCartLine[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  shippingAddress: {
    recipientName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    label?: string;
  };
  paymentMethod: string;
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function formatSavedAddress(address: Address) {
  return [
    address.line1,
    address.line2,
    address.landmark,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function splitRecipientName(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

function toPlainText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record._id === "string") return record._id;
    if (typeof record.id === "string") return record.id;
  }
  return "";
}

function isMongoId(value: string) {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function getDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits.slice(0, 10);
}

function getProductImage(product: any, variant: any, fallback?: string) {
  if (variant?.images?.length) {
    const variantImg = variant.images[0];
    if (typeof variantImg === "string" && !variantImg.includes("localhost"))
      return variantImg;
  }
  return getValidImages(product, fallback)[0] || "";
}

function getSelectedVariant(
  product: any,
  item: { size: string; color: string }
) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return null;
  const targetSize = normalizeLabel(getSizeLabel(item.size));
  const targetColor = normalizeLabel(getColorLabel(item.color));
  const match = variants.find((variant: any) => {
    const variantSize = normalizeLabel(getSizeLabel(variant?.size));
    const variantColor = normalizeLabel(getColorLabel(variant?.color));
    return variantSize === targetSize && variantColor === targetColor;
  });
  return match || variants[0] || null;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { settings } = useConfig();

  const [step, setStep] = useState<Step>("information");
  const [paymentMode, setPaymentMode] = useState<CheckoutPaymentMode>("online");
  const [onlineSubMethod, setOnlineSubMethod] =
    useState<OnlineSubMethod>("upi");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to login if user is not authenticated
  const { isLoading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Login Required", "Please login to proceed with checkout.");
      router.push("/login?redirect=/checkout");
    }
  }, [user, authLoading, router, toast]);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [placedOrders, setPlacedOrders] = useState<
    Array<{ _id: string; orderId: string; sellerId: string; total: number }>
  >([]);

  /* Coupon */
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  /* Accordion – order summary on mobile */
  const [summaryOpen, setSummaryOpen] = useState(false);

  /* Shipping */
  const [shipping, setShipping] = useState("standard");
  const [savedAddressId, setSavedAddressId] = useState("manual");
  const [addressInitialized, setAddressInitialized] = useState(false);

  const FREE_SHIPPING_THRESHOLD =
    settings?.shipping?.freeShippingAbove || 999;
  const COD_CHARGE = settings?.shipping?.codCharge || 0;
  const COD_ENABLED = settings?.payment?.codEnabled ?? true;

  const selectedShipping = shippingOptions.find((o) => o.id === shipping)!;
  const isFreeShipping =
    shipping === "standard" && total >= FREE_SHIPPING_THRESHOLD;

  let shippingCost = isFreeShipping ? 0 : selectedShipping.price;
  if (paymentMode === "offline") shippingCost += COD_CHARGE;

  const orderTotal = total + shippingCost - couponDiscount;

  /* Form */
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    country: "India",
    state: "",
    zip: "",
    phone: "",
    saveInfo: false,
    newsletter: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  /* Prefill from user */
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        email: prev.email || user.email || "",
        firstName: prev.firstName || user.firstName || "",
        lastName: prev.lastName || user.lastName || "",
        phone: prev.phone || getDigits(user.phone || ""),
      }));
    }
  }, [user]);

  const applyAddress = (address: Address) => {
    const recipient = splitRecipientName(address.recipientName);
    setForm((prev) => ({
      ...prev,
      firstName: recipient.firstName || prev.firstName,
      lastName: recipient.lastName || prev.lastName,
      address: formatSavedAddress(address),
      city: address.city || prev.city,
      state: address.state || prev.state,
      zip: address.postalCode || prev.zip,
      phone: address.phone || prev.phone,
      country: address.country || prev.country,
    }));
  };

  React.useEffect(() => {
    const preferredAddress =
      user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
    if (!preferredAddress || addressInitialized) return;
    setSavedAddressId(preferredAddress._id || "manual");
    applyAddress(preferredAddress);
    setAddressInitialized(true);
  }, [user?.addresses, addressInitialized]);

  /* Confetti on confirmation */
  useEffect(() => {
    if (step !== "confirmation") return;
    import("canvas-confetti").then((module) => {
      const confetti = module.default;
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;
      const colors = ["#c8a96e", "#e8d4b0", "#9a7a3e", "#292524", "#78716c"];
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });
  }, [step]);

  /* Validation */
  const checkoutInfoSchema = z.object({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    address: z.string().min(3, "Required"),
    city: z.string().min(2, "Required"),
    zip: z.string().min(1, "Required"),
    phone: z
      .string()
      .refine((val) => getDigits(val).length === 10, {
        message: "Phone must be exactly 10 digits",
      }),
  });

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (!user?.email || form.email !== user.email)
      e.email = "Signed-in email is required";
    const result = checkoutInfoSchema.safeParse(form);
    if (!result.success)
      for (const issue of result.error.issues)
        e[issue.path[0] as string] = issue.message;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePayment = () => {
    setErrors({});
    return true;
  };

  /* Coupon */
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>(
        "/api/v1/promotions"
      );
      const promotions = res.data || (res as any).promotions || [];
      const valid = promotions.find(
        (p: any) => p.code === couponInput.toUpperCase()
      );

      if (valid && valid.isActive !== false) {
        let discount = 0;
        if (valid.discountType === "percentage") {
          discount = (total * valid.discountValue) / 100;
        } else {
          discount = Math.min(valid.discountValue, total);
        }
        setAppliedCoupon(couponInput.toUpperCase());
        setCouponDiscount(discount);
        setCouponInput("");
        toast.success("Coupon applied", `You saved ${formatCurrency(discount)}!`);
      } else {
        setCouponError("Invalid or expired coupon code.");
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError("");
  };

  /* Build / place order */
  const buildShippingAddress = useCallback(
    () => ({
      recipientName: `${form.firstName} ${form.lastName}`.trim(),
      phone: getDigits(form.phone),
      line1: form.address,
      line2: form.apartment || undefined,
      city: form.city,
      state: form.state,
      postalCode: form.zip,
      country: form.country || "India",
      label: "Shipping address",
    }),
    [
      form.address,
      form.apartment,
      form.city,
      form.country,
      form.firstName,
      form.lastName,
      form.phone,
      form.state,
      form.zip,
    ]
  );

  const buildPreparedOrders = useCallback(async (): Promise<
    PreparedOrder[]
  > => {
    if (items.length === 0) throw new Error("Your cart is empty.");

    const resolved = await Promise.all(
      items.map(async (item) => {
        const response = await productService.getProductById(item.id);
        const product = response.product || response.data || response;
        if (!product) throw new Error(`Unable to load product ${item.name}.`);

        const variant = getSelectedVariant(product, item);
        const variantId = toPlainText(variant?._id || variant?.id);
        if (!variantId || !isMongoId(variantId))
          throw new Error(
            `Missing variant information for ${product.name}.`
          );

        const productId = toPlainText(product._id || product.id);
        if (!productId || !isMongoId(productId))
          throw new Error(`Missing product id for ${product.name}.`);

        const unitPrice = Number(
          variant?.price ?? product.price ?? item.price ?? 0
        );
        return {
          productId,
          variantId,
          name: product.name,
          slug: product.slug,
          sku:
            variant?.sku ||
            product.sku ||
            `${product.slug || product.name || "SKU"}-${variantId}`,
          image: getProductImage(product, variant, item.image),
          color:
            variant?.color && typeof variant.color === "object"
              ? variant.color
              : undefined,
          size:
            variant?.size && typeof variant.size === "object"
              ? variant.size
              : undefined,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
        } satisfies PreparedCartLine;
      })
    );

    const shippingAddress = buildShippingAddress();
    let shippingCharge = isFreeShipping ? 0 : selectedShipping.price;
    if (paymentMode === "offline") shippingCharge += COD_CHARGE;
    const subtotal = resolved.reduce((sum, l) => sum + l.subtotal, 0);
    const totalForOrder = subtotal + shippingCharge - couponDiscount;

    return [
      {
        items: resolved,
        subtotal,
        deliveryCharge: shippingCharge,
        total: totalForOrder,
        shippingAddress,
        paymentMethod: paymentMode === "online" ? "razorpay" : "cod",
      } as PreparedOrder,
    ];
  }, [
    buildShippingAddress,
    couponDiscount,
    isFreeShipping,
    items,
    paymentMode,
    selectedShipping.price,
    COD_CHARGE,
  ]);

  const placeOrder = useCallback(async () => {
    if (!user) {
      toast.error(
        "Authentication Required",
        "Please sign in to place your order."
      );
      router.push("/login");
      return;
    }
    if (!validateInfo() || !validatePayment()) return;

    setIsSubmitting(true);
    setErrors({});
    setCheckoutError(null);

    try {
      const ordersToPlace = await buildPreparedOrders();
      const orderResults: Array<{
        _id: string;
        orderId: string;
        sellerId: string;
        total: number;
      }> = [];

      for (const draft of ordersToPlace) {
        const payload = {
          items: draft.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            name: item.name,
            slug: item.slug,
            sku: item.sku,
            image: getValidImage(item.image),
            color: item.color,
            size: item.size,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
          shippingAddress: {
            ...draft.shippingAddress,
            country: draft.shippingAddress.country || "IN",
          },
          billingAddress: {
            ...draft.shippingAddress,
            country: draft.shippingAddress.country || "IN",
          },
          pricing: {
            subtotal: draft.subtotal,
            deliveryCharge: draft.deliveryCharge,
            discount: couponDiscount,
            total: draft.total,
            currency: "INR",
          },
          payment: {
            method: paymentMode === "online" ? "razorpay" : "cod",
            status: "pending",
            amount: draft.total,
            currency: "INR",
          },
          coupon: appliedCoupon || undefined,
          notes: `Checkout placed via ${paymentMode} payment${paymentMode === "online" ? ` (${onlineSubMethod})` : ""}`,
        };

        const response: any = await orderService.createOrder(payload as any);
        const created =
          response?.data ||
          response?.order ||
          response?.data?.data ||
          response?.data?.order ||
          response;
        if (!created?._id)
          throw new Error(
            "Order creation succeeded, but no order record was returned."
          );

        orderResults.push({
          _id: created._id,
          orderId: created.orderId || created._id,
          sellerId: created.sellerId || "",
          total: draft.total,
        });
      }

      setPlacedOrders(orderResults);
      clear();
      setStep("confirmation");

      toast.success(
        "Order placed",
        paymentMode === "online"
          ? "Your order was created. Complete payment from the order page."
          : "Cash on delivery order created successfully."
      );
    } catch (error: any) {
      setCheckoutError(
        error?.message ||
          "We could not place your order right now. Please try another payment method."
      );
      toast.error(
        "Checkout failed",
        error?.message || "We could not place your order right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    appliedCoupon,
    buildPreparedOrders,
    clear,
    couponDiscount,
    onlineSubMethod,
    paymentMode,
    router,
    toast,
    user,
  ]);

  const handleContinue = () => {
    if (step === "information") {
      if (validateInfo()) setStep("shipping");
    } else if (step === "shipping") {
      setStep("payment");
    } else if (step === "payment") {
      placeOrder();
    }
  };

  const goBack = () => {
    const prev: Record<Step, Step> = {
      information: "information",
      shipping: "information",
      payment: "shipping",
      confirmation: "payment",
    };
    setStep(prev[step]);
  };

  /* ── Free-shipping progress bar percentage ── */
  const freeShippingPct = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - total, 0);

  /* ─────────────────────────────────────────
     Confirmation screen
  ───────────────────────────────────────── */
  if (step === "confirmation") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-stone-50 via-white to-stone-50">
        <main className="flex-1 flex items-center justify-center pt-20 pb-16 px-4">
          <div className="max-w-lg w-full">
            {/* Success card */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white rounded-3xl border border-stone-100 shadow-2xl shadow-stone-900/5 overflow-hidden"
            >
              {/* Header gradient */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-8 w-24 h-24 rounded-full bg-white/20" />
                  <div className="absolute bottom-4 right-8 w-16 h-16 rounded-full bg-white/20" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.2,
                  }}
                  className="relative mx-auto mb-5 h-20 w-20 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <motion.svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
                      d="M20 6L9 17l-5-5"
                    />
                  </motion.svg>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-emerald-100 text-[10px] tracking-[0.3em] uppercase mb-1">
                    Order Confirmed
                  </p>
                  <h1 className="text-white font-display text-3xl font-light italic">
                    Thank you!
                  </h1>
                  <p className="text-emerald-100 text-sm mt-2">
                    Your order{placedOrders.length > 1 ? "s have" : " has"} been
                    placed successfully.
                  </p>
                </motion.div>
              </div>

              <div className="p-6 space-y-4">
                {/* Confirmation detail */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xs text-stone-500 text-center"
                >
                  A confirmation email will be sent to{" "}
                  <span className="font-medium text-stone-800">{form.email}</span>
                </motion.p>

                {/* Delivery mode badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
                    paymentMode === "offline"
                      ? "bg-amber-50 border border-amber-100"
                      : "bg-blue-50 border border-blue-100"
                  }`}
                >
                  {paymentMode === "offline" ? (
                    <Banknote size={18} className="text-amber-500 shrink-0" />
                  ) : (
                    <CreditCard size={18} className="text-blue-500 shrink-0" />
                  )}
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        paymentMode === "offline"
                          ? "text-amber-700"
                          : "text-blue-700"
                      }`}
                    >
                      {paymentMode === "offline"
                        ? "Cash on Delivery"
                        : "Online Payment"}
                    </p>
                    <p
                      className={`text-[10px] ${
                        paymentMode === "offline"
                          ? "text-amber-600"
                          : "text-blue-600"
                      }`}
                    >
                      {paymentMode === "offline"
                        ? "Pay when your order arrives"
                        : "Complete payment via the order details page"}
                    </p>
                  </div>
                </motion.div>

                {/* Order summary */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="border border-stone-100 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
                    <p className="text-[10px] tracking-widest uppercase text-stone-500 font-semibold">
                      Order Summary
                    </p>
                  </div>
                  <div className="p-4 space-y-2 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className={shippingCost === 0 ? "text-emerald-600 font-medium" : ""}>
                        {shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}
                      </span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount ({appliedCoupon})</span>
                        <span>−{formatCurrency(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-stone-900 border-t border-stone-100 pt-3 mt-3 text-sm">
                      <span>Total Paid</span>
                      <span>{formatCurrency(orderTotal)}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Created orders */}
                {placedOrders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="border border-stone-100 rounded-2xl overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
                      <p className="text-[10px] tracking-widest uppercase text-stone-500 font-semibold">
                        Created Orders
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      {placedOrders.map((order) => (
                        <div
                          key={order._id}
                          className="flex items-center justify-between gap-3 text-xs text-stone-600"
                        >
                          <div>
                            <p className="font-semibold text-stone-900 font-mono">
                              #{order.orderId}
                            </p>
                            {order.sellerId && (
                              <p className="text-[10px] text-stone-400">
                                Seller {order.sellerId.slice(-6).toUpperCase()}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-stone-900">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Shipping address recap */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="border border-stone-100 rounded-2xl p-4 flex gap-3"
                >
                  <MapPin
                    size={14}
                    className="text-stone-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-1">
                      Ships to
                    </p>
                    <p className="text-xs font-medium text-stone-800">
                      {form.firstName} {form.lastName}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {form.address}
                      {form.apartment ? `, ${form.apartment}` : ""}, {form.city},{" "}
                      {form.state} {form.zip}
                    </p>
                  </div>
                </motion.div>

                {/* CTA buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 }}
                  className="space-y-3 pt-2"
                >
                  <Link
                    href={
                      placedOrders[0]?._id
                        ? `/orders/${placedOrders[0]._id}`
                        : "/orders"
                    }
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-stone-900 text-stone-50 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-stone-800 rounded-2xl transition-colors"
                  >
                    <Package size={14} /> View Order Details
                  </Link>
                  <Link
                    href="/"
                    className="flex items-center justify-center w-full py-3 border border-stone-200 text-stone-600 text-xs tracking-[0.2em] uppercase font-medium hover:border-stone-900 hover:text-stone-900 rounded-2xl transition-colors"
                  >
                    Continue Shopping
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ─────────────────────────────────────────
     Failure screen
  ───────────────────────────────────────── */
  if (checkoutError) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <main className="flex-1 flex items-center justify-center pt-20 pb-16 px-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-md w-full bg-white rounded-3xl border border-stone-100 shadow-2xl shadow-stone-900/5 overflow-hidden"
          >
            {/* Error header */}
            <div className="bg-gradient-to-br from-red-500 to-rose-600 px-8 py-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-8 w-24 h-24 rounded-full bg-white/20" />
                <div className="absolute bottom-4 right-8 w-16 h-16 rounded-full bg-white/20" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative mx-auto mb-5 h-20 w-20 bg-white/20 rounded-full flex items-center justify-center"
              >
                <X size={36} className="text-white" strokeWidth={2} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-red-100 text-[10px] tracking-[0.3em] uppercase mb-1">
                  Order Failed
                </p>
                <h1 className="text-white font-display text-2xl font-light">
                  We couldn't process your order
                </h1>
              </motion.div>
            </div>

            <div className="p-6 space-y-4">
              {/* Error message */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{checkoutError}</p>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                {[
                  "Check your internet connection",
                  "Ensure your cart items are still in stock",
                  "Try a different payment method",
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-stone-500">
                    <div className="h-1.5 w-1.5 rounded-full bg-stone-300 shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setCheckoutError(null)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-stone-900 text-stone-50 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-stone-800 rounded-2xl transition-colors"
                >
                  <RefreshCw size={13} /> Try Again
                </button>
                <Link
                  href="/cart"
                  className="flex items-center justify-center w-full py-3 border border-stone-200 text-stone-600 text-xs tracking-[0.2em] uppercase font-medium hover:border-stone-900 hover:text-stone-900 rounded-2xl transition-colors"
                >
                  Return to Cart
                </Link>
              </div>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ─────────────────────────────────────────
     Main checkout layout
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <main className="flex-1 pb-16 pt-[calc(var(--h-main-nav)+1rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo & title */}
          <div className="text-center py-8 border-b border-stone-100 mb-8">
            <Link
              href="/"
              className="font-display text-2xl font-medium tracking-[0.3em] text-stone-900 uppercase"
            >
              Stitch
            </Link>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mt-1 flex items-center justify-center gap-1.5">
              <Lock size={10} /> Secure Checkout
            </p>
          </div>

          {/* Mobile: collapsible order summary */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setSummaryOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-stone-200 rounded-2xl text-xs font-medium text-stone-700 shadow-sm"
              aria-expanded={summaryOpen}
            >
              <span className="flex items-center gap-2">
                <Package size={13} className="text-stone-500" />
                Order summary ({items.length} item
                {items.length !== 1 ? "s" : ""})
              </span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-stone-900">
                  {formatCurrency(orderTotal)}
                </span>
                <ChevronDown
                  size={13}
                  className={`transition-transform ${summaryOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            <AnimatePresence>
              {summaryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border border-stone-200 border-t-0 bg-white rounded-b-2xl px-4 pb-4 pt-3">
                    <MobileOrderSummary
                      items={items}
                      total={total}
                      shippingCost={shippingCost}
                      isFreeShipping={isFreeShipping}
                      couponDiscount={couponDiscount}
                      appliedCoupon={appliedCoupon}
                      orderTotal={orderTotal}
                      couponInput={couponInput}
                      couponError={couponError}
                      couponLoading={couponLoading}
                      setCouponInput={setCouponInput}
                      handleApplyCoupon={handleApplyCoupon}
                      handleRemoveCoupon={handleRemoveCoupon}
                      freeShippingPct={freeShippingPct}
                      amountToFreeShipping={amountToFreeShipping}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
            {/* ── Left: multi-step form ── */}
            <div>
              {/* Step progress */}
              <nav
                aria-label="Checkout steps"
                className="flex items-center gap-2 mb-8"
              >
                {steps.map((s, i) => {
                  const stepIndex = steps.findIndex((x) => x.key === step);
                  const done = i < stepIndex;
                  const active = s.key === step;
                  return (
                    <React.Fragment key={s.key}>
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{
                            backgroundColor:
                              done || active ? "#1c1917" : "#e7e5e4",
                          }}
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300 ${
                            done || active
                              ? "text-stone-50"
                              : "text-stone-500"
                          }`}
                        >
                          {done ? <Check size={11} /> : i + 1}
                        </motion.div>
                        <span
                          className={`text-[10px] tracking-widest uppercase font-medium transition-colors ${
                            active ? "text-stone-900" : "text-stone-400"
                          }`}
                          aria-current={active ? "step" : undefined}
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <ChevronRight size={12} className="text-stone-300 mx-1" />
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>

              <AnimatePresence mode="wait">
                {/* ── Information step ── */}
                {step === "information" && (
                  <motion.div
                    key="information"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Contact */}
                    <section
                      className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4"
                      aria-labelledby="contact-heading"
                    >
                      <p
                        id="contact-heading"
                        className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold"
                      >
                        Contact
                      </p>
                      <Field
                        label="Email address"
                        value={form.email}
                        error={errors.email}
                        type="email"
                        placeholder="you@example.com"
                        readOnly
                        icon={<Lock size={14} className="text-stone-400" />}
                      />
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <Checkbox
                          checked={form.newsletter}
                          onChange={() => set("newsletter", !form.newsletter)}
                        />
                        <span className="text-[11px] text-stone-500">
                          Keep me updated with news and offers
                        </span>
                      </label>
                    </section>

                    {/* Address */}
                    <section
                      className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4"
                      aria-labelledby="address-heading"
                    >
                      <p
                        id="address-heading"
                        className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold"
                      >
                        Shipping Address
                      </p>

                      {/* Saved address selector */}
                      {user?.addresses?.length ? (
                        <div>
                          <label className="block text-[10px] tracking-[0.18em] uppercase text-stone-500 font-medium mb-2">
                            Saved address
                          </label>
                          <select
                            value={savedAddressId}
                            aria-label="Saved address"
                            onChange={(e) => {
                              const value = e.target.value;
                              setSavedAddressId(value);
                              if (value === "manual") return;
                              const found = user.addresses?.find(
                                (a) => a._id === value
                              );
                              if (found) applyAddress(found);
                            }}
                            className="w-full px-3 py-2.5 text-xs border border-stone-200 bg-white rounded-xl focus:outline-none focus:border-stone-500 transition-colors"
                          >
                            <option value="manual">Enter a new address</option>
                            {user.addresses.map((a) => (
                              <option key={a._id} value={a._id}>
                                {a.recipientName || a.type || "Saved address"} –{" "}
                                {formatSavedAddress(a)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          label="First name"
                          value={form.firstName}
                          onChange={(v) => set("firstName", v)}
                          error={errors.firstName}
                          autoComplete="given-name"
                        />
                        <Field
                          label="Last name"
                          value={form.lastName}
                          onChange={(v) => set("lastName", v)}
                          error={errors.lastName}
                          autoComplete="family-name"
                        />
                      </div>
                      <Field
                        label="Address"
                        value={form.address}
                        onChange={(v) => set("address", v)}
                        error={errors.address}
                        placeholder="Street address"
                        autoComplete="street-address"
                      />
                      <Field
                        label="Apartment, suite, etc. (optional)"
                        value={form.apartment}
                        onChange={(v) => set("apartment", v)}
                        autoComplete="address-line2"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <Field
                          label="City"
                          value={form.city}
                          onChange={(v) => set("city", v)}
                          error={errors.city}
                          autoComplete="address-level2"
                        />
                        <Field
                          label="State"
                          value={form.state}
                          onChange={(v) => set("state", v)}
                          autoComplete="address-level1"
                        />
                        <Field
                          label="PIN code"
                          value={form.zip}
                          onChange={(v) => set("zip", v)}
                          error={errors.zip}
                          autoComplete="postal-code"
                          inputMode="numeric"
                        />
                      </div>
                      <Field
                        label="Phone"
                        value={form.phone}
                        onChange={(v) => set("phone", getDigits(v))}
                        type="tel"
                        inputMode="numeric"
                        error={errors.phone}
                        placeholder="10 digit mobile number"
                        autoComplete="tel"
                      />

                      {/* Save info toggle */}
                      <label className="flex items-center gap-2.5 cursor-pointer group pt-1">
                        <Checkbox
                          checked={form.saveInfo}
                          onChange={() => set("saveInfo", !form.saveInfo)}
                        />
                        <span className="text-[11px] text-stone-500">
                          Save this information for next time
                        </span>
                      </label>
                    </section>
                  </motion.div>
                )}

                {/* ── Shipping step ── */}
                {step === "shipping" && (
                  <motion.div
                    key="shipping"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Free-shipping progress */}
                    {total < FREE_SHIPPING_THRESHOLD && (
                      <div className="bg-white border border-stone-200 rounded-2xl p-5">
                        <div className="flex justify-between text-[11px] text-stone-500 mb-3">
                          <span>
                            Add{" "}
                            <span className="font-semibold text-stone-800">
                              {formatCurrency(amountToFreeShipping)}
                            </span>{" "}
                            more for free standard shipping
                          </span>
                          <span className="font-semibold">
                            {Math.round(freeShippingPct)}%
                          </span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${freeShippingPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-stone-700 to-stone-900 rounded-full"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {shippingOptions.map((opt) => {
                        const free =
                          opt.id === "standard" &&
                          total >= FREE_SHIPPING_THRESHOLD;
                        const selected = shipping === opt.id;
                        return (
                          <motion.label
                            key={opt.id}
                            whileHover={{ scale: selected ? 1 : 1.005 }}
                            whileTap={{ scale: 0.99 }}
                            className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                              selected
                                ? "border-stone-900 bg-stone-50 shadow-sm"
                                : "border-stone-200 bg-white hover:border-stone-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <RadioDot
                                checked={selected}
                                onChange={() => setShipping(opt.id)}
                              />
                              <span
                                className={`${selected ? "text-stone-700" : "text-stone-400"}`}
                              >
                                {opt.icon}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-stone-900">
                                  {opt.label}
                                </p>
                                <p className="text-[11px] text-stone-400 mt-0.5">
                                  {opt.sub}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-stone-900 shrink-0">
                              {free || opt.price === 0 ? (
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                                  Free
                                </span>
                              ) : (
                                formatCurrency(opt.price)
                              )}
                            </p>
                          </motion.label>
                        );
                      })}
                    </div>

                    {/* Estimated delivery note */}
                    {shipping && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] text-stone-400 flex items-center gap-1.5 px-1"
                      >
                        <Truck size={11} />
                        Estimated delivery:{" "}
                        {selectedShipping.sub.replace(
                          "business days",
                          "business days from today"
                        )}
                      </motion.p>
                    )}
                  </motion.div>
                )}

                {/* ── Payment step ── */}
                {step === "payment" && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">
                        Payment Method
                      </p>
                      <div className="flex items-center gap-1.5 text-stone-400">
                        <ShieldCheck size={12} />
                        <span className="text-[10px]">256-bit SSL Secured</span>
                      </div>
                    </div>

                    {/* Payment mode cards */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <PaymentMethodCard
                        selected={paymentMode === "online"}
                        onClick={() => setPaymentMode("online")}
                        icon={<CreditCard size={18} />}
                        badge="Instant"
                        badgeColor="blue"
                        title="Online Payment"
                        description="Pay securely via UPI, Cards or Net Banking"
                        features={["Instant confirmation", "100% secure", "All major banks"]}
                      />
                      {COD_ENABLED && (
                        <PaymentMethodCard
                          selected={paymentMode === "offline"}
                          onClick={() => setPaymentMode("offline")}
                          icon={<Banknote size={18} />}
                          badge="COD"
                          badgeColor="amber"
                          title="Cash on Delivery"
                          description={`Pay in cash when your order arrives${
                            COD_CHARGE > 0
                              ? ` (${formatCurrency(COD_CHARGE)} extra fee applies)`
                              : ""
                          }`}
                          features={["No advance payment", "Pay on delivery", "Easy returns"]}
                        />
                      )}
                    </div>

                    {/* Online sub-method selector */}
                    <AnimatePresence>
                      {paymentMode === "online" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-semibold">
                              Choose online payment method
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                              <OnlineMethodPill
                                active={onlineSubMethod === "upi"}
                                onClick={() => setOnlineSubMethod("upi")}
                                icon={<Smartphone size={16} />}
                                label="UPI"
                                sublabel="GPay, PhonePe"
                              />
                              <OnlineMethodPill
                                active={onlineSubMethod === "card"}
                                onClick={() => setOnlineSubMethod("card")}
                                icon={<CreditCard size={16} />}
                                label="Card"
                                sublabel="Debit / Credit"
                              />
                              <OnlineMethodPill
                                active={onlineSubMethod === "netbanking"}
                                onClick={() => setOnlineSubMethod("netbanking")}
                                icon={<Building2 size={16} />}
                                label="Net Banking"
                                sublabel="All major banks"
                              />
                            </div>

                            {/* Dynamic sub-method info */}
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={onlineSubMethod}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                className="bg-blue-50 border border-blue-100 rounded-xl p-4"
                              >
                                {onlineSubMethod === "upi" && (
                                  <div className="flex gap-3 items-start">
                                    <Smartphone size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-semibold text-blue-800">UPI Payment</p>
                                      <p className="text-[11px] text-blue-600 mt-1">
                                        Pay instantly using Google Pay, PhonePe, Paytm, or any UPI-enabled app. Order confirms within seconds.
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {onlineSubMethod === "card" && (
                                  <div className="flex gap-3 items-start">
                                    <CreditCard size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-semibold text-blue-800">Debit / Credit Card</p>
                                      <p className="text-[11px] text-blue-600 mt-1">
                                        All Visa, Mastercard, Rupay, and AmEx cards accepted. Your card data is encrypted and never stored.
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {onlineSubMethod === "netbanking" && (
                                  <div className="flex gap-3 items-start">
                                    <Building2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-semibold text-blue-800">Net Banking</p>
                                      <p className="text-[11px] text-blue-600 mt-1">
                                        Pay directly from your bank account. Supports all major banks including SBI, HDFC, ICICI, Axis and more.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            </AnimatePresence>

                            {/* Security badges */}
                            <div className="flex items-center gap-4 pt-1 flex-wrap">
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                                <Lock size={10} className="text-emerald-500" />
                                <span>SSL Encrypted</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                                <ShieldCheck size={10} className="text-emerald-500" />
                                <span>PCI DSS Compliant</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                                <CheckCircle2 size={10} className="text-emerald-500" />
                                <span>RBI Approved</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* COD info panel */}
                    <AnimatePresence>
                      {paymentMode === "offline" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-semibold">
                              How Cash on Delivery Works
                            </p>
                            <div className="space-y-3">
                              {[
                                {
                                  icon: <Package size={14} className="text-amber-500" />,
                                  title: "Order is confirmed",
                                  desc: "Your order is placed and dispatched to our logistics partner.",
                                },
                                {
                                  icon: <Truck size={14} className="text-amber-500" />,
                                  title: "Delivery to your door",
                                  desc: "Our delivery partner brings the package to your address.",
                                },
                                {
                                  icon: <Banknote size={14} className="text-amber-500" />,
                                  title: "Pay at the door",
                                  desc: `Pay ₹ in cash (or UPI) when you receive the package.${COD_CHARGE > 0 ? ` A COD fee of ${formatCurrency(COD_CHARGE)} is included in your total.` : ""}`,
                                },
                              ].map((step, i) => (
                                <div key={i} className="flex gap-3">
                                  <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                    {step.icon}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-stone-800">{step.title}</p>
                                    <p className="text-[11px] text-stone-500 mt-0.5">{step.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Trust badges */}
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
                              <ShieldCheck size={14} className="text-amber-500 shrink-0" />
                              <p className="text-[11px] text-amber-700">
                                COD orders are fully insured. Easy returns within 7 days of delivery.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Recap cards */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {/* Contact recap */}
                      <div className="bg-white border border-stone-200 rounded-2xl p-4">
                        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-semibold mb-2.5">
                          Contact on order
                        </p>
                        <p className="text-xs text-stone-700 font-medium">{form.email}</p>
                        <p className="text-xs text-stone-500 mt-1">
                          +91 {getDigits(form.phone)}
                        </p>
                      </div>

                      {/* Shipping recap */}
                      <div className="bg-white border border-stone-200 rounded-2xl p-4">
                        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-semibold mb-2.5">
                          Ships to
                        </p>
                        <p className="text-xs text-stone-700 font-medium">
                          {form.firstName} {form.lastName}
                        </p>
                        <p className="text-xs text-stone-500 mt-1 truncate">
                          {form.address}
                          {form.apartment ? `, ${form.apartment}` : ""},{" "}
                          {form.city}, {form.state} {form.zip}
                        </p>
                        <button
                          onClick={() => setStep("information")}
                          className="mt-2 text-[10px] text-stone-400 underline underline-offset-2 hover:text-stone-700 transition-colors"
                        >
                          Edit address
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Navigation buttons ── */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-100">
                {step === "information" ? (
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-700 transition-colors tracking-widest uppercase"
                    aria-label="Return to cart"
                  >
                    <ArrowLeft size={13} /> Return to cart
                  </Link>
                ) : (
                  <button
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-700 transition-colors tracking-widest uppercase"
                    aria-label="Go back"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-stone-50 text-[11px] tracking-[0.2em] uppercase font-semibold hover:bg-stone-800 disabled:opacity-80 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-900/10 rounded-xl relative overflow-hidden min-w-[180px] justify-center"
                >
                  {/* Loading overlay */}
                  <AnimatePresence>
                    {isSubmitting && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-stone-800 flex items-center justify-center gap-2 rounded-xl"
                      >
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Processing...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    className={`flex items-center gap-2 ${isSubmitting ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
                  >
                    {step === "payment" ? (
                      <>
                        <Lock size={12} />
                        Place Order · {formatCurrency(orderTotal)}
                      </>
                    ) : (
                      <>
                        Continue <ChevronRight size={13} />
                      </>
                    )}
                  </div>
                </motion.button>
              </div>
            </div>

            {/* ── Right: sticky order summary (desktop) ── */}
            <div className="hidden lg:block lg:sticky self-start top-[calc(var(--h-main-nav)+1rem)]">
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/60">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">
                    Order Summary
                  </p>
                </div>

                {/* Items */}
                <div className="px-6 py-4 space-y-4 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200">
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${item.size}-${item.color}`}
                      className="flex gap-3"
                    >
                      <div className="relative shrink-0">
                        <div className="h-16 w-12 bg-stone-100 rounded-xl overflow-hidden">
                          <img
                            src={getValidImage(item.image)}
                            alt={item.name}
                            className="h-full w-full object-contain p-1"
                            loading="lazy"
                          />
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-stone-600 text-stone-50 text-[9px] font-medium flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {getSizeLabel(item.size)} ·{" "}
                          {getColorLabel(item.color)}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-stone-900 shrink-0">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="px-6 py-4 border-t border-stone-100">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[11px] font-medium">
                      <span className="flex items-center gap-1.5">
                        <Tag size={11} /> {appliedCoupon} applied
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        aria-label="Remove coupon"
                        className="text-emerald-500 hover:text-emerald-800 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            setCouponError("");
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleApplyCoupon()
                          }
                          placeholder="Discount code"
                          aria-label="Discount code"
                          className="flex-1 px-3 py-2 text-xs border border-stone-200 bg-transparent rounded-xl placeholder:text-stone-400 focus:outline-none focus:border-stone-500 transition-colors"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="px-4 py-2 border border-stone-200 text-[10px] tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-50 transition-colors rounded-xl"
                        >
                          {couponLoading ? (
                            <RefreshCw size={11} className="animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
                          <X size={10} /> {couponError}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Totals */}
                <div className="px-6 py-4 border-t border-stone-100 space-y-2.5">
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Shipping</span>
                    <span
                      className={
                        isFreeShipping
                          ? "text-emerald-600 font-medium"
                          : "font-medium"
                      }
                    >
                      {isFreeShipping
                        ? "Free"
                        : shippingCost === 0
                        ? "Calculated at next step"
                        : formatCurrency(shippingCost)}
                    </span>
                  </div>
                  {paymentMode === "offline" && COD_CHARGE > 0 && (
                    <div className="flex justify-between text-xs text-stone-600">
                      <span>COD Fee</span>
                      <span className="font-medium">{formatCurrency(COD_CHARGE)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>Discount ({appliedCoupon})</span>
                      <span className="font-medium">−{formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-stone-900 border-t border-stone-100 pt-3 mt-3">
                    <span>Total</span>
                    <div className="text-right">
                      <span>{formatCurrency(orderTotal)}</span>
                      <p className="text-[10px] font-normal text-stone-400">
                        Incl. taxes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Free-shipping progress (desktop) */}
                {shipping === "standard" && total < FREE_SHIPPING_THRESHOLD && (
                  <div className="px-6 pb-4">
                    <div className="text-[10px] text-stone-400 mb-1.5">
                      {formatCurrency(amountToFreeShipping)} away from free shipping
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${freeShippingPct}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-stone-600 to-stone-900 rounded-full"
                      />
                    </div>
                  </div>
                )}

                {/* Trust badges */}
                <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-center gap-4 flex-wrap">
                  <TrustBadge icon={<Lock size={11} />} label="SSL Secure" />
                  <div className="h-3 w-px bg-stone-200" />
                  <TrustBadge icon={<Truck size={11} />} label="Fast Delivery" />
                  <div className="h-3 w-px bg-stone-200" />
                  <TrustBadge
                    icon={<RefreshCw size={11} />}
                    label="Easy Returns"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function TrustBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
      {icon} {label}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <motion.div
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      whileTap={{ scale: 0.9 }}
      className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer focus:outline-none ${
        checked
          ? "bg-stone-900 border-stone-900"
          : "border-stone-300 hover:border-stone-600 bg-white"
      }`}
    >
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check size={10} className="text-stone-50" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RadioDot({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: () => void;
}) {
  return (
    <motion.div
      role="radio"
      aria-checked={checked}
      onClick={onChange}
      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none cursor-pointer shrink-0 ${
        checked ? "border-stone-900" : "border-stone-300"
      }`}
    >
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="h-2.5 w-2.5 rounded-full bg-stone-900"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Redesigned Payment Method Card ── */
function PaymentMethodCard({
  selected,
  onClick,
  icon,
  badge,
  badgeColor,
  title,
  description,
  features,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge: string;
  badgeColor: "blue" | "amber";
  title: string;
  description: string;
  features: string[];
}) {
  const isBlue = badgeColor === "blue";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: selected ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 focus:outline-none ${
        selected
          ? isBlue
            ? "border-blue-500 shadow-lg shadow-blue-500/10 bg-blue-50"
            : "border-amber-500 shadow-lg shadow-amber-500/10 bg-amber-50"
          : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-md"
      }`}
    >
      {/* Selection indicator glow */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${
              isBlue ? "bg-blue-400" : "bg-amber-400"
            }`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.2 }}
            exit={{ scale: 0, opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10">
        {/* Top row: icon + badge + check */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
              selected
                ? isBlue
                  ? "bg-blue-500 text-white"
                  : "bg-amber-500 text-white"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {icon}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full ${
                selected
                  ? isBlue
                    ? "bg-blue-500 text-white"
                    : "bg-amber-500 text-white"
                  : isBlue
                  ? "bg-blue-100 text-blue-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {badge}
            </span>

            {/* Animated check */}
            <div
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                selected
                  ? isBlue
                    ? "border-blue-500 bg-blue-500"
                    : "border-amber-500 bg-amber-500"
                  : "border-stone-200 bg-white"
              }`}
            >
              <AnimatePresence>
                {selected && (
                  <motion.svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      d="M20 6L9 17l-5-5"
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Title & description */}
        <p className="text-sm font-bold text-stone-900">{title}</p>
        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
          {description}
        </p>

        {/* Feature list */}
        <div className="mt-3 space-y-1.5">
          {features.map((feat, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  selected
                    ? isBlue
                      ? "bg-blue-400"
                      : "bg-amber-400"
                    : "bg-stone-300"
                }`}
              />
              <span className="text-[11px] text-stone-500">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Online method pill ── */
function OnlineMethodPill({
  active,
  onClick,
  icon,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: active ? 1 : 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden rounded-xl border-2 p-3 text-center transition-all duration-200 w-full focus:outline-none ${
        active
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div
        className={`mx-auto mb-2 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
          active ? "bg-blue-500 text-white" : "bg-stone-100 text-stone-500"
        }`}
      >
        {icon}
      </div>
      <p className={`text-xs font-semibold ${active ? "text-blue-700" : "text-stone-700"}`}>
        {label}
      </p>
      <p className="text-[10px] text-stone-400 mt-0.5">{sublabel}</p>
    </motion.button>
  );
}

/** Inline order summary for the mobile accordion. */
function MobileOrderSummary({
  items,
  total,
  shippingCost,
  isFreeShipping,
  couponDiscount,
  appliedCoupon,
  orderTotal,
  couponInput,
  couponError,
  couponLoading,
  setCouponInput,
  handleApplyCoupon,
  handleRemoveCoupon,
  freeShippingPct,
  amountToFreeShipping,
}: {
  items: any[];
  total: number;
  shippingCost: number;
  isFreeShipping: boolean;
  couponDiscount: number;
  appliedCoupon: string | null;
  orderTotal: number;
  couponInput: string;
  couponError: string;
  couponLoading: boolean;
  setCouponInput: (v: string) => void;
  handleApplyCoupon: () => void;
  handleRemoveCoupon: () => void;
  freeShippingPct: number;
  amountToFreeShipping: number;
}) {
  return (
    <div className="space-y-4 pt-2">
      {items.map((item) => (
        <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-3">
          <div className="relative shrink-0">
            <div className="h-14 w-10 bg-stone-100 rounded-lg overflow-hidden">
              <img
                src={getValidImage(item.image)}
                alt={item.name}
                className="h-full w-full object-contain p-1"
                loading="lazy"
              />
            </div>
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-stone-600 text-stone-50 text-[9px] font-medium flex items-center justify-center">
              {item.quantity}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-stone-900 truncate">{item.name}</p>
            <p className="text-[10px] text-stone-400">
              {getSizeLabel(item.size)} · {getColorLabel(item.color)}
            </p>
          </div>
          <p className="text-xs font-semibold text-stone-900 shrink-0">
            {formatCurrency(item.price * item.quantity)}
          </p>
        </div>
      ))}

      {/* Coupon */}
      {appliedCoupon ? (
        <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <Tag size={11} /> {appliedCoupon} applied
          </span>
          <button
            onClick={handleRemoveCoupon}
            aria-label="Remove coupon"
            className="text-emerald-500"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              placeholder="Discount code"
              className="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-xl bg-transparent placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponInput.trim()}
              className="px-4 py-2 border border-stone-200 text-[10px] tracking-widest uppercase text-stone-600 hover:border-stone-900 disabled:opacity-50 rounded-xl"
            >
              {couponLoading ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                "Apply"
              )}
            </button>
          </div>
          {couponError && (
            <p className="text-[10px] text-red-500 flex items-center gap-1">
              <X size={10} /> {couponError}
            </p>
          )}
        </>
      )}

      {/* Totals */}
      <div className="space-y-2 text-xs text-stone-600 border-t border-stone-100 pt-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className={`font-medium ${isFreeShipping ? "text-emerald-600" : ""}`}>
            {isFreeShipping
              ? "Free"
              : shippingCost === 0
              ? "TBD"
              : formatCurrency(shippingCost)}
          </span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount ({appliedCoupon})</span>
            <span className="font-medium">−{formatCurrency(couponDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-stone-900 border-t border-stone-100 pt-2 mt-1 text-sm">
          <span>Total</span>
          <span>{formatCurrency(orderTotal)}</span>
        </div>
      </div>

      {/* Free-shipping bar */}
      {amountToFreeShipping > 0 && (
        <div>
          <p className="text-[10px] text-stone-400 mb-1.5">
            {formatCurrency(amountToFreeShipping)} away from free shipping
          </p>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-stone-600 to-stone-900 rounded-full transition-all duration-500"
              style={{ width: `${freeShippingPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Field
───────────────────────────────────────────── */

function Field({
  label,
  value,
  onChange = () => {},
  error,
  type = "text",
  placeholder,
  icon,
  readOnly,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  readOnly?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  const id = React.useId();
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="block text-[10px] tracking-[0.15em] uppercase text-stone-500 font-semibold mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-transparent text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
              : "border-stone-200 focus:border-stone-400 focus:ring-stone-900/5"
          } ${icon ? "pr-10" : ""} ${
            readOnly ? "bg-stone-50 text-stone-500 cursor-default" : ""
          }`}
        />
        {icon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1"
        >
          <AlertCircle size={9} /> {error}
        </p>
      )}
    </div>
  );
}