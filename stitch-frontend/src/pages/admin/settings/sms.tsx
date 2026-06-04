import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SmsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    provider: 'twilio',
    enabled: false,
    fromNumber: '',
    accountSid: '',
    authToken: '',
    orderConfirmationEnabled: true,
    orderShippedEnabled: true,
    orderDeliveredEnabled: true,
    otpEnabled: true,
    marketingEnabled: false,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await configService.getPlatformSettings();
      const settings = res.data;
      if (settings?.sms) {
        setForm({
          provider: settings.sms.provider || 'twilio',
          enabled: settings.sms.isActive || false,
          fromNumber: settings.sms.senderId || '',
          accountSid: settings.sms.accountSid || '',
          authToken: settings.sms.authToken || '',
          orderConfirmationEnabled: settings.sms.orderConfirmationEnabled !== false,
          orderShippedEnabled: settings.sms.orderShippedEnabled !== false,
          orderDeliveredEnabled: settings.sms.orderDeliveredEnabled !== false,
          otpEnabled: settings.sms.otpEnabled !== false,
          marketingEnabled: settings.sms.marketingEnabled || false,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load SMS settings');
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
      await configService.updateSmsSettings({
        provider: form.provider,
        enabled: form.enabled,
        fromNumber: form.fromNumber,
        accountSid: form.accountSid,
        authToken: form.authToken,
        orderConfirmationEnabled: form.orderConfirmationEnabled,
        orderShippedEnabled: form.orderShippedEnabled,
        orderDeliveredEnabled: form.orderDeliveredEnabled,
        otpEnabled: form.otpEnabled,
        marketingEnabled: form.marketingEnabled,
      });
      setSuccess('SMS settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update SMS settings');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <SettingsLayout title="SMS"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="SMS">
      <Head>
        <title>SMS Settings | Admin | STITCH</title>
      </Head>

      <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
        {/* Provider Config */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <MessageSquare size={20} className="text-stone-400" />
              <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
                SMS Provider Configuration
              </h2>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-stone-900 text-white text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Enable Toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors w-max">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-stone-900 font-sans">Enable SMS Notifications</span>
              <span className="text-[11px] text-stone-500">Send transactional SMS to customers</span>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>SMS Provider</label>
              <select
                className={inputClass}
                value={form.provider}
                onChange={e => setForm({ ...form, provider: e.target.value })}
              >
                <option value="twilio">Twilio</option>
                <option value="msg91">MSG91</option>
                <option value="textlocal">TextLocal</option>
                <option value="sns">AWS SNS</option>
                <option value="kaleyra">Kaleyra</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>From Number / Sender ID</label>
              <input
                type="text"
                className={inputClass}
                value={form.fromNumber}
                onChange={e => setForm({ ...form, fromNumber: e.target.value })}
                placeholder="e.g. +12025551234 or STITCH"
              />
            </div>
            <div>
              <label className={labelClass}>Account SID / API Key</label>
              <input
                type="password"
                className={inputClass}
                value={form.accountSid}
                onChange={e => setForm({ ...form, accountSid: e.target.value })}
                placeholder="Leave blank to keep existing"
              />
            </div>
            <div>
              <label className={labelClass}>Auth Token / API Secret</label>
              <input
                type="password"
                className={inputClass}
                value={form.authToken}
                onChange={e => setForm({ ...form, authToken: e.target.value })}
                placeholder="Leave blank to keep existing"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
              <CheckCircle2 size={14} />
              {success}
            </div>
          )}
        </div>

        {/* Notification Toggles */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Notification Types
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'orderConfirmationEnabled', label: 'Order Confirmation', desc: 'When an order is placed' },
              { key: 'orderShippedEnabled', label: 'Order Shipped', desc: 'When tracking number is added' },
              { key: 'orderDeliveredEnabled', label: 'Order Delivered', desc: 'When order is marked delivered' },
              { key: 'otpEnabled', label: 'OTP / Auth', desc: 'Login and verification codes' },
              { key: 'marketingEnabled', label: 'Promotional SMS', desc: 'Marketing campaigns (requires consent)' },
            ].map(item => (
              <label
                key={item.key}
                className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={form[item.key as keyof typeof form] as boolean}
                  onChange={e => setForm({ ...form, [item.key]: e.target.checked })}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-stone-900 font-sans">{item.label}</span>
                  <span className="text-[11px] text-stone-500">{item.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </form>
    </SettingsLayout>
  );
}
