import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Shield, CreditCard, Wallet, Star, CheckCircle, Trash2, Edit3, X, Plus } from 'lucide-react';

export default function PaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    codEnabled: false,
    codMaxOrderValue: 0,
    walletEnabled: false,
    loyaltyEnabled: false,
    emiEnabled: false,
    autoRefundEnabled: false,
    autoRefundDays: 0,
  });

  const [gateways, setGateways] = useState<any[]>([]);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [editGateway, setEditGateway] = useState<any>(null);
  
  const fetchSettingsAndGateways = async () => {
    try {
      setLoading(true);
      const [settingsRes, gatewaysRes] = await Promise.all([
        configService.getPlatformSettings(),
        configService.getPaymentGateways()
      ]);
      
      const settings = settingsRes.data;
      if (settings?.payment) {
        setForm({
          codEnabled: settings.payment.codEnabled || false,
          codMaxOrderValue: settings.payment.codMaxOrderValue || 0,
          walletEnabled: settings.payment.walletEnabled || false,
          loyaltyEnabled: settings.payment.loyaltyEnabled || false,
          emiEnabled: settings.payment.emiEnabled || false,
          autoRefundEnabled: settings.payment.autoRefundEnabled || false,
          autoRefundDays: settings.payment.autoRefundDays || 0,
        });
      }
      setGateways(gatewaysRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndGateways();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await configService.updatePaymentSettings({
        ...form,
        codMaxOrderValue: Number(form.codMaxOrderValue),
        autoRefundDays: Number(form.autoRefundDays)
      });
      setSuccess('Payment settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editGateway._id) {
        await configService.updatePaymentGateway(editGateway._id, editGateway);
      } else {
        await configService.addPaymentGateway(editGateway);
      }
      setShowGatewayModal(false);
      setEditGateway(null);
      fetchSettingsAndGateways();
    } catch (err: any) {
      setError(err.message || 'Failed to save gateway');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await configService.setPrimaryGateway(id);
      fetchSettingsAndGateways();
    } catch (err: any) {
      setError(err.message || 'Failed to set primary');
    }
  };

  const handleDeleteGateway = async (id: string) => {
    if(!window.confirm('Delete this gateway?')) return;
    try {
      await configService.deletePaymentGateway(id);
      fetchSettingsAndGateways();
    } catch (err: any) {
      setError(err.message || 'Failed to delete gateway');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <SettingsLayout title="Payment"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="Payment">
      <Head>
        <title>Payment Settings | Admin | STITCH</title>
      </Head>

      <div className="space-y-8 max-w-5xl">
        <form onSubmit={handleSaveSettings} className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
              Payment Methods & Toggles
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
                  checked={form.codEnabled}
                  onChange={e => setForm({...form, codEnabled: e.target.checked})}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-stone-900 font-sans">Cash on Delivery (COD)</span>
                  <span className="text-[11px] text-stone-500">Allow customers to pay on delivery</span>
                </div>
              </label>
              {form.codEnabled && (
                <div className="pl-4 border-l-2 border-stone-200 ml-2">
                  <label className={labelClass}>Max COD Order Value ($)</label>
                  <input type="number" className={inputClass} value={form.codMaxOrderValue} onChange={e => setForm({...form, codMaxOrderValue: Number(e.target.value)})} min="0" />
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={form.walletEnabled}
                  onChange={e => setForm({...form, walletEnabled: e.target.checked})}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-stone-900 font-sans">Wallet Payments</span>
                  <span className="text-[11px] text-stone-500">Allow partial/full payment from internal wallet</span>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={form.emiEnabled}
                  onChange={e => setForm({...form, emiEnabled: e.target.checked})}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-stone-900 font-sans">EMI Options</span>
                  <span className="text-[11px] text-stone-500">Show EMI details on product pages</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={form.autoRefundEnabled}
                  onChange={e => setForm({...form, autoRefundEnabled: e.target.checked})}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-stone-900 font-sans">Auto Refunds</span>
                  <span className="text-[11px] text-stone-500">Automatically trigger refund to gateway</span>
                </div>
              </label>
              {form.autoRefundEnabled && (
                <div className="pl-4 border-l-2 border-stone-200 ml-2">
                  <label className={labelClass}>Auto Refund Window (Days)</label>
                  <input type="number" className={inputClass} value={form.autoRefundDays} onChange={e => setForm({...form, autoRefundDays: Number(e.target.value)})} min="0" />
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
          {success && <p className="text-sm text-green-600 font-sans">{success}</p>}
        </form>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
              Payment Gateways
            </h2>
            <button 
              onClick={() => { setEditGateway({ name: '', displayName: '', environment: 'sandbox', isActive: true }); setShowGatewayModal(true); }}
              className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={14} /> Add Gateway
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {gateways.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-8">No payment gateways configured.</p>
            )}
            {gateways.map(gw => (
              <div key={gw._id} className={`p-5 border rounded-xl flex items-center justify-between ${gw.isPrimary ? 'border-green-300 bg-green-50/30' : 'border-stone-200'}`}>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-stone-900">{gw.displayName || gw.name}</h3>
                    {gw.isPrimary && <span className="text-[9px] uppercase tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10} /> Primary</span>}
                    {!gw.isActive && <span className="text-[9px] uppercase tracking-widest bg-stone-100 text-stone-500 px-2 py-0.5 rounded">Inactive</span>}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 uppercase tracking-wider">{gw.environment} | ID: {gw.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!gw.isPrimary && (
                    <button onClick={() => handleSetPrimary(gw._id)} className="p-1.5 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Set as Primary">
                      <CheckCircle size={15} />
                    </button>
                  )}
                  <button onClick={() => { setEditGateway({...gw}); setShowGatewayModal(true); }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => handleDeleteGateway(gw._id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showGatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowGatewayModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">
                {editGateway._id ? 'Edit Gateway' : 'Add Gateway'}
              </h3>
              <button onClick={() => setShowGatewayModal(false)} className="text-stone-400 hover:text-stone-900">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveGateway} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Internal Name</label>
                  <input type="text" required disabled={!!editGateway._id} className={inputClass} value={editGateway.name} onChange={e => setEditGateway({...editGateway, name: e.target.value})} placeholder="e.g. razorpay" />
                </div>
                <div>
                  <label className={labelClass}>Display Name</label>
                  <input type="text" required className={inputClass} value={editGateway.displayName} onChange={e => setEditGateway({...editGateway, displayName: e.target.value})} placeholder="e.g. Credit Card / UPI" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Environment</label>
                  <select className={inputClass} value={editGateway.environment} onChange={e => setEditGateway({...editGateway, environment: e.target.value})}>
                    <option value="sandbox">Sandbox (Test)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900" checked={editGateway.isActive} onChange={e => setEditGateway({...editGateway, isActive: e.target.checked})} />
                    <span className="text-sm text-stone-700 font-sans">Active</span>
                  </label>
                </div>
              </div>

              <div>
                <label className={labelClass}>Key ID (API Key)</label>
                <input type="password" placeholder="Leave blank to keep unchanged" className={inputClass} value={editGateway.keyId || ''} onChange={e => setEditGateway({...editGateway, keyId: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Key Secret (API Secret)</label>
                <input type="password" placeholder="Leave blank to keep unchanged" className={inputClass} value={editGateway.keySecret || ''} onChange={e => setEditGateway({...editGateway, keySecret: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Webhook Secret (Optional)</label>
                <input type="password" placeholder="Leave blank to keep unchanged" className={inputClass} value={editGateway.webhookSecret || ''} onChange={e => setEditGateway({...editGateway, webhookSecret: e.target.value})} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowGatewayModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-xl hover:border-stone-400">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-xl hover:bg-stone-800 disabled:opacity-50">Save Gateway</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
