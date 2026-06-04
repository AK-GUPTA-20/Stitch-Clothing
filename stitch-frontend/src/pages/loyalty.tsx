// src/pages/loyalty.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/api/userService';
import Loading from '@/components/Loading';
import Footer from '@/components/Footer';
import { Star, Gift, TrendingUp, ChevronLeft, ChevronRight, Award } from 'lucide-react';

type LoyaltyEntry = {
  _id?: string;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  points: number;
  description?: string;
  createdAt?: string;
  balanceAfter?: number;
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; next: number; icon: string }> = {
  bronze:   { label: '🥉 Bronze',   color: 'text-[#7a4a18]',  bg: 'bg-[#cd7f32]/10', next: 1000,  icon: '🥉' },
  silver:   { label: '🥈 Silver',   color: 'text-stone-600',  bg: 'bg-stone-200/70', next: 5000,  icon: '🥈' },
  gold:     { label: '🥇 Gold',     color: 'text-[#7a5e1a]',  bg: 'bg-accent/10',    next: 10000, icon: '🥇' },
  platinum: { label: '💎 Platinum', color: 'text-stone-700',  bg: 'bg-stone-300/40', next: Infinity, icon: '💎' },
};

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

const PER_PAGE = 15;

export default function LoyaltyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState('bronze');
  const [history, setHistory] = useState<LoyaltyEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLoyalty = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await userService.getLoyalty(p, PER_PAGE);
      setPoints(res.points ?? 0);
      setTier(res.tier ?? 'bronze');
      setHistory(res.history ?? []);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchLoyalty(page);
  }, [authLoading, user, page, fetchLoyalty, router]);

  if (authLoading) return <Loading />;
  if (!user) return null;

  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze;
  const nextTierPoints = cfg.next;
  const progress = nextTierPoints === Infinity ? 100 : Math.min(100, (points / nextTierPoints) * 100);
  const nextTierIdx = TIER_ORDER.indexOf(tier) + 1;
  const nextTier = TIER_ORDER[nextTierIdx];
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <Head>
        <title>Loyalty Rewards | STITCH</title>
      </Head>
      <div className="min-h-screen bg-stone-50 pt-header">
        {/* Top bar */}
        <div className="bg-white border-b border-stone-100">
          <div className="container-page">
            <div className="flex items-center gap-4 h-16">
              <Link href="/profile" className="text-stone-400 hover:text-stone-900 transition-colors">
                <ChevronLeft size={18} />
              </Link>
              <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans">Loyalty Rewards</p>
            </div>
          </div>
        </div>

        <div className="container-page py-10 space-y-8">
          {/* Points hero */}
          <div className="relative overflow-hidden bg-stone-900 rounded-2xl p-8 text-white">
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 36px)' }} />
            <div className="absolute right-6 top-6 opacity-10">
              <Star size={90} strokeWidth={0.6} />
            </div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans mb-3">Your Points</p>
            <p className="font-display text-6xl font-light mb-1">{points.toLocaleString('en-IN')}</p>
            <p className="text-sm text-stone-400 font-sans mb-6">Stitch Points</p>

            {/* Tier badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-sans font-medium px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>

          {/* Tier progress */}
          {tier !== 'platinum' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-sans mb-0.5">Progress to next tier</p>
                  <p className="text-sm font-medium text-stone-900 font-sans">
                    {points.toLocaleString('en-IN')} / {nextTierPoints.toLocaleString('en-IN')} pts to{' '}
                    <span className="capitalize">{nextTier}</span>
                  </p>
                </div>
                <Award size={20} className="text-stone-300" />
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-400 font-sans mt-2">
                {Math.max(0, nextTierPoints - points).toLocaleString('en-IN')} more points needed
              </p>
            </div>
          )}

          {/* How to earn */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-sans mb-4">How to Earn</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: TrendingUp, label: 'Make a purchase',  sub: 'Earn 1 pt per ₹10 spent' },
                { icon: Gift,       label: 'Refer a friend',   sub: 'Earn 200 pts per referral' },
                { icon: Star,       label: 'Write a review',   sub: 'Earn 50 pts per review' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3 bg-stone-50 rounded-xl p-4">
                  <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-900 font-sans">{label}</p>
                    <p className="text-[11px] text-stone-400 font-sans mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div>
            <h2 className="font-display text-2xl font-light text-stone-900 mb-5">Points History</h2>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 font-sans mb-4">{error}</div>
            )}
            {loading ? (
              <div className="space-y-3">
                {Array(5).fill(null).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 animate-pulse flex justify-between">
                    <div className="space-y-2">
                      <div className="h-3 bg-stone-100 rounded w-48" />
                      <div className="h-2.5 bg-stone-100 rounded w-28" />
                    </div>
                    <div className="h-4 bg-stone-100 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-16 text-center">
                <Star size={32} strokeWidth={1.2} className="text-stone-300 mx-auto mb-4" />
                <p className="font-display text-2xl font-light text-stone-400 italic">No activity yet</p>
                <p className="text-sm text-stone-400 font-sans mt-2">Your points history will appear here.</p>
              </div>
            ) : (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-50">
                {history.map((entry) => {
                  const isEarn = entry.type === 'earn';
                  const isRedeem = entry.type === 'redeem';
                  return (
                    <div key={entry._id} className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm ${
                          isEarn ? 'bg-green-50 text-green-600' : isRedeem ? 'bg-red-50 text-red-500' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {isEarn ? '▲' : isRedeem ? '▼' : '~'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900 font-sans">{entry.description}</p>
                          <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                            {new Date(entry.createdAt || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {entry.balanceAfter !== undefined && ` · Balance: ${entry.balanceAfter.toLocaleString('en-IN')} pts`}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold font-sans shrink-0 ${isEarn ? 'text-green-600' : isRedeem ? 'text-red-500' : 'text-stone-600'}`}>
                        {isEarn ? '+' : isRedeem ? '−' : ''}{Math.abs(entry.points).toLocaleString('en-IN')} pts
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-stone-400 font-sans">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-sans text-stone-600 px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
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
