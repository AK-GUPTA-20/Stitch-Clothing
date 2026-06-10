'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import { useProfile } from '@/lib/context/ProfileContext';
import Link from 'next/link';
import { userService } from '@/lib/api/userService';
import Loading from '@/components/Loading';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, ChangePasswordFormData, profileSchema, measurementsSchema, ProfileFormData, MeasurementsFormData, addressSchema, AddressFormData } from '@/lib/schemas/user';
import { ConfirmationResult, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { PhoneInputForm } from '@/components/auth/PhoneInputForm';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/firebase/client';
import { toast } from 'sonner';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES (inferred from User model)
───────────────────────────────────────────────────────────────────────────── */
type Address = {
  _id?: string;
  label?: string;
  type?: 'shipping' | 'billing' | 'pickup' | 'both';
  recipientName?: string;
  phone?: string;
  alternatePhone?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstin?: string;
  isDefault?: boolean;
  isVerified?: boolean;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
};

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────────────────────────────────────── */
const inputClass = (hasError: boolean = false) =>
  `w-full px-4 py-2.5 bg-stone-50 border ${hasError ? 'border-red-300' : 'border-stone-200'} rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-900/[0.06] transition-all`;
const labelClass =
  'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

/* ─────────────────────────────────────────────────────────────────────────────
   TIER BADGE
───────────────────────────────────────────────────────────────────────────── */
const TIER_STYLES: Record<string, string> = {
  bronze:   'bg-[#cd7f32]/10 text-[#7a4a18]',
  silver:   'bg-stone-200/80 text-stone-600',
  gold:     'bg-accent/10 text-[#7a5e1a]',
  platinum: 'bg-stone-300/50 text-stone-700',
};
const TIER_LABELS: Record<string, string> = {
  bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold', platinum: '💎 Platinum',
};

/* ─────────────────────────────────────────────────────────────────────────────
   NAV TABS
───────────────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'edit',          label: 'Edit Profile' },
  { id: 'addresses',     label: 'Addresses' },
  { id: 'security',      label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION HEADING
───────────────────────────────────────────────────────────────────────────── */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-light text-stone-900">{title}</h2>
      {subtitle && <p className="text-sm text-stone-500 font-sans mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OVERVIEW TAB
───────────────────────────────────────────────────────────────────────────── */
function OverviewTab({ user }: { user: any }) {
  const tier = user?.loyaltyTier || 'bronze';

  const stats = [
    { label: 'Wallet Balance', value: `₹${(user?.walletBalance ?? 0).toLocaleString('en-IN')}` },
    { label: 'Loyalty Points', value: (user?.loyaltyPoints ?? 0).toLocaleString('en-IN') },
    { label: 'Referrals',      value: user?.referralCount ?? 0 },
    { label: 'Wishlist Items', value: user?.wishlist?.length ?? 0 },
  ];

  return (
    <div className="space-y-8">
      
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-stone-50 border border-stone-100 rounded-xl p-4">
            <p className="text-[10px] tracking-[0.12em] uppercase text-stone-400 font-sans mb-1">{s.label}</p>
            <p className="font-display text-2xl font-light text-stone-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Loyalty tier */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <p className="text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans mb-3">Loyalty tier</p>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-sans font-medium px-3 py-1 rounded-full ${TIER_STYLES[tier]}`}>
            {TIER_LABELS[tier]}
          </span>
          <div className="flex-1">
            {/* Progress to next tier */}
            {tier !== 'platinum' && (
              <div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, ((user?.loyaltyPoints ?? 0) / (
                        tier === 'bronze' ? 1000 : tier === 'silver' ? 5000 : 10000
                      )) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-stone-400 font-sans mt-1">
                  {(user?.loyaltyPoints ?? 0).toLocaleString('en-IN')} /{' '}
                  {tier === 'bronze' ? '1,000' : tier === 'silver' ? '5,000' : '10,000'} pts
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referral code */}
      {user?.referralCode && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans mb-3">Your referral code</p>
          <div className="flex items-center gap-3">
            <code className="font-mono text-lg font-medium tracking-[0.3em] text-stone-800 bg-stone-50 px-4 py-2 rounded-lg border border-stone-200">
              {user.referralCode}
            </code>
            <button
              onClick={() => navigator.clipboard?.writeText(user.referralCode)}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors font-sans"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Account status indicators */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <p className="text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans mb-4">Account status</p>
        <div className="space-y-3">
          {[
            { label: 'Email verified',  ok: user?.emailVerified  },
            { label: 'Phone verified',  ok: user?.phoneVerified  },
            { label: 'Account active',  ok: user?.isActive       },
            { label: '2FA enabled',     ok: user?.twoFactorEnabled },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-stone-600 font-sans">{item.label}</span>
              <span className={`text-[11px] font-medium font-sans px-2.5 py-0.5 rounded-full ${
                item.ok ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'
              }`}>
                {item.ok ? 'Yes' : 'No'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EDIT PROFILE TAB
───────────────────────────────────────────────────────────────────────────── */
function EditProfileTab({ user, updateUser }: { user: any; updateUser: (u: any) => void }) {
  const { register: regProf, handleSubmit: submitProf, formState: { errors: errProf }, watch: watchProf } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName:         user?.firstName         || '',
      lastName:          user?.lastName          || '',
      phone:             user?.phone             || '',
      gender:            user?.gender            || '',
      dob:               user?.dob ? user.dob.split('T')[0] : '',
      preferredLanguage: user?.preferredLanguage || 'en',
      preferredCurrency: user?.preferredCurrency || 'INR',
    }
  });

  const { register: regMeas, handleSubmit: submitMeas, formState: { errors: errMeas }, watch: watchMeas } = useForm<MeasurementsFormData>({
    resolver: zodResolver(measurementsSchema) as any,
    defaultValues: {
      height:   user?.bodyMeasurements?.height   || undefined,
      weight:   user?.bodyMeasurements?.weight   || undefined,
      chest:    user?.bodyMeasurements?.chest    || undefined,
      waist:    user?.bodyMeasurements?.waist    || undefined,
      hips:     user?.bodyMeasurements?.hips     || undefined,
      inseam:   user?.bodyMeasurements?.inseam   || undefined,
      shoulder: user?.bodyMeasurements?.shoulder || undefined,
      neck:     user?.bodyMeasurements?.neck     || undefined,
      sleeve:   user?.bodyMeasurements?.sleeve   || undefined,
      unit:     user?.bodyMeasurements?.unit     || 'cm',
    }
  });

  const [saving, setSaving]     = useState(false);
  const [savingM, setSavingM]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [savedM, setSavedM]     = useState(false);
  const [error, setError]       = useState('');
  const [phoneVerifySuccess, setPhoneVerifySuccess] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const handleVerifyClick = async () => {
    toast.info('Coming Soon', {
      description: 'Phone verification is currently disabled while we upgrade our systems.'
    });
  };


  const handleVerified = () => {
    setPhoneVerifySuccess(true);
    setConfirmationResult(null);
  };

  const handleSave = async (data: ProfileFormData) => {
    setSaving(true); setError('');
    try {
      const payload: any = { ...data };
      if (payload.gender === '') delete payload.gender;
      if (payload.phone === '') delete payload.phone;
      const res = await userService.updateProfile(payload);
      updateUser({ ...user, ...res.user });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeasurements = async (data: MeasurementsFormData) => {
    setSavingM(true);
    try {
      await userService.updateBodyMeasurements({
        ...data,
        height: data.height ? Number(data.height) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        chest: data.chest ? Number(data.chest) : undefined,
        waist: data.waist ? Number(data.waist) : undefined,
        hips: data.hips ? Number(data.hips) : undefined,
        inseam: data.inseam ? Number(data.inseam) : undefined,
        shoulder: data.shoulder ? Number(data.shoulder) : undefined,
        neck: data.neck ? Number(data.neck) : undefined,
        sleeve: data.sleeve ? Number(data.sleeve) : undefined,
      });
      setSavedM(true);
      setTimeout(() => setSavedM(false), 2500);
    } finally {
      setSavingM(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Profile info */}
      <form onSubmit={submitProf(handleSave)}>
        <SectionHeading title="Personal information" subtitle="Update your name, contact details and preferences." />

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-5 text-sm text-red-700 font-sans">
            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 5v3M8 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            {error}
          </div>
        )}

        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>First name</label>
              <input type="text" {...regProf('firstName')} className={inputClass(!!errProf.firstName)} />
              {errProf.firstName && <p className="text-[11px] text-red-500 mt-1">{errProf.firstName.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input type="text" {...regProf('lastName')} className={inputClass(!!errProf.lastName)} />
              {errProf.lastName && <p className="text-[11px] text-red-500 mt-1">{errProf.lastName.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Phone number</label>
            <div className="flex gap-2">
              <input type="tel" placeholder="+91 98765 43210" {...regProf('phone')} className={`${inputClass(!!errProf.phone)} flex-1`} />
              {watchProf('phone') && (
                <button type="button" onClick={handleVerifyClick} className="px-4 py-2 bg-stone-100 border border-stone-200 text-stone-700 text-[11px] uppercase tracking-wider font-medium rounded-lg hover:bg-stone-200 transition">
                  Verify
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-stone-400 font-sans">E.164 format — e.g. +919876543210</p>
            {errProf.phone && <p className="text-[11px] text-red-500 mt-1">{errProf.phone.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Gender</label>
              <select {...regProf('gender')} className={inputClass(!!errProf.gender)}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of birth</label>
              <input type="date" {...regProf('dob')} className={inputClass(!!errProf.dob)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Preferred language</label>
              <select {...regProf('preferredLanguage')} className={inputClass(!!errProf.preferredLanguage)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="bn">Bengali</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Preferred currency</label>
              <select {...regProf('preferredCurrency')} className={inputClass(!!errProf.preferredCurrency)}>
                <option value="INR">INR — ₹</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.18em] uppercase rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all disabled:opacity-50">
              {saving
                ? <><span className="w-3 h-3 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin"/>Saving…</>
                : 'Save changes'
              }
            </button>
            {saved && <span className="text-sm text-green-600 font-sans flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Saved
            </span>}
          </div>
        </div>
      </form>

      {/* Body measurements */}
        <form onSubmit={submitMeas(handleSaveMeasurements as any)} className="space-y-6">
        <SectionHeading title="Body measurements" subtitle="Used for personalised size recommendations." />
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-5">
            <label className="text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium">Unit</label>
            {['cm', 'in'].map((u) => (
              <label key={u} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value={u} {...regMeas('unit')} className="accent-stone-900" />
                <span className="text-sm text-stone-700 font-sans">{u}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { name: 'height', label: 'Height' },
              { name: 'weight', label: 'Weight (kg)' },
              { name: 'chest',  label: 'Chest' },
              { name: 'waist',  label: 'Waist' },
              { name: 'hips',   label: 'Hips' },
              { name: 'inseam', label: 'Inseam' },
              { name: 'shoulder', label: 'Shoulder' },
              { name: 'neck',   label: 'Neck' },
              { name: 'sleeve', label: 'Sleeve' },
            ].map((f) => (
              <div key={f.name}>
                <label className={labelClass}>{f.label}</label>
                <input type="number" min="0" step="0.1" placeholder="—" {...regMeas(f.name as keyof MeasurementsFormData)}
                  className={inputClass()} />
              </div>
            ))}
          </div>
          <div className="pt-5 flex items-center gap-4">
            <button type="submit" disabled={savingM}
              className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.18em] uppercase rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all disabled:opacity-50">
              {savingM ? <><span className="w-3 h-3 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin"/>Saving…</> : 'Save measurements'}
            </button>
            {savedM && <span className="text-sm text-green-600 font-sans flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Saved
            </span>}
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADDRESS TAB
───────────────────────────────────────────────────────────────────────────── */
const EMPTY_ADDRESS: Address = {
  label: '',
  type: 'shipping',
  recipientName: '',
  phone: '',
  alternatePhone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  district: '',
  state: '',
  country: 'IN',
  postalCode: '',
  gstin: '',
  isDefault: false,
};

function AddressesTab({ user }: { user: any }) {
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew]         = useState(false);
  const [saving, setSaving]       = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues: EMPTY_ADDRESS as any
  });

  const openNew  = () => { setIsEditing(true); setEditingId(null); setIsNew(true); reset(EMPTY_ADDRESS as any); };
  const openEdit = (a: Address) => { setIsEditing(true); setEditingId(a._id || null); setIsNew(false); reset(a as any); };
  const cancel   = () => { setIsEditing(false); setEditingId(null); setIsNew(false); };

  const handleSave = async (data: AddressFormData) => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await userService.addAddress({ ...data, postalCode: data.postalCode || '' } as any);
        setAddresses(res.addresses || []);
      } else if (editingId) {
        const res = await userService.updateAddress(editingId, { ...data, postalCode: data.postalCode || '' } as any);
        setAddresses(res.addresses || []);
      }
      cancel();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      const res = await userService.deleteAddress(id);
      setAddresses(res.addresses || []);
    } catch (err: any) {
      console.error('Failed to delete address:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <SectionHeading title="Saved addresses" />
        </div>
        {!isEditing && addresses.length < 10 && (
          <button onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.15em] uppercase rounded-lg hover:bg-stone-800 transition-all">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v10M3 8h10"/></svg>
            Add address
          </button>
        )}
      </div>

      {/* Address form */}
      {isEditing && (
        <form onSubmit={handleSubmit(handleSave as any)} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 animate-slide-in-up">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-sans font-medium mb-4">
            {isNew ? 'New address' : 'Edit address'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Label <span className="normal-case text-stone-400 tracking-normal">e.g. Home, Office</span></label>
              <input type="text" placeholder="Home" {...register('label')} className={inputClass(!!errors.label)} />
              {errors.label && <p className="text-[11px] text-red-500 mt-1">{errors.label.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Address type</label>
              <select {...register('type')} className={inputClass(!!errors.type)}>
                <option value="shipping">Shipping</option>
                <option value="billing">Billing</option>
                <option value="pickup">Pickup</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Recipient name</label>
              <input type="text" placeholder="Full name" {...register('recipientName')} className={inputClass(!!errors.recipientName)} />
              {errors.recipientName && <p className="text-[11px] text-red-500 mt-1">{errors.recipientName.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <select {...register('country')} className={inputClass(!!errors.country)}>
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="AE">UAE</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Address line 1</label>
            <input type="text" placeholder="12 MG Road" {...register('line1')} className={inputClass(!!errors.line1)} />
            {errors.line1 && <p className="text-[11px] text-red-500 mt-1">{errors.line1.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Address line 2</label>
            <input type="text" placeholder="Apartment, building, floor" {...register('line2')} className={inputClass(!!errors.line2)} />
            {errors.line2 && <p className="text-[11px] text-red-500 mt-1">{errors.line2.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input type="text" placeholder="Bengaluru" {...register('city')} className={inputClass(!!errors.city)} />
              {errors.city && <p className="text-[11px] text-red-500 mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input type="text" placeholder="Karnataka" {...register('state')} className={inputClass(!!errors.state)} />
              {errors.state && <p className="text-[11px] text-red-500 mt-1">{errors.state.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Postal code</label>
              <input type="text" placeholder="560034" {...register('postalCode')} className={inputClass(!!errors.postalCode)} />
              {errors.postalCode && <p className="text-[11px] text-red-500 mt-1">{errors.postalCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>District</label>
              <input type="text" placeholder="Bengaluru Urban" {...register('district')} className={inputClass(!!errors.district)} />
              {errors.district && <p className="text-[11px] text-red-500 mt-1">{errors.district.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Landmark</label>
              <input type="text" placeholder="Near metro station" {...register('landmark')} className={inputClass(!!errors.landmark)} />
              {errors.landmark && <p className="text-[11px] text-red-500 mt-1">{errors.landmark.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Primary phone</label>
              <input type="tel" placeholder="+919876543210" {...register('phone')} className={inputClass(!!errors.phone)} />
              {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Alternate phone</label>
              <input type="tel" placeholder="+919876543210" {...register('alternatePhone')} className={inputClass(!!errors.alternatePhone)} />
              {errors.alternatePhone && <p className="text-[11px] text-red-500 mt-1">{errors.alternatePhone.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>GSTIN</label>
            <input type="text" placeholder="22AAAAA0000A1Z5" {...register('gstin')} className={inputClass(!!errors.gstin)} />
            {errors.gstin && <p className="text-[11px] text-red-500 mt-1">{errors.gstin.message}</p>}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" {...register('isDefault')} className="rounded accent-stone-900 w-4 h-4" />
            <span className="text-sm text-stone-700 font-sans">Set as default address</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.18em] uppercase rounded-lg hover:bg-stone-800 transition-all disabled:opacity-50">
              {saving ? <><span className="w-3 h-3 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin"/>Saving…</> : 'Save address'}
            </button>
            <button type="button" onClick={cancel}
              className="px-5 py-2.5 text-[11px] font-sans font-medium tracking-[0.15em] uppercase text-stone-500 hover:text-stone-900 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address cards */}
      {addresses.length === 0 && !isEditing ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-xl p-10 text-center">
          <svg className="w-8 h-8 text-stone-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 21s-8-5.686-8-12a8 8 0 1 1 16 0c0 6.314-8 12-8 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <p className="text-sm text-stone-500 font-sans">No saved addresses yet</p>
          <button onClick={openNew} className="mt-3 text-[11px] text-stone-700 underline underline-offset-2 font-sans hover:text-stone-900 transition-colors">
            Add your first address
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {addresses.map((address) => (
            <div key={address._id}
              className="bg-white border border-stone-200 rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {address.label && (
                    <span className="text-[10px] tracking-[0.12em] uppercase font-sans font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      {address.label}
                    </span>
                  )}
                  {address.type && (
                    <span className="text-[10px] tracking-[0.12em] uppercase font-sans font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      {address.type}
                    </span>
                  )}
                  {address.isDefault && (
                    <span className="text-[10px] tracking-[0.12em] uppercase font-sans font-medium text-[#7a5e1a] bg-accent/10 px-2 py-0.5 rounded-md">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-800 font-sans font-medium mt-1.5">{address.recipientName || 'Recipient'}</p>
                <p className="text-sm text-stone-600 font-sans">{address.line1}</p>
                {address.line2 && <p className="text-sm text-stone-600 font-sans">{address.line2}</p>}
                <p className="text-sm text-stone-500 font-sans">
                  {[address.city, address.district, address.state, address.postalCode].filter(Boolean).join(', ')}
                </p>
                {address.country && (
                  <p className="text-xs text-stone-400 font-sans">{address.country}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(address)}
                  className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all"
                  aria-label="Edit address">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => handleDelete(address._id)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  aria-label="Delete address">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 13.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addresses.length >= 10 && (
        <p className="text-xs text-stone-400 font-sans text-center">Maximum 10 addresses reached.</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECURITY TAB
───────────────────────────────────────────────────────────────────────────── */
function SecurityTab({ user }: { user: any }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  });

  const handleSave = async (data: ChangePasswordFormData) => {
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await userService.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setSuccess('Password updated successfully.');
      reset();
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1">
      {show
        ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Change password */}
      <form onSubmit={handleSubmit(handleSave)}>
        <SectionHeading title="Change password" subtitle="Use a strong password you don't use elsewhere." />
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
          {error   && <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700 font-sans"><svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 5v3M8 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>{error}</div>}
          {success && <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-700 font-sans"><svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>{success}</div>}

          <div>
            <label className={labelClass}>Current password</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••" {...register('currentPassword')}
                className={`${inputClass(!!errors.currentPassword)} pr-11`} />
              <EyeBtn show={showCurrent} toggle={() => setShowCurrent(!showCurrent)} />
            </div>
            {errors.currentPassword && <p className="text-[11px] text-red-500 mt-1">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label className={labelClass}>New password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'}
                placeholder="Min. 8 characters" {...register('newPassword')}
                className={`${inputClass(!!errors.newPassword)} pr-11`} />
              <EyeBtn show={showNew} toggle={() => setShowNew(!showNew)} />
            </div>
            {errors.newPassword && <p className="text-[11px] text-red-500 mt-1">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Confirm new password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'}
                placeholder="Repeat new password" {...register('confirmPassword')}
                className={`${inputClass(!!errors.confirmPassword)} pr-11`} />
            </div>
            {errors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <div className="pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.18em] uppercase rounded-lg hover:bg-stone-800 transition-all disabled:opacity-50">
              {saving ? <><span className="w-3 h-3 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin"/>Saving…</> : 'Update password'}
            </button>
          </div>
        </div>
      </form>

      {/* Account danger zone */}
      <div>
        <SectionHeading title="Danger zone" subtitle="Permanent actions — proceed with caution." />
        <div className="bg-white border border-red-100 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-800 font-sans">Delete account</p>
              <p className="text-xs text-stone-500 font-sans mt-0.5">
                Schedule deletion with a 30-day grace period. You can cancel within that window.
              </p>
            </div>
            <Link href="/account/delete"
              className="shrink-0 px-4 py-2 text-[11px] font-sans font-medium tracking-[0.12em] uppercase text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all">
              Request deletion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATIONS TAB
───────────────────────────────────────────────────────────────────────────── */
const NOTIF_KEYS = [
  { key: 'orderUpdates',  label: 'Order updates',   desc: 'Shipping, delivery, and order status' },
  { key: 'promotions',    label: 'Promotions',       desc: 'Sales, discounts, and special offers' },
  { key: 'newArrivals',   label: 'New arrivals',     desc: 'New products and collections' },
  { key: 'priceDrops',    label: 'Price drops',      desc: 'Wishlist item price alerts' },
  { key: 'reviews',       label: 'Reviews',          desc: 'Reminders to review past purchases' },
  { key: 'wishlistAlert', label: 'Wishlist alerts',  desc: 'Low stock on saved items' },
  { key: 'loyalty',       label: 'Loyalty',          desc: 'Points earned, tier upgrades' },
  { key: 'returnUpdates', label: 'Return updates',   desc: 'Return and refund status' },
  { key: 'otp',           label: 'OTP / security',   desc: 'Verification codes — always on' },
] as const;
type NotifKey = (typeof NOTIF_KEYS)[number]['key'];

const DEFAULT_PREFS = Object.fromEntries(NOTIF_KEYS.map((k) => [k.key, true])) as Record<NotifKey, boolean>;

function NotificationsTab({ user }: { user: any }) {
  const [prefs, setPrefs] = useState<{ email: Record<string, boolean>; push: Record<string, boolean>; sms: Record<string, boolean> }>({
    email: { ...DEFAULT_PREFS, ...(user?.notificationPreferences?.email || {}) },
    push:  { ...DEFAULT_PREFS, ...(user?.notificationPreferences?.push  || {}) },
    sms:   { ...DEFAULT_PREFS, ...(user?.notificationPreferences?.sms   || {}) },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const toggle = (channel: 'email' | 'push' | 'sms', key: string) => {
    if (key === 'otp') return; // OTP is always on
    setPrefs((p) => ({ ...p, [channel]: { ...p[channel], [key]: !p[channel][key] } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userService.updateNotificationPreferences({ email: prefs.email, push: prefs.push, sms: prefs.sms });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const CHANNELS: Array<{ id: 'email' | 'push' | 'sms'; label: string }> = [
    { id: 'email', label: 'Email' },
    { id: 'push',  label: 'Push' },
    { id: 'sms',   label: 'SMS' },
  ];

  return (
    <div>
      <SectionHeading title="Notification preferences" subtitle="Choose what you hear about and how." />
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-0 border-b border-stone-100 px-5 py-3">
          <div />
          {CHANNELS.map((c) => (
            <div key={c.id} className="text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans text-center">{c.label}</div>
          ))}
        </div>

        {/* Rows */}
        {NOTIF_KEYS.map((n, i) => (
          <div key={n.key}
            className={`grid grid-cols-[1fr_80px_80px_80px] items-center px-5 py-3.5 ${i < NOTIF_KEYS.length - 1 ? 'border-b border-stone-50' : ''}`}>
            <div>
              <p className="text-sm text-stone-800 font-sans font-medium">{n.label}</p>
              <p className="text-xs text-stone-400 font-sans">{n.desc}</p>
            </div>
            {CHANNELS.map((c) => {
              const checked = prefs[c.id][n.key] ?? true;
              const locked  = n.key === 'otp';
              return (
                <div key={c.id} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggle(c.id, n.key)}
                    disabled={locked}
                    aria-label={`${checked ? 'Disable' : 'Enable'} ${n.label} via ${c.label}`}
                    className={`w-9 h-5 rounded-full transition-all duration-200 relative shrink-0 ${
                      checked ? 'bg-stone-900' : 'bg-stone-200'
                    } ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
                      checked ? 'left-[calc(100%-18px)]' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-stone-50 text-[11px] font-sans font-medium tracking-[0.18em] uppercase rounded-lg hover:bg-stone-800 transition-all disabled:opacity-50">
          {saving ? <><span className="w-3 h-3 rounded-full border-2 border-stone-50/30 border-t-stone-50 animate-spin"/>Saving…</> : 'Save preferences'}
        </button>
        {saved && <span className="text-sm text-green-600 font-sans flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Saved
        </span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateUser, isLoading } = useAuth();
  const [activeTab, setActiveTab]   = useState<TabId>('overview');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (router.isReady && router.query.tab) {
      const tab = router.query.tab as TabId;
      if (TABS.some(t => t.id === tab)) {
        setActiveTab(tab);
      }
    }
  }, [router.isReady, router.query.tab]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-4">
          <p className="font-display text-2xl font-light text-stone-400 italic">Not signed in</p>
          <Link href="/login" className="inline-block text-[11px] tracking-[0.2em] uppercase font-sans font-medium text-stone-900 underline underline-offset-2 hover:text-stone-600 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const tier      = user.loyaltyTier || 'bronze';

  return (
    <div className="min-h-screen bg-stone-50 pt-header">
      
      {/* ── Page header bar ── */}
      <div className="bg-white border-b border-stone-100">
        <div className="container-page">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-stone-400 hover:text-stone-900 transition-colors" title="Back to Home">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </Link>
              <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-sans">My account</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase text-stone-500 hover:text-stone-900 transition-colors font-sans disabled:opacity-50"
            >
              {loggingOut ? <span className="w-3 h-3 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin"/> : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              )}
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="container-page py-10">
        <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start">

          {/* ── Left sidebar ── */}
          <aside className="space-y-4 sticky top-[calc(var(--h-header)+1.5rem)]">

            {/* Avatar card */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full avatar-gradient flex items-center justify-center text-white font-display text-xl font-light select-none">
                {user.avatar
                  ? <img src={user.avatar} alt={user.firstName} className="w-full h-full rounded-full object-cover" />
                  : initials
                }
              </div>
              <div>
                <p className="font-display text-xl font-light text-stone-900">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-stone-400 font-sans mt-0.5">{user.email}</p>
              </div>
              <span className={`text-[10px] tracking-[0.1em] uppercase font-sans font-medium px-3 py-1 rounded-full ${TIER_STYLES[tier]}`}>
                {TIER_LABELS[tier]}
              </span>
            </div>

            {/* Nav */}
            <nav className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {TABS.map((tab, i) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-sans transition-colors ${
                    i < TABS.length - 1 ? 'border-b border-stone-50' : ''
                  } ${
                    activeTab === tab.id
                      ? 'bg-stone-900 text-stone-50'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m6 4 4 4-4 4"/>
                    </svg>
                  )}
                </button>
              ))}
            </nav>

            {/* Quick links */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {[
                { href: '/orders',    label: 'My orders' },
                { href: '/wishlist',  label: 'Wishlist' },
                { href: '/wallet',    label: 'Wallet' },
                { href: '/loyalty',   label: 'Loyalty rewards' },
              ].map((link, i, arr) => (
                <Link key={link.href} href={link.href}
                  className={`flex items-center justify-between px-4 py-3 text-sm font-sans text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors ${i < arr.length - 1 ? 'border-b border-stone-50' : ''}`}>
                  <span>{link.label}</span>
                  <svg className="w-3.5 h-3.5 text-stone-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 4 4 4-4 4"/></svg>
                </Link>
              ))}
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="min-w-0 animate-fade-up">
            {activeTab === 'overview'      && <OverviewTab      user={user} />}
            {activeTab === 'edit'          && <EditProfileTab   user={user} updateUser={updateUser} />}
            {activeTab === 'addresses'     && <AddressesTab     user={user} />}
            {activeTab === 'security'      && <SecurityTab      user={user} />}
            {activeTab === 'notifications' && <NotificationsTab user={user} />}
          </main>
        </div>
      </div>
    </div>
  );
}
