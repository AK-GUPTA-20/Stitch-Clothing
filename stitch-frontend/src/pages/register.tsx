'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import Link from 'next/link';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from '@/lib/schemas/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { register: authRegister } = useAuth();

  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '' }
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await authRegister(data);
      if (res.success) {
        router.push('/verify-email');
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
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
          style={{ background: 'radial-gradient(ellipse 55% 50% at 70% 30%,rgba(200,169,110,0.12) 0%,transparent 70%)' }}
        />
        <div className="relative z-10 p-10">
          <span className="font-display text-2xl font-light tracking-[0.4em] text-stone-100 uppercase">Stitch</span>
        </div>
        <div className="relative z-10 mt-auto p-10 pb-14">
          <div className="w-8 h-px bg-accent mb-6" />
          <h2 className="font-display text-5xl font-light italic text-stone-100 leading-[1.15] mb-4">
            Dress the life<br />you want<br />to live.
          </h2>
          <p className="text-[10px] tracking-[0.22em] uppercase text-stone-500 font-sans">Curated Indian Fashion</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center px-6 py-14 lg:py-10">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Mobile wordmark */}
          <div className="lg:hidden mb-8 text-center">
            <span className="font-display text-2xl font-light tracking-[0.4em] text-stone-900 uppercase">Stitch</span>
          </div>

          <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans mb-2">Join us</p>
          <h1 className="font-display text-4xl font-light text-stone-900 mb-1">Create account</h1>
          <p className="text-sm text-stone-500 mb-8 font-sans">
            Already a member?{' '}
            <Link href="/login" className="text-stone-900 underline underline-offset-2 hover:text-stone-600 transition-colors">
              Sign in
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className={labelClass}>First name</label>
                <input id="firstName" type="text"
                  placeholder="Riya" {...register('firstName')}
                  className={inputClass(!!errors.firstName)} />
                {errors.firstName && <p className="text-[11px] text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>Last name</label>
                <input id="lastName" type="text"
                  placeholder="Sharma" {...register('lastName')}
                  className={inputClass(!!errors.lastName)} />
                {errors.lastName && <p className="text-[11px] text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email-address" className={labelClass}>Email address</label>
              <input id="email-address" type="email" autoComplete="email"
                placeholder="you@example.com" {...register('email')}
                className={inputClass(!!errors.email)} />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone <span className="normal-case tracking-normal text-stone-400 ml-1">optional</span>
              </label>
              <input id="phone" type="tel"
                placeholder="+91 98765 43210" {...register('phone')}
                className={inputClass(!!errors.phone)} />
              {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters" {...register('password')}
                  className={`${inputClass(!!errors.password)} pr-11`} />
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
              {errors.password ? (
                 <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>
              ) : (
                 <p className="mt-1.5 text-[11px] text-stone-400 font-sans">Use at least 8 characters</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
              <input id="confirmPassword" type={showPw ? 'text' : 'password'}
                placeholder="Confirm password" {...register('confirmPassword')}
                className={inputClass(!!errors.confirmPassword)} />
              {errors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.2em] uppercase rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading
                ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin" />Creating account…</>
                : 'Create account'
              }
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/verify-email" className="text-[11px] text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors font-sans">
              Already have an account but need to verify your email?
            </Link>
          </div>

          <p className="mt-5 text-center text-[11px] text-stone-400 font-sans leading-relaxed">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-stone-700 transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-stone-700 transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}