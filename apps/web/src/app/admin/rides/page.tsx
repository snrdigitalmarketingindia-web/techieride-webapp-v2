'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, ridesApi } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING:   'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  DRAFT:     'bg-yellow-100 text-yellow-700',
  ABORTED:   'bg-red-100 text-red-600',
};

const REQ_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
  NO_SHOW:   'bg-orange-100 text-orange-700',
  DEBOARDED: 'bg-gray-100 text-gray-500',
  BOARDED:   'bg-teal-100 text-teal-700',
};

function fmt(date: string, time?: string) {
  const d = new Date(date);
  const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  return time ? `${label} · ${time}` : label;
}

export default function AdminRidesPage() {
  const [rides, setRides] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Force-complete
  const [completing, setCompleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Detail drawer
  const [selectedRide, setSelectedRide] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listRides({ status: filter.status || undefined, search: filter.search || undefined }).then((r) => {
      setRides(r.data.data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedRide({ id }); // open drawer immediately (shows loading state)
    try {
      const res = await ridesApi.getById(id);
      setSelectedRide(res.data);
    } catch {
      setSelectedRide(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleForceComplete = async (id: string) => {
    setCompleting(id);
    setConfirmId(null);
    try {
      await adminApi.forceCompleteRide(id);
      setRides((prev) => prev.map((r) => r.id === id ? { ...r, status: 'COMPLETED' } : r));
      if (selectedRide?.id === id) setSelectedRide((s: any) => ({ ...s, status: 'COMPLETED' }));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Force complete failed');
    } finally {
      setCompleting(null);
    }
  };

  const canForceComplete = (status: string) => ['ONGOING', 'PUBLISHED'].includes(status);

  return (
    <div className="space-y-5">
      {/* Header */}
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
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">🔍</button>
            {filter.search && (
              <button onClick={() => { setSearchInput(''); setFilter((f) => ({ ...f, search: '' })); }}
                className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
            )}
          </div>
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All Status</option>
            {['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ABORTED'].map((s) => (
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
            ⚠️ Force-complete this ride? Pending passengers → NO_SHOW. This cannot be undone.
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

      <div className="flex gap-4">
        {/* Table */}
        <div className={`flex-1 min-w-0 transition-all ${selectedRide ? 'max-w-[calc(100%-400px)]' : ''}`}>
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
                    <tr
                      key={r.id}
                      onClick={() => openDetail(r.id)}
                      className={`hover:bg-brand-50 cursor-pointer transition ${selectedRide?.id === r.id ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.rideGiver?.user?.fullName}</p>
                        {r.vehicle?.plateNumber && (
                          <p className="text-xs text-gray-400">{r.vehicle.plateNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {r.originName} → {r.destinationName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {fmt(r.departureDate, r.departureTime)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-center">
                        {r.availableSeats}/{r.totalSeats}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {canForceComplete(r.status) && (
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

        {/* Detail drawer */}
        {selectedRide && (
          <div className="w-[390px] shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: '80px' }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Ride Details</h2>
              <button onClick={() => setSelectedRide(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">

                {/* Status + action */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[selectedRide.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {selectedRide.status}
                  </span>
                  {canForceComplete(selectedRide.status) && (
                    <button
                      onClick={() => setConfirmId(selectedRide.id)}
                      disabled={completing === selectedRide.id}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50">
                      {completing === selectedRide.id ? '⏳ Closing…' : '🔒 Force Complete'}
                    </button>
                  )}
                </div>

                {/* Route */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Route</p>
                  <p className="text-gray-800 font-medium">{selectedRide.originName}</p>
                  <p className="text-gray-400 text-xs">↓</p>
                  <p className="text-gray-800 font-medium">{selectedRide.destinationName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedRide.departureDate ? fmt(selectedRide.departureDate, selectedRide.departureTime) : '—'}
                  </p>
                </div>

                {/* Giver + Vehicle */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Ride Giver</p>
                    <p className="text-gray-800 font-medium text-xs">{selectedRide.rideGiver?.user?.fullName ?? '—'}</p>
                    <p className="text-gray-400 text-xs">{selectedRide.rideGiver?.user?.phone ?? ''}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Vehicle</p>
                    <p className="text-gray-800 font-medium text-xs">
                      {selectedRide.vehicle ? `${selectedRide.vehicle.make} ${selectedRide.vehicle.model}` : '—'}
                    </p>
                    <p className="text-gray-400 text-xs">{selectedRide.vehicle?.plateNumber ?? ''}</p>
                  </div>
                </div>

                {/* Seats */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Total Seats</p>
                    <p className="text-xl font-bold text-gray-800">{selectedRide.totalSeats ?? '—'}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Available</p>
                    <p className="text-xl font-bold text-brand-600">{selectedRide.availableSeats ?? '—'}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Fare/seat</p>
                    <p className="text-xl font-bold text-gray-800">
                      {selectedRide.pricePerSeat != null ? `₹${selectedRide.pricePerSeat}` : 'Free'}
                    </p>
                  </div>
                </div>

                {/* Passengers */}
                {selectedRide.participants && selectedRide.participants.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Passengers ({selectedRide.participants.length})
                    </p>
                    <div className="space-y-2">
                      {selectedRide.participants.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-gray-800">
                              {p.seeker?.user?.fullName ?? '—'}
                            </p>
                            <p className="text-xs text-gray-400">{p.seeker?.user?.phone ?? ''}</p>
                            {p.request?.pickupName && (
                              <p className="text-xs text-gray-400">📍 {p.request.pickupName}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REQ_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRide.participants?.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No passengers yet</p>
                )}

                {/* Notes / reason */}
                {selectedRide.cancellationReason && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-red-700 mb-0.5">Cancellation reason</p>
                    <p className="text-xs text-red-600">{selectedRide.cancellationReason}</p>
                  </div>
                )}

                {/* Ride ID (for support) */}
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-300 font-mono break-all">{selectedRide.id}</p>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
