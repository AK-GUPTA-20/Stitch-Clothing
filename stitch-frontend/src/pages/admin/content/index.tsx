import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { FileText, Plus, Edit3, Trash2, Power, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ContentPages() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [pages, setPages] = useState<any[]>([]);
  const [contentType, setContentType] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editPage, setEditPage] = useState<any>(null);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const query = contentType ? `contentType=${contentType}&limit=100` : 'limit=100';
      const res = await configService.getContentPages(query);
      setPages(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load content pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [contentType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...editPage };
      if (payload._id) await configService.updateContentPage(payload._id, payload);
      else await configService.createContentPage(payload);
      
      setShowModal(false);
      setEditPage(null);
      fetchPages();
    } catch (err: any) {
      setError(err.message || 'Failed to save content page');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await configService.toggleContentPage(id);
      fetchPages();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm('Delete this content page?')) return;
    try {
      await configService.deleteContentPage(id);
      fetchPages();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 focus:bg-white transition-all';
  const labelClass = 'block text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-medium mb-1.5';

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = { 'static_page': 'Static Page', 'policy': 'Policy', 'faq': 'FAQ', 'banner': 'Banner', 'redirect': 'Redirect' };
    return map[type] || type;
  };

  if (loading && pages.length === 0) return <AdminLayout title="Content"><Loading /></AdminLayout>;

  return (
    <AdminLayout title="Content Pages">
      <Head>
        <title>Content | Admin | STITCH</title>
      </Head>

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-light text-stone-900 flex items-center gap-2">
              <FileText size={24} className="text-stone-400" /> Content Management
            </h1>
            <p className="text-sm text-stone-500 mt-1">Manage pages, FAQs, banners, and redirects.</p>
          </div>
          <button 
            onClick={() => { setEditPage({ contentType: 'static_page', title: '', slug: '', content: '', isActive: true }); setShowModal(true); }}
            className="px-4 py-2 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans font-medium rounded-lg hover:bg-stone-800 flex items-center gap-2 transition-colors"
          >
            <Plus size={14} /> Add Content
          </button>
        </div>

        <div className="flex gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
          {['', 'static_page', 'policy', 'faq', 'banner', 'redirect'].map(type => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              className={`px-4 py-2 rounded-full text-xs font-medium font-sans whitespace-nowrap transition-colors ${contentType === type ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {type === '' ? 'All Content' : getTypeLabel(type)}
            </button>
          ))}
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.length === 0 && (
            <div className="col-span-full py-12 text-center text-stone-400 text-sm">No content pages found.</div>
          )}
          {pages.map(page => (
            <div key={page._id} className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-shadow hover:shadow-md ${page.isActive ? 'border-stone-200' : 'border-stone-200 opacity-60'}`}>
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                    {getTypeLabel(page.contentType)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(page._id)} title="Toggle active" className={`p-1.5 rounded-lg ${page.isActive ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-100'}`}><Power size={13} /></button>
                    <button onClick={() => { setEditPage({...page}); setShowModal(true); }} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={13}/></button>
                    <button onClick={() => handleDelete(page._id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13}/></button>
                  </div>
                </div>
                <h3 className="font-semibold text-stone-900 mb-1 leading-tight line-clamp-2">
                  {page.title || page.question || page.fromUrl || '(No Title)'}
                </h3>
                {page.slug && (
                  <Link href={`/pages/${page.slug}`} target="_blank" className="text-[11px] text-blue-500 hover:underline flex items-center gap-1 mt-1 w-max">
                    /pages/{page.slug} <ExternalLink size={10} />
                  </Link>
                )}
                {page.toUrl && <p className="text-xs text-stone-500 font-mono mt-2 truncate">→ {page.toUrl}</p>}
                {page.bannerUrl && <img src={page.bannerUrl} alt="banner" className="h-16 w-full object-cover rounded-lg mt-3" />}
              </div>
              <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-center text-[10px] text-stone-400">
                <span>Updated: {new Date(page.updatedAt).toLocaleDateString()}</span>
                {page.position !== undefined && <span>Pos: {page.position}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && editPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 shrink-0">
              <h3 className="text-sm font-semibold text-stone-900 font-sans uppercase tracking-widest">{editPage._id ? 'Edit Content' : 'Create Content'}</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {!editPage._id && (
                <div>
                  <label className={labelClass}>Content Type</label>
                  <select className={inputClass} value={editPage.contentType} onChange={e => setEditPage({...editPage, contentType: e.target.value})}>
                    <option value="static_page">Static Page</option>
                    <option value="policy">Policy</option>
                    <option value="faq">FAQ</option>
                    <option value="banner">Banner</option>
                    <option value="redirect">Redirect</option>
                  </select>
                </div>
              )}

              {(editPage.contentType === 'static_page' || editPage.contentType === 'policy') && (
                <>
                  <div>
                    <label className={labelClass}>Title</label>
                    <input type="text" required className={inputClass} value={editPage.title || ''} onChange={e => setEditPage({...editPage, title: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>URL Slug (Unique)</label>
                    <input type="text" required className={inputClass} value={editPage.slug || ''} onChange={e => setEditPage({...editPage, slug: e.target.value})} placeholder="e.g. about-us" />
                  </div>
                  <div>
                    <label className={labelClass}>HTML Content</label>
                    <textarea required rows={8} className={`${inputClass} font-mono text-sm`} value={editPage.content || ''} onChange={e => setEditPage({...editPage, content: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Meta Title (SEO)</label>
                      <input type="text" className={inputClass} value={editPage.metaTitle || ''} onChange={e => setEditPage({...editPage, metaTitle: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelClass}>Meta Description (SEO)</label>
                      <input type="text" className={inputClass} value={editPage.metaDescription || ''} onChange={e => setEditPage({...editPage, metaDescription: e.target.value})} />
                    </div>
                  </div>
                </>
              )}

              {editPage.contentType === 'faq' && (
                <>
                  <div>
                    <label className={labelClass}>Question</label>
                    <input type="text" required className={inputClass} value={editPage.question || ''} onChange={e => setEditPage({...editPage, question: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Answer (HTML supported)</label>
                    <textarea required rows={4} className={inputClass} value={editPage.answer || ''} onChange={e => setEditPage({...editPage, answer: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Category</label>
                      <input type="text" className={inputClass} value={editPage.faqCategory || ''} onChange={e => setEditPage({...editPage, faqCategory: e.target.value})} placeholder="e.g. Orders, Shipping" />
                    </div>
                    <div>
                      <label className={labelClass}>Position (Ordering)</label>
                      <input type="number" className={inputClass} value={editPage.position || 0} onChange={e => setEditPage({...editPage, position: Number(e.target.value)})} />
                    </div>
                  </div>
                </>
              )}

              {editPage.contentType === 'banner' && (
                <>
                  <div>
                    <label className={labelClass}>Banner Title (Internal)</label>
                    <input type="text" required className={inputClass} value={editPage.title || ''} onChange={e => setEditPage({...editPage, title: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Banner Image URL</label>
                    <input type="url" required className={inputClass} value={editPage.bannerUrl || ''} onChange={e => setEditPage({...editPage, bannerUrl: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Link URL (Optional)</label>
                    <input type="text" className={inputClass} value={editPage.linkUrl || ''} onChange={e => setEditPage({...editPage, linkUrl: e.target.value})} placeholder="/collections/summer" />
                  </div>
                  <div>
                    <label className={labelClass}>Position</label>
                    <input type="number" className={inputClass} value={editPage.position || 0} onChange={e => setEditPage({...editPage, position: Number(e.target.value)})} />
                  </div>
                </>
              )}

              {editPage.contentType === 'redirect' && (
                <>
                  <div>
                    <label className={labelClass}>From URL Path</label>
                    <input type="text" required className={inputClass} value={editPage.fromUrl || ''} onChange={e => setEditPage({...editPage, fromUrl: e.target.value})} placeholder="/old-path" />
                  </div>
                  <div>
                    <label className={labelClass}>To URL Path</label>
                    <input type="text" required className={inputClass} value={editPage.toUrl || ''} onChange={e => setEditPage({...editPage, toUrl: e.target.value})} placeholder="/new-path" />
                  </div>
                  <div>
                    <label className={labelClass}>HTTP Status Code</label>
                    <select className={inputClass} value={editPage.redirectCode || 301} onChange={e => setEditPage({...editPage, redirectCode: Number(e.target.value)})}>
                      <option value={301}>301 Permanent</option>
                      <option value={302}>302 Temporary</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-stone-900" checked={editPage.isActive} onChange={e => setEditPage({...editPage, isActive: e.target.checked})} />
                  <span className="text-sm font-semibold text-stone-900 font-sans">Published / Active</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-stone-100 flex gap-3 shrink-0 bg-stone-50">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-stone-200 text-stone-600 text-[11px] tracking-widest uppercase font-sans font-medium rounded-xl hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-stone-900 text-white text-[11px] tracking-widest uppercase font-sans font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50">Save Content</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
