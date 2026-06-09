import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Plus, Edit3, Trash2, CheckCircle, X } from 'lucide-react';

export default function TaxSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    gstEnabled: false,
    taxIncluded: false,
    defaultTaxRate: 0,
  });

  const [slabs, setSlabs] = useState<any[]>([]);
  const [showSlabModal, setShowSlabModal] = useState(false);
  const [editSlab, setEditSlab] = useState<any>(null);

  const fetchSettingsAndSlabs = async () => {
    try {
      setLoading(true);
      const res = await configService.getPlatformSettings();
      const settings = res.data;
      if (settings?.tax) {
        setForm({
          gstEnabled: settings.tax.gstEnabled || false,
          taxIncluded: settings.tax.taxIncluded || false,
          defaultTaxRate: settings.tax.defaultTaxRate || 0,
        });
        setSlabs(settings.tax.slabs || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndSlabs();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await configService.updateTaxSettings({
        ...form,
        defaultTaxRate: Number(form.defaultTaxRate),
      });
      setSuccess('Tax settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: editSlab.label || editSlab.name,
        rate: Number(editSlab.rate),
        isDefault: editSlab.isDefault,
        hsnCode: editSlab.hsnCode || '',
        minAmount: Number(editSlab.minAmount || 0),
        maxAmount: editSlab.maxAmount ? Number(editSlab.maxAmount) : undefined,
      };

      if (editSlab._id) {
        await configService.updateTaxSlab(editSlab._id, payload);
      } else {
        await configService.addTaxSlab(payload);
      }
      setShowSlabModal(false);
      setEditSlab(null);
      fetchSettingsAndSlabs();
    } catch (err: any) {
      setError(err.message || 'Failed to save tax slab');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlab = async (id: string) => {
    if(!window.confirm('Delete this tax slab?')) return;
    try {
      await configService.deleteTaxSlab(id);
      fetchSettingsAndSlabs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tax slab');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <SettingsLayout title="Tax"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="Tax">
      <Head>
        <title>Tax Settings | Admin | STITCH</title>
      </Head>

      <div className="space-y-8 max-w-5xl">
        <form onSubmit={handleSaveSettings} className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
              Global Tax Configuration
            </h2>
            <button 
              type="submit" 
              disabled={saving}
              className="px-4 py-2 bg-stone-900 text-white text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={form.gstEnabled}
                  onChange={e => setForm({...form, gstEnabled: e.target.checked})}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-stone-900 font-sans">GST Enabled</span>
                  <span className="text-[11px] text-stone-500">Collect GST details from sellers/customers</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={form.taxIncluded}
                  onChange={e => setForm({...form, taxIncluded: e.target.checked})}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-stone-900 font-sans">Prices Include Tax</span>
                  <span className="text-[11px] text-stone-500">Show prices inclusive of tax</span>
                </div>
              </label>
            </div>

            <div>
              <label className={labelClass}>Default Tax Rate (%)</label>
              <input type="number" step="0.1" min="0" className={inputClass} value={form.defaultTaxRate} onChange={e => setForm({...form, defaultTaxRate: Number(e.target.value)})} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
          {success && <p className="text-sm text-green-600 font-sans">{success}</p>}
        </form>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
              Tax Slabs
            </h2>
            <button 
              onClick={() => { setEditSlab({ label: '', rate: 0, isDefault: false, hsnCode: '', minAmount: 0, maxAmount: '' }); setShowSlabModal(true); }}
              className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={14} /> Add Slab
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {slabs.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-8">No tax slabs configured.</p>
            )}
            {slabs.map(slab => (
              <div key={slab._id} className={`p-5 border rounded-xl flex items-center justify-between ${slab.isDefault ? 'border-green-300 bg-green-50/30' : 'border-stone-200'}`}>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-stone-900">{slab.label || slab.name || 'Tax Slab'} - {slab.rate}%</h3>
                    {slab.isDefault && <span className="text-[9px] uppercase tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10} /> Default</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] text-stone-500 mt-1 uppercase tracking-wider font-mono">
                    {slab.hsnCode && <span>HSN: {slab.hsnCode}</span>}
                    {slab.minAmount > 0 && <span>Min: ${slab.minAmount}</span>}
                    {slab.maxAmount && <span>Max: ${slab.maxAmount}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditSlab({...slab}); setShowSlabModal(true); }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => handleDeleteSlab(slab._id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSlabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowSlabModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">
                {editSlab._id ? 'Edit Tax Slab' : 'Add Tax Slab'}
              </h3>
              <button onClick={() => setShowSlabModal(false)} className="text-stone-400 hover:text-stone-900">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveSlab} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Slab Name (Label)</label>
                <input type="text" required className={inputClass} value={editSlab.label || editSlab.name || ''} onChange={e => setEditSlab({...editSlab, label: e.target.value})} placeholder="e.g. Standard GST 18%" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>HSN Code</label>
                  <input type="text" className={inputClass} value={editSlab.hsnCode || ''} onChange={e => setEditSlab({...editSlab, hsnCode: e.target.value})} placeholder="e.g. 6109" />
                </div>
                <div>
                  <label className={labelClass}>Min Amount (₹)</label>
                  <input type="number" className={inputClass} value={editSlab.minAmount || 0} onChange={e => setEditSlab({...editSlab, minAmount: Number(e.target.value)})} min="0" />
                </div>
                <div>
                  <label className={labelClass}>Max Amount (₹)</label>
                  <input type="number" className={inputClass} value={editSlab.maxAmount || ''} onChange={e => setEditSlab({...editSlab, maxAmount: e.target.value})} min="0" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Tax Rate (%)</label>
                <input type="number" step="0.1" min="0" required className={inputClass} value={editSlab.rate} onChange={e => setEditSlab({...editSlab, rate: Number(e.target.value)})} />
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900" checked={editSlab.isDefault} onChange={e => setEditSlab({...editSlab, isDefault: e.target.checked})} />
                  <span className="text-sm text-stone-700 font-sans">Set as Default Slab</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowSlabModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-xl hover:border-stone-400">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-xl hover:bg-stone-800 disabled:opacity-50">Save Slab</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
