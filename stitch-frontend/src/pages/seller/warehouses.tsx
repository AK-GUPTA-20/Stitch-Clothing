import React, { useState } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import {
  useGetWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  useSetDefaultWarehouse,
} from '@/lib/hooks/useSeller';
import { useToast } from '@/lib/context/ToastContext';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  MapPin,
  Phone,
  X,
  RefreshCw,
  AlertCircle,
  Star,
} from 'lucide-react';

type WarehouseForm = {
  name: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
};

const emptyForm: WarehouseForm = {
  name: '',
  contactPhone: '',
  address: { street: '', city: '', state: '', postalCode: '', country: 'India' },
};

const inputCls =
  'w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/5 transition-all bg-white';

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

const FieldErr = ({ msg }: { msg?: string }) =>
  msg ? (
    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
      <AlertCircle size={10} />
      {msg}
    </p>
  ) : null;

function WarehouseFormModal({
  initial,
  onClose,
  onSubmit,
  loading,
  title,
}: {
  initial: WarehouseForm;
  onClose: () => void;
  onSubmit: (data: WarehouseForm) => void;
  loading: boolean;
  title: string;
}) {
  const [form, setForm] = useState<WarehouseForm>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 2)
      errs.name = 'Name must be at least 2 characters';
    if (!form.address.street.trim()) errs.street = 'Street is required';
    if (!form.address.city.trim()) errs.city = 'City is required';
    if (!form.address.state.trim()) errs.state = 'State is required';
    if (!/^[1-9][0-9]{5}$/.test(form.address.postalCode))
      errs.postalCode = 'Enter a valid 6-digit postal code';
    if (!form.address.country.trim()) errs.country = 'Country is required';
    if (form.contactPhone && !/^(?:\+91|0)?[6-9]\d{9}$/.test(form.contactPhone))
      errs.phone = 'Enter a valid 10-digit Indian mobile number';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit(form);
  };

  const setAddr = (key: string, val: string) =>
    setForm((f) => ({ ...f, address: { ...f.address, [key]: val } }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <FormLabel required>Warehouse Name</FormLabel>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Delhi Main Warehouse"
              className={inputCls}
            />
            <FieldErr msg={errors.name} />
          </div>

          <div>
            <FormLabel>Contact Phone</FormLabel>
            <input
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              placeholder="+91 98765 43210"
              className={inputCls}
            />
            <FieldErr msg={errors.phone} />
          </div>

          <div className="border-t border-stone-100 pt-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-semibold mb-3">
              Warehouse Address
            </p>
          </div>

          <div>
            <FormLabel required>Street Address</FormLabel>
            <input
              value={form.address.street}
              onChange={(e) => setAddr('street', e.target.value)}
              placeholder="Building no, Street name"
              className={inputCls}
            />
            <FieldErr msg={errors.street} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel required>City</FormLabel>
              <input
                value={form.address.city}
                onChange={(e) => setAddr('city', e.target.value)}
                placeholder="City"
                className={inputCls}
              />
              <FieldErr msg={errors.city} />
            </div>
            <div>
              <FormLabel required>State</FormLabel>
              <input
                value={form.address.state}
                onChange={(e) => setAddr('state', e.target.value)}
                placeholder="State"
                className={inputCls}
              />
              <FieldErr msg={errors.state} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel required>Postal Code</FormLabel>
              <input
                value={form.address.postalCode}
                onChange={(e) => setAddr('postalCode', e.target.value)}
                placeholder="110001"
                className={inputCls}
                maxLength={6}
              />
              <FieldErr msg={errors.postalCode} />
            </div>
            <div>
              <FormLabel required>Country</FormLabel>
              <input
                value={form.address.country}
                onChange={(e) => setAddr('country', e.target.value)}
                placeholder="India"
                className={inputCls}
              />
              <FieldErr msg={errors.country} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-semibold rounded-xl hover:border-stone-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={12} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save Warehouse'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WarehousesPage() {
  const { data: warehousesData, isLoading, refetch } = useGetWarehouses();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const setDefault = useSetDefaultWarehouse();
  const toast = useToast();

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<WarehouseForm>(emptyForm);

  const warehouses: any[] =
    (warehousesData as any)?.warehouses ??
    (Array.isArray(warehousesData) ? warehousesData : []);

  const handleCreate = (data: WarehouseForm) => {
    createWarehouse.mutate(data as any, {
      onSuccess: () => {
        toast.success('Warehouse Created', 'New warehouse added successfully.');
        setModal(null);
      },
      onError: (err: any) =>
        toast.error('Error', err?.message || 'Failed to create warehouse.'),
    });
  };

  const handleEdit = (data: WarehouseForm) => {
    if (!editingId) return;
    updateWarehouse.mutate(
      { id: editingId, data: data as any },
      {
        onSuccess: () => {
          toast.success('Warehouse Updated', 'Warehouse details saved.');
          setModal(null);
          setEditingId(null);
        },
        onError: (err: any) =>
          toast.error('Error', err?.message || 'Failed to update warehouse.'),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete warehouse "${name}"? This cannot be undone.`)) return;
    deleteWarehouse.mutate(id, {
      onSuccess: () => toast.success('Warehouse Deleted', `"${name}" has been removed.`),
      onError: (err: any) =>
        toast.error('Error', err?.message || 'Failed to delete warehouse.'),
    });
  };

  const handleSetDefault = (id: string) => {
    setDefault.mutate(id, {
      onSuccess: () =>
        toast.success('Default Updated', 'This warehouse is now set as default.'),
      onError: (err: any) =>
        toast.error('Error', err?.message || 'Failed to set default.'),
    });
  };

  if (isLoading) {
    return (
      <SellerLayout
        title="Warehouses"
        description="Manage your inventory locations and shipping origins"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-40 bg-stone-100 rounded-2xl" />
          ))}
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout
      title="Warehouses"
      description="Manage your inventory locations and shipping origins"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''} configured
          </p>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Plus size={13} /> Add Warehouse
          </button>
        </div>

        {warehouses.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center mb-4">
              <WarehouseIcon size={24} className="text-stone-300" />
            </div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">No warehouses yet</h3>
            <p className="text-xs text-stone-400 max-w-sm">
              Add your first warehouse to start managing inventory locations.
            </p>
            <button
              onClick={() => setModal('create')}
              className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors"
            >
              + Add First Warehouse
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {warehouses.map((wh: any) => {
              const id = wh.id ?? wh._id;
              return (
                <div
                  key={id}
                  className={`bg-white border rounded-2xl p-5 space-y-3 relative ${
                    wh.isDefault ? 'border-stone-900 shadow-sm' : 'border-stone-200'
                  }`}
                >
                  {wh.isDefault && (
                    <span className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-stone-900 text-white px-2 py-0.5 rounded-full">
                      <Star size={8} fill="white" /> Default
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                      <WarehouseIcon size={18} className="text-stone-500" />
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <h3 className="text-sm font-semibold text-stone-900 truncate">
                        {wh.name}
                      </h3>
                      <div className="flex items-start gap-1 mt-1">
                        <MapPin size={10} className="text-stone-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                          {wh.address?.street}, {wh.address?.city}, {wh.address?.state}{' '}
                          {wh.address?.postalCode}
                        </p>
                      </div>
                      {wh.contactPhone && (
                        <div className="flex items-center gap-1 mt-1">
                          <Phone size={10} className="text-stone-400" />
                          <p className="text-[11px] text-stone-500">{wh.contactPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                    {!wh.isDefault && (
                      <button
                        onClick={() => handleSetDefault(id)}
                        disabled={setDefault.isPending}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 size={11} /> Set Default
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingId(id);
                        setEditInitial({
                          name: wh.name,
                          contactPhone: wh.contactPhone ?? '',
                          address: wh.address ?? emptyForm.address,
                        });
                        setModal('edit');
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(id, wh.name)}
                      disabled={deleteWarehouse.isPending || wh.isDefault}
                      className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      title={
                        wh.isDefault
                          ? 'Cannot delete the default warehouse'
                          : 'Delete warehouse'
                      }
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal === 'create' && (
        <WarehouseFormModal
          title="Add New Warehouse"
          initial={emptyForm}
          onClose={() => setModal(null)}
          onSubmit={handleCreate}
          loading={createWarehouse.isPending}
        />
      )}
      {modal === 'edit' && (
        <WarehouseFormModal
          title="Edit Warehouse"
          initial={editInitial}
          onClose={() => {
            setModal(null);
            setEditingId(null);
          }}
          onSubmit={handleEdit}
          loading={updateWarehouse.isPending}
        />
      )}
    </SellerLayout>
  );
}
