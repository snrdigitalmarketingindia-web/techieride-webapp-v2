'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { requestsApi, ridesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-blue-100 text-blue-700',
  HOLD:      'bg-purple-100 text-purple-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  NO_SHOW:   'bg-orange-100 text-orange-700',
};

const STATUS_ICONS: Record<string, string> = {
  PENDING: '⏳', APPROVED: '✅', HOLD: '🔒',
  CONFIRMED: '🎉', REJECTED: '❌', CANCELLED: '🚫', NO_SHOW: '👻',
};

function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecs(diff);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const urgent = secs < 120;

  return (
    <span className={`text-xs font-mono font-semibold ${urgent ? 'text-red-600 animate-pulse' : 'text-purple-700'}`}>
      ⏱ {secs > 0 ? `${mins}:${String(s).padStart(2, '0')} left` : 'EXPIRED'}
    </span>
  );
}

export default function RequestsPage() {
  const searchParams = useSearchParams();
  const rideIdParam = searchParams.get('rideId');
  const { user } = useAuthStore();

  const [tab, setTab] = useState<'incoming' | 'mine'>(rideIdParam ? 'incoming' : 'mine');
  const [rideId, setRideId] = useState(rideIdParam || '');
  const [requests, setRequests] = useState<any[]>([]);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Load giver's rides for the selector
  useEffect(() => {
    ridesApi.getGiven('PUBLISHED').then(r => setMyRides(r.data || []));
  }, []);

  const loadIncoming = (id: string) => {
    if (!id) return;
    setLoading(true);
    requestsApi.getIncoming(id)
      .then(r => setRequests(r.data))
      .finally(() => setLoading(false));
  };

  // My own seat requests (as seeker) — fetch rides taken and check request statuses
  const loadMine = () => {
    setLoading(true);
    requestsApi.getMine()
      .then(r => setRequests(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'incoming') loadIncoming(rideId);
    else loadMine();
  }, [tab]);

  useEffect(() => {
    if (rideIdParam) { setRideId(rideIdParam); loadIncoming(rideIdParam); }
  }, [rideIdParam]);

  const approve = async (id: string) => {
    setProcessing(id);
    try {
      await requestsApi.approve(id);
      loadIncoming(rideId);
    } finally { setProcessing(null); }
  };

  const reject = async (id: string) => {
    setProcessing(id);
    try {
      await requestsApi.reject(id);
      loadIncoming(rideId);
    } finally { setProcessing(null); }
  };

  const confirm = async (id: string) => {
    setProcessing(id);
    try {
      await requestsApi.confirm(id);
      loadMine();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Confirmation failed');
    } finally { setProcessing(null); }
  };

  const cancel = async (id: string) => {
    setProcessing(id);
    try {
      await requestsApi.cancel(id);
      if (tab === 'incoming') loadIncoming(rideId); else loadMine();
    } finally { setProcessing(null); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Ride Requests</h1>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('incoming')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${tab === 'incoming' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          📥 Incoming (Giver)
        </button>
        <button
          onClick={() => { setTab('mine'); loadMine(); }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${tab === 'mine' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          🧳 My Requests (Seeker)
        </button>
      </div>

      {/* Incoming: ride selector */}
      {tab === 'incoming' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">Select Ride</label>
          {myRides.length === 0 ? (
            <p className="text-sm text-gray-400">No published rides found. Create and publish a ride first.</p>
          ) : (
            <select
              value={rideId}
              onChange={e => { setRideId(e.target.value); loadIncoming(e.target.value); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Select a ride —</option>
              {myRides.map(r => (
                <option key={r.id} value={r.id}>
                  {r.originName} → {r.destinationName} | {new Date(r.departureDate).toLocaleDateString()} {r.departureTime}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-2">{tab === 'incoming' ? '📥' : '🧳'}</div>
          <p className="text-gray-500 text-sm">
            {tab === 'incoming'
              ? rideId ? 'No requests for this ride yet' : 'Select a ride to see requests'
              : 'You have no seat requests yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'incoming' && requests.map((req: any) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              {/* Seeker info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700">
                    {req.seeker?.user?.fullName?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.seeker?.user?.fullName}</p>
                    <p className="text-xs text-gray-500">{req.seeker?.user?.companyName} · ⭐ {req.seeker?.averageRating?.toFixed(1) || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'HOLD' && req.holdExpiresAt && <HoldTimer expiresAt={req.holdExpiresAt} />}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
                    {STATUS_ICONS[req.status]} {req.status}
                  </span>
                </div>
              </div>

              {/* Pickup/drop */}
              {(req.pickupName || req.dropName) && (
                <div className="flex gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  {req.pickupName && <span>📍 {req.pickupName}</span>}
                  {req.dropName && <span>🏢 {req.dropName}</span>}
                </div>
              )}

              {/* Actions */}
              {req.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(req.id)}
                    disabled={processing === req.id}
                    className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => reject(req.id)}
                    disabled={processing === req.id}
                    className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
              {['HOLD', 'CONFIRMED'].includes(req.status) && (
                <button
                  onClick={() => cancel(req.id)}
                  disabled={processing === req.id}
                  className="w-full border border-gray-200 text-gray-500 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel booking
                </button>
              )}
            </div>
          ))}

          {tab === 'mine' && requests.map((req: any) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.ride?.originName} → {req.ride?.destinationName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {req.ride?.rideGiver?.user?.fullName} · {req.ride?.departureDate ? new Date(req.ride.departureDate).toLocaleDateString() : ''} {req.ride?.departureTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'HOLD' && req.holdExpiresAt && <HoldTimer expiresAt={req.holdExpiresAt} />}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_ICONS[req.status]} {req.status}
                  </span>
                </div>
              </div>
              {req.status === 'HOLD' && (
                <button
                  onClick={() => confirm(req.id)}
                  disabled={processing === req.id}
                  className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  ✅ Confirm Seat
                </button>
              )}
              {['HOLD', 'CONFIRMED', 'PENDING'].includes(req.status) && (
                <button
                  onClick={() => cancel(req.id)}
                  disabled={processing === req.id}
                  className="w-full border border-gray-200 text-gray-500 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel Request
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
