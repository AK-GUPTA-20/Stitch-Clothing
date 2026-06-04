import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Webhook, Plus, Edit3, Trash2, Power, X, RefreshCw, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WebhooksPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editWebhook, setEditWebhook] = useState<any>(null);

  const [logsModal, setLogsModal] = useState<string | null>(null);
  const [logs, setLogs] = useState<any>(null);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await configService.getWebhooks();
      setWebhooks(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: editWebhook.name,
        url: editWebhook.url,
        events: typeof editWebhook.events === 'string' ? editWebhook.events.split(',').map((e:string)=>e.trim()) : editWebhook.events,
        secret: editWebhook.secret,
        retryPolicy: { maxRetries: Number(editWebhook.retryPolicy?.maxRetries || 3), intervalSeconds: Number(editWebhook.retryPolicy?.intervalSeconds || editWebhook.retryPolicy?.delaySeconds || 60) }
      };

      if (editWebhook._id) await configService.updateWebhook(editWebhook._id, payload);
      else await configService.createWebhook(payload);
      
      setShowModal(false);
      setEditWebhook(null);
      fetchWebhooks();
    } catch (err: any) {
      setError(err.message || 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await configService.toggleWebhook(id);
      fetchWebhooks();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle webhook');
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm('Delete this webhook?')) return;
    try {
      await configService.deleteWebhook(id);
      fetchWebhooks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete webhook');
    }
  };

  const openLogs = async (id: string) => {
    setLogsModal(id);
    setLogs(null);
    try {
      const res = await configService.getWebhookLogs(id, 'limit=20');
      setLogs(res);
    } catch (err: any) {
      alert(err.message || 'Failed to load logs');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  if (loading) return <AdminLayout title="Webhooks"><Loading /></AdminLayout>;

  return (
    <AdminLayout title="Webhooks">
      <Head>
        <title>Webhooks | Admin | STITCH</title>
      </Head>

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-light text-stone-900">Webhooks</h1>
            <p className="text-sm text-stone-500 mt-1">Configure external endpoints to receive real-time updates.</p>
          </div>
          <button 
            onClick={() => { setEditWebhook({ name: '', url: '', events: '', secret: '', retryPolicy: {maxRetries: 3, intervalSeconds: 60} }); setShowModal(true); }}
            className="px-4 py-2 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans font-medium rounded-lg hover:bg-stone-800 flex items-center gap-2 transition-colors"
          >
            <Plus size={14} /> Add Webhook
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                {['Name & URL', 'Events', 'Delivery Stats', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[10px] tracking-[0.14em] uppercase text-stone-400 font-sans font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {webhooks.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-stone-400">No webhooks configured.</td></tr>
              )}
              {webhooks.map(wh => (
                <tr key={wh._id} className="border-b border-stone-50 hover:bg-stone-50/50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-stone-900">{wh.name}</p>
                    <p className="text-[11px] text-stone-500 font-mono mt-1 break-all max-w-[200px]">{wh.url}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-stone-600">
                    <div className="flex flex-wrap gap-1">
                      {(wh.events || []).map((ev:string) => (
                        <span key={ev} className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] uppercase">{ev}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> {wh.totalDelivered || 0}</span>
                      <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {wh.totalFailed || 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-sans font-medium uppercase tracking-widest px-2 py-0.5 rounded-md ${wh.isActive ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-500'}`}>
                      {wh.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openLogs(wh._id)} title="View Logs" className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg"><Activity size={14} /></button>
                      <button onClick={() => handleToggle(wh._id)} title="Toggle active" className={`p-1.5 rounded-lg ${wh.isActive ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}><Power size={14} /></button>
                      <button onClick={() => { setEditWebhook({...wh, events: wh.events?.join(', ')}); setShowModal(true); }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                      <button onClick={() => handleDelete(wh._id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">{editWebhook._id ? 'Edit Webhook' : 'Add Webhook'}</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" required className={inputClass} value={editWebhook.name} onChange={e => setEditWebhook({...editWebhook, name: e.target.value})} placeholder="e.g. ERP Integration" />
              </div>
              <div>
                <label className={labelClass}>Endpoint URL</label>
                <input type="url" required className={inputClass} value={editWebhook.url} onChange={e => setEditWebhook({...editWebhook, url: e.target.value})} placeholder="https://api.example.com/webhook" />
              </div>
              <div>
                <label className={labelClass}>Events (comma separated)</label>
                <input type="text" className={inputClass} value={editWebhook.events} onChange={e => setEditWebhook({...editWebhook, events: e.target.value})} placeholder="order.created, payment.success, *" />
              </div>
              <div>
                <label className={labelClass}>Secret (for signing payload)</label>
                <input type="password" placeholder="Leave blank to keep unchanged" className={inputClass} value={editWebhook.secret || ''} onChange={e => setEditWebhook({...editWebhook, secret: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Max Retries</label>
                  <input type="number" min="0" required className={inputClass} value={editWebhook.retryPolicy.maxRetries} onChange={e => setEditWebhook({...editWebhook, retryPolicy: {...editWebhook.retryPolicy, maxRetries: e.target.value}})} />
                </div>
                <div>
                  <label className={labelClass}>Retry Delay (seconds)</label>
                  <input type="number" min="1" required className={inputClass} value={editWebhook.retryPolicy.intervalSeconds || editWebhook.retryPolicy.delaySeconds || ''} onChange={e => setEditWebhook({...editWebhook, retryPolicy: {...editWebhook.retryPolicy, intervalSeconds: e.target.value}})} />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase rounded-xl hover:border-stone-400">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase rounded-xl hover:bg-stone-800 disabled:opacity-50">Save Webhook</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {logsModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setLogsModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 shrink-0">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">
                Webhook Logs {logs?.webhookName ? `— ${logs.webhookName}` : ''}
              </h3>
              <button onClick={() => setLogsModal(null)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-stone-50">
              {!logs ? (
                <Loading />
              ) : logs.data?.length === 0 ? (
                <p className="text-sm text-stone-500 text-center">No logs recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {logs.data.map((log: any, idx: number) => (
                    <div key={idx} className="bg-white border border-stone-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded ${log.status === 'success' || log.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-stone-400 font-mono">{new Date(log.attemptedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-stone-700 font-mono break-all">{log.responseBody || 'No response details'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
