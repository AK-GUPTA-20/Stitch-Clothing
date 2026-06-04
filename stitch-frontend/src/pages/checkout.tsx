"use client";
// src/app/checkout/page.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/context/CartContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { getColorLabel, getSizeLabel, getValidImages, getValidImage } from "@/lib/utils";
import { orderService } from "@/lib/api/orderService";
import { productService } from "@/lib/api/productService";
import { Address } from "@/lib/types/user.types";
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

const shippingOptions = [
  {
    id: "standard",
    label: "Standard Shipping",
    sub: "5–7 business days",
    price: 0,
    threshold: 120,
    icon: <Truck size={14} />,
  },
  {
    id: "express",
    label: "Express Shipping",
    sub: "2–3 business days",
    price: 12,
    icon: <Package size={14} />,
  },
  {
    id: "overnight",
    label: "Overnight Shipping",
    sub: "Next business day",
    price: 28,
    icon: <Clock size={14} />,
  },
];

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
    if (typeof variantImg === 'string' && !variantImg.includes('localhost')) return variantImg;
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
   Coupon helpers (mock – swap with real API)
───────────────────────────────────────────── */

const MOCK_COUPONS: Record<string, { type: "pct" | "flat"; value: number }> = {
  SAVE10: { type: "pct", value: 10 },
  FLAT20: { type: "flat", value: 20 },
};

