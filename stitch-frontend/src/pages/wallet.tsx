// src/pages/wallet.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/api/userService';
import Loading from '@/components/Loading';
import Footer from '@/components/Footer';
import { ArrowUpRight, ArrowDownLeft, Wallet, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

type Transaction = {
  _id?: string;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  createdAt: string;
  source?: string;
  balance?: number;
  balanceAfter?: number;
};

const PER_PAGE = 15;

export default function WalletPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWallet = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await userService.getWallet(p, PER_PAGE);
      setBalance(res.balance ?? 0);
      setTransactions((res.transactions as any) ?? []);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchWallet(page);
  }, [authLoading, user, page, fetchWallet, router]);

  if (authLoading) return <Loading />;
  if (!user) return null;

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <Head>
        <title>Wallet | STITCH</title>
      </Head>
      <div className="min-h-screen bg-stone-50 pt-header">
        {/* Page bar */}
        <div className="bg-white border-b border-stone-100">
          <div className="container-page">
            <div className="flex items-center gap-4 h-16">
              <Link href="/profile" className="text-stone-400 hover:text-stone-900 transition-colors">
                <ChevronLeft size={18} />
              </Link>
              <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans">Wallet</p>
            </div>
          </div>
        </div>

        <div className="container-page py-10 space-y-8">
          {/* Balance card */}
          <div className="relative overflow-hidden bg-stone-900 rounded-2xl p-8 text-white">
            <div className="absolute inset-0 opacity-10 wallet-pattern" />
            <div className="absolute top-6 right-6 opacity-10">
              <Wallet size={80} strokeWidth={0.8} />
            </div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans mb-3">Available Balance</p>
            <p className="font-display text-5xl font-light mb-2">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-stone-500 font-sans">{user.email}</p>
          </div>

          {/* Transactions */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl font-light text-stone-900">Transaction History</h2>
              <button
                onClick={() => fetchWallet(page)}
                className="text-stone-400 hover:text-stone-900 transition-colors p-2 hover:bg-stone-100 rounded-lg"
                aria-label="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 font-sans mb-4">{error}</div>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array(6).fill(null).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 animate-pulse flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-100" />
                      <div className="space-y-2">
                        <div className="h-3 bg-stone-100 rounded w-40" />
                        <div className="h-2.5 bg-stone-100 rounded w-24" />
                      </div>
                    </div>
                    <div className="h-4 bg-stone-100 rounded w-20" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-16 text-center">
                <Wallet size={32} strokeWidth={1.2} className="text-stone-300 mx-auto mb-4" />
                <p className="font-display text-2xl font-light text-stone-400 italic mb-2">No transactions yet</p>
                <p className="text-sm text-stone-400 font-sans">Your wallet activity will appear here.</p>
              </div>
            ) : (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-50">
                {transactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {tx.type === 'credit'
                          ? <ArrowDownLeft size={16} />
                          : <ArrowUpRight size={16} />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900 font-sans">{tx.description}</p>
                        <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {tx.source && (
                          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300 font-sans mt-1">{tx.source.replace(/_/g, ' ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold font-sans ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      {(tx.balanceAfter ?? tx.balance) !== undefined && (
                        <p className="text-[10px] text-stone-400 font-sans mt-0.5">Bal: ₹{(tx.balanceAfter ?? tx.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-stone-400 font-sans">
                  Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-sans text-stone-600 px-2">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
