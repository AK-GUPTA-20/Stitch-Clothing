'use client';
import React, { useEffect } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useGetMe,
  useUpdateBusinessInfo,
  useRegisterSeller,
  useGetWarehouses,
  useCreateWarehouse,
  useDeleteWarehouse,
} from '@/lib/hooks/useSeller';
import { businessInfoSchema, BusinessInfo } from '@/lib/schemas/seller';
import { useToast } from '@/lib/context/ToastContext';
import {
  Building2, MapPin, Phone, RefreshCw, CheckCircle2,
  AlertCircle, Warehouse as WarehouseIcon, Trash2, Clock
} from 'lucide-react';

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
  title, description, icon: Icon, children, action
}: {
  title: string; description?: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) => (
  <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white border border-stone-200 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={14} className="text-stone-500" />
        </div>
        <div>
          <h3 className="text-[10px] tracking-[0.25em] uppercase text-stone-600 font-bold">{title}</h3>
          {description && <p className="text-[10px] text-stone-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-6">{children}</div>
  </section>
);

export default function ProfileSettingsPage() {
  const { data: response, isLoading: profileLoading } = useGetMe();
  const seller = (response as any)?.data || (response as any);
  
  const { data: warehousesData, isLoading: warehousesLoading, refetch: refetchWarehouses } = useGetWarehouses();
  const warehouses: any[] = (warehousesData as any)?.warehouses ?? (warehousesData as any)?.data ?? (Array.isArray(warehousesData) ? warehousesData : []);

  const updateBusiness = useUpdateBusinessInfo();
  const registerSeller = useRegisterSeller();
  const createWarehouse = useCreateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const toast = useToast();

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

  const [warehouseForm, setWarehouseForm] = React.useState({
    name: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'India' }
  });

  useEffect(() => {
    if (seller) {
      // Backend stores businessAddress with "line1" but frontend form uses "street"
      const addr = seller.businessAddress || seller.address;
      businessForm.reset({
        businessName: seller.businessName || '',
        legalEntityName: seller.legalEntityName || '',
        taxId: seller.gstNumber || seller.panNumber || seller.taxId || '',
        phone: seller.businessPhone || seller.phone || '',
        address: addr
          ? {
              street: addr.line1 || addr.street || '',
              city: addr.city || '',
              state: addr.state || '',
              postalCode: addr.postalCode || '',
              country: addr.country || 'India',
            }
          : { street: '', city: '', state: '', postalCode: '', country: 'India' },
      });
    }
  }, [seller]);

  const onBusinessSubmit = (data: BusinessInfo) => {
    if (!seller || !seller._id) {
      registerSeller.mutate(data, {
        onSuccess: () => toast.success('Profile Created', 'Your seller profile has been set up.'),
        onError: (err: any) => toast.error('Registration Failed', err?.message || 'Failed to register seller profile.'),
      });
    } else {
      updateBusiness.mutate(data, {
        onSuccess: () => toast.success('Business Info Updated', 'Your business details have been saved.'),
        onError: (err: any) => toast.error('Save Failed', err?.message || 'Failed to update business info.'),
      });
    }
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseForm.name || !warehouseForm.address.street || !warehouseForm.address.city) {
      toast.error('Validation Error', 'Please fill required warehouse fields');
      return;
    }
    createWarehouse.mutate(warehouseForm as any, {
      onSuccess: () => {
        toast.success('Warehouse Created', 'New warehouse added successfully.');
        setWarehouseForm({ name: '', address: { street: '', city: '', state: '', postalCode: '', country: 'India' } });
        refetchWarehouses();
      },
      onError: (err: any) => toast.error('Error', err?.message || 'Failed to create warehouse.'),
    });
  };

  const handleDeleteWarehouse = (id: string) => {
    if (!confirm('Delete this warehouse?')) return;
    deleteWarehouse.mutate(id, {
      onSuccess: () => {
        toast.success('Warehouse Deleted');
        refetchWarehouses();
      },
    });
  };

  if (profileLoading || warehousesLoading) {
    return (
      <SellerLayout title="Profile & Settings" backHref="/seller/dashboard">
        <div className="space-y-5 max-w-3xl">
          <div className="animate-pulse h-80 bg-stone-100 rounded-2xl" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="Profile" description="Essential business and operational information" backHref="/seller/dashboard">
      <div className="max-w-3xl space-y-5">
        
        {seller && (
          <div className={`flex items-center justify-between px-6 py-4 rounded-2xl border ${
            seller.verificationStatus === 'approved' ? 'bg-emerald-50 border-emerald-200' :
            seller.verificationStatus === 'rejected' || seller.verificationStatus === 'suspended' ? 'bg-red-50 border-red-200' :
            seller.verificationStatus === 'under_review' || seller.verificationStatus === 'documents_received' ? 'bg-blue-50 border-blue-200' :
            'bg-amber-50 border-amber-200'
          }`}>
            <div>
              <p className="text-[10px] tracking-widest uppercase font-bold text-stone-500 mb-1">KYC Status</p>
              <div className="flex items-center gap-2">
                {seller.verificationStatus === 'approved' ? <CheckCircle2 className="text-emerald-500" size={18} /> :
                 seller.verificationStatus === 'rejected' || seller.verificationStatus === 'suspended' ? <AlertCircle className="text-red-500" size={18} /> :
                 <Clock className={seller.verificationStatus === 'under_review' || seller.verificationStatus === 'documents_received' ? "text-blue-500" : "text-amber-500"} size={18} />}
                <p className={`font-semibold capitalize ${
                  seller.verificationStatus === 'approved' ? 'text-emerald-700' :
                  seller.verificationStatus === 'rejected' || seller.verificationStatus === 'suspended' ? 'text-red-700' :
                  seller.verificationStatus === 'under_review' || seller.verificationStatus === 'documents_received' ? 'text-blue-700' :
                  'text-amber-700'
                }`}>
                  {seller.verificationStatus === 'not_submitted' ? 'Not Submitted' :
                   seller.verificationStatus === 'documents_received' ? 'Documents Received' :
                   seller.verificationStatus === 'under_review' ? 'Under Review' :
                   seller.verificationStatus === 'approved' ? 'Approved' :
                   seller.verificationStatus === 'rejected' ? 'Rejected' :
                   seller.verificationStatus === 'suspended' ? 'Suspended' :
                   (seller.verificationStatus || 'Unknown')}
                </p>
              </div>
            </div>
            {seller.verificationStatus !== 'approved' && (
              <a href="/seller/kyc" className="px-4 py-2 bg-white rounded-lg shadow-sm text-xs font-semibold text-stone-700 hover:bg-stone-50 border border-stone-200">
                Manage Documents
              </a>
            )}
          </div>
        )}

        <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-5">
          <SectionCard title="Business Information" description="Your core business details" icon={Building2}
            action={
              <button
                type="submit"
                disabled={updateBusiness.isPending || registerSeller.isPending || (!!seller?._id && !businessForm.formState.isDirty)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-[10px] tracking-wider uppercase font-bold rounded-lg transition-all disabled:opacity-50"
              >
                {(updateBusiness.isPending || registerSeller.isPending) ? 'Saving...' : seller?._id ? 'Save Info' : 'Create Profile'}
              </button>
            }>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Business Name</Label>
                  <input {...businessForm.register('businessName')} className={inputCls(!!businessForm.formState.errors.businessName)} />
                  <FieldError message={businessForm.formState.errors.businessName?.message} />
                </div>
                <div>
                  <Label required>GST/Tax ID</Label>
                  <input {...businessForm.register('taxId')} className={inputCls(!!businessForm.formState.errors.taxId)} />
                  <FieldError message={businessForm.formState.errors.taxId?.message} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Business Phone</Label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input {...businessForm.register('phone')} className={inputCls(!!businessForm.formState.errors.phone) + ' pl-9'} />
                  </div>
                  <FieldError message={businessForm.formState.errors.phone?.message} />
                </div>
              </div>
              <div className="pt-4 border-t border-stone-100">
                <Label required>Registered Business Address</Label>
                <div className="space-y-3 mt-3">
                  <input {...businessForm.register('address.street')} placeholder="Street Address" className={inputCls(!!businessForm.formState.errors.address?.street)} />
                  <div className="grid grid-cols-2 gap-3">
                    <input {...businessForm.register('address.city')} placeholder="City" className={inputCls()} />
                    <input {...businessForm.register('address.state')} placeholder="State" className={inputCls()} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input {...businessForm.register('address.postalCode')} placeholder="Postal Code" className={inputCls()} />
                    <input {...businessForm.register('address.country')} placeholder="Country" className={inputCls()} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </form>

        {seller && (
          <SectionCard title="Warehouse Details" description="Your fulfillment locations" icon={WarehouseIcon}>
            {warehouses.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {warehouses.map((wh) => (
                  <div key={wh.id || wh._id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 relative">
                    <h4 className="text-sm font-semibold text-stone-800">{wh.name}</h4>
                    <p className="text-xs text-stone-500 mt-1">{wh.address?.street}, {wh.address?.city}</p>
                    <button type="button" onClick={() => handleDeleteWarehouse(wh.id || wh._id)} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 mb-6 italic">No warehouses added yet.</p>
            )}
            
            <form onSubmit={handleCreateWarehouse} className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <h4 className="text-[10px] tracking-widest uppercase font-bold text-stone-500 mb-3">Add Warehouse</h4>
              <div className="space-y-3">
                <input value={warehouseForm.name} onChange={e => setWarehouseForm(f => ({ ...f, name: e.target.value }))} placeholder="Warehouse Name" className={inputCls()} required />
                <input value={warehouseForm.address.street} onChange={e => setWarehouseForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} placeholder="Street Address" className={inputCls()} required />
                <div className="grid grid-cols-2 gap-3">
                  <input value={warehouseForm.address.city} onChange={e => setWarehouseForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} placeholder="City" className={inputCls()} required />
                  <input value={warehouseForm.address.postalCode} onChange={e => setWarehouseForm(f => ({ ...f, address: { ...f.address, postalCode: e.target.value } }))} placeholder="Postal Code" className={inputCls()} required />
                </div>
                <button type="submit" disabled={createWarehouse.isPending} className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50">
                  {createWarehouse.isPending ? 'Adding...' : 'Add Warehouse'}
                </button>
              </div>
            </form>
          </SectionCard>
        )}

      </div>
    </SellerLayout>
  );
}
