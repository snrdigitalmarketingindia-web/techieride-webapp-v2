'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';

const ENTITY_TYPES = ['ride', 'request', 'user', 'call', 'sos', 'complaint', 'vehicle', 'verification', 'template'];
const ACTOR_TYPES  = ['USER', 'SYSTEM', 'ADMIN'];

export default function AuditLogPage() {
  const [entries, setEntries]   = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const LIMIT = 50;

  const [filters, setFilters] = useState({
    actor: '', actorType: '', action: '', entityType: '', entityId: '', from: '', to: '',
  });
  const [draft, setDraft] = useState({ ...filters });

  const load = useCallback((p = 1, f = filters) => {
    setLoading(true);
    const params: any = { page: p, limit: LIMIT };
    if (f.actor)      params.actor      = f.actor;
    if (f.actorType)  params.actorType  = f.actorType;
    if (f.action)     params.action     = f.action;
    if (f.entityType) params.entityType = f.entityType;
    if (f.entityId)   params.entityId   = f.entityId;
    if (f.from)       params.from       = f.from;
    if (f.to)         params.to         = f.to;

    adminApi.getAuditLog(params)
      .then((r) => { setEntries(r.data.entries ?? []); setTotal(r.data.total ?? 0); })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(1, filters); }, []);

  const apply = () => { setFilters(draft); setPage(1); load(1, draft); };
  const reset = () => { const empty = { actor: '', actorType: '', action: '', entityType: '', entityId: '', from: '', to: '' }; setDraft(empty); setFilters(empty); setPage(1); load(1, empty); };

  const goPage = (p: number) => { setPage(p); load(p); };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <span className="text-sm text-gray-400">{total.toLocaleString()} entries</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <input
            value={draft.actor}
            onChange={(e) => setDraft((d) => ({ ...d, actor: e.target.value }))}
            placeholder="Actor (user ID or SYSTEM)"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 col-span-2 sm:col-span-1"
          />
          <select
            value={draft.actorType}
            onChange={(e) => setDraft((d) => ({ ...d, actorType: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">All actor types</option>
            {ACTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            value={draft.action}
            onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
            placeholder="Action (e.g. RIDE_CANCELLED)"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <select
            value={draft.entityType}
            onChange={(e) => setDraft((d) => ({ ...d, entityType: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">All entity types</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            value={draft.entityId}
            onChange={(e) => setDraft((d) => ({ ...d, entityId: e.target.value }))}
            placeholder="Entity ID"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            type="date"
            value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            type="date"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={apply} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 transition">Apply</button>
          <button onClick={reset} className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition">Reset</button>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No audit entries found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Timestamp', 'Actor', 'Type', 'Action', 'Entity', 'Metadata'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.actorType === 'SYSTEM' ? 'bg-gray-100 text-gray-600' : e.actorType === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {e.actorType}
                    </span>
                    <p className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-[120px]">{e.actor}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{e.entityType}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded">{e.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500 truncate max-w-[120px]">{e.entityId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[180px]">
                    {e.metadata ? JSON.stringify(e.metadata).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cards — mobile */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No entries found</div>
        ) : entries.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded">{e.action}</span>
              <span className="text-xs text-gray-400">
                {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium mr-1 ${e.actorType === 'SYSTEM' ? 'bg-gray-100 text-gray-600' : e.actorType === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{e.actorType}</span>
              <span className="font-mono">{e.actor.slice(0, 20)}</span>
            </p>
            <p className="text-xs text-gray-500">{e.entityType}{e.entityId ? ` · ${e.entityId.slice(0, 16)}` : ''}</p>
            {e.metadata && <p className="text-xs text-gray-400 truncate">{JSON.stringify(e.metadata).slice(0, 60)}</p>}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => goPage(page - 1)} disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
