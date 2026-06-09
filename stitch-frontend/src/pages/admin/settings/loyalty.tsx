import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Plus, Edit3, Trash2, X, Star, Zap } from 'lucide-react';

export default function LoyaltySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    enabled: false,
    pointsExpiryDays: 365,
    pointsValue: 0.1,
    maxRedemptionPercent: 10,
    referralBonusBuyer: 0,
    referralBonusReferrer: 0,
  });

  const [rules, setRules] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);

  const [showTierModal, setShowTierModal] = useState(false);
  const [editTier, setEditTier] = useState<any>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await configService.getPlatformSettings();
      const settings = res.data;
      if (settings?.loyalty) {
        setForm({
          enabled: settings.loyalty.enabled || false,
          pointsExpiryDays: settings.loyalty.pointsExpiryDays || 365,
          pointsValue: settings.loyalty.pointsValue || 0.1,
          maxRedemptionPercent: settings.loyalty.maxRedemptionPercent || 10,
          referralBonusBuyer: settings.loyalty.referralBonusBuyer || 0,
          referralBonusReferrer: settings.loyalty.referralBonusReferrer || 0,
        });
        setRules(settings.loyalty.rules || []);
        setTiers(settings.loyalty.tiers || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load loyalty settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await configService.updateLoyaltySettings({
        enabled: form.enabled,
        pointsExpiryDays: Number(form.pointsExpiryDays),
        pointsValue: Number(form.pointsValue),
        maxRedemptionPercent: Number(form.maxRedemptionPercent),
        referralBonusBuyer: Number(form.referralBonusBuyer),
        referralBonusReferrer: Number(form.referralBonusReferrer),
      });
      setSuccess('Loyalty settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        action: editRule.action,
        pointsPerUnit: Number(editRule.pointsPerUnit),
        maxPointsPerDay: Number(editRule.maxPoints || editRule.maxPointsPerDay || 0),
        isActive: editRule.isActive,
      };
      if (editRule._id) await configService.updateLoyaltyRule(editRule._id, payload);
      else await configService.addLoyaltyRule(payload);
      
      setShowRuleModal(false);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if(!window.confirm('Delete this rule?')) return;
    try {
      await configService.deleteLoyaltyRule(id);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete rule');
    }
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: editTier.name.toLowerCase(),
        minPoints: Number(editTier.minPoints),
        bonusMultiplier: Number(editTier.multiplier || editTier.bonusMultiplier || 1),
        perks: typeof editTier.benefits === 'string' ? editTier.benefits.split(',').map((b: string) => b.trim()) : (editTier.benefits || editTier.perks || []),
      };
      if (editTier._id) await configService.updateLoyaltyTier(editTier._id, payload);
      else await configService.addLoyaltyTier(payload);
      
      setShowTierModal(false);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save tier');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <SettingsLayout title="Loyalty"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="Loyalty">
      <Head>
        <title>Loyalty Settings | Admin | STITCH</title>
      </Head>

      <div className="space-y-8 max-w-5xl">
        <form onSubmit={handleSaveSettings} className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
              Global Loyalty Configuration
            </h2>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-stone-900 text-white text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          
          <div className="space-y-6">
            <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors w-max">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                checked={form.enabled}
                onChange={e => setForm({...form, enabled: e.target.checked})}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-stone-900 font-sans">Enable Loyalty Program</span>
                <span className="text-[11px] text-stone-500">Allow users to earn and redeem points</span>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Points Value (in ₹)</label>
                <input type="number" step="0.01" min="0" className={inputClass} value={form.pointsValue} onChange={e => setForm({...form, pointsValue: Number(e.target.value)})} placeholder="e.g. 0.1 for 10pts=₹1" />
              </div>
              <div>
                <label className={labelClass}>Points Expiry (Days)</label>
                <input type="number" min="0" className={inputClass} value={form.pointsExpiryDays} onChange={e => setForm({...form, pointsExpiryDays: Number(e.target.value)})} />
              </div>
              <div>
                <label className={labelClass}>Max Redemption (%)</label>
                <input type="number" min="0" max="100" className={inputClass} value={form.maxRedemptionPercent} onChange={e => setForm({...form, maxRedemptionPercent: Number(e.target.value)})} placeholder="e.g. 10%" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
              <div>
                <label className={labelClass}>Referral Bonus (For Buyer)</label>
                <input type="number" min="0" className={inputClass} value={form.referralBonusBuyer} onChange={e => setForm({...form, referralBonusBuyer: Number(e.target.value)})} placeholder="Points..." />
              </div>
              <div>
                <label className={labelClass}>Referral Bonus (For Referrer)</label>
                <input type="number" min="0" className={inputClass} value={form.referralBonusReferrer} onChange={e => setForm({...form, referralBonusReferrer: Number(e.target.value)})} placeholder="Points..." />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
          {success && <p className="text-sm text-green-600 font-sans">{success}</p>}
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Rules */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 flex items-center gap-2">
                <Zap size={16} className="text-blue-500" /> Earn Rules
              </h2>
              <button onClick={() => { setEditRule({ action: '', pointsPerUnit: 0, maxPoints: 0, isActive: true }); setShowRuleModal(true); }} className="px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 text-[10px] tracking-widest uppercase rounded-lg flex items-center gap-1 transition-colors">
                <Plus size={12} /> Add Rule
              </button>
            </div>
            <div className="space-y-3">
              {rules.length === 0 && <p className="text-sm text-stone-500">No earn rules configured.</p>}
              {rules.map(rule => (
                <div key={rule._id} className="p-4 border border-stone-200 rounded-xl flex items-center justify-between hover:border-stone-300 transition-colors">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-widest">{rule.action}</h3>
                    <p className="text-xs text-stone-500 mt-1">{rule.pointsPerUnit} points / unit {rule.maxPointsPerDay > 0 ? `(Max: ${rule.maxPointsPerDay}/day)` : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditRule({...rule, maxPoints: rule.maxPointsPerDay || rule.maxPoints}); setShowRuleModal(true); }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteRule(rule._id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tiers */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 flex items-center gap-2">
                <Star size={16} className="text-[#cd7f32]" /> Loyalty Tiers
              </h2>
              <button onClick={() => { setEditTier({ name: '', minPoints: 0, multiplier: 1, benefits: '' }); setShowTierModal(true); }} className="px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 text-[10px] tracking-widest uppercase rounded-lg flex items-center gap-1 transition-colors">
                <Plus size={12} /> Add Tier
              </button>
            </div>
            <div className="space-y-3">
              {tiers.length === 0 && <p className="text-sm text-stone-500">No tiers configured.</p>}
              {[...tiers].sort((a,b) => a.minPoints - b.minPoints).map(tier => (
                <div key={tier._id} className="p-4 border border-stone-200 rounded-xl flex items-center justify-between hover:border-stone-300 transition-colors">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 capitalize">{tier.name} <span className="text-[10px] text-stone-500 font-normal ml-2">{tier.minPoints}+ pts</span></h3>
                    <p className="text-xs text-stone-500 mt-1">Earn Multiplier: {tier.bonusMultiplier || tier.multiplier || 1}x</p>
                  </div>
                  <button onClick={() => { setEditTier({...tier, multiplier: tier.bonusMultiplier || tier.multiplier, benefits: (tier.perks || tier.benefits)?.join(', ') || ''}); setShowTierModal(true); }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowRuleModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">{editRule._id ? 'Edit Rule' : 'Add Rule'}</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Action Key</label>
                <input type="text" required disabled={!!editRule._id} className={inputClass} value={editRule.action} onChange={e => setEditRule({...editRule, action: e.target.value})} placeholder="e.g. signup, purchase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Points / Unit</label>
                  <input type="number" min="0" required className={inputClass} value={editRule.pointsPerUnit} onChange={e => setEditRule({...editRule, pointsPerUnit: Number(e.target.value)})} />
                </div>
                <div>
                  <label className={labelClass}>Max Points (0=no limit)</label>
                  <input type="number" min="0" className={inputClass} value={editRule.maxPoints} onChange={e => setEditRule({...editRule, maxPoints: Number(e.target.value)})} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-stone-900" checked={editRule.isActive} onChange={e => setEditRule({...editRule, isActive: e.target.checked})} />
                <span className="text-sm text-stone-700 font-sans">Active</span>
              </label>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowRuleModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase rounded-xl hover:border-stone-400">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase rounded-xl hover:bg-stone-800 disabled:opacity-50">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowTierModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">{editTier._id ? 'Edit Tier' : 'Add Tier'}</h3>
              <button onClick={() => setShowTierModal(false)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveTier} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Tier Name</label>
                <select required disabled={!!editTier._id} className={inputClass} value={editTier.name} onChange={e => setEditTier({...editTier, name: e.target.value})}>
                  <option value="">Select Tier...</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Min Points Required</label>
                  <input type="number" min="0" required className={inputClass} value={editTier.minPoints} onChange={e => setEditTier({...editTier, minPoints: Number(e.target.value)})} />
                </div>
                <div>
                  <label className={labelClass}>Earn Multiplier</label>
                  <input type="number" min="1" step="0.1" required className={inputClass} value={editTier.multiplier} onChange={e => setEditTier({...editTier, multiplier: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Benefits (comma separated)</label>
                <textarea rows={3} className={inputClass} value={editTier.benefits} onChange={e => setEditTier({...editTier, benefits: e.target.value})} placeholder="e.g. Free Shipping, Priority Support" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowTierModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase rounded-xl hover:border-stone-400">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase rounded-xl hover:bg-stone-800 disabled:opacity-50">Save Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
