import React, { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useGetBankDetails, useUpdateBankDetails } from '@/lib/hooks/useSeller';
import { bankDetailsSchema, BankDetails } from '@/lib/schemas/seller';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/lib/context/ToastContext';
import {
  Shield,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Lock,
} from 'lucide-react';

const inputCls = (hasError?: boolean) =>
  `w-full border rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 transition-all bg-white ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10'
      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-900/5'
  }`;

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle size={10} />
      {message}
    </p>
  ) : null;

const FormLabel = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-semibold mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

export default function BankDetailsPage() {
  const { data: bank, isLoading, error, refetch } = useGetBankDetails();
  const updateBank = useUpdateBankDetails();
  const toast = useToast();
  const [showAccount, setShowAccount] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BankDetails>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      accountName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      bankName: '',
      branch: '',
      accountType: 'savings',
    },
  });

  useEffect(() => {
    if (bank) {
      const b = bank as any;
      reset({
        accountName: b.accountName ?? '',
        accountNumber: b.accountNumber ?? '',
        confirmAccountNumber: b.accountNumber ?? '',
        ifscCode: b.ifscCode ?? b.routingNumber ?? '',
        bankName: b.bankName ?? '',
        branch: b.branch ?? '',
        accountType: b.accountType ?? 'savings',
      });
    }
  }, [bank, reset]);

  const onSubmit = (data: BankDetails) => {
    setSaved(false);
    const { confirmAccountNumber, ...payload } = data;
    updateBank.mutate(payload, {
      onSuccess: () => {
        toast.success('Bank Details Saved', 'Your bank account information has been updated.');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
      onError: (err: any) => {
        toast.error('Save Failed', err?.message || 'Could not update bank details. Please try again.');
      },
    });
  };

  if (isLoading) {
    return (
      <SellerLayout title="Bank Details" description="Manage your payout bank account">
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-12 bg-stone-100 rounded-xl" />
          ))}
        </div>
      </SellerLayout>
    );
  }

  if (error && !bank) {
    return (
      <SellerLayout title="Bank Details" description="Manage your payout bank account">
        <div className="max-w-2xl flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-stone-700 mb-1">Could not load bank details</h3>
          <p className="text-xs text-stone-400 mb-4">Check your connection and try again.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 hover:border-stone-400 text-xs font-semibold text-stone-700 rounded-xl transition-colors"
          >
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout
      title="Bank Details"
      description="Your payout will be deposited to this account"
    >
      <div className="max-w-2xl space-y-5">
        {/* Security notice */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Secure &amp; Encrypted</p>
            <p className="text-[11px] text-blue-600 mt-0.5">
              Your bank details are stored securely. We use industry-standard encryption to
              protect your financial information.
            </p>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <p className="text-xs font-semibold text-emerald-800">
              Bank details saved successfully
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-900">Bank Account Information</h2>
          </div>

          {/* Account Name */}
          <div>
            <FormLabel required>Account Holder Name</FormLabel>
            <input
              {...register('accountName')}
              placeholder="Name as on bank account"
              className={inputCls(!!errors.accountName)}
            />
            <FieldError message={errors.accountName?.message} />
          </div>

          {/* Account Type */}
          <div>
            <FormLabel required>Account Type</FormLabel>
            <select
              {...register('accountType')}
              className={inputCls(!!errors.accountType)}
            >
              <option value="savings">Savings Account</option>
              <option value="current">Current Account</option>
              <option value="salary">Salary Account</option>
            </select>
            <FieldError message={errors.accountType?.message} />
          </div>

          {/* Account Number */}
          <div>
            <FormLabel required>Account Number</FormLabel>
            <div className="relative">
              <input
                {...register('accountNumber')}
                type={showAccount ? 'text' : 'password'}
                placeholder="Enter your account number"
                className={inputCls(!!errors.accountNumber) + ' pr-10'}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowAccount((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                aria-label={showAccount ? 'Hide account number' : 'Show account number'}
              >
                {showAccount ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <FieldError message={errors.accountNumber?.message} />
          </div>

          {/* Confirm Account Number */}
          <div>
            <FormLabel required>Confirm Account Number</FormLabel>
            <input
              {...register('confirmAccountNumber')}
              type="password"
              placeholder="Re-enter account number"
              className={inputCls(!!errors.confirmAccountNumber)}
              autoComplete="off"
              onPaste={(e) => e.preventDefault()}
            />
            {errors.confirmAccountNumber ? (
              <FieldError message={errors.confirmAccountNumber.message} />
            ) : (
              <p className="flex items-center gap-1 mt-1 text-[10px] text-stone-400">
                <Lock size={9} /> Paste is disabled for security
              </p>
            )}
          </div>

          {/* IFSC Code */}
          <div>
            <FormLabel required>IFSC Code</FormLabel>
            <input
              {...register('ifscCode', {
                setValueAs: (v: string) => v.toUpperCase(),
              })}
              placeholder="e.g. SBIN0001234"
              className={inputCls(!!errors.ifscCode)}
              style={{ textTransform: 'uppercase' }}
            />
            <FieldError message={errors.ifscCode?.message} />
            <p className="flex items-center gap-1 mt-1 text-[10px] text-stone-400">
              <Info size={9} /> Format: 4 letters + 0 + 6 alphanumeric (e.g. HDFC0001234)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel required>Bank Name</FormLabel>
              <input
                {...register('bankName')}
                placeholder="e.g. State Bank of India"
                className={inputCls(!!errors.bankName)}
              />
              <FieldError message={errors.bankName?.message} />
            </div>
            <div>
              <FormLabel>Branch</FormLabel>
              <input
                {...register('branch')}
                placeholder="Branch name or location"
                className={inputCls(!!errors.branch)}
              />
              <FieldError message={errors.branch?.message} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <p className="text-[10px] text-stone-400 flex items-center gap-1">
              <Lock size={9} /> Changes take effect on next payout cycle
            </p>
            <button
              type="submit"
              disabled={updateBank.isPending || !isDirty}
              className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateBank.isPending ? (
                <>
                  <RefreshCw size={12} className="animate-spin" /> Saving…
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={12} /> Saved!
                </>
              ) : (
                'Save Bank Details'
              )}
            </button>
          </div>
        </form>
      </div>
    </SellerLayout>
  );
}
