'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { userService } from '@/lib/api/userService';
import { useAuth } from '@/lib/context/AuthContext';
import OtpInput from '@/components/ui/OtpInput';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [token, setToken]         = useState('');
  const [error, setError]         = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const OTP_LENGTH = 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      if (!user || !user.email) {
        setError('User session not found. Please log in first.');
        setIsLoading(false);
        return;
      }
      const routeToken = typeof router.query.token === 'string' ? router.query.token : '';
      const res = routeToken
        ? await userService.verifyEmailByToken(routeToken)
        : await userService.verifyEmail({ email: user.email, otp: token });
      if (res.success) {
        setSuccessMsg(res.message || 'Email verified successfully!');
        if (user) updateUser({ ...user, emailVerified: true });
        setTimeout(() => router.push('/profile'), 2000);
      } else {
        setError(res.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccessMsg('');
    setIsResending(true);
    try {
      const res = await userService.sendEmailVerification();
      if (res.success) {
        setSuccessMsg(res.message || 'Verification email resent.');
      } else {
        setError(res.message || 'Failed to resend email');
      }
    } catch (err: any) {
      setError(err.message || 'Error resending verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6 py-16">
      <div className="w-full max-w-md animate-fade-up">

        {/* Wordmark */}
        <div className="text-center mb-10">
          <Link href="/" className="font-display text-2xl font-light tracking-[0.4em] text-stone-900 uppercase hover:text-stone-600 transition-colors">
            Stitch
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white border border-stone-200 rounded-2xl px-8 py-10">

          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 mx-auto mb-6">
            <svg className="w-6 h-6 text-stone-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>

          <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans text-center mb-1">One more step</p>
          <h1 className="font-display text-3xl font-light text-stone-900 text-center mb-3">Verify your email</h1>
          <p className="text-sm text-stone-500 text-center font-sans mb-8 leading-relaxed">
            We've sent a 6-digit code to{' '}
            {user?.email
              ? <span className="text-stone-700 font-medium">{user.email}</span>
              : 'your email address'
            }
            . Enter it below.
          </p>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-5 text-sm text-red-700 font-sans">
              <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M8 5v3M8 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 mb-5 text-sm text-green-700 font-sans">
              <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <OtpInput
                length={OTP_LENGTH}
                value={token}
                onChange={setToken}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || token.length < OTP_LENGTH}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.2em] uppercase rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin" />Verifying…</>
                : 'Verify email'
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-sans">or</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          <button
            type="button" onClick={handleResend} disabled={isResending}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-transparent border border-stone-200 text-stone-600 text-[11px] font-sans font-medium tracking-[0.15em] uppercase rounded-lg hover:border-stone-400 hover:text-stone-900 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending
              ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />Sending…</>
              : 'Resend code'
            }
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-stone-400 font-sans">
          <Link href="/login" className="underline underline-offset-2 hover:text-stone-700 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}