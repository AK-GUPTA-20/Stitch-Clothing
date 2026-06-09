// src/pages/admin/index.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/api/userService';
import { User } from '@/lib/types/user.types';
import Loading from '@/components/Loading';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Search, Users, Shield, Ban, Trash2, Edit3,
  ChevronLeft, ChevronRight, RefreshCw, X,
  Wallet, Star, CheckCircle2, AlertCircle,
  ArrowUpDown, SlidersHorizontal
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type AdminUser = User & {
  isSuspended?: boolean;
  addresses?: any[];
  wishlist?: any[];
};

type ModalType = 'edit' | 'suspend' | 'delete' | 'wallet' | 'loyalty' | null;

// ── Helpers ────────────────────────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  bronze: 'bg-[#cd7f32]/10 text-[#7a4a18]',
  silver: 'bg-stone-200/80 text-stone-600',
  gold: 'bg-accent/10 text-[#7a5e1a]',
  platinum: 'bg-stone-300/50 text-stone-700',
};

const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700',
  seller: 'bg-blue-50 text-blue-700',
  user: 'bg-stone-100 text-stone-600',
};

const PER_PAGE = 20;

// ── Reusable modal shell ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden animate-slide-in-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-900 font-sans">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors p-1" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans">{label}</p>
        <p className="font-display text-2xl font-light text-stone-900">{value}</p>
      </div>
    </div>
  );
}

