import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';

export default function ShippingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    defaultCourier: '',
    freeShippingAbove: 0,
    packagingCharge: 0,
    codCharge: 0,
    expressAvailable: false,
    expressCharge: 0,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await configService.getPlatformSettings();
      const settings = res.data;
      if (settings?.shipping) {
        setForm({
          defaultCourier: settings.shipping.defaultCourier || '',
          freeShippingAbove: settings.shipping.freeShippingAbove || 0,
          packagingCharge: settings.shipping.packagingCharge || 0,
          codCharge: settings.shipping.codCharge || 0,
          expressAvailable: settings.shipping.expressAvailable || false,
          expressCharge: settings.shipping.expressCharge || 0,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await configService.updateShippingSettings({
        defaultCourier: form.defaultCourier,
        freeShippingAbove: Number(form.freeShippingAbove),
        packagingCharge: Number(form.packagingCharge),
        codCharge: Number(form.codCharge),
        expressAvailable: form.expressAvailable,
        expressCharge: Number(form.expressCharge),
      });

      setSuccess('Shipping settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <SettingsLayout title="Shipping"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="Shipping">
      <Head>
        <title>Shipping Settings | Admin | STITCH</title>
      </Head>

      <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Shipping Fees & Providers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Default Courier Partner</label>
              <input type="text" className={inputClass} value={form.defaultCourier} onChange={e => setForm({...form, defaultCourier: e.target.value})} placeholder="e.g. BlueDart" />
            </div>
            <div>
              <label className={labelClass}>Free Shipping Above (₹)</label>
              <input type="number" className={inputClass} value={form.freeShippingAbove} onChange={e => setForm({...form, freeShippingAbove: Number(e.target.value)})} min="0" />
            </div>
            <div>
              <label className={labelClass}>Flat Packaging Charge (₹)</label>
              <input type="number" className={inputClass} value={form.packagingCharge} onChange={e => setForm({...form, packagingCharge: Number(e.target.value)})} min="0" />
            </div>
            <div>
              <label className={labelClass}>COD Charge (₹)</label>
              <input type="number" className={inputClass} value={form.codCharge} onChange={e => setForm({...form, codCharge: Number(e.target.value)})} min="0" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Express Shipping
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                checked={form.expressAvailable}
                onChange={e => setForm({...form, expressAvailable: e.target.checked})}
              />
              <span className="text-sm font-sans text-stone-700">Enable Express Shipping</span>
            </label>
            
            {form.expressAvailable && (
              <div className="w-1/2">
                <label className={labelClass}>Express Shipping Charge (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  className={inputClass}
                  value={form.expressCharge}
                  onChange={e => setForm({...form, expressCharge: Number(e.target.value)})}
                />
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
        {success && <p className="text-sm text-green-600 font-sans">{success}</p>}

        <div>
          <button 
            type="submit" 
            disabled={saving}
            className="px-6 py-3 bg-stone-900 text-white text-xs tracking-widest uppercase font-sans font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
}
