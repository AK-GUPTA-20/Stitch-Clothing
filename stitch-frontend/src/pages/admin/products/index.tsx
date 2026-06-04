// src/pages/admin/products/index.tsx
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { productService } from "@/lib/api/productService";
import { Product, ProductStatus, BulkStatusPayload } from "@/lib/types/product.types";
import { useProfile } from "@/lib/context/ProfileContext";
import { useToast } from "@/lib/context/ToastContext";
import { getCategoryLabel } from '@/lib/utils';
import {
  CheckCircle, XCircle, Star, Trash2, RotateCcw, RefreshCw,
  Clock, Edit2, AlertCircle, Eye, ChevronDown, Package,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:    { label: "Draft",    color: "text-stone-500 bg-stone-100" },
  pending:  { label: "Pending",  color: "text-amber-600 bg-amber-50"  },
  approved: { label: "Approved", color: "text-green-700 bg-green-50"  },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50"      },
  archived: { label: "Archived", color: "text-stone-400 bg-stone-50"  },
};

// use shared getCategoryLabel from src/lib/utils.ts

export default function AdminProductsPage() {
  const { isLoggedIn, user } = useProfile();
  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | ProductStatus>("all");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bulkStatus, setBulkStatus] = useState<ProductStatus>("approved");

  useEffect(() => {
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (user && user.role !== "admin") { router.replace("/"); return; }
    loadProducts();
  }, [isLoggedIn]);

  async function loadProducts() {
    setLoading(true);
    try {
      const params = filterStatus !== "all" ? { status: filterStatus } : {};
      const res = await productService.getProducts(params);
      setProducts(res.data || res.products || []);
    } catch {
      toast.error?.("Error", "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, [filterStatus]);

  // ── Individual moderation actions ──────────────────────────────────────────

  async function handleApprove(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await productService.approveProduct(id);
      setProducts((prev) => prev.map((p) => p._id === id ? (res.data || res.product) : p));
      toast.success("Approved", `"${name}" is now live.`);
    } catch { toast.error?.("Error", "Could not approve."); }
    finally { setActionLoading(null); }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) { toast.error?.("Required", "Please enter a rejection reason."); return; }
    setActionLoading(id);
    try {
      const res = await productService.rejectProduct(id, { reason: rejectReason });
      setProducts((prev) => prev.map((p) => p._id === id ? (res.data || res.product) : p));
      toast.success("Rejected", "Product has been rejected.");
      setRejectModal(null);
      setRejectReason("");
    } catch { toast.error?.("Error", "Could not reject."); }
    finally { setActionLoading(null); }
  }

  async function handleFeature(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await productService.featureProduct(id);
      setProducts((prev) => prev.map((p) => p._id === id ? { ...p, isFeatured: res.isFeatured } : p));
      toast.success("Featured", `"${name}" featured status toggled.`);
    } catch { toast.error?.("Error", "Could not update featured."); }
    finally { setActionLoading(null); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Soft-delete "${name}"?`)) return;
    setActionLoading(id);
    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success("Deleted", `"${name}" deleted.`);
    } catch { toast.error?.("Error", "Could not delete."); }
    finally { setActionLoading(null); }
  }

  async function handleRestore(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await productService.restoreProduct(id);
      setProducts((prev) => prev.map((p) => p._id === id ? (res.data || res.product) : p));
      toast.success("Restored", `"${name}" restored.`);
    } catch { toast.error?.("Error", "Could not restore."); }
    finally { setActionLoading(null); }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  async function handleBulkStatus() {
    if (selected.size === 0) return;
    try {
      await productService.bulkUpdateStatus({ ids: [...selected], status: bulkStatus });
      toast.success("Bulk Updated", `${selected.size} products set to ${bulkStatus}.`);
      setSelected(new Set());
      loadProducts();
    } catch { toast.error?.("Error", "Bulk update failed."); }
  }

  async function handleBulkDelete() {
    if (selected.size === 0 || !confirm(`Delete ${selected.size} products?`)) return;
    try {
      await productService.bulkDeleteProducts({ ids: [...selected] });
      toast.success("Bulk Deleted", `${selected.size} products deleted.`);
      setSelected(new Set());
      loadProducts();
    } catch { toast.error?.("Error", "Bulk delete failed."); }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      // ✅ Coerce MongoIdLike to string before adding to Set<string>
      setSelected(new Set(products.map((p) => String(p._id))));
    }
  };

  const allSelected = products.length > 0 && selected.size === products.length;

  return (
    <AdminLayout title="Products">
      <Head>
        <title>Products — Admin | Stitch</title>
      </Head>
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-1">Admin</p>
              <h1 className="font-display text-3xl text-stone-900 font-light italic">Product Moderation</h1>
            </div>
            <button onClick={loadProducts} className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-stone-500 hover:text-stone-900 border border-stone-200 px-4 py-2.5 transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {(["all", "pending", "approved", "rejected", "draft", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-shrink-0 px-4 py-2 text-[10px] tracking-widest uppercase font-bold border transition-all ${
                  filterStatus === s
                    ? "bg-stone-900 text-stone-50 border-stone-900"
                    : "border-stone-200 text-stone-500 hover:border-stone-700"
                }`}
              >
                {s} {s !== "all" && `(${products.filter((p) => p.status === s).length})`}
              </button>
            ))}
          </div>

          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-stone-900 text-stone-50 px-4 py-3 rounded-sm">
              <span className="text-[11px] font-semibold">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as ProductStatus)}
                  className="bg-stone-800 text-stone-200 text-[10px] px-2 py-1.5 border border-stone-700 focus:outline-none"
                >
                  {(["approved", "rejected", "archived", "draft"] as ProductStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button onClick={handleBulkStatus} className="px-3 py-1.5 bg-stone-50 text-stone-900 text-[10px] font-bold tracking-widest uppercase hover:bg-stone-200 transition-colors">
                  Apply
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase hover:bg-red-700 transition-colors">
                  Delete All
                </button>
                <button onClick={() => setSelected(new Set())} className="text-stone-400 hover:text-stone-200 ml-2">✕</button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-white border border-stone-100" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <Package size={40} className="text-stone-200 mx-auto mb-4" />
              <p className="text-stone-400">No products found for this filter.</p>
            </div>
          ) : (
            <div className="bg-white border border-stone-100 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-4 py-3 w-10">
                      <input aria-label="Select all products" type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-stone-900" />
                    </th>
                    <th className="text-left px-4 py-3 text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold">Product</th>
                    <th className="text-left px-4 py-3 text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold">Category</th>
                    <th className="text-left px-4 py-3 text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold">Price</th>
                    <th className="text-left px-4 py-3 text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold">Featured</th>
                    <th className="text-right px-4 py-3 text-[9px] tracking-[0.3em] uppercase text-stone-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {products.map((p) => {
                    const { label, color } = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                    const img = p.images?.[0]?.url || p.image || "";
                    const isLoading = actionLoading === p._id;
                    return (
                      <tr key={p._id} className={`hover:bg-stone-50/50 transition-colors ${selected.has(p._id) ? "bg-accent/5" : ""}`}>
                        <td className="px-4 py-3">
                          <input aria-label={`Select product ${p.name}`} type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)} className="accent-stone-900" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {img && <img src={img} alt={p.name} className="h-10 w-8 object-cover bg-stone-100 shrink-0" />}
                            <div>
                              <p className="text-xs font-medium text-stone-900">{p.name}</p>
                              <p className="text-[10px] text-stone-400">{(p as any).seller?.name || "Unknown seller"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500">{getCategoryLabel(p.category)}</td>
                        <td className="px-4 py-3 text-xs font-medium text-stone-900">${p.price}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] font-semibold tracking-wider uppercase ${color}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleFeature(p._id, p.name)}
                            disabled={isLoading}
                            title="Toggle featured"
                            className={`p-1.5 rounded transition-colors disabled:opacity-40 ${p.isFeatured ? "text-accent" : "text-stone-300 hover:text-accent"}`}
                          >
                            <Star size={14} fill={p.isFeatured ? "currentColor" : "none"} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {p.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(p._id, p.name)}
                                  disabled={isLoading}
                                  title="Approve"
                                  className="p-1.5 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-40"
                                >
                                  {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                                </button>
                                <button
                                  onClick={() => setRejectModal({ id: p._id, name: p.name })}
                                  disabled={isLoading}
                                  title="Reject"
                                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                                >
                                  <XCircle size={13} />
                                </button>
                              </>
                            )}
                            {p.status === "archived" && (
                              <button
                                onClick={() => handleRestore(p._id, p.name)}
                                disabled={isLoading}
                                title="Restore"
                                className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                            <Link href={`/product/${p._id}`} title="View" className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors">
                              <Eye size={13} />
                            </Link>
                            <button
                              onClick={() => handleDelete(p._id, p.name)}
                              disabled={isLoading}
                              title="Delete"
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject modal */}
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
            <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-md p-6 z-10">
              <h3 className="text-sm font-semibold text-stone-900 mb-1">Reject Product</h3>
              <p className="text-xs text-stone-500 mb-4">"{rejectModal.name}" — please provide a reason.</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (required)…"
                rows={4}
                className="w-full border border-stone-200 p-3 text-xs focus:outline-none focus:border-stone-700 resize-none mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRejectModal(null)} className="px-4 py-2 border border-stone-200 text-xs text-stone-600 hover:border-stone-900 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(rejectModal.id)}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
