'use client';

import { useState, useEffect } from 'react';
import { ridesApi, requestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import dynamic from 'next/dynamic';
import { CallButton } from '@/components/ui/CallButton';

const RideMap = dynamic(() => import('@/components/maps/RideMap'), { ssr: false });
const LocationPickerMap = dynamic(() => import('@/components/maps/LocationPickerMap'), { ssr: false });

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

const SEEKER_PREFS_KEY = 'tr_seeker_prefs';
const loadSeekerPrefs = () => { try { return JSON.parse(localStorage.getItem(SEEKER_PREFS_KEY) || '{}'); } catch { return {}; } };
const saveSeekerPrefs = (prefs: object) => { try { localStorage.setItem(SEEKER_PREFS_KEY, JSON.stringify(prefs)); } catch {} };

// ── Boarding Point Modal ──────────────────────────────────────────────────────
function BoardingModal({
  ride,
  onConfirm,
  onClose,
}: {
  ride: any;
  onConfirm: (data: { pickupName: string; pickupLat?: number; pickupLng?: number; dropName: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [pickupName, setPickupName] = useState('');
  const [pickupLat, setPickupLat] = useState<number | undefined>();
  const [pickupLng, setPickupLng] = useState<number | undefined>();
  const [dropName, setDropName] = useState(ride.destinationName || '');
  const [mapMode, setMapMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLocationSelected = (lat: number, lng: number, address: string) => {
    setPickupLat(lat);
    setPickupLng(lng);
    setPickupName(address);
    setMapMode(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (!pickupName.trim()) { setError('Please enter or pin your boarding point'); return; }
    if (!dropName.trim()) { setError('Please enter your drop point'); return; }
    setSubmitting(true);
    try {
      await onConfirm({ pickupName: pickupName.trim(), pickupLat, pickupLng, dropName: dropName.trim() });
    } catch (e: any) {
      setError(e.message || 'Failed to send request');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-5 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">📍 Your Boarding Point</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          </div>

          {/* Ride info */}
          <div className="bg-brand-50 rounded-xl px-4 py-3 text-sm">
            <p className="font-medium text-brand-800">{ride.rideGiver?.user?.fullName}</p>
            <p className="text-brand-600 text-xs mt-0.5">
              {ride.originName} → {ride.destinationName} · {ride.departureTime}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Map picker mode */}
          {mapMode ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Pin your boarding point</p>
                <button
                  onClick={() => setMapMode(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  ← Back to text
                </button>
              </div>
              <LocationPickerMap
                initialLat={ride.originLat}
                initialLng={ride.originLng}
                onLocationSelect={handleLocationSelected}
              />
            </div>
          ) : (
            <>
              {/* Boarding point input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Where should the giver pick you up? <span className="text-red-500">*</span>
                </label>
                <input
                  value={pickupName}
                  onChange={(e) => { setPickupName(e.target.value); setError(''); }}
                  placeholder="e.g. Kondapur Metro Exit 2, near Dominos"
                  className={inputCls}
                />

                {/* Pinned coords shown if set */}
                {pickupLat && pickupLng && (
                  <p className="text-xs text-brand-600 bg-brand-50 rounded px-2 py-1">
                    📍 Pinned: {pickupLat.toFixed(5)}, {pickupLng.toFixed(5)}
                  </p>
                )}

                {/* Map pin button */}
                <button
                  type="button"
                  onClick={() => setMapMode(true)}
                  className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  🗺️ Pin on map instead
                </button>
              </div>

              {/* Drop point */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Where are you dropping off? <span className="text-red-500">*</span>
                </label>
                <input
                  value={dropName}
                  onChange={(e) => setDropName(e.target.value)}
                  placeholder="e.g. HITEC City, Cyber Towers gate"
                  className={inputCls}
                />
                <p className="text-xs text-gray-400">Default: ride destination. Edit if getting off earlier.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {submitting ? 'Sending...' : '🚗 Request Seat'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RideSearchPage() {
  const { user } = useAuthStore();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [form, setForm] = useState({
    originName: '',
    originLat: 17.4401,
    originLng: 78.3489,
    destinationName: '',
    destinationLat: 17.4489,
    destinationLng: 78.3696,
    date: today,
  });
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  // rideId → 'pending' (awaiting giver) | 'sent' (just sent this session)
  const [requestedMap, setRequestedMap] = useState<Record<string, 'pending' | 'sent'>>({});
  const [womenOnlyFilter, setWomenOnlyFilter] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [boardingRide, setBoardingRide] = useState<any | null>(null);

  // Load saved search prefs client-side (localStorage unavailable during SSR)
  useEffect(() => {
    const prefs = loadSeekerPrefs();
    if (prefs.originName || prefs.destinationName) {
      setForm((f) => ({
        ...f,
        originName: prefs.originName ?? f.originName,
        originLat: prefs.originLat ?? f.originLat,
        originLng: prefs.originLng ?? f.originLng,
        destinationName: prefs.destinationName ?? f.destinationName,
        destinationLat: prefs.destinationLat ?? f.destinationLat,
        destinationLng: prefs.destinationLng ?? f.destinationLng,
      }));
    } else {
      setIsFirstVisit(true);
    }
  }, []);

  // Pre-load seeker's active requests so buttons are disabled immediately
  // Also auto-search today's rides on mount
  useEffect(() => {
    requestsApi.getMine().then((r) => {
      const active: Record<string, 'pending'> = {};
      for (const req of r.data ?? []) {
        if (['PENDING', 'CONFIRMED'].includes(req.status)) {
          active[req.ride?.id] = 'pending';
        }
      }
      setRequestedMap(active);
    }).catch(() => {});

    search();
  }, []);

  const search = async () => {
    if (form.originName && form.destinationName) {
      saveSeekerPrefs({
        originName: form.originName, originLat: form.originLat, originLng: form.originLng,
        destinationName: form.destinationName, destinationLat: form.destinationLat, destinationLng: form.destinationLng,
      });
    }
    setLoading(true);
    setSearchError('');
    try {
      const { data } = await ridesApi.search({
        originLat: form.originLat,
        originLng: form.originLng,
        destinationLat: form.destinationLat,
        destinationLng: form.destinationLng,
        date: form.date,
      });
      setRides(data);
    } catch {
      setRides([]);
      setSearchError('Unable to fetch rides. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const openBoardingModal = (ride: any) => {
    setBoardingRide(ride);
  };

  const submitRequest = async (data: {
    pickupName: string;
    pickupLat?: number;
    pickupLng?: number;
    dropName: string;
  }): Promise<void> => {
    if (!boardingRide) return;
    try {
      await requestsApi.create({
        rideId: boardingRide.id,
        pickupName: data.pickupName,
        ...(data.pickupLat !== undefined && { pickupLat: data.pickupLat }),
        ...(data.pickupLng !== undefined && { pickupLng: data.pickupLng }),
        dropName: data.dropName,
      });
      setRequestedMap((prev) => ({ ...prev, [boardingRide.id]: 'sent' }));
      setBoardingRide(null);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to send request';
      // 409 = already have active request — close modal, mark as pending
      if (e.response?.status === 409) {
        setRequestedMap((prev) => ({ ...prev, [boardingRide.id]: 'pending' }));
        setBoardingRide(null);
        return;
      }
      throw new Error(text); // bubble up to modal's inline error
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Find a Ride</h1>

      {/* Boarding modal */}
      {boardingRide && (
        <BoardingModal
          ride={boardingRide}
          onConfirm={submitRequest}
          onClose={() => setBoardingRide(null)}
        />
      )}

      {/* First-visit hint */}
      {isFirstVisit && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
          💡 Tip: Save your home &amp; office in{' '}
          <a href="/profile" className="underline font-medium">Profile</a>
          {' '}— your search will pre-fill automatically next time.
        </div>
      )}

      {/* Search form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">📍 Pickup area</label>
            <input
              value={form.originName}
              onChange={(e) => setForm((f) => ({ ...f, originName: e.target.value }))}
              placeholder="Kondapur"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">🏢 Drop area</label>
            <input
              value={form.destinationName}
              onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
              placeholder="HITEC City"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">📅 Date</label>
          <input
            type="date"
            value={form.date}
            min={today}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {loading ? 'Searching...' : '🔍 Search Rides'}
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={womenOnlyFilter} onChange={(e) => setWomenOnlyFilter(e.target.checked)} className="w-4 h-4 text-pink-600" />
          <span className="text-sm text-gray-600">👩 Show women-only rides only</span>
        </label>
      </div>

      {/* View toggle */}
      {rides.length > 0 && (
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('list')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            📋 List
          </button>
          <button onClick={() => setView('map')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${view === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            🗺️ Map
          </button>
        </div>
      )}

      {/* Map view */}
      {view === 'map' && rides.length > 0 && (
        <div className="h-80 rounded-xl overflow-hidden border border-gray-200">
          <RideMap
            rides={rides}
            originLat={form.originLat}
            originLng={form.originLng}
            destLat={form.destinationLat}
            destLng={form.destinationLng}
          />
        </div>
      )}

      {/* Women-only gender warning */}
      {!user?.gender && rides.some((r) => r.womenOnly) && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2.5 flex items-start gap-2 text-sm text-pink-800">
          <span className="text-lg leading-none">👩</span>
          <div>
            <p className="font-medium">Some rides are women-only</p>
            <p className="text-xs text-pink-600 mt-0.5">
              Set your gender in{' '}
              <a href="/profile" className="underline font-medium">Profile</a>
              {' '}to see and book women-only rides.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {view === 'list' && (
        <div className="space-y-3">
          {searchError && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600 text-sm">⚠️ {searchError}</p>
            </div>
          )}
          {rides.length === 0 && !loading && !searchError && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-2">🛣️</div>
              <p className="text-gray-500 text-sm">No rides found. Try adjusting your search.</p>
            </div>
          )}
          {rides.filter((r) => !womenOnlyFilter || r.womenOnly).map((ride) => (
            <div key={ride.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
                      {ride.rideGiver?.user?.fullName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ride.rideGiver?.user?.fullName}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">⭐ {ride.rideGiver?.averageRating?.toFixed(1) || '—'}</p>
                        {ride.rideGiver?.user?.companyName && (
                          <p className="text-xs text-gray-400">{ride.rideGiver.user.companyName}</p>
                        )}
                      </div>
                    </div>
                    {ride.rideGiver?.user?.phone && (
                      <CallButton
                        phone={ride.rideGiver.user.phone}
                        countryCode={ride.rideGiver.user.countryCode}
                        receiverId={ride.rideGiver.userId}
                        rideId={ride.id}
                        label="Call Giver"
                        size="sm"
                        variant="outline"
                      />
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{ride.originName} → {ride.destinationName}</p>
                  <p className="text-xs text-gray-500">
                    🕐 {ride.departureTime} · 📍 {ride.distanceFromOriginM}m from pickup
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-brand-700">{ride.availableSeats} seats</p>
                  <p className="text-xs text-gray-400">available</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                {ride.womenOnly && <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded font-medium">👩 Women only</span>}
                <span className="bg-gray-100 px-2 py-0.5 rounded">{ride.vehicle?.make} {ride.vehicle?.model}</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded">{ride.vehicle?.color}</span>
              </div>

              {(() => {
                const reqStatus = requestedMap[ride.id];
                const full = ride.availableSeats === 0;
                if (reqStatus === 'pending') return (
                  <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center bg-amber-50 text-amber-700 border border-amber-200">
                    ⏳ Awaiting giver's response
                  </div>
                );
                if (reqStatus === 'sent') return (
                  <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center bg-green-50 text-green-700 border border-green-200">
                    ✅ Request Sent — awaiting approval
                  </div>
                );
                return (
                  <button
                    onClick={() => openBoardingModal(ride)}
                    disabled={full}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                      full
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {full ? 'No seats available' : '📍 Request Seat'}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
