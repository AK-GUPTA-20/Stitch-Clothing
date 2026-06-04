'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { userService } from '@/lib/api/userService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/schemas/auth';
import { z } from 'zod';

const resetSchema = z.object({
  otp: z.string().length(6, 'Verification code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
type ResetFormData = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors }
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: '', newPassword: '' }
  });

  const onSendEmail = async (data: ForgotPasswordFormData) => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await userService.forgotPassword({ email: data.email });
      if (res.success || res.message) {
        setEmail(data.email);
        setSuccessMsg('Reset code sent to your email.');
        setStep(2);
      } else {
        setError('Failed to send reset email.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending the reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (data: ResetFormData) => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await userService.resetPassword({ email, otp: data.otp, newPassword: data.newPassword });
      if (res.success || res.message) {
        setSuccessMsg('Password has been successfully reset! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError('Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP or an error occurred during reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 bg-white border ${hasError ? 'border-red-300' : 'border-stone-200'} rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/[0.08] transition-all`;
  const labelClass = 'block text-[10px] tracking-[0.15em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-stone-50">

      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-stone-900">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 48px)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 30% 40%,rgba(180,140,90,0.18) 0%,transparent 70%)' }}
        />
        <div className="relative z-10 p-10">
          <span className="font-display text-2xl font-light tracking-[0.4em] text-stone-100 uppercase">Stitch</span>
        </div>
        <div className="relative z-10 mt-auto p-10 pb-14">
          <div className="w-8 h-px bg-accent mb-6" />
          <h2 className="font-display text-5xl font-light italic text-stone-100 leading-[1.15] mb-4">
            Regain<br />access.
          </h2>
          <p className="text-[10px] tracking-[0.22em] uppercase text-stone-500 font-sans">Secure your account</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center px-6 py-14 lg:py-10">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Mobile wordmark */}
          <div className="lg:hidden mb-8 text-center">
            <span className="font-display text-2xl font-light tracking-[0.4em] text-stone-900 uppercase">Stitch</span>
          </div>

          <h1 className="font-display text-4xl font-light text-stone-900 mb-2">
            {step === 1 ? "Reset password" : "Create new password"}
          </h1>
          <p className="text-sm text-stone-500 mb-8 font-sans">
            {step === 1 
              ? "Enter the email associated with your account and we'll send you a secure verification code."
              : `We've sent a code to ${email}. Enter it below along with your new password.`}
          </p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-6 text-sm text-red-700 font-sans">
              <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M8 5v3M8 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-6 text-sm text-emerald-800 font-sans">
              <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4.5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {successMsg}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleEmailSubmit(onSendEmail)} className="space-y-4">
              <div>
                <label htmlFor="email" className={labelClass}>Email address</label>
                <input
                  id="email" type="email" autoComplete="email"
                  placeholder="you@example.com"
                  {...registerEmail('email')}
                  className={inputClass(!!emailErrors.email)}
                />
                {emailErrors.email && <p className="text-[11px] text-red-500 mt-1">{emailErrors.email.message}</p>}
              </div>

              <button
                type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.2em] uppercase rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin" />Sending code…</>
                  : 'Send Reset Code'
                }
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit(onResetPassword)} className="space-y-4">
              <div>
                <label htmlFor="otp" className={labelClass}>Verification Code (OTP)</label>
                <input
                  id="otp" type="text" maxLength={6}
                  placeholder="e.g. 123456"
                  {...registerReset('otp')}
                  className={inputClass(!!resetErrors.otp)}
                />
                {resetErrors.otp && <p className="text-[11px] text-red-500 mt-1">{resetErrors.otp.message}</p>}
              </div>

              <div>
                <label htmlFor="newPassword" className={labelClass}>New Password</label>
                <div className="relative">
                  <input
                    id="newPassword" type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...registerReset('newPassword')}
                    className={`${inputClass(!!resetErrors.newPassword)} pr-11`}
                  />
                  <button
                    type="button" onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1"
                  >
                    {showPw
                      ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {resetErrors.newPassword && <p className="text-[11px] text-red-500 mt-1">{resetErrors.newPassword.message}</p>}
              </div>

              <button
                type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.2em] uppercase rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin" />Resetting Password…</>
                  : 'Reset Password'
                }
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link href="/login" className="text-[11px] text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors font-sans">
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
