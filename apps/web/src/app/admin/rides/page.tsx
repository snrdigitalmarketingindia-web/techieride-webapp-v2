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

// ── Shared detail panel content ─────────────────────────────────────────────
function RideDetailContent({
  ride, detailLoading, completing, confirmId, setConfirmId, handleForceComplete, canForceComplete,
}: any) {
  if (detailLoading) return <div className="flex-1 flex items-center justify-center text-gray-400 py-12">Loading…</div>;
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
      {/* Status + action */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[ride.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {ride.status}
        </span>
        {canForceComplete(ride.status) && (
          confirmId === ride.id ? (
            <div className="flex gap-2">
              <button onClick={() => handleForceComplete(ride.id)}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium">
                {completing === ride.id ? '⏳' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmId(null)}
                className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmId(ride.id)} disabled={completing === ride.id}
              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
              🔒 Force Complete
            </button>
          )
        )}
      </div>

      {/* Route */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Route</p>
        <p className="text-gray-800 font-medium">{ride.originName}</p>
        <p className="text-gray-400 text-xs">↓</p>
        <p className="text-gray-800 font-medium">{ride.destinationName}</p>
        <p className="text-xs text-gray-500 mt-1">{ride.departureDate ? fmt(ride.departureDate, ride.departureTime) : '—'}</p>
      </div>

      {/* Giver + Vehicle */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Ride Giver</p>
          <p className="text-gray-800 font-medium text-xs">{ride.rideGiver?.user?.fullName ?? '—'}</p>
          <p className="text-gray-400 text-xs">{ride.rideGiver?.user?.phone ?? ''}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Vehicle</p>
          <p className="text-gray-800 font-medium text-xs">
            {ride.vehicle ? `${ride.vehicle.make} ${ride.vehicle.model}` : '—'}
          </p>
          <p className="text-gray-400 text-xs">{ride.vehicle?.plateNumber ?? ''}</p>
        </div>
      </div>

      {/* Seats / Fare */}
      <div className="flex gap-3">
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Total</p>
          <p className="text-xl font-bold text-gray-800">{ride.totalSeats ?? '—'}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Available</p>
          <p className="text-xl font-bold text-brand-600">{ride.availableSeats ?? '—'}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Fare</p>
          <p className="text-xl font-bold text-gray-800">{ride.pricePerSeat != null ? `₹${ride.pricePerSeat}` : 'Free'}</p>
        </div>
      </div>

      {/* Passengers */}
      {ride.participants && ride.participants.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Passengers ({ride.participants.length})</p>
          <div className="space-y-2">
            {ride.participants.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-gray-800">{p.seeker?.user?.fullName ?? '—'}</p>
                  <p className="text-xs text-gray-400">{p.seeker?.user?.phone ?? ''}</p>
                  {p.request?.pickupName && <p className="text-xs text-gray-400">📍 {p.request.pickupName}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REQ_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {ride.participants?.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No passengers yet</p>}

      {ride.cancellationReason && (
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs font-medium text-red-700 mb-0.5">Cancellation reason</p>
          <p className="text-xs text-red-600">{ride.cancellationReason}</p>
        </div>
      )}
      <div className="pt-1 border-t border-gray-100">
        <p className="text-xs text-gray-300 font-mono break-all">{ride.id}</p>
      </div>
    </div>
  );
}

export default function AdminRidesPage() {
  const [rides, setRides]             = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [filter, setFilter]           = useState({ status: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]         = useState(true);
  const [completing, setCompleting]   = useState<string | null>(null);
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listRides({ status: filter.status || undefined, search: filter.search || undefined })
      .then((r) => { setRides(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedRide({ id });
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Rides ({total})</h1>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setFilter((f) => ({ ...f, search: searchInput })); }}
            placeholder="Search route, giver, plate..."
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button onClick={() => setFilter((f) => ({ ...f, search: searchInput }))}
            className="text-sm bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 transition">🔍</button>
          {filter.search && (
            <button onClick={() => { setSearchInput(''); setFilter((f) => ({ ...f, search: '' })); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
          )}
        </div>
        <div className="flex gap-2">
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2">
            <option value="">All Status</option>
            {['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ABORTED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={load} disabled={loading}
            className="text-sm text-brand-600 border border-brand-200 px-4 py-2 rounded-lg hover:bg-brand-50 transition disabled:opacity-50">
            {loading ? '⏳' : '↻'}
          </button>
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="flex gap-4">

          {/* ── Mobile card list ── */}
          <div className={`sm:hidden flex-1 space-y-3 ${selectedRide ? 'hidden' : 'block'}`}>
            {rides.length === 0 && <p className="text-center py-8 text-gray-400">No rides found.</p>}
            {rides.map((r) => (
              <div key={r.id} onClick={() => openDetail(r.id)}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{r.rideGiver?.user?.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{r.originName} → {r.destinationName}</p>
                    <p className="text-xs text-gray-400">{fmt(r.departureDate, r.departureTime)}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{r.availableSeats}/{r.totalSeats} seats · {r.vehicle?.plateNumber ?? '—'}</span>
                  {canForceComplete(r.status) && (
                    <button onClick={(e) => { e.stopPropagation(); setConfirmId(r.id); openDetail(r.id); }}
                      className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg font-medium">
                      🔒 Force Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className={`hidden sm:block flex-1 min-w-0 transition-all ${selectedRide ? 'max-w-[calc(100%-400px)]' : ''}`}>
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
                    <tr key={r.id} onClick={() => openDetail(r.id)}
                      className={`hover:bg-brand-50 cursor-pointer transition ${selectedRide?.id === r.id ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.rideGiver?.user?.fullName}</p>
                        {r.vehicle?.plateNumber && <p className="text-xs text-gray-400">{r.vehicle.plateNumber}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{r.originName} → {r.destinationName}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmt(r.departureDate, r.departureTime)}</td>
                      <td className="px-4 py-3 text-gray-600 text-center">{r.availableSeats}/{r.totalSeats}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {canForceComplete(r.status) && (
                          <button onClick={() => setConfirmId(r.id)}
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
              {rides.length === 0 && <div className="text-center py-10 text-gray-400">No rides found.</div>}
            </div>
          </div>

          {/* ── Desktop side drawer ── */}
          {selectedRide && (
            <div className="hidden sm:flex w-[390px] shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex-col"
              style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: '80px' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-800">Ride Details</h2>
                <button onClick={() => setSelectedRide(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
              <RideDetailContent ride={selectedRide} detailLoading={detailLoading}
                completing={completing} confirmId={confirmId}
                setConfirmId={setConfirmId} handleForceComplete={handleForceComplete}
                canForceComplete={canForceComplete} />
            </div>
          )}
        </div>
      )}

      {/* ── Mobile full-screen detail modal ── */}
      {selectedRide && (
        <div className="sm:hidden fixed inset-0 z-40 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <button onClick={() => setSelectedRide(null)} className="text-sm text-brand-600 font-medium">← Back</button>
            <h2 className="text-sm font-semibold text-gray-800">Ride Details</h2>
            <div className="w-12" />
          </div>
          <RideDetailContent ride={selectedRide} detailLoading={detailLoading}
            completing={completing} confirmId={confirmId}
            setConfirmId={setConfirmId} handleForceComplete={handleForceComplete}
            canForceComplete={canForceComplete} />
        </div>
      )}

      {/* ── Force-complete confirm banner (desktop) ── */}
      {confirmId && !selectedRide && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-4 shadow-lg max-w-sm w-full">
          <p className="text-amber-800 text-sm font-medium flex-1">⚠️ Force-complete? Pending passengers → NO_SHOW.</p>
          <button onClick={() => handleForceComplete(confirmId)}
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium">Yes</button>
          <button onClick={() => setConfirmId(null)}
            className="text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg">No</button>
        </div>
      )}
    </div>
  );
}
