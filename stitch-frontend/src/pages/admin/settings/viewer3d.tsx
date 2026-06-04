import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { SettingsLayout } from '@/components/admin/SettingsLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Box, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Viewer3DSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    enabled: false,
    defaultModelFormat: 'glb',
    autoRotate: true,
    showWireframe: false,
    enableAR: false,
    maxFileSizeMb: 50,
    allowedFormats: 'glb,gltf,obj',
    watermarkEnabled: false,
    watermarkText: '',
    bgColor: '#ffffff',
    shadowEnabled: true,
    exposureLevel: 1.0,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await configService.getPlatformSettings();
      const settings = res.data;
      if (settings?.viewer3D) {
        const v = settings.viewer3D;
        setForm({
          enabled: v.enabled || false,
          defaultModelFormat: v.defaultModelFormat || 'glb',
          autoRotate: v.autoRotate !== false,
          showWireframe: v.showWireframe || false,
          enableAR: v.enableAR || false,
          maxFileSizeMb: v.maxFileSizeMb || 50,
          allowedFormats: Array.isArray(v.allowedFormats) ? v.allowedFormats.join(',') : (v.allowedFormats || 'glb,gltf,obj'),
          watermarkEnabled: v.watermarkEnabled || false,
          watermarkText: v.watermarkText || '',
          bgColor: v.bgColor || '#ffffff',
          shadowEnabled: v.shadowEnabled !== false,
          exposureLevel: v.exposureLevel ?? 1.0,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load 3D viewer settings');
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
      await configService.updateViewer3DSettings({
        enabled: form.enabled,
        defaultModelFormat: form.defaultModelFormat,
        autoRotate: form.autoRotate,
        showWireframe: form.showWireframe,
        enableAR: form.enableAR,
        maxFileSizeMb: Number(form.maxFileSizeMb),
        allowedFormats: form.allowedFormats.split(',').map(f => f.trim()),
        watermarkEnabled: form.watermarkEnabled,
        watermarkText: form.watermarkText,
        bgColor: form.bgColor,
        shadowEnabled: form.shadowEnabled,
        exposureLevel: Number(form.exposureLevel),
      });
      setSuccess('3D Viewer settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update 3D viewer settings');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  const ToggleCard = ({
    fieldKey, label, desc
  }: { fieldKey: keyof typeof form; label: string; desc: string }) => (
    <label className="flex items-center gap-3 cursor-pointer p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
        checked={form[fieldKey] as boolean}
        onChange={e => setForm({ ...form, [fieldKey]: e.target.checked })}
      />
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-stone-900 font-sans">{label}</span>
        <span className="text-[11px] text-stone-500">{desc}</span>
      </div>
    </label>
  );

  if (loading) return <SettingsLayout title="3D Viewer"><Loading /></SettingsLayout>;

  return (
    <SettingsLayout title="3D Viewer">
      <Head>
        <title>3D Viewer Settings | Admin | STITCH</title>
      </Head>

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">

        {/* Main Toggle */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <Box size={20} className="text-stone-400" />
              <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900">
                3D Product Viewer
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

          <ToggleCard fieldKey="enabled" label="Enable 3D Viewer" desc="Allow products to display 3D model previews" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Default Model Format</label>
              <select className={inputClass} value={form.defaultModelFormat} onChange={e => setForm({ ...form, defaultModelFormat: e.target.value })}>
                <option value="glb">GLB (Recommended)</option>
                <option value="gltf">GLTF</option>
                <option value="obj">OBJ</option>
                <option value="fbx">FBX</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Max File Size (MB)</label>
              <input type="number" min="1" max="500" className={inputClass} value={form.maxFileSizeMb} onChange={e => setForm({ ...form, maxFileSizeMb: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelClass}>Allowed Formats (comma separated)</label>
              <input type="text" className={inputClass} value={form.allowedFormats} onChange={e => setForm({ ...form, allowedFormats: e.target.value })} placeholder="glb,gltf,obj" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
              <CheckCircle2 size={14} /> {success}
            </div>
          )}
        </div>

        {/* Viewer Behaviour */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Viewer Behaviour
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ToggleCard fieldKey="autoRotate" label="Auto-Rotate" desc="Slowly spin the model by default" />
            <ToggleCard fieldKey="showWireframe" label="Show Wireframe Option" desc="Allow user to toggle wireframe mode" />
            <ToggleCard fieldKey="enableAR" label="Augmented Reality (AR)" desc="Enable AR view on supported mobile browsers" />
            <ToggleCard fieldKey="shadowEnabled" label="Ground Shadow" desc="Render a shadow beneath the 3D model" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-stone-100 pt-6">
            <div>
              <label className={labelClass}>Background Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 cursor-pointer rounded-lg border border-stone-200 bg-stone-50 p-1"
                  value={form.bgColor}
                  onChange={e => setForm({ ...form, bgColor: e.target.value })}
                />
                <input
                  type="text"
                  className={inputClass}
                  value={form.bgColor}
                  onChange={e => setForm({ ...form, bgColor: e.target.value })}
                  placeholder="#ffffff"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Exposure Level (0.1 – 3.0)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="3.0"
                className={inputClass}
                value={form.exposureLevel}
                onChange={e => setForm({ ...form, exposureLevel: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-sm font-semibold font-sans uppercase tracking-widest text-stone-900 border-b border-stone-100 pb-4">
            Watermark
          </h2>
          <ToggleCard fieldKey="watermarkEnabled" label="Enable Watermark" desc="Overlay brand text on the 3D viewport" />
          {form.watermarkEnabled && (
            <div>
              <label className={labelClass}>Watermark Text</label>
              <input
                type="text"
                className={inputClass}
                value={form.watermarkText}
                onChange={e => setForm({ ...form, watermarkText: e.target.value })}
                placeholder="e.g. © STITCH 2025"
              />
            </div>
          )}
        </div>
      </form>
    </SettingsLayout>
  );
}
