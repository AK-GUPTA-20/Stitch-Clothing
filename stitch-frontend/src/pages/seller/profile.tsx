'use client';
import React, { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useGetMe,
  useUpdateBusinessInfo,
  useUpdateStoreInfo,
  useUpdateShippingSettings,
  useRegisterSeller,
} from '@/lib/hooks/useSeller';
import {
  businessInfoSchema,
  storeInfoSchema,
  shippingSettingsSchema,
  BusinessInfo,
  StoreInfo,
  ShippingSettings,
} from '@/lib/schemas/seller';
import { useToast } from '@/lib/context/ToastContext';
import {
  Building2, Store, Truck, AlertCircle, CheckCircle2,
  RefreshCw, Info, Phone, MapPin, Globe,
} from 'lucide-react';

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls = (hasError?: boolean) =>
  `w-full border rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 transition-all bg-white ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10'
      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-900/5'
  }`;

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="flex items-center gap-1 mt-1.5 text-[11px] text-red-500">
      <AlertCircle size={10} />
      {message}
    </p>
  ) : null;

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-semibold mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const SectionCard = ({
  title, description, icon: Icon, children,
}: {
  title: string; description?: string; icon: React.ElementType; children: React.ReactNode;
}) => (
  <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center gap-3">
      <div className="w-8 h-8 bg-white border border-stone-200 rounded-xl flex items-center justify-center shrink-0">
        <Icon size={14} className="text-stone-500" />
      </div>
      <div>
        <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-600 font-bold">{title}</h3>
        {description && <p className="text-[10px] text-stone-400 mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </section>
);

const TABS = [
  { id: 'business', label: 'Business Info', icon: Building2 },
  { id: 'store', label: 'Store Info', icon: Store },
  { id: 'shipping', label: 'Shipping', icon: Truck },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfileSettingsPage() {
  const { data: response, isLoading } = useGetMe();
  const seller = (response as any)?.data || (response as any);
  const updateBusiness = useUpdateBusinessInfo();
  const updateStore = useUpdateStoreInfo();
  const updateShipping = useUpdateShippingSettings();
  const registerSeller = useRegisterSeller();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('business');
  const [savedTab, setSavedTab] = useState<string | null>(null);

  const businessForm = useForm<BusinessInfo>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      businessName: '',
      legalEntityName: '',
      taxId: '',
      phone: '',
      address: { street: '', city: '', state: '', postalCode: '', country: 'India' },
    },
  });

  const storeForm = useForm<StoreInfo>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: { storeName: '', description: '', logoUrl: '', coverUrl: '' },
  });

  const shippingForm = useForm<ShippingSettings>({
    resolver: zodResolver(shippingSettingsSchema),
    defaultValues: {
      shippingMethods: ['standard'],
      freeShippingThreshold: 0,
      defaultHandlingDays: 1,
      selfShipping: false,
    },
  });

  useEffect(() => {
    if (seller) {
      businessForm.reset({
        businessName: seller.businessName || '',
        legalEntityName: seller.legalEntityName || '',
        taxId: seller.taxId || '',
        phone: seller.phone || '',
        address: seller.address || { street: '', city: '', state: '', postalCode: '', country: 'India' },
      });
      storeForm.reset({
        storeName: seller.storeName || '',
        description: seller.description || '',
        logoUrl: seller.logoUrl || '',
        coverUrl: seller.coverUrl || '',
      });
      if (seller.shippingSettings) {
        shippingForm.reset({
          shippingMethods: seller.shippingSettings.shippingMethods || ['standard'],
          freeShippingThreshold: seller.shippingSettings.freeShippingThreshold ?? 0,
          defaultHandlingDays: seller.shippingSettings.defaultHandlingDays ?? 1,
          selfShipping: seller.shippingSettings.selfShipping ?? false,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller]);

  const showSaved = (tab: string) => {
    setSavedTab(tab);
    setTimeout(() => setSavedTab(null), 3000);
  };

  const onBusinessSubmit = (data: BusinessInfo) => {
    if (!seller || !seller._id) {
      registerSeller.mutate(data, {
        onSuccess: () => {
          toast.success('Profile Created', 'Your seller profile has been set up.');
          showSaved('business');
        },
        onError: (err: any) => toast.error('Registration Failed', err?.message || 'Failed to register seller profile.'),
      });
    } else {
      updateBusiness.mutate(data, {
        onSuccess: () => {
          toast.success('Business Info Updated', 'Your business details have been saved.');
          showSaved('business');
        },
        onError: (err: any) => toast.error('Save Failed', err?.message || 'Failed to update business info.'),
      });
    }
  };

  const onStoreSubmit = (data: StoreInfo) => {
    updateStore.mutate(data, {
      onSuccess: () => {
        toast.success('Store Info Updated', 'Your store details have been saved.');
        showSaved('store');
      },
      onError: (err: any) => toast.error('Save Failed', err?.message || 'Failed to update store info.'),
    });
  };

  const onShippingSubmit = (data: ShippingSettings) => {
    updateShipping.mutate(data, {
      onSuccess: () => {
        toast.success('Shipping Settings Saved', 'Your fulfillment preferences have been updated.');
        showSaved('shipping');
      },
      onError: (err: any) => toast.error('Save Failed', err?.message || 'Failed to update shipping settings.'),
    });
  };

  const isSaving = updateBusiness.isPending || updateStore.isPending || updateShipping.isPending || registerSeller.isPending;

  if (isLoading) {
    return (
      <SellerLayout title="Profile & Settings" backHref="/seller/dashboard">
        <div className="space-y-5 max-w-3xl">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-10 w-28 bg-stone-100 rounded-xl" />)}
          </div>
          <div className="animate-pulse h-80 bg-stone-100 rounded-2xl" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="Profile & Settings" description="Manage your business, store, and shipping details" backHref="/seller/dashboard">
      <div className="max-w-3xl space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon size={13} />
                {tab.label}
                {savedTab === tab.id && (
                  <CheckCircle2 size={11} className="text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Business Info Tab ──────────────────────────────────────────── */}
        {activeTab === 'business' && (
          <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-5">
            <SectionCard title="Business Information" description="Your legal business registration details" icon={Building2}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label required>Business Name</Label>
                    <input
                      {...businessForm.register('businessName')}
                      placeholder="Your business name"
                      className={inputCls(!!businessForm.formState.errors.businessName)}
                    />
                    <FieldError message={businessForm.formState.errors.businessName?.message} />
                  </div>
                  <div>
                    <Label required>Legal Entity Name</Label>
                    <input
                      {...businessForm.register('legalEntityName')}
                      placeholder="As registered with MCA / ROC"
                      className={inputCls(!!businessForm.formState.errors.legalEntityName)}
                    />
                    <FieldError message={businessForm.formState.errors.legalEntityName?.message} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label required>Tax ID / GST Number</Label>
                    <input
                      {...businessForm.register('taxId')}
                      placeholder="22AAAAA0000A1Z5"
                      className={inputCls(!!businessForm.formState.errors.taxId)}
                      style={{ textTransform: 'uppercase' }}
                    />
                    <FieldError message={businessForm.formState.errors.taxId?.message} />
                    <p className="flex items-center gap-1 mt-1 text-[10px] text-stone-400">
                      <Info size={9} /> 15-character GST number
                    </p>
                  </div>
                  <div>
                    <Label required>Business Phone</Label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        {...businessForm.register('phone')}
                        placeholder="+91 98765 43210"
                        className={inputCls(!!businessForm.formState.errors.phone) + ' pl-9'}
                      />
                    </div>
                    <FieldError message={businessForm.formState.errors.phone?.message} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Registered Address" description="Your official business address" icon={MapPin}>
              <div className="space-y-4">
                <div>
                  <Label required>Street Address</Label>
                  <input
                    {...businessForm.register('address.street')}
                    placeholder="Building no, Street name, Area"
                    className={inputCls(!!businessForm.formState.errors.address?.street)}
                  />
                  <FieldError message={businessForm.formState.errors.address?.street?.message} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>City</Label>
                    <input
                      {...businessForm.register('address.city')}
                      placeholder="City"
                      className={inputCls(!!businessForm.formState.errors.address?.city)}
                    />
                    <FieldError message={businessForm.formState.errors.address?.city?.message} />
                  </div>
                  <div>
                    <Label required>State</Label>
                    <input
                      {...businessForm.register('address.state')}
                      placeholder="State"
                      className={inputCls(!!businessForm.formState.errors.address?.state)}
                    />
                    <FieldError message={businessForm.formState.errors.address?.state?.message} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Postal Code</Label>
                    <input
                      {...businessForm.register('address.postalCode')}
                      placeholder="110001"
                      maxLength={6}
                      className={inputCls(!!businessForm.formState.errors.address?.postalCode)}
                    />
                    <FieldError message={businessForm.formState.errors.address?.postalCode?.message} />
                  </div>
                  <div>
                    <Label required>Country</Label>
                    <input
                      {...businessForm.register('address.country')}
                      placeholder="India"
                      className={inputCls(!!businessForm.formState.errors.address?.country)}
                    />
                    <FieldError message={businessForm.formState.errors.address?.country?.message} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-stone-400">
                {!seller?._id ? 'This will register your seller profile.' : 'Changes take effect immediately.'}
              </p>
              <button
                type="submit"
                disabled={isSaving || !businessForm.formState.isDirty}
                className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {(updateBusiness.isPending || registerSeller.isPending) ? (
                  <><RefreshCw size={12} className="animate-spin" />Saving…</>
                ) : savedTab === 'business' ? (
                  <><CheckCircle2 size={12} />Saved!</>
                ) : (
                  !seller?._id ? 'Register Business' : 'Save Business Info'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── Store Info Tab ─────────────────────────────────────────────── */}
        {activeTab === 'store' && (
          <form onSubmit={storeForm.handleSubmit(onStoreSubmit)} className="space-y-5">
            <SectionCard title="Store Information" description="How your store appears to customers" icon={Store}>
              <div className="space-y-4">
                <div>
                  <Label required>Store Name</Label>
                  <input
                    {...storeForm.register('storeName')}
                    placeholder="Your customer-facing store name"
                    className={inputCls(!!storeForm.formState.errors.storeName)}
                  />
                  <FieldError message={storeForm.formState.errors.storeName?.message} />
                  <p className="mt-1 text-[10px] text-stone-400">
                    {storeForm.watch('storeName')?.length || 0}/100 characters
                  </p>
                </div>
                <div>
                  <Label>Store Description</Label>
                  <textarea
                    {...storeForm.register('description')}
                    placeholder="Tell customers what makes your store special…"
                    rows={4}
                    className={inputCls(!!storeForm.formState.errors.description) + ' resize-none'}
                  />
                  <FieldError message={storeForm.formState.errors.description?.message} />
                  <p className="mt-1 text-[10px] text-stone-400">
                    {storeForm.watch('description')?.length || 0}/1000 characters
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Logo URL</Label>
                    <div className="relative">
                      <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        {...storeForm.register('logoUrl')}
                        placeholder="https://example.com/logo.png"
                        className={inputCls(!!storeForm.formState.errors.logoUrl) + ' pl-9'}
                      />
                    </div>
                    <FieldError message={storeForm.formState.errors.logoUrl?.message} />
                  </div>
                  <div>
                    <Label>Cover Image URL</Label>
                    <div className="relative">
                      <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        {...storeForm.register('coverUrl')}
                        placeholder="https://example.com/cover.jpg"
                        className={inputCls(!!storeForm.formState.errors.coverUrl) + ' pl-9'}
                      />
                    </div>
                    <FieldError message={storeForm.formState.errors.coverUrl?.message} />
                  </div>
                </div>

                {/* Logo Preview */}
                {storeForm.watch('logoUrl') && (
                  <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <img
                      src={storeForm.watch('logoUrl')}
                      alt="Logo preview"
                      className="w-12 h-12 object-cover rounded-lg border border-stone-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <p className="text-[11px] text-stone-500">Logo preview</p>
                  </div>
                )}
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateStore.isPending || !storeForm.formState.isDirty}
                className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {updateStore.isPending ? (
                  <><RefreshCw size={12} className="animate-spin" />Saving…</>
                ) : savedTab === 'store' ? (
                  <><CheckCircle2 size={12} />Saved!</>
                ) : (
                  'Save Store Info'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── Shipping Tab ───────────────────────────────────────────────── */}
        {activeTab === 'shipping' && (
          <form onSubmit={shippingForm.handleSubmit(onShippingSubmit)} className="space-y-5">
            <SectionCard title="Shipping Settings" description="Configure your fulfillment and delivery options" icon={Truck}>
              <div className="space-y-5">
                {/* Shipping Methods */}
                <div>
                  <Label required>Shipping Methods</Label>
                  <FieldError message={shippingForm.formState.errors.shippingMethods?.message} />
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { value: 'standard', label: 'Standard Delivery', sub: '3-7 business days' },
                      { value: 'express', label: 'Express Delivery', sub: '1-3 business days' },
                      { value: 'same_day', label: 'Same Day Delivery', sub: 'Orders before 12 PM' },
                      { value: 'pickup', label: 'Store Pickup', sub: 'Customer collects in-store' },
                    ].map(method => {
                      const methods = shippingForm.watch('shippingMethods') || [];
                      const isChecked = methods.includes(method.value as any);
                      return (
                        <label
                          key={method.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = shippingForm.getValues('shippingMethods') || [];
                              if (e.target.checked) {
                                shippingForm.setValue('shippingMethods', [...current, method.value] as any, { shouldDirty: true });
                              } else {
                                shippingForm.setValue('shippingMethods', current.filter((m: string) => m !== method.value) as any, { shouldDirty: true });
                              }
                            }}
                            className="mt-0.5 accent-stone-900"
                          />
                          <div>
                            <p className="text-xs font-semibold text-stone-800">{method.label}</p>
                            <p className="text-[10px] text-stone-400">{method.sub}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Free Shipping Threshold ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        {...shippingForm.register('freeShippingThreshold', { valueAsNumber: true })}
                        placeholder="0 = never free"
                        className={inputCls() + ' pl-8'}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-stone-400">Set to 0 to disable free shipping</p>
                  </div>
                  <div>
                    <Label>Default Handling Days</Label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      {...shippingForm.register('defaultHandlingDays', { valueAsNumber: true })}
                      placeholder="e.g. 1"
                      className={inputCls()}
                    />
                    <p className="mt-1 text-[10px] text-stone-400">Days to prepare order before dispatch</p>
                  </div>
                </div>

                {/* Self Shipping */}
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Self-managed Shipping</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Handle shipping yourself instead of using our logistics partners</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={shippingForm.watch('selfShipping')}
                    onClick={() => shippingForm.setValue('selfShipping', !shippingForm.watch('selfShipping'), { shouldDirty: true })}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors ${
                      shippingForm.watch('selfShipping') ? 'bg-stone-900 border-stone-900' : 'bg-stone-200 border-stone-200'
                    }`}
                  >
                    <span className={`pointer-events-none block h-3.5 w-3.5 mt-0.5 rounded-full bg-white shadow-sm transition-transform ${
                      shippingForm.watch('selfShipping') ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateShipping.isPending || !shippingForm.formState.isDirty}
                className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {updateShipping.isPending ? (
                  <><RefreshCw size={12} className="animate-spin" />Saving…</>
                ) : savedTab === 'shipping' ? (
                  <><CheckCircle2 size={12} />Saved!</>
                ) : (
                  'Save Shipping Settings'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </SellerLayout>
  );
}
