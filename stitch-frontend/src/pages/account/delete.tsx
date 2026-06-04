// src/pages/account/delete.tsx
'use client';
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/api/userService';
import Loading from '@/components/Loading';
import { AlertTriangle, ChevronLeft, ShieldX, Undo2 } from 'lucide-react';

export default function AccountDeletePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'confirm' | 'done' | 'cancel-done'>('confirm');
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  if (authLoading) return <Loading />;
  if (!user) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await userService.requestAccountDeletion(reason || undefined);
      setScheduledAt(res.scheduledAt ?? null);
      setStep('done');
      // Log user out after scheduling deletion
      setTimeout(() => logout(), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule deletion');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setError('');
    try {
      await userService.cancelAccountDeletion();
      setStep('cancel-done');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel deletion');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Delete Account | STITCH</title>
      </Head>
      <div className="min-h-screen bg-stone-50 pt-header">
        <div className="bg-white border-b border-stone-100">
          <div className="container-page">
            <div className="flex items-center gap-4 h-16">
              <Link href="/profile" className="text-stone-400 hover:text-stone-900 transition-colors">
                <ChevronLeft size={18} />
              </Link>
              <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans">Account Deletion</p>
            </div>
          </div>
        </div>

        <div className="container-page py-12 max-w-lg mx-auto">
          {step === 'confirm' && (
            <div className="space-y-6">
              {/* Warning card */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800 font-sans">This action schedules account deletion</p>
                    <p className="text-xs text-red-600 font-sans">You have 30 days to cancel before permanent removal</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-red-700 font-sans">
                  {[
                    'All your personal data will be permanently deleted',
                    'Your wallet balance and loyalty points will be forfeited',
                    'You will be logged out of all devices immediately',
                    'This cannot be undone after the 30-day grace period',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl p-6">
                <h1 className="font-display text-2xl font-light text-stone-900 mb-1">Request Account Deletion</h1>
                <p className="text-sm text-stone-500 font-sans mb-6">Signed in as <strong>{user.email}</strong></p>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 font-sans mb-5">{error}</div>
                )}

                <form onSubmit={handleRequest} className="space-y-5">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase text-stone-500 font-sans font-medium mb-1.5">
                      Reason <span className="normal-case tracking-normal text-stone-400">(optional)</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      placeholder="Tell us why you're leaving (optional, helps us improve)..."
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Link
                      href="/profile"
                      className="flex-1 text-center py-3 border border-stone-200 text-stone-600 text-[11px] tracking-[0.15em] uppercase font-sans font-medium rounded-xl hover:border-stone-400 transition-colors"
                    >
                      Keep my account
                    </Link>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white text-[11px] tracking-[0.15em] uppercase font-sans font-medium rounded-xl hover:bg-red-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Scheduling…</>
                        : <><ShieldX size={13} />Schedule Deletion</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                <ShieldX size={28} className="text-red-500" />
              </div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans mb-2">Scheduled</p>
              <h2 className="font-display text-3xl font-light text-stone-900 mb-3">Deletion Scheduled</h2>
              <p className="text-sm text-stone-500 font-sans leading-relaxed mb-2">
                Your account is scheduled for deletion.
              </p>
              {scheduledAt && (
                <p className="text-sm font-medium text-stone-700 font-sans mb-6">
                  Deletion date:{' '}
                  <span className="text-red-600">
                    {new Date(scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </p>
              )}
              <p className="text-xs text-stone-400 font-sans mb-6">Logging you out in a moment…</p>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="inline-flex items-center gap-2 px-6 py-3 border border-stone-300 text-stone-700 text-[11px] tracking-[0.15em] uppercase font-sans font-medium rounded-xl hover:border-stone-900 hover:text-stone-900 transition-colors disabled:opacity-50"
              >
                <Undo2 size={13} />
                {cancelLoading ? 'Cancelling…' : 'Cancel Deletion'}
              </button>
            </div>
          )}

          {step === 'cancel-done' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <Undo2 size={28} className="text-green-600" />
              </div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans mb-2">Cancelled</p>
              <h2 className="font-display text-3xl font-light text-stone-900 mb-3">Deletion Cancelled</h2>
              <p className="text-sm text-stone-500 font-sans leading-relaxed mb-8">
                Your account is safe. The scheduled deletion has been cancelled.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 bg-stone-900 text-stone-50 px-8 py-3.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-stone-800 transition-colors rounded-xl"
              >
                Back to Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
