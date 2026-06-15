import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { productService } from "@/lib/api/productService";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Product, ProductVariant, ProductImage, UpdateProductPayload,
} from "@/lib/types/product.types";
import { useToast } from "@/lib/context/ToastContext";
import Loading from "@/components/Loading";
import { getDeterministicObjectId, getCategoryLabel } from "@/lib/utils";
import {
  ArrowLeft, Plus, Trash2, Upload, RefreshCw, X, ImagePlus, Save, Send,
} from "lucide-react";

const CATEGORIES = [
  "Shirts", "T-Shirts", "Hoodies & Sweatshirts", "Outerwear & Jackets",
  "Pants & Trousers", "Jeans", "Shorts", "Skirts", "Dresses", "Activewear",
  "Suits & Blazers", "Sweaters & Cardigans", "Innerwear", "Accessories", "Other",
];

// ── Validation helpers ─────────────────────────────────────────────────────
interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  compareAtPrice?: string;
  category?: string;
}

function validateForm(form: any): FormErrors {
  const errs: FormErrors = {};
  if (!form.name || form.name.trim().length < 3) errs.name = 'Product name must be at least 3 characters';
  else if (form.name.length > 150) errs.name = 'Product name must be 150 characters or less';
  if (!form.description || form.description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
  else if (form.description.length > 5000) errs.description = 'Description must be 5000 characters or less';
  if (!form.price || Number(form.price) <= 0) errs.price = 'Price must be greater than ₹0';
  if (form.compareAtPrice && Number(form.compareAtPrice) > 0 && Number(form.compareAtPrice) <= Number(form.price)) {
    errs.compareAtPrice = 'Compare At price must be higher than the selling price';
  }
  return errs;
}

// ── Reusable field primitives ───────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/60">
        <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">{title}</h3>
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

// ── Toggle switch component ─────────────────────────────────────────────────
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

export default function PortalEditProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const { user: authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<Omit<UpdateProductPayload, "tags"> & { tags?: string }>({});
  const [details, setDetails] = useState<string[]>([""]);
  const [careList, setCareList] = useState<string[]>([""]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id || !router.isReady) return;
    loadProduct(id as string);
  }, [id, router.isReady]);

  async function loadProduct(pid: string) {
    setLoading(true);
    try {
      const res = await productService.getProductById(pid);
      const p = (res as any).data || (res as any).product || res;
      setProduct(p);
      setForm({
        name: p.name,
        description: p.description,
        category: getCategoryLabel(p.category) || undefined,
        price: p.basePrice !== undefined ? p.basePrice : p.price,
        compareAtPrice: p.salePrice !== undefined ? p.salePrice : p.compareAtPrice,
        material: p.fabric || p.material,
        fit: p.fit || "regular",
        brand: getCategoryLabel(p.brand) || (p as any).brand,
        tags: (p.tags || []).join(", "),
        gender: p.gender || "unisex",
        occasion: p.occasion?.join(", ") || "",
        countryOfOrigin: p.countryOfOrigin || "IN",
        taxRate: p.taxRate !== undefined ? p.taxRate : 5,
        taxIncluded: p.taxIncluded !== undefined ? p.taxIncluded : false,
        minOrderQty: p.minOrderQty !== undefined ? p.minOrderQty : 1,
        maxOrderQty: p.maxOrderQty !== undefined ? p.maxOrderQty : 10,
        isReturnable: p.isReturnable !== undefined ? p.isReturnable : true,
        returnWindowDays: p.returnWindowDays !== undefined ? p.returnWindowDays : 7,
        isExchangeable: p.isExchangeable !== undefined ? p.isExchangeable : true,
        exchangeWindowDays: p.exchangeWindowDays !== undefined ? p.exchangeWindowDays : 7,
        isCODAvailable: p.isCODAvailable !== undefined ? p.isCODAvailable : true,
        currency: p.currency || "INR",
      } as any);
      setDetails(p.details?.length ? p.details : [""]);
      setCareList(p.careInstructions ? p.careInstructions.split('\n') : (p.care?.length ? p.care : [""]));
      setVariants(p.variants || []);
      setImages(p.images || []);
    } catch {
      toast.error?.("Error", "Could not load product data.");
      router.push("/seller/products");
    } finally {
      setLoading(false);
    }
  }

  const set = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  async function handleSave() {
    if (!product) return;
    const errors = validateForm(form);
    setFormErrors(errors);
    setTouched({ name: true, description: true, price: true, compareAtPrice: true });
    if (Object.keys(errors).length > 0) {
      toast.error?.("Validation Error", "Please fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    try {
      const catNameStr = typeof form.category === "string" ? form.category : form.category?.name || "Other";
      const catId = getDeterministicObjectId(catNameStr);

      const brandStr = typeof form.brand === "string" ? form.brand : (form.brand as any)?.name;

      const payload: UpdateProductPayload = {
        name: form.name,
        description: form.description,
        category: { id: catId, name: catNameStr, slug: catNameStr.toLowerCase() },
        brand: brandStr
          ? { name: brandStr, slug: brandStr.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
          : undefined,
        basePrice: Number(form.price),
        salePrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
        fabric: form.material || undefined,
        careInstructions: careList.filter(Boolean).join('\n') || undefined,
        tags: typeof form.tags === "string"
          ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : form.tags,
        details: details.filter(Boolean),
        gender: (form as any).gender,
        fit: (form as any).fit,
        occasion: (form as any).occasion
          ? (form as any).occasion.split(",").map((o: string) => o.trim()).filter(Boolean)
          : [],
        countryOfOrigin: (form as any).countryOfOrigin || "IN",
        taxRate: Number((form as any).taxRate),
        taxIncluded: Boolean((form as any).taxIncluded),
        minOrderQty: Number((form as any).minOrderQty),
        maxOrderQty: Number((form as any).maxOrderQty),
        isReturnable: Boolean((form as any).isReturnable),
        returnWindowDays: (form as any).isReturnable ? Number((form as any).returnWindowDays) : undefined,
        isExchangeable: Boolean((form as any).isExchangeable),
        exchangeWindowDays: (form as any).isExchangeable ? Number((form as any).exchangeWindowDays) : undefined,
        isCODAvailable: Boolean((form as any).isCODAvailable),
        currency: (form as any).currency || "INR",
      };

      const res = await productService.updateProduct(product._id, payload);
      const updatedProduct = (res as any).data || (res as any).product || res;
      setProduct(updatedProduct);
      toast.success("Saved", "Product details updated successfully.");
    } catch (err: any) {
      toast.error?.("Error", err?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateVariantStock(variantId: string, stock: number) {
    if (!product) return;
    try {
      await productService.updateVariantStock(product._id, variantId, { totalStock: stock });
      setVariants((prev) => prev.map((v) => (v._id === variantId ? { ...v, totalStock: stock, stock } : v)));
      toast.success("Stock Saved", "Variant inventory stock adjusted.");
    } catch {
      toast.error?.("Error", "Could not update stock.");
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!product || !confirm("Permanently delete this variant?")) return;
    try {
      await productService.deleteVariant(product._id, variantId);
      setVariants((prev) => prev.filter((v) => v._id !== variantId));
      toast.success("Deleted", "Variant removed from product.");
    } catch {
      toast.error?.("Error", "Could not delete variant.");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!product) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));
      const res = await productService.uploadImages(product._id, fd);
      setImages((prev) => [...prev, ...(res.images || [])]);
      toast.success("Uploaded", `${files.length} photo(s) added.`);
    } catch {
      toast.error?.("Upload Failed", "Could not upload images.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!product || !confirm("Remove this image?")) return;
    try {
      await productService.deleteImage(product._id, imageId);
      setImages((prev) => prev.filter((img) => img._id !== imageId));
      toast.success("Image Removed", "");
    } catch {
      toast.error?.("Error", "Could not remove image.");
    }
  }

  async function handleSubmitForApproval() {
    if (!product) return;
    setSaving(true);
    try {
      await productService.submitProduct(product._id);
      toast.success("Published", "Product published successfully.");
      router.push("/seller/products");
    } catch {
      toast.error?.("Error", "Failed to publish product.");
    } finally {
      setSaving(false);
    }
  }

  if (!router.isReady || loading) return <Loading />;
  if (!product) return null;

  const isReturnable = Boolean((form as any).isReturnable !== undefined ? (form as any).isReturnable : true);
  const isExchangeable = Boolean((form as any).isExchangeable !== undefined ? (form as any).isExchangeable : true);

  return (
    <>
      <Head>
        <title>Edit Product | STITCH Portal</title>
      </Head>

      <SellerLayout title="Edit Product">
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
              <p className="text-[10px] tracking-widest uppercase text-stone-400">Products / Edit</p>
              <h2 className="text-sm font-semibold text-stone-900 mt-0.5 leading-tight">{product.name}</h2>
            </div>
          </div>

          {/* ── Basic Information ──────────────────────────────────────── */}
          <SectionCard title="Basic Information">
            <div className="space-y-4">
              <div>
                <FieldLabel>Product Name</FieldLabel>
                <input type="text" value={form.name || ""} onChange={(e) => { set("name", e.target.value); if (touched.name) setFormErrors(v => ({ ...v, name: e.target.value.trim().length < 3 ? 'Min 3 characters' : e.target.value.length > 150 ? 'Max 150 characters' : undefined })); }}
                  onBlur={() => setTouched(t => ({ ...t, name: true }))}
                  className={inputCls(formErrors.name ? 'border-red-300 focus:border-red-400' : '')} placeholder="e.g. Ribbed Regular Fit Shirt" />
                <div className="flex justify-between mt-1">
                  {formErrors.name ? <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.name}</p> : <span />}
                  <span className={`text-[10px] ${(form.name?.length || 0) > 140 ? 'text-amber-500' : 'text-stone-400'}`}>{(form.name?.length || 0)}/150</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <select value={(typeof form.category === "string" ? form.category : form.category?.name) || ""} onChange={(e) => set("category", e.target.value)}
                    className={selectCls()}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Price (₹)</FieldLabel>
                  <input type="number" min="0" value={form.price || ""} onChange={(e) => { set("price", e.target.value); if (touched.price) setFormErrors(v => ({ ...v, price: Number(e.target.value) <= 0 ? 'Must be greater than ₹0' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, price: true }))}
                    className={inputCls(formErrors.price ? 'border-red-300' : '')} placeholder="0" />
                  {formErrors.price && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><span>⚠</span>{formErrors.price}</p>}
                </div>
                <div>
                  <FieldLabel>Compare At (₹)</FieldLabel>
                  <input type="number" min="0" value={form.compareAtPrice || ""} onChange={(e) => { set("compareAtPrice", e.target.value); if (touched.compareAtPrice) setFormErrors(v => ({ ...v, compareAtPrice: (Number(e.target.value) > 0 && Number(e.target.value) <= Number(form.price)) ? 'Must be higher than selling price' : undefined })); }}
                    onBlur={() => setTouched(t => ({ ...t, compareAtPrice: true }))}
                    className={inputCls(formErrors.compareAtPrice ? 'border-red-300' : '')} placeholder="Original price" />
                  {formErrors.compareAtPrice && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><span>⚠</span>{formErrors.compareAtPrice}</p>}
                </div>
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea rows={4} value={form.description || ""} onChange={(e) => { set("description", e.target.value); if (touched.description) setFormErrors(v => ({ ...v, description: e.target.value.trim().length < 20 ? 'Min 20 characters' : e.target.value.length > 5000 ? 'Max 5000 characters' : undefined })); }}
                  onBlur={() => setTouched(t => ({ ...t, description: true }))}
                  className={inputCls(formErrors.description ? 'border-red-300 ' : '' + "resize-none")} placeholder="Describe the product…" />
                <div className="flex justify-between mt-1">
                  {formErrors.description ? <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.description}</p> : <span />}
                  <span className={`text-[10px] ${(form.description?.length || 0) > 4800 ? 'text-amber-500' : 'text-stone-400'}`}>{(form.description?.length || 0)}/5000</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Material / Fabric</FieldLabel>
                  <input type="text" value={form.material || ""} onChange={(e) => set("material", e.target.value)}
                    className={inputCls()} placeholder="e.g. Ribbed Knit Cotton" />
                </div>
                <div>
                  <FieldLabel>Brand</FieldLabel>
                  <input type="text" value={(form as any).brand || ""} onChange={(e) => set("brand", e.target.value)}
                    className={inputCls()} />
                </div>
                <div>
                  <FieldLabel>Tags (comma-separated)</FieldLabel>
                  <input type="text" value={form.tags || ""} onChange={(e) => set("tags", e.target.value)}
                    className={inputCls()} placeholder="casual, summer, shirt" />
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
                      <input value={d}
                        onChange={(e) => { const n = [...details]; n[i] = e.target.value; setDetails(n); }}
                        placeholder={`Spec ${i + 1}`}
                        className={smallInputCls() + " flex-1"} />
                      {details.length > 1 && (
                        <button onClick={() => setDetails(details.filter((_, j) => j !== i))}
                          className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
                      <input value={c}
                        onChange={(e) => { const n = [...careList]; n[i] = e.target.value; setCareList(n); }}
                        placeholder={`Instruction ${i + 1}`}
                        className={smallInputCls() + " flex-1"} />
                      {careList.length > 1 && (
                        <button onClick={() => setCareList(careList.filter((_, j) => j !== i))}
                          className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
                  <select value={(form as any).gender || "unisex"} onChange={(e) => set("gender", e.target.value)}
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
                  <select value={(form as any).fit || "regular"} onChange={(e) => set("fit", e.target.value)}
                    className={selectCls()}>
                    <option value="regular">Regular</option>
                    <option value="slim">Slim</option>
                    <option value="loose">Loose</option>
                    <option value="oversized">Oversized</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Occasion</FieldLabel>
                  <input type="text" value={(form as any).occasion || ""} onChange={(e) => set("occasion", e.target.value)}
                    placeholder="casual, formal, party" className={inputCls()} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <FieldLabel required>Country of Origin</FieldLabel>
                  <input type="text" value={(form as any).countryOfOrigin || "IN"} onChange={(e) => set("countryOfOrigin", e.target.value)}
                    className={inputCls()} />
                </div>
                <div>
                  <FieldLabel>Tax Rate (%)</FieldLabel>
                  <input type="number" min="0" value={(form as any).taxRate ?? 5} onChange={(e) => set("taxRate", Number(e.target.value))}
                    className={inputCls()} />
                </div>
                <div>
                  <FieldLabel>Min Qty</FieldLabel>
                  <input type="number" min="1" value={(form as any).minOrderQty ?? 1} onChange={(e) => set("minOrderQty", Number(e.target.value))}
                    className={inputCls()} />
                </div>
                <div>
                  <FieldLabel>Max Qty</FieldLabel>
                  <input type="number" min="1" value={(form as any).maxOrderQty ?? 10} onChange={(e) => set("maxOrderQty", Number(e.target.value))}
                    className={inputCls()} />
                </div>
              </div>

              {/* Toggle switches */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                <Toggle
                  checked={Boolean((form as any).taxIncluded)}
                  onChange={(v) => set("taxIncluded", v)}
                  label="Tax included in price"
                />
                <Toggle
                  checked={Boolean((form as any).isCODAvailable !== undefined ? (form as any).isCODAvailable : true)}
                  onChange={(v) => set("isCODAvailable", v)}
                  label="Cash on Delivery (COD)"
                />
              </div>

              <div className="border-t border-stone-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Toggle
                    checked={isReturnable}
                    onChange={(v) => set("isReturnable", v)}
                    label="Product is returnable"
                  />
                  {isReturnable && (
                    <div>
                      <FieldLabel>Return Window (days)</FieldLabel>
                      <input type="number" min="1" value={(form as any).returnWindowDays ?? 7}
                        onChange={(e) => set("returnWindowDays", Number(e.target.value))}
                        className={smallInputCls() + " w-28"} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Toggle
                    checked={isExchangeable}
                    onChange={(v) => set("isExchangeable", v)}
                    label="Product is exchangeable"
                  />
                  {isExchangeable && (
                    <div>
                      <FieldLabel>Exchange Window (days)</FieldLabel>
                      <input type="number" min="1" value={(form as any).exchangeWindowDays ?? 7}
                        onChange={(e) => set("exchangeWindowDays", Number(e.target.value))}
                        className={smallInputCls() + " w-28"} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Inventory Variants ─────────────────────────────────────── */}
          <SectionCard title="Inventory Variants">
            {variants.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <p className="text-xs">No variants created for this item.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header row */}
                <div className="hidden sm:grid grid-cols-6 gap-3 px-3 pb-1">
                  {["Size", "Color", "Price", "Stock", "SKU", ""].map((h) => (
                    <span key={h} className="text-[9px] tracking-widest uppercase text-stone-400 font-semibold">{h}</span>
                  ))}
                </div>
                {variants.map((v) => {
                  const sizeLabel = typeof v.size === "object" && v.size !== null ? v.size.label : (v as any).sizeStr || v.size || "—";
                  const colorName = typeof v.color === "object" && v.color !== null ? v.color.name : (v as any).colorStr || v.color || "—";
                  const currentStock = v.totalStock !== undefined ? v.totalStock : (v.stock || 0);

                  return (
                    <div key={v._id} className="grid grid-cols-2 sm:grid-cols-6 gap-3 px-3 py-3 bg-stone-50 border border-stone-100 rounded-xl items-center">
                      <span className="text-xs font-medium text-stone-700">{sizeLabel}</span>
                      <span className="text-xs font-medium text-stone-700">{colorName}</span>
                      <span className="text-xs text-stone-600">{v.price ? `$${v.price}` : "—"}</span>
                      <div>
                        <input
                          type="number" min="0"
                          defaultValue={currentStock}
                          onBlur={(e) => handleUpdateVariantStock(v._id, Number(e.target.value))}
                          className={smallInputCls() + " w-20"}
                        />
                      </div>
                      <span className="text-xs text-stone-400 font-mono truncate">{v.sku || "—"}</span>
                      <button onClick={() => handleDeleteVariant(v._id)}
                        className="justify-self-end w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* ── Product Gallery ────────────────────────────────────────── */}
          <SectionCard title="Product Gallery">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
              {images.map((img, i) => (
                <div key={img._id} className="relative group aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden border border-stone-200/50">
                  <img loading="lazy" decoding="async" src={img.url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                  {img.isDefault && (
                    <span className="absolute top-1.5 left-1.5 text-[8px] font-bold bg-stone-900 text-white px-1.5 py-0.5 rounded-md">
                      Primary
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteImage(img._id)}
                    className="absolute inset-0 bg-stone-900/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Trash2 size={14} />
                    </div>
                  </button>
                </div>
              ))}

              {/* Upload slot */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[3/4] border-2 border-dashed border-stone-200 hover:border-stone-400 hover:bg-stone-50/50 flex flex-col items-center justify-center cursor-pointer transition-all rounded-xl group"
              >
                {uploading ? (
                  <RefreshCw size={18} className="text-stone-400 animate-spin" />
                ) : (
                  <ImagePlus size={18} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                )}
                <span className="text-[9px] text-stone-400 mt-1.5 font-semibold">
                  {uploading ? "Uploading…" : "Add Photo"}
                </span>
              </button>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
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
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 border border-stone-900 text-xs font-bold text-stone-900 hover:bg-stone-900 hover:text-white rounded-xl transition-all disabled:opacity-40"
            >
              <Save size={13} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {["draft", "rejected"].includes(product.status) && (
              <button
                onClick={handleSubmitForApproval}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 shadow-sm"
              >
                <Send size={13} />
                Publish Product
              </button>
            )}
          </div>
        </div>
      </SellerLayout>
    </>
  );
}