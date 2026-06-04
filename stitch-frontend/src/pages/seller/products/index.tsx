import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { getCategoryLabel } from '@/lib/utils';
import { useRouter } from "next/router";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { productService } from "@/lib/api/productService";
import { Product, ProductStatus } from "@/lib/types/product.types";
import { useProfile } from "@/lib/context/ProfileContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import {
  CheckCircle,
  XCircle,
  Star,
  Trash2,
  RotateCcw,
  RefreshCw,
  Clock,
  Edit2,
  Eye,
  Send,
  Package,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

// ── Status config with richer dot-based badges ──────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  draft:            { label: "Draft",            dot: "bg-stone-400",   bg: "bg-stone-100",   text: "text-stone-600"  },
  pending_approval: { label: "Pending",          dot: "bg-amber-400",   bg: "bg-amber-50",    text: "text-amber-700"  },
  approved:         { label: "Approved",         dot: "bg-emerald-500", bg: "bg-emerald-50",  text: "text-emerald-700"},
  rejected:         { label: "Rejected",         dot: "bg-red-500",     bg: "bg-red-50",      text: "text-red-700"    },
  archived:         { label: "Archived",         dot: "bg-stone-300",   bg: "bg-stone-50",    text: "text-stone-500"  },
  suspended:        { label: "Suspended",        dot: "bg-orange-400",  bg: "bg-orange-50",   text: "text-orange-700" },
};

const TAB_COUNTS_LABEL: Record<string, string> = {
  all: "All",
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  draft: "Draft",
  archived: "Archived",
  suspended: "Suspended",
};

