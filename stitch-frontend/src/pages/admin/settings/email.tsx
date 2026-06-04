import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Plus, Edit3, CheckCircle, X, Power } from 'lucide-react';

export default function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<{
    provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
    fromName: string;
    fromEmail: string;
    replyTo: string;
  }>({
    provider: 'smtp',
    fromName: '',
    fromEmail: '',
    replyTo: '',
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);

  const fetchSettingsAndTemplates = async () => {
    try {
      setLoading(true);
      const [settingsRes, templatesRes] = await Promise.all([
        configService.getPlatformSettings(),
        configService.getEmailTemplates(),
      ]);
      const settings = settingsRes.data;
      if (settings?.email) {
        setForm({
          provider: settings.email.provider || 'smtp',
          fromName: settings.email.fromName || '',
          fromEmail: settings.email.fromEmail || '',
          replyTo: settings.email.replyTo || '',
        });
      }
      setTemplates(templatesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndTemplates();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await configService.updateEmailSettings(form);
      setSuccess('Email settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await configService.upsertEmailTemplate({
        key: editTemplate.key,
        subject: editTemplate.subject,
        htmlBody: editTemplate.htmlBody,
        textBody: editTemplate.textBody,
        variables: typeof editTemplate.variables === 'string' ? editTemplate.variables.split(',').map((v: string) => v.trim()) : editTemplate.variables,
      });
      setShowTemplateModal(false);
      setEditTemplate(null);
      fetchSettingsAndTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTemplate = async (id: string) => {
    try {
      await configService.toggleEmailTemplate(id);
      fetchSettingsAndTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle template');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <SettingsLayout title="Email & SMS"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="Email & SMS">
      <Head>
        <title>Email Settings | Admin | STITCH</title>
      </Head>

      <div className="space-y-8 max-w-5xl">
        <form onSubmit={handleSaveSettings} className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
              Email Provider Settings
            </h2>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-stone-900 text-white text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Provider</label>
              <select className={inputClass} value={form.provider} onChange={e => setForm({...form, provider: e.target.value as any})}>
                <option value="smtp">SMTP</option>
                <option value="sendgrid">SendGrid</option>
                <option value="ses">AWS SES</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>From Name</label>
              <input type="text" className={inputClass} value={form.fromName} onChange={e => setForm({...form, fromName: e.target.value})} placeholder="e.g. STITCH Notifications" />
            </div>
            <div>
              <label className={labelClass}>From Email</label>
              <input type="email" className={inputClass} value={form.fromEmail} onChange={e => setForm({...form, fromEmail: e.target.value})} placeholder="e.g. no-reply@stitch.com" />
            </div>
            <div>
              <label className={labelClass}>Reply-To Email</label>
              <input type="email" className={inputClass} value={form.replyTo} onChange={e => setForm({...form, replyTo: e.target.value})} placeholder="e.g. support@stitch.com" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
          {success && <p className="text-sm text-green-600 font-sans">{success}</p>}
        </form>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
              Email Templates
            </h2>
            <button 
              onClick={() => { setEditTemplate({ key: '', subject: '', htmlBody: '', textBody: '', variables: '' }); setShowTemplateModal(true); }}
              className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 text-[10px] tracking-widest uppercase font-sans font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={14} /> Add Template
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {templates.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-8">No email templates found.</p>
            )}
            {templates.map(tmpl => (
              <div key={tmpl._id} className="p-5 border border-stone-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded">{tmpl.key}</h3>
                    <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded ${tmpl.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {tmpl.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[12px] text-stone-600 mt-1">{tmpl.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleTemplate(tmpl._id)} className={`p-1.5 rounded-lg transition-colors ${tmpl.isActive ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`} title="Toggle active">
                    <Power size={15} />
                  </button>
                  <button onClick={() => { 
                    setEditTemplate({...tmpl, variables: tmpl.variables?.join(', ') || ''}); 
                    setShowTemplateModal(true); 
                  }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowTemplateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">
                {editTemplate._id ? 'Edit Template' : 'Add Template'}
              </h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-stone-400 hover:text-stone-900">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className={labelClass}>Template Key (Unique)</label>
                <input type="text" required disabled={!!editTemplate._id} className={`${inputClass} font-mono text-sm`} value={editTemplate.key} onChange={e => setEditTemplate({...editTemplate, key: e.target.value})} placeholder="e.g. order_confirmation" />
              </div>
              <div>
                <label className={labelClass}>Subject Line</label>
                <input type="text" required className={inputClass} value={editTemplate.subject} onChange={e => setEditTemplate({...editTemplate, subject: e.target.value})} placeholder="e.g. Your STITCH Order #{{orderId}}" />
              </div>
              <div>
                <label className={labelClass}>Variables (comma separated)</label>
                <input type="text" className={inputClass} value={editTemplate.variables} onChange={e => setEditTemplate({...editTemplate, variables: e.target.value})} placeholder="e.g. orderId, customerName, total" />
              </div>
              <div>
                <label className={labelClass}>HTML Body</label>
                <textarea required rows={8} className={`${inputClass} font-mono text-xs leading-relaxed`} value={editTemplate.htmlBody} onChange={e => setEditTemplate({...editTemplate, htmlBody: e.target.value})} placeholder="<h1>Hi {{customerName}}</h1>..." />
              </div>
              <div>
                <label className={labelClass}>Text Body (Fallback)</label>
                <textarea rows={4} className={`${inputClass} font-mono text-xs`} value={editTemplate.textBody || ''} onChange={e => setEditTemplate({...editTemplate, textBody: e.target.value})} placeholder="Hi {{customerName}}..." />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans rounded-xl hover:border-stone-400">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans rounded-xl hover:bg-stone-800 disabled:opacity-50">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
