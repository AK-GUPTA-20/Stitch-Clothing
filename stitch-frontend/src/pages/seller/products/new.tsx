import React, { useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { productService } from "@/lib/api/productService";
import { useAuth } from "@/lib/context/AuthContext";
import { useGetMe } from "@/lib/hooks/useSeller";
import { CreateProductPayload, CreateVariantPayload } from "@/lib/types/product.types";
import { useToast } from "@/lib/context/ToastContext";
import { generateSlug, getDeterministicObjectId } from "@/lib/utils";
import {
  ArrowLeft, Plus, Trash2, RefreshCw, X, ImagePlus, CheckCircle2,
} from "lucide-react";

// ── Validation helpers ─────────────────────────────────────────────────────
interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  compareAtPrice?: string;
  category?: string;
  material?: string;
  brand?: string;
  tags?: string;
  occasion?: string;
  countryOfOrigin?: string;
  taxRate?: string;
  minOrderQty?: string;
  maxOrderQty?: string;
  variants?: string;
}

function validateForm(form: any, variants: VariantForm[]): FormErrors {
  const errs: FormErrors = {};
  if (!form.name || form.name.trim().length < 3) errs.name = 'Required (min 3 chars)';
  else if (form.name.length > 150) errs.name = 'Max 150 chars';
  if (!form.description || form.description.trim().length < 20) errs.description = 'Required (min 20 chars)';
  else if (form.description.length > 5000) errs.description = 'Max 5000 chars';
  if (!form.price || Number(form.price) <= 0) errs.price = 'Must be > 0';
  if (!form.compareAtPrice || Number(form.compareAtPrice) <= 0) {
    errs.compareAtPrice = 'Required';
  } else if (Number(form.compareAtPrice) <= Number(form.price)) {
    errs.compareAtPrice = 'Must be higher than price';
  }
  if (!form.category) errs.category = 'Required';
  if (!form.material || !form.material.trim()) errs.material = 'Required';
  if (!form.brand || !form.brand.trim()) errs.brand = 'Required';
  if (!form.tags || !form.tags.trim()) errs.tags = 'Required';
  if (!form.occasion || !form.occasion.trim()) errs.occasion = 'Required';
  if (!form.countryOfOrigin || !form.countryOfOrigin.trim()) errs.countryOfOrigin = 'Required';
  if (form.taxRate === undefined || form.taxRate === null || form.taxRate === '') errs.taxRate = 'Required';
  if (!form.minOrderQty || Number(form.minOrderQty) <= 0) errs.minOrderQty = 'Required';
  if (!form.maxOrderQty || Number(form.maxOrderQty) <= 0) errs.maxOrderQty = 'Required';

  if (!variants || variants.length === 0) {
    errs.variants = 'At least one variant is required.';
  } else {
    for (const v of variants) {
      if (!v.size && !v.color) errs.variants = 'All variants must have at least a size or color.';
      if (!v.stock || Number(v.stock) <= 0) errs.variants = 'All variants must have stock.';
    }
  }

  return errs;
}

const CATEGORIES = [
  "Shirts", "T-Shirts", "Hoodies & Sweatshirts", "Outerwear & Jackets",
  "Pants & Trousers", "Jeans", "Shorts", "Skirts", "Dresses", "Activewear",
  "Suits & Blazers", "Sweaters & Cardigans", "Innerwear", "Accessories", "Other",
];

interface VariantForm {
  key: string;
  size: string;
  color: string;
  colorHex: string;
  price: string;
  stock: string;
  sku: string;
}

// ── Reusable field primitives ───────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
        <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function inputCls(extra = "") {
  return `w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/5 transition-all bg-white ${extra}`;
}
function selectCls() {
  return `w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/5 transition-all bg-white appearance-none`;
}
function smallInputCls() {
  return `border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/5 transition-all bg-white`;
}

// ── Toggle switch ───────────────────────────────────────────────────────────
function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 min-h-[20px] w-9 min-w-[36px] shrink-0 rounded-full border-2 transition-colors duration-200 ${
          checked ? "bg-stone-900 border-stone-900" : "bg-stone-200 border-stone-200"
        }`}
      >
        <span
          className={`pointer-events-none block h-3.5 w-3.5 mt-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs font-medium text-stone-700 group-hover:text-stone-900 transition-colors">{label}</span>
    </label>
  );
}