function applyCoupon(code: string, subtotal: number): number {
  const c = MOCK_COUPONS[code.toUpperCase()];
  if (!c) return 0;
  if (c.type === "pct") return (subtotal * c.value) / 100;
  return Math.min(c.value, subtotal);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    settings?.shipping?.freeShippingAbove || 120;
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
    country: "United States",
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
    await new Promise((r) => setTimeout(r, 500)); // simulate network
    const discount = applyCoupon(couponInput, total);
    if (discount > 0) {
      setAppliedCoupon(couponInput.toUpperCase());
      setCouponDiscount(discount);
      setCouponInput("");
      toast.success("Coupon applied", `You saved $${discount.toFixed(2)}!`);
    } else {
      setCouponError("Invalid or expired coupon code.");
    }
    setCouponLoading(false);
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
      country: form.country || "United States",
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
        const product = response.product || response.data;
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
            currency: user.preferredCurrency || "INR",
          },
          payment: {
            method: paymentMode === "online" ? "razorpay" : "cod",
            status: "pending",
            amount: draft.total,
            currency: user.preferredCurrency || "INR",
          },
          coupon: appliedCoupon || undefined,
          notes: `Checkout placed via ${paymentMode} payment`,
        };

        const response: any = await orderService.createOrder(payload as any);
        const created =
          response?.data ||
          response?.order ||
          response?.data?.data ||
          response?.data?.order;
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
      <div className="min-h-screen flex flex-col bg-stone-50">
        <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-6">
          <div className="max-w-md w-full text-center animate-fade-in-up">
            {/* Success icon */}
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-stone-900 opacity-10 animate-ping-slow" />
              <div className="relative h-20 w-20 rounded-full bg-stone-900 flex items-center justify-center">
                <Check size={32} strokeWidth={1.5} className="text-stone-50" />
              </div>
            </div>

            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">
              Order Confirmed
            </p>
            <h1 className="font-display text-4xl text-stone-900 font-light italic mb-3">
              Thank you!
            </h1>
            <p className="text-sm text-stone-500 mb-1">
              Your order{placedOrders.length > 1 ? "s have" : " has"} been
              placed successfully.
            </p>
            <p className="text-xs text-stone-400 mb-4">
              A confirmation email will be sent to{" "}
              <span className="text-stone-600">{form.email}</span>
            </p>


            {/* Order summary */}
            <div className="border border-stone-100 p-6 text-left mb-6">
              <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-4">
                Order Summary
              </p>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {shippingCost === 0
                      ? "Free"
                      : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedCoupon})</span>
                    <span>-${couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-stone-900 border-t border-stone-100 pt-2 mt-2">
                  <span>Total</span>
                  <span>${orderTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Created orders */}
            {placedOrders.length > 0 && (
              <div className="border border-stone-100 p-6 text-left mb-8">
                <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-4">
                  Created Orders
                </p>
                <div className="space-y-3">
                  {placedOrders.map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between gap-3 text-xs text-stone-600"
                    >
                      <div>
                        <p className="font-medium text-stone-900">
                          {order.orderId}
                        </p>
                        {order.sellerId && (
                          <p className="text-[10px] text-stone-400">
                            Seller {order.sellerId.slice(-6).toUpperCase()}
                          </p>
                        )}
                      </div>
                      <span className="font-medium text-stone-900">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping address recap */}
            <div className="border border-stone-100 p-5 text-left mb-8 flex gap-3">
              <MapPin size={13} className="text-stone-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-1">
                  Ships to
                </p>
                <p className="text-xs text-stone-600">
                  {form.firstName} {form.lastName}
                </p>
                <p className="text-[11px] text-stone-400">
                  {form.address}
                  {form.apartment ? `, ${form.apartment}` : ""}, {form.city},{" "}
                  {form.state} {form.zip}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full py-4 bg-stone-900 text-stone-50 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-stone-800 transition-colors text-center"
              >
                Continue Shopping
              </Link>
              <Link
                href={
                  placedOrders[0]?._id
                    ? `/orders/${placedOrders[0]._id}`
                    : "/orders"
                }
                className="block w-full py-3 border border-stone-200 text-stone-600 text-[11px] tracking-[0.2em] uppercase font-medium hover:border-stone-900 transition-colors text-center"
              >
                View Order Details
              </Link>
            </div>
          </div>
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
        <div className="max-w-300 mx-auto px-4 sm:px-6 lg:px-8">
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
              className="w-full flex items-center justify-between px-4 py-3 bg-stone-100 text-xs font-medium text-stone-700"
              aria-expanded={summaryOpen}
            >
              <span className="flex items-center gap-2">
                <Package size={13} /> Order summary ({items.length} item
                {items.length !== 1 ? "s" : ""})
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold text-stone-900">
                  ${orderTotal.toFixed(2)}
                </span>
                <ChevronRight
                  size={13}
                  className={`transition-transform ${summaryOpen ? "rotate-90" : ""}`}
                />
              </span>
            </button>
            {summaryOpen && (
              <div className="border border-stone-100 border-t-0 bg-white px-4 pb-4 pt-2">
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
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
            {/* ── Left: multi-step form ── */}
            <div>
              {/* Step progress */}
              <nav aria-label="Checkout steps" className="flex items-center gap-2 mb-8">
                {steps.map((s, i) => {
                  const stepIndex = steps.findIndex((x) => x.key === step);
                  const done = i < stepIndex;
                  const active = s.key === step;
                  return (
                    <React.Fragment key={s.key}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300 ${
                            done || active
                              ? "bg-stone-900 text-stone-50"
                              : "bg-stone-200 text-stone-500"
                          }`}
                        >
                          {done ? <Check size={10} /> : i + 1}
                        </div>
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
                        <ChevronRight
                          size={12}
                          className="text-stone-300 mx-1"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>

              {/* ── Information step ── */}
              {step === "information" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Contact */}
                  <section aria-labelledby="contact-heading">
                    <p
                      id="contact-heading"
                      className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium mb-4"
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
                    <label className="flex items-center gap-2.5 mt-3 cursor-pointer group">
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
                  <section aria-labelledby="address-heading">
                    <p
                      id="address-heading"
                      className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium mb-4"
                    >
                      Shipping Address
                    </p>

                    {/* Saved address selector */}
                    {user?.addresses?.length ? (
                      <div className="mb-3">
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
                          className="w-full px-3 py-2 text-xs border border-stone-200 bg-transparent focus:outline-none focus:border-stone-500 transition-colors"
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
                    <div className="mt-3">
                      <Field
                        label="Address"
                        value={form.address}
                        onChange={(v) => set("address", v)}
                        error={errors.address}
                        placeholder="Street address"
                        autoComplete="street-address"
                      />
                    </div>
                    <div className="mt-3">
                      <Field
                        label="Apartment, suite, etc. (optional)"
                        value={form.apartment}
                        onChange={(v) => set("apartment", v)}
                        autoComplete="address-line2"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
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
                        label="ZIP code"
                        value={form.zip}
                        onChange={(v) => set("zip", v)}
                        error={errors.zip}
                        autoComplete="postal-code"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="mt-3">
                      <Field
                        label="Phone"
                        value={form.phone}
                        onChange={(v) => set("phone", getDigits(v))}
                        type="tel"
                        inputMode="numeric"
                        error={errors.phone}
                        placeholder="10 digit phone number"
                        autoComplete="tel"
                      />
                    </div>

                    {/* Save info toggle */}
                    <label className="flex items-center gap-2.5 mt-4 cursor-pointer group">
                      <Checkbox
                        checked={form.saveInfo}
                        onChange={() => set("saveInfo", !form.saveInfo)}
                      />
                      <span className="text-[11px] text-stone-500">
                        Save this information for next time
                      </span>
                    </label>
                  </section>
                </div>
              )}

              {/* ── Shipping step ── */}
              {step === "shipping" && (
                <div className="animate-fade-in">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium mb-4">
                    Shipping Method
                  </p>

                  {/* Free-shipping progress */}
                  {total < FREE_SHIPPING_THRESHOLD && (
                    <div className="mb-5 p-4 border border-stone-100 bg-white rounded-sm">
                      <div className="flex justify-between text-[10px] text-stone-500 mb-2">
                        <span>
                          Add{" "}
                          <span className="font-medium text-stone-700">
                            ${amountToFreeShipping.toFixed(2)}
                          </span>{" "}
                          more for free standard shipping
                        </span>
                        <span>{Math.round(freeShippingPct)}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-900 rounded-full transition-all duration-500"
                          style={{ width: `${freeShippingPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {shippingOptions.map((opt) => {
                      const free =
                        opt.id === "standard" &&
                        total >= FREE_SHIPPING_THRESHOLD;
                      const selected = shipping === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between p-4 border cursor-pointer transition-all duration-150 ${
                            selected
                              ? "border-stone-900 bg-stone-50"
                              : "border-stone-200 hover:border-stone-400"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioDot
                              checked={selected}
                              onChange={() => setShipping(opt.id)}
                            />
                            <span
                              className="text-stone-400"
                              aria-hidden="true"
                            >
                              {opt.icon}
                            </span>
                            <div>
                              <p className="text-xs font-medium text-stone-900">
                                {opt.label}
                              </p>
                              <p className="text-[11px] text-stone-400">
                                {opt.sub}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs font-medium text-stone-900">
                            {free || opt.price === 0 ? (
                              <span className="text-green-600">Free</span>
                            ) : (
                              `$${opt.price.toFixed(2)}`
                            )}
                          </p>
                        </label>
                      );
                    })}
                  </div>

                  {/* Estimated delivery note */}
                  {shipping && (
                    <p className="mt-4 text-[11px] text-stone-400 flex items-center gap-1.5">
                      <Truck size={11} />
                      Estimated delivery:{" "}
                      {selectedShipping.sub.replace("business days", "business days from now")}
                    </p>
                  )}
                </div>
              )}

              {/* ── Payment step ── */}
              {step === "payment" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium">
                      Payment Details
                    </p>
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <ShieldCheck size={11} />
                      <span className="text-[10px]">256-bit SSL Secured</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <PaymentMethodCard
                      selected={paymentMode === "online"}
                      onClick={() => setPaymentMode("online")}
                      icon={<CreditCard size={15} />}
                      title="Online Payment"
                      description="Create the order and complete payment through the online gateway flow."
                    />
                    {COD_ENABLED && (
                      <PaymentMethodCard
                        selected={paymentMode === "offline"}
                        onClick={() => setPaymentMode("offline")}
                        icon={<Wallet size={15} />}
                        title="Cash on Delivery"
                        description={`Pay with cash when your order is delivered.${
                          COD_CHARGE > 0
                            ? ` A COD fee of $${COD_CHARGE.toFixed(2)} applies.`
                            : ""
                        }`}
                      />
                    )}
                  </div>

                  {/* Info banner */}
                  <div className="border border-stone-100 bg-stone-50 p-4 text-[11px] text-stone-500 leading-relaxed">
                    {paymentMode === "online"
                      ? "An online order will be created now. You can complete the payment flow from the order details page once the gateway step is connected."
                      : "The order will be placed as cash on delivery and will appear in your order history and the seller dashboard immediately."}
                  </div>



                  {/* Contact recap */}
                  <div className="rounded-xl border border-stone-100 bg-white p-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium mb-3">
                      Contact on order
                    </p>
                    <p className="text-xs text-stone-600">{form.email}</p>
                    <p className="text-xs text-stone-600 mt-1">
                      {getDigits(form.phone)}
                    </p>
                  </div>

                  {/* Shipping recap */}
                  <div className="rounded-xl border border-stone-100 bg-white p-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium mb-3">
                      Ships to
                    </p>
                    <p className="text-xs text-stone-600">
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
              )}

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
                <button
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-stone-50 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {step === "payment" ? (
                    isSubmitting ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />{" "}
                        Placing order…
                      </>
                    ) : (
                      <>
                        <Lock size={12} /> Place order $
                        {orderTotal.toFixed(2)}
                      </>
                    )
                  ) : (
                    <>
                      Continue <ChevronRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── Right: sticky order summary (desktop) ── */}
            <div className="hidden lg:block lg:sticky self-start top-[calc(var(--h-main-nav)+1rem)]">
              <div className="border border-stone-100 bg-stone-50">
                <div className="px-6 py-4 border-b border-stone-100">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium">
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
                        <div className="h-16 w-12 bg-stone-100 overflow-hidden">
                          <img
                            src={getValidImage(item.image)}
                            alt={item.name}
                            className="h-full w-full object-contain p-1"
                            loading="lazy"
                          />
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-stone-500 text-stone-50 text-[9px] font-medium flex items-center justify-center">
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
                      <p className="text-xs font-medium text-stone-900 shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="px-6 py-4 border-t border-stone-100">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-[11px] font-medium">
                      <span className="flex items-center gap-1.5">
                        <Tag size={11} /> {appliedCoupon} applied
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        aria-label="Remove coupon"
                        className="text-green-500 hover:text-green-800 transition-colors"
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
                          className="flex-1 px-3 py-2 text-xs border border-stone-200 bg-transparent placeholder:text-stone-400 focus:outline-none focus:border-stone-500 transition-colors"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="px-4 py-2 border border-stone-200 text-[10px] tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-50 transition-colors"
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
                <div className="px-6 py-4 border-t border-stone-100 space-y-2">
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Shipping</span>
                    <span
                      className={isFreeShipping ? "text-green-600" : ""}
                    >
                      {isFreeShipping
                        ? "Free"
                        : shippingCost === 0
                        ? "Calculated at next step"
                        : `$${shippingCost.toFixed(2)}`}
                    </span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Discount ({appliedCoupon})</span>
                      <span>-${couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium text-stone-900 border-t border-stone-100 pt-3 mt-3">
                    <span>Total</span>
                    <span>${orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Free-shipping progress (desktop) */}
                {shipping === "standard" &&
                  total < FREE_SHIPPING_THRESHOLD && (
                    <div className="px-6 pb-4">
                      <div className="text-[10px] text-stone-400 mb-1.5">
                        $
                        {amountToFreeShipping.toFixed(2)} away from free
                        shipping
                      </div>
                      <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-700 rounded-full transition-all duration-500"
                          style={{ width: `${freeShippingPct}%` }}
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
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`h-4 w-4 border flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
        checked
          ? "bg-stone-900 border-stone-900"
          : "border-stone-300 hover:border-stone-600"
      }`}
    >
      {checked && <Check size={10} className="text-stone-50" />}
    </button>
  );
}

function RadioDot({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onChange}
      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
        checked ? "border-stone-900" : "border-stone-300"
      }`}
    >
      {checked && (
        <div className="h-2 w-2 rounded-full bg-stone-900" />
      )}
    </button>
  );
}

function PaymentMethodCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-4 py-4 text-left transition-all duration-150 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
        selected
          ? "border-stone-900 bg-stone-50"
          : "border-stone-200 hover:border-stone-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 ${
              selected ? "text-stone-900" : "text-stone-400"
            }`}
          >
            {icon}
          </span>
          <div>
            <p className="text-xs font-medium text-stone-900">{title}</p>
            <p className="text-[11px] text-stone-400 mt-1">{description}</p>
          </div>
        </div>
        <RadioDot checked={selected} onChange={onClick} />
      </div>
    </button>
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
            <div className="h-14 w-10 bg-stone-100 overflow-hidden">
              <img
                src={getValidImage(item.image)}
                alt={item.name}
                className="h-full w-full object-contain p-1"
                loading="lazy"
              />
            </div>
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-stone-500 text-stone-50 text-[9px] font-medium flex items-center justify-center">
              {item.quantity}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-stone-900 truncate">{item.name}</p>
            <p className="text-[10px] text-stone-400">
              {getSizeLabel(item.size)} · {getColorLabel(item.color)}
            </p>
          </div>
          <p className="text-xs font-medium text-stone-900 shrink-0">
            ${(item.price * item.quantity).toFixed(2)}
          </p>
        </div>
      ))}

      {/* Coupon */}
      {appliedCoupon ? (
        <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <Tag size={11} /> {appliedCoupon} applied
          </span>
          <button onClick={handleRemoveCoupon} aria-label="Remove coupon" className="text-green-500">
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
              className="flex-1 px-3 py-2 text-xs border border-stone-200 bg-transparent placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponInput.trim()}
              className="px-4 py-2 border border-stone-200 text-[10px] tracking-widest uppercase text-stone-600 hover:border-stone-900 disabled:opacity-50"
            >
              {couponLoading ? <RefreshCw size={11} className="animate-spin" /> : "Apply"}
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
      <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
        <div className="flex justify-between">
          <span>Subtotal</span><span>${total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className={isFreeShipping ? "text-green-600" : ""}>
            {isFreeShipping ? "Free" : shippingCost === 0 ? "TBD" : `$${shippingCost.toFixed(2)}`}
          </span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({appliedCoupon})</span>
            <span>-${couponDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium text-stone-900 border-t border-stone-100 pt-2 mt-1">
          <span>Total</span><span>${orderTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Free-shipping bar */}
      {amountToFreeShipping > 0 && (
        <div>
          <p className="text-[10px] text-stone-400 mb-1">${amountToFreeShipping.toFixed(2)} away from free shipping</p>
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-700 rounded-full transition-all duration-500"
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
        className="block text-[10px] tracking-[0.15em] uppercase text-stone-500 font-medium mb-1.5"
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
          className={`w-full px-3 py-2.5 text-xs border bg-transparent text-stone-900 placeholder:text-stone-300 focus:outline-none transition-colors ${
            error
              ? "border-red-300 focus:border-red-500"
              : "border-stone-200 focus:border-stone-700"
          } ${icon ? "pr-9" : ""} ${
            readOnly ? "bg-stone-50 text-stone-500 cursor-default" : ""
          }`}
        />
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[10px] text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}