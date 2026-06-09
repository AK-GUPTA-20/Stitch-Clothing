import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';

export default function GeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    platformName: '',
    supportEmail: '',
    supportPhone: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    allowGuestCheckout: false,
    minOrderAmount: 0,
    maintenanceMode: false,
    maintenanceMessage: '',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await configService.getPlatformSettings();
      const settings = res.data;
      if (settings?.general) {
        setForm({
          platformName: settings.general.platformName || '',
          supportEmail: settings.general.supportEmail || '',
          supportPhone: settings.general.supportPhone || '',
          currency: settings.general.currency || 'INR',
          timezone: settings.general.timezone || 'Asia/Kolkata',
          allowGuestCheckout: settings.general.allowGuestCheckout || false,
          minOrderAmount: settings.general.minOrderAmount || 0,
          maintenanceMode: settings.general.maintenanceMode || false,
          maintenanceMessage: settings.general.maintenanceMessage || '',
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
      // General Settings
      await configService.updateGeneralSettings({
        platformName: form.platformName,
        supportEmail: form.supportEmail,
        supportPhone: form.supportPhone,
        currency: form.currency,
        timezone: form.timezone,
        allowGuestCheckout: form.allowGuestCheckout,
        minOrderAmount: Number(form.minOrderAmount),
      });

      // Maintenance Mode (separate API in our backend controller)
      await configService.toggleMaintenanceMode({
        maintenanceMode: form.maintenanceMode,
        maintenanceMessage: form.maintenanceMessage,
      });

      setSuccess('Settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <SettingsLayout title="General"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="General">
      <Head>
        <title>General Settings | Admin | STITCH</title>
      </Head>

      <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Platform Basics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Platform Name</label>
              <input type="text" className={inputClass} value={form.platformName} onChange={e => setForm({...form, platformName: e.target.value})} required />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select className={inputClass} value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Support Email</label>
              <input type="email" className={inputClass} value={form.supportEmail} onChange={e => setForm({...form, supportEmail: e.target.value})} required />
            </div>
            <div>
              <label className={labelClass}>Support Phone</label>
              <input type="tel" className={inputClass} value={form.supportPhone} onChange={e => setForm({...form, supportPhone: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Order Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Minimum Order Amount</label>
              <input type="number" className={inputClass} value={form.minOrderAmount} onChange={e => setForm({...form, minOrderAmount: Number(e.target.value)})} min="0" />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={form.allowGuestCheckout}
                  onChange={e => setForm({...form, allowGuestCheckout: e.target.checked})}
                />
                <span className="text-sm text-stone-700 font-sans">Allow Guest Checkout</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Maintenance
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                checked={form.maintenanceMode}
                onChange={e => setForm({...form, maintenanceMode: e.target.checked})}
              />
              <span className="text-sm font-semibold text-red-600 font-sans uppercase tracking-widest">Enable Maintenance Mode</span>
            </label>
            
            {form.maintenanceMode && (
              <div>
                <label className={labelClass}>Maintenance Message</label>
                <textarea 
                  rows={3}
                  className={inputClass}
                  value={form.maintenanceMessage}
                  onChange={e => setForm({...form, maintenanceMessage: e.target.value})}
                  placeholder="We are currently down for maintenance..."
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
