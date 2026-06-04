import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Database, Plus, Edit3, Trash2, X, Search, Filter } from 'lucide-react';

export default function GenericConfigsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [configs, setConfigs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editConfig, setEditConfig] = useState<any>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (typeFilter) params.set('type', typeFilter);
      // We'll filter search client-side for simplicity since the backend API does not have a native search param for generic configs (only type and group).
      
      const res = await configService.getAllConfigs(params.toString());
      setConfigs(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let val = editConfig.value;
      try { val = JSON.parse(val); } catch (e) { /* treat as string if parse fails */ }

      const payload = {
        key: editConfig.key,
        type: editConfig.type,
        group: editConfig.group,
        isPublic: editConfig.isPublic,
        description: editConfig.description,
        value: val,
      };

      if (editConfig._isEdit) {
        await configService.updateConfigByKey(editConfig.key, payload);
      } else {
        await configService.createConfig(payload);
      }
      
      setShowModal(false);
      setEditConfig(null);
      fetchConfigs();
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if(!window.confirm(`Delete configuration key "${key}"?`)) return;
    try {
      await configService.deleteConfigByKey(key);
      fetchConfigs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete config');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  const filteredConfigs = configs.filter(c => 
    !search || 
    c.key?.toLowerCase().includes(search.toLowerCase()) || 
    c.description?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Advanced Configs">
      <Head>
        <title>Advanced Configs | Admin | STITCH</title>
      </Head>

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-light text-stone-900 flex items-center gap-2">
              <Database size={24} className="text-stone-400" /> Advanced Settings
            </h1>
            <p className="text-sm text-stone-500 mt-1">Manage underlying key-value configurations and platform documents.</p>
          </div>
          <button 
            onClick={() => { setEditConfig({ _isEdit: false, key: '', type: 'custom', group: 'general', value: '', description: '', isPublic: false }); setShowModal(true); }}
            className="px-4 py-2 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans font-medium rounded-lg hover:bg-stone-800 flex items-center gap-2 transition-colors"
          >
            <Plus size={14} /> Add Config
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text"
              placeholder="Search by key, description..."
              className={`${inputClass} pl-9 bg-white`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-64 shrink-0">
            <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <select
              className={`${inputClass} pl-9 appearance-none bg-white`}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="platform_settings">Platform Settings (Singleton)</option>
              <option value="webhook">Webhooks</option>
              <option value="content_page">Content Pages</option>
              <option value="custom">Custom Key-Value</option>
            </select>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                {['Key & Type', 'Description', 'Access', 'Value (Snippet)', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && configs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center"><Loading /></td></tr>
              ) : filteredConfigs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-stone-400">No configs found.</td></tr>
              ) : (
                filteredConfigs.map(config => (
                  <tr key={config._id} className="border-b border-stone-50 hover:bg-stone-50/50">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs font-semibold text-stone-900">{config.key || '(No Key)'}</div>
                      <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">{config.type} / {config.group}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-600">
                      {config.description || '-'}
                    </td>
                    <td className="px-5 py-4">
                      {config.isPublic ? (
                        <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700">Public</span>
                      ) : (
                        <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600">Internal</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-[200px] max-h-12 overflow-hidden text-[10px] font-mono text-stone-500 bg-stone-50 p-2 rounded">
                        {config.value !== undefined ? JSON.stringify(config.value) : (config.settings || config.webhook || config.content ? '{ Nested Document }' : '-')}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {config.key ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { 
                            setEditConfig({
                              _isEdit: true,
                              key: config.key,
                              type: config.type,
                              group: config.group,
                              description: config.description,
                              isPublic: config.isPublic,
                              value: typeof config.value === 'object' ? JSON.stringify(config.value, null, 2) : String(config.value || ''),
                            }); 
                            setShowModal(true); 
                          }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                          <button onClick={() => handleDelete(config.key)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">Managed visually</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">{editConfig._isEdit ? 'Edit Key-Value Config' : 'Add Key-Value Config'}</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Key (Unique String)</label>
                <input type="text" required disabled={editConfig._isEdit} className={`${inputClass} font-mono bg-stone-50`} value={editConfig.key} onChange={e => setEditConfig({...editConfig, key: e.target.value})} placeholder="e.g. max_upload_size_mb" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Type</label>
                  <input type="text" required className={inputClass} value={editConfig.type} onChange={e => setEditConfig({...editConfig, type: e.target.value})} placeholder="custom" />
                </div>
                <div>
                  <label className={labelClass}>Group (Optional)</label>
                  <input type="text" className={inputClass} value={editConfig.group || ''} onChange={e => setEditConfig({...editConfig, group: e.target.value})} placeholder="general" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Description (Internal Use)</label>
                <input type="text" className={inputClass} value={editConfig.description || ''} onChange={e => setEditConfig({...editConfig, description: e.target.value})} placeholder="Max upload limit..." />
              </div>
              <div>
                <label className={labelClass}>Value (String or JSON)</label>
                <textarea required rows={6} className={`${inputClass} font-mono text-xs leading-relaxed bg-stone-50`} value={editConfig.value} onChange={e => setEditConfig({...editConfig, value: e.target.value})} placeholder={`15\nor\n{"limit": 15, "format": "pdf"}`} />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-stone-900" checked={editConfig.isPublic} onChange={e => setEditConfig({...editConfig, isPublic: e.target.checked})} />
                  <span className="text-sm font-medium text-stone-900 font-sans">Publicly Accessible via /public/:key</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans font-medium rounded-xl hover:bg-stone-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50">Save Config</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