function getUserDisplayName(user: AdminUser) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown user';
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { user: me, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [suspendedTotal, setSuspendedTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Form states for modals
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [suspendReason, setSuspendReason] = useState('');
  const [walletForm, setWalletForm] = useState({ amount: '', type: 'credit' as 'credit' | 'debit', description: '' });
  const [loyaltyForm, setLoyaltyForm] = useState({ points: '', type: 'earn' as 'earn' | 'redeem' | 'adjust', description: '' });

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (p: number, q: string, role: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (role) params.set('role', role);
      params.set('page', String(p));
      params.set('limit', String(PER_PAGE));
      const res = await userService.adminGetUsers(params.toString());
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
      setActiveTotal(res.activeTotal ?? 0);
      setSuspendedTotal(res.suspendedTotal ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !me) { router.push('/login'); return; }
    if (!authLoading && me && me.role !== 'admin') { router.push('/'); return; }
    if (me?.role === 'admin') fetchUsers(page, search, roleFilter);
  }, [authLoading, me, page, roleFilter, fetchUsers, router, search]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchUsers(1, val, roleFilter), 400);
  };

  const openModal = (u: AdminUser, type: ModalType) => {
    setSelectedUser(u);
    setModal(type);
    setActionError('');
    setActionSuccess('');
    if (type === 'edit') setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, phone: u.phone });
    if (type === 'wallet') setWalletForm({ amount: '', type: 'credit', description: '' });
    if (type === 'loyalty') setLoyaltyForm({ points: '', type: 'earn', description: '' });
    setSuspendReason('');
  };

  const closeModal = () => { setModal(null); setSelectedUser(null); setActionError(''); setActionSuccess(''); };

  const refreshUser = async (userId: string) => {
    try {
      const res = await userService.adminGetUser(userId);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, ...res.user } : u));
    } catch { /* silent */ }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true); setActionError('');
    try {
      await userService.adminUpdateUser(selectedUser._id, editForm);
      setActionSuccess('User updated successfully.');
      refreshUser(selectedUser._id);
      setTimeout(closeModal, 1200);
    } catch (err: any) {
      setActionError(err.message || 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true); setActionError('');
    try {
      await userService.adminDeleteUser(selectedUser._id);
      setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));
      setTotal((t) => t - 1);
      closeModal();
    } catch (err: any) {
      setActionError(err.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendToggle = async () => {
    if (!selectedUser) return;
    setActionLoading(true); setActionError('');
    try {
      if (selectedUser.isSuspended) {
        await userService.adminUnsuspendUser(selectedUser._id);
        setActionSuccess('User unsuspended.');
      } else {
        await userService.adminSuspendUser(selectedUser._id, suspendReason || undefined);
        setActionSuccess('User suspended.');
      }
      refreshUser(selectedUser._id);
      setTimeout(closeModal, 1200);
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true); setActionError('');
    try {
      await userService.adminUpdateWallet(selectedUser._id, {
        amount: Number(walletForm.amount),
        type: walletForm.type,
        description: walletForm.description,
      });
      setActionSuccess(`Wallet ${walletForm.type}ed $${walletForm.amount} successfully.`);
      refreshUser(selectedUser._id);
      setTimeout(closeModal, 1200);
    } catch (err: any) {
      setActionError(err.message || 'Wallet update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true); setActionError('');
    try {
      await userService.adminUpdateLoyalty(selectedUser._id, {
        points: Number(loyaltyForm.points),
        type: loyaltyForm.type,
        description: loyaltyForm.description,
      });
      setActionSuccess(`Loyalty points ${loyaltyForm.type}ed successfully.`);
      refreshUser(selectedUser._id);
      setTimeout(closeModal, 1200);
    } catch (err: any) {
      setActionError(err.message || 'Loyalty update failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading) return <Loading />;
  if (!me || me.role !== 'admin') return null;

  const totalPages = Math.ceil(total / PER_PAGE);

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  return (
    <AdminLayout title="Users & Dashboard">
      <Head>
        <title>Admin Dashboard | STITCH</title>
      </Head>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={total} icon={Users} color="bg-blue-50 text-blue-600" />
            <StatCard label="Active" value={activeTotal} icon={CheckCircle2} color="bg-green-50 text-green-600" />
            <StatCard label="Suspended" value={suspendedTotal} icon={Ban} color="bg-red-50 text-red-500" />
            <StatCard label="Shown" value={users.length} icon={SlidersHorizontal} color="bg-stone-100 text-stone-600" />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all"
              />
              {search && (
                <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900" aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-sans focus:outline-none focus:border-stone-400 transition-all"
            >
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => fetchUsers(page, search, roleFilter)}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 font-sans flex items-center gap-2">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    {['User', 'Role', 'Tier', 'Wallet', 'Points', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(6).fill(null).map((_, i) => (
                      <tr key={i} className="border-b border-stone-50">
                        {Array(7).fill(null).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-3 bg-stone-100 rounded animate-pulse" style={{ width: `${40 + (j * 10) % 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-stone-400 font-sans text-sm">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600 shrink-0">
                              {u.avatar
                                ? <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                : `${(u.name || u.firstName || '')[0] ?? ''}${(u.lastName || u.name?.split(' ')?.[1] || '')[0] ?? ''}`
                              }
                            </div>
                            <div>
                              <p className="text-xs font-medium text-stone-900 font-sans whitespace-nowrap">
                                {getUserDisplayName(u)}
                              </p>
                              <p className="text-[10px] text-stone-400 font-sans">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        {/* Role */}
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-sans font-medium uppercase tracking-widest px-2 py-0.5 rounded-md ${ROLE_COLOR[u.role] ?? 'bg-stone-100 text-stone-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        {/* Tier */}
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-md ${TIER_COLOR[u.loyaltyTier ?? ''] ?? ''}`}>
                            {u.loyaltyTier}
                          </span>
                        </td>
                        {/* Wallet */}
                        <td className="px-5 py-4 text-xs text-stone-700 font-sans whitespace-nowrap">
                          ${(u.walletBalance ?? 0).toLocaleString('en-IN')}
                        </td>
                        {/* Points */}
                        <td className="px-5 py-4 text-xs text-stone-700 font-sans">
                          {(u.loyaltyPoints ?? 0).toLocaleString('en-IN')}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-md ${
                            u.isSuspended ? 'bg-red-50 text-red-600' :
                            u.isActive ? 'bg-green-50 text-green-600' :
                            'bg-stone-100 text-stone-500'
                          }`}>
                            {u.isSuspended ? 'Suspended' : u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4">
                          {u._id !== me._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openModal(u, 'edit')}
                                title="Edit user"
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => openModal(u, 'wallet')}
                                title="Adjust wallet"
                                className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Wallet size={13} />
                              </button>
                              <button
                                onClick={() => openModal(u, 'loyalty')}
                                title="Adjust loyalty"
                                className="p-1.5 text-stone-400 hover:text-[#7a5e1a] hover:bg-accent/10 rounded-lg transition-all"
                              >
                                <Star size={13} />
                              </button>
                              <button
                                onClick={() => openModal(u, 'suspend')}
                                title={u.isSuspended ? 'Unsuspend user' : 'Suspend user'}
                                className={`p-1.5 rounded-lg transition-all ${
                                  u.isSuspended
                                    ? 'text-green-500 hover:bg-green-50'
                                    : 'text-stone-400 hover:text-orange-500 hover:bg-orange-50'
                                }`}
                              >
                                <Ban size={13} />
                              </button>
                              <button
                                onClick={() => openModal(u, 'delete')}
                                title="Delete user"
                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-sans italic tracking-wide">No actions for self</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-stone-100">
                <p className="text-xs text-stone-400 font-sans">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total} users
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Previous page"><ChevronLeft size={13} /></button>
                  <span className="text-xs font-sans text-stone-600 px-1">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Next page"><ChevronRight size={13} /></button>
                </div>
              </div>
            )}
          </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Edit User */}
      {modal === 'edit' && selectedUser && (
        <Modal title={`Edit — ${selectedUser.firstName} ${selectedUser.lastName}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input aria-label="First name" placeholder="First name" className={inputClass} value={editForm.firstName ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input aria-label="Last name" placeholder="Last name" className={inputClass} value={editForm.lastName ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input aria-label="Email address" placeholder="you@example.com" type="email" className={inputClass} value={editForm.email ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input aria-label="Phone number" placeholder="Optional" type="tel" className={inputClass} value={editForm.phone ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select aria-label="User role" className={inputClass} value={editForm.role ?? 'user'} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as User['role'] }))}>
                <option value="user">User</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {actionError && <p className="text-sm text-red-600 font-sans">{actionError}</p>}
            {actionSuccess && <p className="text-sm text-green-600 font-sans">{actionSuccess}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
                {actionLoading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Suspend / Unsuspend */}
      {modal === 'suspend' && selectedUser && (
        <Modal title={selectedUser.isSuspended ? 'Unsuspend User' : 'Suspend User'} onClose={closeModal}>
          <div className="space-y-4">
            <p className="text-sm text-stone-600 font-sans">
              {selectedUser.isSuspended
                ? `Restore access for ${selectedUser.firstName} ${selectedUser.lastName}?`
                : `Suspend ${selectedUser.firstName} ${selectedUser.lastName}'s account?`
              }
            </p>
            {!selectedUser.isSuspended && (
              <div>
                <label className={labelClass}>Reason <span className="normal-case tracking-normal text-stone-400">(optional)</span></label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all resize-none"
                  placeholder="Policy violation, spam, etc…"
                />
              </div>
            )}
            {actionError && <p className="text-sm text-red-600 font-sans">{actionError}</p>}
            {actionSuccess && <p className="text-sm text-green-600 font-sans">{actionSuccess}</p>}
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button onClick={handleSuspendToggle} disabled={actionLoading} className={`flex-1 py-2.5 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg transition-colors disabled:opacity-50 ${selectedUser.isSuspended ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                {actionLoading ? 'Processing…' : selectedUser.isSuspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete */}
      {modal === 'delete' && selectedUser && (
        <Modal title="Delete User" onClose={closeModal}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm text-red-700 font-sans">
                Permanently delete <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email})? This cannot be undone.
              </p>
            </div>
            {actionError && <p className="text-sm text-red-600 font-sans">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-2.5 bg-red-600 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {actionLoading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Wallet adjust */}
      {modal === 'wallet' && selectedUser && (
        <Modal title={`Wallet — ${selectedUser.firstName} ${selectedUser.lastName}`} onClose={closeModal}>
          <form onSubmit={handleWallet} className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">Current balance: <strong>${(selectedUser.walletBalance ?? 0).toLocaleString('en-IN')}</strong></p>
            <div>
              <label className={labelClass}>Operation</label>
              <div className="flex gap-2">
                {(['credit', 'debit'] as const).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setWalletForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 text-[11px] tracking-widest uppercase font-sans font-medium rounded-lg border transition-colors ${walletForm.type === t ? (t === 'credit' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500') : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Amount (₹)</label>
              <input type="number" min="1" step="0.01" required value={walletForm.amount} onChange={(e) => setWalletForm((f) => ({ ...f, amount: e.target.value }))} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input type="text" required value={walletForm.description} onChange={(e) => setWalletForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} placeholder="Reason for adjustment…" />
            </div>
            {actionError && <p className="text-sm text-red-600 font-sans">{actionError}</p>}
            {actionSuccess && <p className="text-sm text-green-600 font-sans">{actionSuccess}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
                {actionLoading ? 'Updating…' : 'Apply'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Loyalty adjust */}
      {modal === 'loyalty' && selectedUser && (
        <Modal title={`Loyalty — ${selectedUser.firstName} ${selectedUser.lastName}`} onClose={closeModal}>
          <form onSubmit={handleLoyalty} className="space-y-4">
            <p className="text-xs text-stone-500 font-sans">Current points: <strong>{(selectedUser.loyaltyPoints ?? 0).toLocaleString('en-IN')}</strong></p>
            <div>
              <label className={labelClass}>Operation</label>
              <div className="flex gap-2">
                {(['earn', 'redeem', 'adjust'] as const).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setLoyaltyForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg border transition-colors ${loyaltyForm.type === t ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Points</label>
              <input type="number" min="1" required value={loyaltyForm.points} onChange={(e) => setLoyaltyForm((f) => ({ ...f, points: e.target.value }))} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input type="text" required value={loyaltyForm.description} onChange={(e) => setLoyaltyForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} placeholder="Reason for adjustment…" />
            </div>
            {actionError && <p className="text-sm text-red-600 font-sans">{actionError}</p>}
            {actionSuccess && <p className="text-sm text-green-600 font-sans">{actionSuccess}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-lg hover:border-stone-400 transition-colors">Cancel</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
                {actionLoading ? 'Updating…' : 'Apply'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      </div>
    </AdminLayout>
  );
}