// ── Variant row ─────────────────────────────────────────────────────────────
function VariantRow({
  variant, onChange, onRemove,
}: {
  variant: VariantForm;
  onChange: (v: VariantForm) => void;
  onRemove: () => void;
}) {
  const fields: { key: keyof VariantForm; placeholder: string; type?: string }[] = [
    { key: "size", placeholder: "Size" },
    { key: "color", placeholder: "Color name" },
    { key: "price", placeholder: "Price", type: "number" },
    { key: "stock", placeholder: "Stock", type: "number" },
    { key: "sku", placeholder: "SKU" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-stone-50 border border-stone-100 rounded-xl items-center">
      {fields.map((f) => (
        <input
          key={f.key}
          type={f.type || "text"}
          value={variant[f.key]}
          onChange={(e) => onChange({ ...variant, [f.key]: e.target.value })}
          placeholder={f.placeholder}
          className={smallInputCls() + " w-full"}
        />
      ))}
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={variant.colorHex}
            onChange={(e) => onChange({ ...variant, colorHex: e.target.value })}
            title="Color swatch"
            className="h-8 w-8 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white"
          />
        </div>
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function PortalNewProductPage() {
  const router = useRouter();
  const toast = useToast();
  const { user: authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{_id: string, url: string}[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: sellerData, isLoading: sellerLoading } = useGetMe();
  const isApproved = 
    authUser?.role === 'admin' || 
    (sellerData as any)?.status === 'approved' || 
    (sellerData as any)?.status === 'verified' || 
    (sellerData as any)?.verificationStatus === 'approved';

  const [form, setForm] = useState({
    name: "", description: "", category: CATEGORIES[0], price: 0,
    compareAtPrice: undefined as number | undefined,
    material: "", fit: "regular", brand: "", tags: "",
    gender: "unisex", occasion: "", countryOfOrigin: "IN",
    taxRate: 5, taxIncluded: false, minOrderQty: 1, maxOrderQty: 10,
    isReturnable: true, returnWindowDays: 7,
    isExchangeable: true, exchangeWindowDays: 7,
    isCODAvailable: true, currency: "INR",
  });

  const [details, setDetails] = useState<string[]>([""]);
  const [careList, setCareList] = useState<string[]>([""]);
  const [variants, setVariants] = useState<VariantForm[]>([]);

  const set = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  async function handleSaveDraft() {
    const errors = validateForm(form, variants);
    setFormErrors(errors);
    setTouched({
      name: true, description: true, price: true, compareAtPrice: true,
      material: true, brand: true, tags: true, occasion: true, countryOfOrigin: true,
      taxRate: true, minOrderQty: true, maxOrderQty: true
    });
    if (Object.keys(errors).length > 0) {
      toast.error?.("Validation Error", "Please fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    try {
      const slug = generateSlug(form.name);
      const catName = form.category || "Other";
      const catId = getDeterministicObjectId(catName);
      const sellerId = authUser?.role === "seller"
        ? (authUser.sellerId || authUser._id)
        : authUser?._id;

      if (!sellerId) {
        toast.error?.("Not Authenticated", "Could not determine your seller account. Please log in again.");
        setSaving(false);
        return;
      }

      const payload: CreateProductPayload = {
        name: form.name,
        slug,
        description: form.description,
        category: { id: catId, name: catName, slug: catName.toLowerCase() },
        brand: form.brand
          ? { name: form.brand, slug: form.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
          : undefined,
        basePrice: Number(form.price),
        salePrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
        fabric: form.material || undefined,
        careInstructions: careList.filter(Boolean).join('\n') || undefined,
        tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        details: details.filter(Boolean),
        sellerId: sellerId,
        gender: form.gender as any,
        fit: form.fit,
        occasion: form.occasion
          ? form.occasion.split(",").map((o: string) => o.trim()).filter(Boolean)
          : [],
        countryOfOrigin: form.countryOfOrigin || "IN",
        taxRate: Number(form.taxRate),
        taxIncluded: Boolean(form.taxIncluded),
        minOrderQty: Number(form.minOrderQty),
        maxOrderQty: Number(form.maxOrderQty),
        isReturnable: Boolean(form.isReturnable),
        returnWindowDays: form.isReturnable ? Number(form.returnWindowDays) : undefined,
        isExchangeable: Boolean(form.isExchangeable),
        exchangeWindowDays: form.isExchangeable ? Number(form.exchangeWindowDays) : undefined,
        isCODAvailable: Boolean(form.isCODAvailable),
        currency: form.currency || "INR",
      };

      if (productId) {
        await productService.updateProduct(productId, payload as any);
        toast.success("Updated", "Product details updated.");
      } else {
        const res = await productService.createProduct(payload);
        const createdProduct = (res as any).data || (res as any).product || res;
        setProductId(createdProduct._id);

        for (const v of variants) {
          if (!v.stock) continue;
          const generatedSku = v.sku || `${form.name.substring(0, 3).toUpperCase()}-${v.size || "SZ"}-${v.color || "CL"}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const vp: CreateVariantPayload = {
            sku: generatedSku.toUpperCase(),
            price: v.price ? Number(v.price) : Number(form.price),
            totalStock: Number(v.stock),
            color: v.color ? { name: v.color, hexCode: v.colorHex || undefined, slug: v.color.toLowerCase() } : undefined,
            size: v.size ? { label: v.size, value: v.size.toLowerCase() } : undefined,
          };
          await productService.addVariant(createdProduct._id, vp);
        }
        toast.success("Product Created", "Product created. You can now upload images.");
      }
    } catch (err: any) {
      toast.error?.("Error", err?.message || "Could not create product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!productId) {
      toast.error?.("Save First", "Please save the draft before uploading images.");
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));
      const res = await productService.uploadImages(productId, fd);
      const newImgs = (res.images || []).map((img: any) => ({ _id: img._id, url: img.url }));
      setUploadedImages((prev) => [...prev, ...newImgs]);
      toast.success("Uploaded", `${files.length} image(s) uploaded.`);
    } catch {
      toast.error?.("Upload Failed", "Could not upload images.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveImage(imageId: string) {
    if (!productId || !imageId) return;
    try {
      await productService.deleteImage(productId, imageId);
      setUploadedImages((prev) => prev.filter(img => img._id !== imageId));
      toast.success("Removed", "Image removed successfully.");
    } catch (err: any) {
      toast.error?.("Failed", "Could not remove image.");
    }
  }

  async function handleComplete() {
    if (!productId) { toast.error?.("Save First", "Save the product details first."); return; }
    toast.success("Completed", "Product successfully added to the catalog.");
    router.push("/seller/products");
  }

  const addVariant = () =>
    setVariants((prev) => [...prev, { key: Date.now().toString(), size: "", color: "", colorHex: "#000000", price: "", stock: "", sku: "" }]);
  const updateVariant = (key: string, v: VariantForm) =>
    setVariants((prev) => prev.map((pv) => pv.key === key ? v : pv));
  const removeVariant = (key: string) =>
    setVariants((prev) => prev.filter((v) => v.key !== key));

  return (
    <>
      <Head>
        <title>New Product | STITCH Portal</title>
      </Head>

      <SellerLayout title="Add Product">
        <div className="max-w-4xl mx-auto space-y-5 pb-10">

          {/* ── Breadcrumb Header ──────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <Link
              href="/seller/products"
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-400 hover:text-stone-700 transition-all"
              aria-label="Back"
            >
              <ArrowLeft size={15} />
            </Link>
            <div>
              <p className="text-[10px] tracking-widest uppercase text-stone-400">Products / New</p>
              <h2 className="text-sm font-semibold text-stone-900 mt-0.5">Create New Product</h2>
            </div>
          </div>

          {!isApproved && !sellerLoading && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
              <span className="text-xl">⚠</span>
              <div>
                <p className="font-bold text-sm">Action Blocked</p>
                <p className="text-xs mt-0.5">Your account must be fully verified by the administrator before you can add products. Please ensure all your details (KYC, Store, Bank) are complete.</p>
              </div>
            </div>
          )}

          {/* ── Saved Banner ───────────────────────────────────────────── */}
          {productId && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/70 px-4 py-3 rounded-xl">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 size={13} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-800">Product saved successfully</p>
                <p className="text-[10px] text-emerald-600 font-mono mt-0.5 truncate">ID: {productId}</p>
              </div>
            </div>
          )}

          {/* ── Basic Information ──────────────────────────────────────── */}
          <SectionCard title="Basic Information">
            <div className="space-y-4">
              <div>
                <FieldLabel required>Product Name</FieldLabel>
                <input type="text" value={form.name} onChange={(e) => { set("name", e.target.value); if (touched.name) setFormErrors(v => ({ ...v, name: e.target.value.trim().length < 3 ? 'Min 3 characters' : e.target.value.length > 150 ? 'Max 150 characters' : undefined })); }}
                  onBlur={() => setTouched(t => ({ ...t, name: true }))}
                  placeholder="e.g. Ribbed Regular Fit Shirt"
                  className={inputCls(formErrors.name ? 'border-red-300 focus:border-red-400' : '')} />
                <div className="flex justify-between mt-1">
                  {formErrors.name ? <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.name}</p> : <span />}
                  <span className={`text-[10px] ${form.name.length > 140 ? 'text-amber-500' : 'text-stone-400'}`}>{form.name.length}/150</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel required>Category</FieldLabel>
                  <select value={form.category} onChange={(e) => set("category", e.target.value)}
                    className={selectCls()}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel required>Price (₹)</FieldLabel>
                  <input type="number" min="0" value={form.price || ""} onChange={(e) => { set("price", e.target.value); if (touched.price) setFormErrors(v => ({ ...v, price: Number(e.target.value) <= 0 ? 'Must be greater than ₹0' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, price: true }))}
                    placeholder="0" className={inputCls(formErrors.price ? 'border-red-300' : '')} />
                  {formErrors.price && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><span>⚠</span>{formErrors.price}</p>}
                </div>
                <div>
                  <FieldLabel required>Compare At (₹)</FieldLabel>
                  <input type="number" min="0" value={form.compareAtPrice || ""} onChange={(e) => { set("compareAtPrice", e.target.value); if (touched.compareAtPrice) setFormErrors(v => ({ ...v, compareAtPrice: (!e.target.value || Number(e.target.value) <= 0) ? 'Required' : Number(e.target.value) <= Number(form.price) ? 'Must be higher than price' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, compareAtPrice: true }))}
                    placeholder="Original price" className={inputCls(formErrors.compareAtPrice ? 'border-red-300' : '')} />
                  {formErrors.compareAtPrice && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><span>⚠</span>{formErrors.compareAtPrice}</p>}
                </div>
              </div>

              <div>
                <FieldLabel required>Description</FieldLabel>
                <textarea rows={4} value={form.description} onChange={(e) => { set("description", e.target.value); if (touched.description) setFormErrors(v => ({ ...v, description: e.target.value.trim().length < 20 ? 'Min 20 characters' : e.target.value.length > 5000 ? 'Max 5000 characters' : undefined })); }}
                  onBlur={() => setTouched(t => ({ ...t, description: true }))}
                  placeholder="Describe the product's details, fit, and texture…"
                  className={inputCls(formErrors.description ? 'border-red-300 ' : '' + 'resize-none')} />
                <div className="flex justify-between mt-1">
                  {formErrors.description ? <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.description}</p> : <span />}
                  <span className={`text-[10px] ${form.description.length > 4800 ? 'text-amber-500' : 'text-stone-400'}`}>{form.description.length}/5000</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel required>Material / Fabric</FieldLabel>
                  <input type="text" value={form.material} onChange={(e) => { set("material", e.target.value); if (touched.material) setFormErrors(v => ({ ...v, material: !e.target.value.trim() ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, material: true }))}
                    placeholder="e.g. Ribbed Knit Cotton" className={inputCls(formErrors.material ? 'border-red-300' : '')} />
                </div>
                <div>
                  <FieldLabel required>Brand</FieldLabel>
                  <input type="text" value={form.brand} onChange={(e) => { set("brand", e.target.value); if (touched.brand) setFormErrors(v => ({ ...v, brand: !e.target.value.trim() ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, brand: true }))}
                    className={inputCls(formErrors.brand ? 'border-red-300' : '')} />
                </div>
                <div>
                  <FieldLabel required>Tags (comma-separated)</FieldLabel>
                  <input type="text" value={form.tags} onChange={(e) => { set("tags", e.target.value); if (touched.tags) setFormErrors(v => ({ ...v, tags: !e.target.value.trim() ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, tags: true }))}
                    placeholder="ribbed, casual, shirt" className={inputCls(formErrors.tags ? 'border-red-300' : '')} />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Details & Care ─────────────────────────────────────────── */}
          <SectionCard title="Details & Care">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Specs */}
              <div>
                <p className="text-[10px] tracking-widest uppercase text-stone-400 font-semibold mb-3">Product Specifications</p>
                <div className="space-y-2">
                  {details.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={d} onChange={(e) => { const n = [...details]; n[i] = e.target.value; setDetails(n); }}
                        placeholder={`Spec ${i + 1}`}
                        className={smallInputCls() + " flex-1"} />
                      {details.length > 1 && (
                        <button onClick={() => setDetails(details.filter((_, j) => j !== i))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setDetails([...details, ""])}
                  className="mt-2.5 text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-1.5 transition-colors">
                  <Plus size={11} /> Add spec
                </button>
              </div>

              {/* Care */}
              <div>
                <p className="text-[10px] tracking-widest uppercase text-stone-400 font-semibold mb-3">Care Instructions</p>
                <div className="space-y-2">
                  {careList.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={c} onChange={(e) => { const n = [...careList]; n[i] = e.target.value; setCareList(n); }}
                        placeholder={`Instruction ${i + 1}`}
                        className={smallInputCls() + " flex-1"} />
                      {careList.length > 1 && (
                        <button onClick={() => setCareList(careList.filter((_, j) => j !== i))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setCareList([...careList, ""])}
                  className="mt-2.5 text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-1.5 transition-colors">
                  <Plus size={11} /> Add instruction
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ── Specifications & Policies ──────────────────────────────── */}
          <SectionCard title="Specifications & Policies">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel required>Gender</FieldLabel>
                  <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
                    className={selectCls()}>
                    <option value="unisex">Unisex</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="kids">Kids</option>
                    <option value="baby">Baby</option>
                  </select>
                </div>
                <div>
                  <FieldLabel required>Fit</FieldLabel>
                  <select value={form.fit} onChange={(e) => set("fit", e.target.value)}
                    className={selectCls()}>
                    <option value="regular">Regular</option>
                    <option value="slim">Slim</option>
                    <option value="loose">Loose</option>
                    <option value="oversized">Oversized</option>
                  </select>
                </div>
                <div>
                  <FieldLabel required>Occasion</FieldLabel>
                  <input type="text" value={form.occasion} onChange={(e) => { set("occasion", e.target.value); if (touched.occasion) setFormErrors(v => ({ ...v, occasion: !e.target.value.trim() ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, occasion: true }))}
                    placeholder="casual, formal, party" className={inputCls(formErrors.occasion ? 'border-red-300' : '')} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <FieldLabel required>Country of Origin</FieldLabel>
                  <input type="text" value={form.countryOfOrigin} onChange={(e) => { set("countryOfOrigin", e.target.value); if (touched.countryOfOrigin) setFormErrors(v => ({ ...v, countryOfOrigin: !e.target.value.trim() ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, countryOfOrigin: true }))}
                    className={inputCls(formErrors.countryOfOrigin ? 'border-red-300' : '')} />
                </div>
                <div>
                  <FieldLabel required>Tax Rate (%)</FieldLabel>
                  <input type="number" min="0" value={form.taxRate} onChange={(e) => { set("taxRate", Number(e.target.value)); if (touched.taxRate) setFormErrors(v => ({ ...v, taxRate: e.target.value === '' ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, taxRate: true }))}
                    className={inputCls(formErrors.taxRate ? 'border-red-300' : '')} />
                </div>
                <div>
                  <FieldLabel required>Min Qty</FieldLabel>
                  <input type="number" min="1" value={form.minOrderQty} onChange={(e) => { set("minOrderQty", Number(e.target.value)); if (touched.minOrderQty) setFormErrors(v => ({ ...v, minOrderQty: Number(e.target.value) <= 0 ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, minOrderQty: true }))}
                    className={inputCls(formErrors.minOrderQty ? 'border-red-300' : '')} />
                </div>
                <div>
                  <FieldLabel required>Max Qty</FieldLabel>
                  <input type="number" min="1" value={form.maxOrderQty} onChange={(e) => { set("maxOrderQty", Number(e.target.value)); if (touched.maxOrderQty) setFormErrors(v => ({ ...v, maxOrderQty: Number(e.target.value) <= 0 ? 'Required' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, maxOrderQty: true }))}
                    className={inputCls(formErrors.maxOrderQty ? 'border-red-300' : '')} />
                </div>
              </div>

              {/* Toggle switches */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                <Toggle checked={form.taxIncluded} onChange={(v) => set("taxIncluded", v)} label="Tax included in price" />
                <Toggle checked={form.isCODAvailable} onChange={(v) => set("isCODAvailable", v)} label="Cash on Delivery (COD)" />
              </div>

              <div className="border-t border-stone-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Toggle checked={form.isReturnable} onChange={(v) => set("isReturnable", v)} label="Product is returnable" />
                  {form.isReturnable && (
                    <div>
                      <FieldLabel>Return Window (days)</FieldLabel>
                      <input type="number" min="1" value={form.returnWindowDays}
                        onChange={(e) => set("returnWindowDays", Number(e.target.value))}
                        className={smallInputCls() + " w-28"} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Toggle checked={form.isExchangeable} onChange={(v) => set("isExchangeable", v)} label="Product is exchangeable" />
                  {form.isExchangeable && (
                    <div>
                      <FieldLabel>Exchange Window (days)</FieldLabel>
                      <input type="number" min="1" value={form.exchangeWindowDays}
                        onChange={(e) => set("exchangeWindowDays", Number(e.target.value))}
                        className={smallInputCls() + " w-28"} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Variants Manager ───────────────────────────────────────── */}
          <SectionCard
            title="Variants Manager"
            action={
              <button
                onClick={addVariant}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-400 px-3 py-1.5 rounded-lg transition-all"
              >
                <Plus size={11} /> Add Variant
              </button>
            }
          >
            {formErrors.variants && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center gap-2">
                <span>⚠</span> {formErrors.variants}
              </div>
            )}
            {variants.length === 0 ? (
              <div className={`text-center py-8 border-2 border-dashed rounded-xl ${formErrors.variants ? 'border-red-300 bg-red-50/30' : 'border-stone-100'}`}>
                <p className="text-xs text-stone-400">No variants yet. You must add at least one variant.</p>
                <button onClick={addVariant}
                  className="mt-3 text-[11px] text-stone-500 hover:text-stone-900 underline underline-offset-2 transition-colors">
                  + Add first variant
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-6 gap-2 pb-1">
                  {["Size", "Color", "Price (₹)", "Stock", "SKU", "Swatch"].map((h) => (
                    <span key={h} className="text-[9px] tracking-widest uppercase text-stone-400 font-semibold">{h}</span>
                  ))}
                </div>
                {variants.map((v) => (
                  <VariantRow
                    key={v.key}
                    variant={v}
                    onChange={(updated) => updateVariant(v.key, updated)}
                    onRemove={() => removeVariant(v.key)}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Image Uploader ─────────────────────────────────────────── */}
          <SectionCard title="Product Images">
            {!productId && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/70 px-4 py-3 rounded-xl mb-4">
                <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[9px] font-bold">!</span>
                </div>
                <p className="text-xs text-amber-700 font-medium">Save the product first to unlock image uploading.</p>
              </div>
            )}

            <div
              onClick={() => productId && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                productId
                  ? "border-stone-200 hover:border-stone-400 hover:bg-stone-50/50 cursor-pointer"
                  : "border-stone-100 opacity-40 cursor-not-allowed"
              }`}
            >
              {uploading ? (
                <RefreshCw size={22} className="text-stone-400 mx-auto mb-2 animate-spin" />
              ) : (
                <ImagePlus size={22} className="text-stone-300 mx-auto mb-2" />
              )}
              <p className="text-xs font-medium text-stone-500">
                {uploading ? "Uploading…" : "Click to upload product photos"}
              </p>
              <p className="text-[10px] text-stone-300 mt-1">PNG, JPG, WebP — up to 10 MB each</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">
                {uploadedImages.map((img, i) => (
                  <div key={img._id || i} className="relative aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden border border-stone-200/50 group">
                    <img src={img.url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(img._id); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-white/90 hover:bg-red-50 text-stone-600 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-sm"
                      title="Remove image"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Actions Bar ────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 justify-end">
            <Link
              href="/seller/products"
              className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSaveDraft}
              disabled={saving || (!isApproved && !sellerLoading)}
              className="px-5 py-2.5 border border-stone-900 text-xs font-bold text-stone-900 hover:bg-stone-900 hover:text-white rounded-xl transition-all disabled:opacity-40"
            >
              {saving ? "Saving…" : productId ? "Update Details" : "Create Product"}
            </button>
            {productId && (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 shadow-sm"
              >
                <CheckCircle2 size={13} />
                Complete & Exit
              </button>
            )}
          </div>
        </div>
      </SellerLayout>
    </>
  );
}