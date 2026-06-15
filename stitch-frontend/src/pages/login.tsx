'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import Link from 'next/link';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/schemas/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await login(data);
      if (res.success) {
        if (res.user && !res.user.emailVerified) {
          router.push('/verify-email');
        } else {
          const redirectTo = (router.query.redirect as string) || '/profile';
          router.push(redirectTo);
        }
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-stone-50">

      {/* ── Left decorative panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-stone-900">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 48px)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 55% at 35% 45%,rgba(200,169,110,0.14) 0%,transparent 70%)' }}
        />
        <div className="relative z-10 p-10">
          <span className="font-display text-2xl font-light tracking-[0.4em] text-stone-100 uppercase">Stitch</span>
        </div>
        <div className="relative z-10 mt-auto p-10 pb-14">
          <div className="w-8 h-px bg-accent mb-6" />
          <h2 className="font-display text-5xl font-light italic text-stone-100 leading-[1.15] mb-4">
            Style is a<br />way to say<br />who you are.
          </h2>
          <p className="text-[10px] tracking-[0.22em] uppercase text-stone-500 font-sans">Curated Indian Fashion</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center px-6 py-16 lg:py-0">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Mobile wordmark */}
          <div className="lg:hidden mb-10 text-center">
            <span className="font-display text-2xl font-light tracking-[0.4em] text-stone-900 uppercase">Stitch</span>
          </div>

          <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans mb-2">Welcome back</p>
          <h1 className="font-display text-4xl font-light text-stone-900 mb-1">Sign in</h1>
          <p className="text-sm text-stone-500 mb-8 font-sans">
            No account?{' '}
            <Link href="/register" className="text-stone-900 underline underline-offset-2 hover:text-stone-600 transition-colors">
              Create one
            </Link>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[10px] tracking-[0.15em] uppercase text-stone-500 font-sans font-medium">
                Email address
              </label>
              <input
                id="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`w-full px-4 py-3 bg-white border ${errors.email ? 'border-red-300' : 'border-stone-200'} rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/[0.08] transition-all`}
              />
              {errors.email && (
                <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[10px] tracking-[0.15em] uppercase text-stone-500 font-sans font-medium">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[11px] text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors font-sans">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPw ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="••••••••"
                  {...register('password')}
                  className={`w-full px-4 py-3 pr-11 bg-white border ${errors.password ? 'border-red-300' : 'border-stone-200'} rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/[0.08] transition-all`}
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
              {errors.password && (
                <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.2em] uppercase rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin" />Signing in…</>
                : 'Sign in'
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/verify-email" className="text-[11px] text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors font-sans">
              Need to verify your email?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}