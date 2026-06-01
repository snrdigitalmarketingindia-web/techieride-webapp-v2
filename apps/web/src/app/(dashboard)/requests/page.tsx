'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { requestsApi, ridesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  HOLD:      'bg-purple-100 text-purple-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
  NO_SHOW:   'bg-orange-100 text-orange-700',
};

const STATUS_ICONS: Record<string, string> = {
  PENDING: '⏳', HOLD: '🔒', CONFIRMED: '🎉',
  REJECTED: '❌', CANCELLED: '🚫', NO_SHOW: '👻',
};

// ── Giver view: rides with inline request sub-trees ──────────────────────────
function GiverView() {
  const [rides, setRides] = useState<any[]>([]);
  const [requestsMap, setRequestsMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    ridesApi.getGiven().then(async (r) => {
      const activeRides = (r.data || []).filter((ride: any) =>
        ['PUBLISHED', 'ONGOING'].includes(ride.status)
      );
      setRides(activeRides);
      // fetch requests for each active ride in parallel
      const entries = await Promise.all(
        activeRides.map((ride: any) =>
          requestsApi.getIncoming(ride.id)
            .then((res) => [ride.id, res.data] as [string, any[]])
            .catch(() => [ride.id, []] as [string, any[]])
        )
      );
      setRequestsMap(Object.fromEntries(entries));
    }).finally(() => setLoading(false));
  }, []);

  const reload = async (rideId: string) => {
    const res = await requestsApi.getIncoming(rideId).catch(() => ({ data: [] }));
    setRequestsMap((prev) => ({ ...prev, [rideId]: res.data }));
  };

  const approve = async (reqId: string, rideId: string) => {
    setProcessing(reqId);
    await requestsApi.approve(reqId).catch(() => {});
    await reload(rideId);
    setProcessing(null);
  };

  const reject = async (reqId: string, rideId: string) => {
    setProcessing(reqId);
    await requestsApi.reject(reqId).catch(() => {});
    await reload(rideId);
    setProcessing(null);
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  if (rides.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">📥</div>
        <p className="text-gray-500 text-sm">No active rides. <Link href="/rides/create" className="text-brand-600 underline font-medium">Create and publish a ride</Link> to receive requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {rides.map((ride) => {
        const reqs: any[] = requestsMap[ride.id] || [];
        const pending = reqs.filter((r) => r.status === 'PENDING');
        const others  = reqs.filter((r) => r.status !== 'PENDING');
        return (
          <div key={ride.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Ride header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{ride.originName} → {ride.destinationName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  📅 {new Date(ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {ride.departureTime} · {ride.availableSeats}/{ride.totalSeats} seats
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ride.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>{ride.status}</span>
                <Link href={`/rides/${ride.id}`} className="text-xs text-brand-600 font-medium hover:underline">View →</Link>
              </div>
            </div>

            {/* Request sub-tree */}
            {reqs.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-gray-400">No requests yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Pending first */}
                {pending.map((req) => (
                  <div key={req.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 shrink-0">
                      {req.seeker?.user?.fullName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{req.seeker?.user?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {req.seeker?.user?.companyName || '—'}
                        {req.pickupName ? ` · 📍 ${req.pickupName}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[req.status]}`}>
                      {STATUS_ICONS[req.status]} {req.status}
                    </span>
                    {req.status === 'PENDING' && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => approve(req.id, ride.id)}
                          disabled={processing === req.id}
                          className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
                        >✅ Approve</button>
                        <button
                          onClick={() => reject(req.id, ride.id)}
                          disabled={processing === req.id}
                          className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
                        >❌ Reject</button>
                      </div>
                    )}
                  </div>
                ))}
                {/* Non-pending (dimmed) */}
                {others.map((req) => (
                  <div key={req.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                      {req.seeker?.user?.fullName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{req.seeker?.user?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 truncate">{req.seeker?.user?.companyName || '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[req.status]}`}>
                      {STATUS_ICONS[req.status]} {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Seeker view: my requests with ride info ──────────────────────────────────
function SeekerView() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    requestsApi.getMine().then((r) => setRequests(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const confirm = async (id: string) => {
    setProcessing(id);
    await requestsApi.confirm(id).catch((e: any) => alert(e.response?.data?.message || 'Failed'));
    load();
    setProcessing(null);
  };

  const cancel = async (id: string) => {
    setProcessing(id);
    await requestsApi.cancel(id).catch(() => {});
    load();
    setProcessing(null);
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">🧳</div>
        <p className="text-gray-500 text-sm">No seat requests yet. <Link href="/rides/search" className="text-brand-600 underline font-medium">Find a ride</Link> to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {req.ride?.originName} → {req.ride?.destinationName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {req.ride?.rideGiver?.user?.fullName || 'Giver'} · {' '}
                {req.ride?.departureDate ? new Date(req.ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} {req.ride?.departureTime}
              </p>
              {req.pickupName && <p className="text-xs text-gray-400 mt-0.5">📍 {req.pickupName}</p>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-500'}`}>
              {STATUS_ICONS[req.status]} {req.status}
            </span>
          </div>
          <div className="flex gap-2">
            {req.status === 'HOLD' && (
              <button onClick={() => confirm(req.id)} disabled={processing === req.id}
                className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition">
                ✅ Confirm Seat
              </button>
            )}
            {['HOLD', 'CONFIRMED', 'PENDING'].includes(req.status) && (
              <button onClick={() => cancel(req.id)} disabled={processing === req.id}
                className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition">
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────
export default function RequestsPage() {
  const { user } = useAuthStore();
  const role = user?.role;

  const isGiver  = role === 'RIDE_GIVER' || role === 'BOTH';
  const isSeeker = role === 'RIDE_SEEKER' || role === 'BOTH';

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">
        {isGiver && !isSeeker ? 'Incoming Requests' : isSeeker && !isGiver ? 'My Requests' : 'Requests'}
      </h1>

      {/* BOTH role: show giver section then seeker section, no tabs */}
      {isGiver && isSeeker ? (
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">📥 Incoming — Your Rides</p>
            <GiverView />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">🧳 My Seat Requests</p>
            <SeekerView />
          </div>
        </div>
      ) : isGiver ? (
        <GiverView />
      ) : (
        <SeekerView />
      )}
    </div>
  );
}
