'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  DRAFT: 'bg-yellow-100 text-yellow-700',
};

export default function AdminRidesPage() {
  const [rides, setRides] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listRides({ status: filter.status || undefined, search: filter.search || undefined }).then((r) => {
      setRides(r.data.data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleForceComplete = async (id: string) => {
    setCompleting(id);
    setConfirmId(null);
    try {
      await adminApi.forceCompleteRide(id);
      setRides((prev) => prev.map((r) => r.id === id ? { ...r, status: 'COMPLETED' } : r));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Force complete failed');
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Rides ({total})</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setFilter((f) => ({ ...f, search: searchInput })); }}
              placeholder="Search route, giver name, plate..."
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button onClick={() => setFilter((f) => ({ ...f, search: searchInput }))}
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
              🔍
            </button>
            {filter.search && (
              <button onClick={() => { setSearchInput(''); setFilter((f) => ({ ...f, search: '' })); }}
                className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
            )}
          </div>
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All Status</option>
            {['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={load} disabled={loading}
            className="text-sm text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition disabled:opacity-50">
            {loading ? '⏳' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Force-complete confirm banner */}
      {confirmId && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-amber-800 text-sm font-medium">
            ⚠️ Force-complete this ride? Unresolved passengers will be marked NO_SHOW. This cannot be undone.
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => handleForceComplete(confirmId)}
              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 transition">
              Yes, Force Complete
            </button>
            <button onClick={() => setConfirmId(null)}
              className="text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Giver', 'Route', 'Date / Time', 'Seats', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rides.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.rideGiver?.user?.fullName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {r.originName} → {r.destinationName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(r.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} · {r.departureTime}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.availableSeats}/{r.totalSeats}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'ONGOING' && (
                      <button
                        onClick={() => setConfirmId(r.id)}
                        disabled={completing === r.id}
                        className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg font-medium hover:bg-red-100 transition disabled:opacity-50 whitespace-nowrap">
                        {completing === r.id ? '⏳ Closing…' : '🔒 Force Complete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rides.length === 0 && (
            <div className="text-center py-10 text-gray-400">No rides found.</div>
          )}
        </div>
      )}
    </div>
  );
}
