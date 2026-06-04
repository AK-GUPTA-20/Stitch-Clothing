import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { configService } from '@/lib/api/configService';
import Loading from '@/components/Loading';
import { Activity, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [targetType, setTargetType] = useState('');

  const fetchLogs = useCallback(async (p: number, q: string, target: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (target) params.set('targetType', target);
      params.set('page', String(p));
      params.set('limit', '30');
      
      const res = await configService.getAuditLogs(params.toString());
      setLogs(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, search, targetType);
  }, [page, targetType, fetchLogs]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (page === 1) fetchLogs(1, search, targetType);
      else setPage(1); // will trigger the other effect
    }, 500);
    return () => clearTimeout(handler);
  }, [search]); // eslint-disable-line

  const inputClass = 'w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 font-sans focus:outline-none focus:border-stone-400 transition-all';

  return (
    <AdminLayout title="Audit Logs">
      <Head>
        <title>Audit Logs | Admin | STITCH</title>
      </Head>

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-light text-stone-900 flex items-center gap-2">
              <Activity size={24} className="text-stone-400" /> Audit Trail
            </h1>
            <p className="text-sm text-stone-500 mt-1">Track all administrative actions and configuration changes.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text"
              placeholder="Search by admin name, action, description..."
              className={`${inputClass} pl-9`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-64 shrink-0">
            <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <select
              className={`${inputClass} pl-9 appearance-none`}
              value={targetType}
              onChange={e => setTargetType(e.target.value)}
            >
              <option value="">All Resource Types</option>
              <option value="setting">Setting</option>
              <option value="user">User</option>
              <option value="seller">Seller</option>
              <option value="product">Product</option>
              <option value="order">Order</option>
            </select>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  {['Timestamp', 'Admin', 'Action', 'Target', 'Details'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[10px] tracking-[0.14em] uppercase text-stone-500 font-sans font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_,i) => (
                    <tr key={i} className="border-b border-stone-50">
                      {Array(5).fill(0).map((__,j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-stone-100 rounded animate-pulse" style={{ width: `${40 + (j*15)%40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-stone-400">No logs found matching criteria.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.timestamp} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-xs text-stone-900 font-medium">{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold text-stone-900">{log.adminName}</div>
                        <div className="text-[10px] text-stone-500">{log.adminEmail}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-stone-700 capitalize">{log.targetType || 'System'}</div>
                        {log.targetId && <div className="text-[10px] text-stone-400 font-mono mt-0.5 truncate max-w-[100px]">{log.targetId}</div>}
                      </td>
                      <td className="px-5 py-4 text-xs text-stone-600 max-w-xs">
                        <p className="truncate">{log.description}</p>
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="mt-1">
                            <span className="text-[10px] text-stone-400 cursor-help border-b border-stone-300 border-dashed" title={JSON.stringify(log.changes, null, 2)}>View Payload</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-stone-100 bg-white">
              <p className="text-xs text-stone-400 font-sans">
                Showing {(page - 1) * 30 + 1} to {Math.min(page * 30, total)} of {total} entries
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={13} /></button>
                <span className="text-xs font-sans text-stone-600 px-1">{page} / {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={13} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