export default function PortalProductsIndex() {
  const { user } = useProfile();
  const { user: authUser } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | ProductStatus>("all");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bulkStatus, setBulkStatus] = useState<ProductStatus>("approved");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user) loadProducts();
  }, [user, filterStatus]);

  async function loadProducts() {
    setLoading(true);
    try {
      const queryParams: any = {};
      if (filterStatus !== "all") queryParams.status = filterStatus;
      if (!isAdmin && authUser) {
        queryParams.sellerId = authUser.role === "seller"
          ? (authUser.sellerId || authUser._id)
          : authUser._id;
      }
      const res = await productService.getProducts(queryParams);
      setProducts(res.data || res.products || []);
    } catch {
      toast.error?.("Error", "Could not load products catalog.");
    } finally {
      setLoading(false);
    }
  }

  // ── Action Handlers ────────────────────────────────────────────────────────

  async function handleApprove(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await productService.approveProduct(id);
      const updatedProduct = res.data || res.product;
      setProducts((prev) => prev.map((p) => (p._id === id ? updatedProduct : p)));
      toast.success("Approved", `"${name}" has been approved.`);
    } catch {
      toast.error?.("Error", "Failed to approve product.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      toast.error?.("Required", "Please provide a rejection reason.");
      return;
    }
    setActionLoading(id);
    try {
      const res = await productService.rejectProduct(id, { reason: rejectReason });
      const updatedProduct = res.data || res.product;
      setProducts((prev) => prev.map((p) => (p._id === id ? updatedProduct : p)));
      toast.success("Rejected", "Product rejection recorded.");
      setRejectModal(null);
      setRejectReason("");
    } catch {
      toast.error?.("Error", "Rejection failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFeature(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await productService.featureProduct(id);
      setProducts((prev) =>
        prev.map((p) =>
          p._id === id
            ? { ...p, isFeatured: res.isFeatured !== undefined ? res.isFeatured : !p.isFeatured }
            : p
        )
      );
      toast.success("Featured", `"${name}" featured status updated.`);
    } catch {
      toast.error?.("Error", "Could not update featured status.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSoftDelete(id: string, name: string) {
    if (!confirm(`Delete product "${name}"? It can be restored later.`)) return;
    setActionLoading(id);
    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success("Deleted", `"${name}" is archived.`);
    } catch {
      toast.error?.("Error", "Deletion failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRestore(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await productService.restoreProduct(id);
      const updatedProduct = res.data || res.product;
      setProducts((prev) => prev.map((p) => (p._id === id ? updatedProduct : p)));
      toast.success("Restored", `"${name}" restored successfully.`);
    } catch {
      toast.error?.("Error", "Failed to restore product.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSendForReview(id: string, name: string) {
    setActionLoading(id);
    try {
      await productService.submitProduct(id);
      loadProducts();
      toast.success("Submitted", `"${name}" sent for moderation.`);
    } catch {
      toast.error?.("Error", "Failed to submit product.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Bulk Handlers ──────────────────────────────────────────────────────────

  async function handleBulkStatus() {
    if (selected.size === 0) return;
    try {
      await productService.bulkUpdateStatus({ ids: [...selected], status: bulkStatus });
      toast.success("Bulk Updated", `${selected.size} products set to ${bulkStatus}.`);
      setSelected(new Set());
      loadProducts();
    } catch {
      toast.error?.("Error", "Bulk update operation failed.");
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0 || !confirm(`Delete all ${selected.size} selected items?`)) return;
    try {
      await productService.bulkDeleteProducts({ ids: [...selected] });
      toast.success("Bulk Deleted", `${selected.size} products deleted.`);
      setSelected(new Set());
      loadProducts();
    } catch {
      toast.error?.("Error", "Bulk deletion failed.");
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === products.length ? new Set() : new Set(products.map((p) => p._id)));
  };

  const allSelected = products.length > 0 && selected.size === products.length;

  return (
    <>
      <Head>
        <title>Products Manager | STITCH Portal</title>
      </Head>

      <SellerLayout title="Products">
        <div className="space-y-5">

          {/* ── Top Bar ─────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full scrollbar-none">
              {(["all", "pending_approval", "approved", "rejected", "draft", "archived", "suspended"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab === "pending_approval" ? "pending_approval" : tab)}
                  className={`
                    flex-shrink-0 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150
                    ${filterStatus === tab
                      ? "bg-stone-900 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                    }
                  `}
                >
                  {tab === "pending_approval" && filterStatus === tab && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 align-middle -mt-0.5" />
                  )}
                  {TAB_COUNTS_LABEL[tab]}
                </button>
              ))}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Link
                href="/seller/products/new"
                className="flex-1 sm:flex-none text-center bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white text-[11px] font-bold tracking-wide px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                + New Product
              </Link>
              <button
                onClick={loadProducts}
                title="Refresh"
                className="p-2 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 bg-white rounded-lg text-stone-400 hover:text-stone-700 transition-all"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* ── Bulk Controls ────────────────────────────────────────────── */}
          {selected.size > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-stone-950 text-stone-50 p-3.5 rounded-xl shadow-lg border border-stone-800">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-stone-700 rounded-md text-[10px] font-bold tabular-nums">
                  {selected.size}
                </span>
                <span className="text-xs font-semibold text-stone-300">item{selected.size > 1 ? "s" : ""} selected</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto w-full sm:w-auto">
                <div className="relative">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as ProductStatus)}
                    className="appearance-none bg-stone-800 text-stone-200 text-[11px] font-medium pl-3 pr-8 py-1.5 border border-stone-700 rounded-lg focus:outline-none focus:border-stone-500 cursor-pointer"
                  >
                    {(["approved", "rejected", "archived", "draft", "pending_approval", "suspended"] as ProductStatus[]).map((s) => (
                      <option key={s} value={s}>{s === "pending_approval" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
                <button
                  onClick={handleBulkStatus}
                  className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-900 text-[11px] font-bold rounded-lg transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-stone-500 hover:text-stone-200 text-xs px-1.5"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── Data Table ───────────────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="animate-pulse h-[68px] bg-white border border-stone-100 rounded-xl"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 bg-white border border-stone-200 rounded-2xl">
              <div className="w-14 h-14 bg-stone-50 border border-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package size={24} className="text-stone-300" />
              </div>
              <p className="text-stone-500 text-sm font-medium">No products found</p>
              <p className="text-stone-400 text-xs mt-1">Try switching the filter or adding a new product.</p>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="px-4 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="accent-stone-900 cursor-pointer h-3.5 w-3.5 rounded"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] tracking-widest uppercase text-stone-400 font-semibold whitespace-nowrap">Product</th>
                      <th className="text-left px-4 py-3 text-[10px] tracking-widest uppercase text-stone-400 font-semibold whitespace-nowrap">Category</th>
                      <th className="text-left px-4 py-3 text-[10px] tracking-widest uppercase text-stone-400 font-semibold whitespace-nowrap">Price</th>
                      <th className="text-left px-4 py-3 text-[10px] tracking-widest uppercase text-stone-400 font-semibold whitespace-nowrap">Status</th>
                      {isAdmin && (
                        <th className="text-center px-4 py-3 text-[10px] tracking-widest uppercase text-stone-400 font-semibold whitespace-nowrap">Featured</th>
                      )}
                      <th className="text-right px-4 py-3 text-[10px] tracking-widest uppercase text-stone-400 font-semibold whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {products.map((p) => {
                      const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                      const img = p.images?.[0]?.url || p.image || "";
                      const isLoading = actionLoading === p._id;
                      const isRowSelected = selected.has(p._id);

                      return (
                        <tr
                          key={p._id}
                          className={`group transition-colors ${isRowSelected ? "bg-stone-50" : "hover:bg-stone-50/60"}`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleSelect(p._id)}
                              className="accent-stone-900 cursor-pointer h-3.5 w-3.5"
                            />
                          </td>

                          {/* Product Info */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {img ? (
                                <img
                                  src={img}
                                  alt={p.name}
                                  className="h-11 w-9 object-cover rounded-lg border border-stone-200/60 shrink-0 bg-stone-100"
                                />
                              ) : (
                                <div className="h-11 w-9 bg-stone-100 flex items-center justify-center text-stone-300 rounded-lg border border-stone-100 shrink-0">
                                  <Package size={13} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-stone-900 truncate max-w-[180px] leading-snug">{p.name}</p>
                                <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                                  {typeof p.seller === "object" && p.seller !== null
                                    ? (p.seller as any).name
                                    : "Unknown Seller"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-stone-500">{getCategoryLabel(p.category)}</span>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-semibold text-stone-900 tabular-nums">
                              ${p.basePrice !== undefined ? p.basePrice : p.price}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>

                          {/* Featured (admin only) */}
                          {isAdmin && (
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => handleFeature(p._id, p.name)}
                                disabled={isLoading}
                                title={p.isFeatured ? "Unfeature" : "Feature"}
                                className={`p-1.5 rounded-lg transition-all ${
                                  p.isFeatured
                                    ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                                    : "text-stone-300 hover:text-amber-400 hover:bg-amber-50"
                                }`}
                              >
                                <Star size={13} fill={p.isFeatured ? "currentColor" : "none"} />
                              </button>
                            </td>
                          )}

                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              {isAdmin && p.status === "pending_approval" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(p._id, p.name)}
                                    disabled={isLoading}
                                    title="Approve"
                                    className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                  <button
                                    onClick={() => setRejectModal({ id: p._id, name: p.name })}
                                    disabled={isLoading}
                                    title="Reject"
                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}

                              {!isAdmin && p.status === "draft" && (
                                <button
                                  onClick={() => handleSendForReview(p._id, p.name)}
                                  disabled={isLoading}
                                  title="Submit for Approval"
                                  className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <Send size={14} />
                                </button>
                              )}

                              {p.status === "archived" && (
                                <button
                                  onClick={() => handleRestore(p._id, p.name)}
                                  disabled={isLoading}
                                  title="Restore"
                                  className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}

                              <Link
                                href={`/seller/products/edit/${p._id}`}
                                title="Edit"
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                              >
                                <Edit2 size={14} />
                              </Link>

                              <Link
                                href={`/product/${p._id}`}
                                target="_blank"
                                title="View on Storefront"
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                              >
                                <Eye size={14} />
                              </Link>

                              <button
                                onClick={() => handleSoftDelete(p._id, p.name)}
                                disabled={isLoading}
                                title="Delete"
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                {isLoading ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer: count */}
              <div className="px-5 py-3 border-t border-stone-50 bg-stone-50/50">
                <p className="text-[10px] text-stone-400">
                  Showing <span className="font-semibold text-stone-600">{products.length}</span> product{products.length !== 1 ? "s" : ""}
                  {filterStatus !== "all" && <> with status <span className="font-semibold text-stone-600">{STATUS_CONFIG[filterStatus]?.label || filterStatus}</span></>}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Rejection Modal ───────────────────────────────────────────── */}
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
              onClick={() => setRejectModal(null)}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 border border-stone-200/60">
              {/* Icon header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Reject Submission</h3>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                    Provide a clear reason for rejecting <span className="font-medium text-stone-700">&ldquo;{rejectModal.name}&rdquo;</span>.
                    The seller will see this message.
                  </p>
                </div>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Describe why this product is being rejected…"
                rows={4}
                className="w-full border border-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/5 font-sans resize-none mb-4 transition-all"
                autoFocus
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setRejectModal(null); setRejectReason(""); }}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(rejectModal.id)}
                  disabled={!rejectReason.trim() || actionLoading === rejectModal.id}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                >
                  {actionLoading === rejectModal.id ? "Rejecting…" : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </SellerLayout>
    </>
  );
}