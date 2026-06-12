'use client';

import { FEATURES } from '@/lib/featureFlags';
import { useState, useEffect, useRef } from 'react';
import { ridesApi, requestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CallButton } from '@/components/ui/CallButton';
import { formatDistance } from '@/lib/geo';
import dynamic from 'next/dynamic';
import { MapPinModal, type MapLocation } from '@/components/ui/MapPinModal';
import OlaPlacesAutocomplete from '@/components/ui/OlaPlacesAutocomplete';
import { LocationInput } from '@/components/ui/LocationInput';

const RideMap = dynamic(() => import('@/components/maps/RideMap'), { ssr: false });

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
  const [showPickupMap, setShowPickupMap] = useState(false);
  const [showDropMap, setShowDropMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Auto-capture GPS on mount — silent fallback if denied
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPickupLat(lat);
        setPickupLng(lng);
        try {
          const res = await fetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (data.address) setPickupName(data.address);
        } catch { /* silent */ }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  const handleSubmit = async () => {
    if (!pickupName.trim()) { setError(FEATURES.MAPS_ENABLED ? 'Please pin your boarding point on the map' : 'Please enter your boarding point'); return; }
    if (!dropName.trim()) { setError('Please set your drop point'); return; }
    setSubmitting(true);
    try {
      await onConfirm({ pickupName: pickupName.trim(), pickupLat, pickupLng, dropName: dropName.trim() });
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Failed to send request');
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

          {/* Boarding point — map pin (maps on) or plain label (maps off) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              📍 Where should the giver pick you up? <span className="text-red-500">*</span>
            </label>
            {FEATURES.MAPS_ENABLED ? (<>
            {gpsLoading && (
              <p className="text-xs text-brand-600 flex items-center gap-1">
                <span className="animate-pulse">📡</span> Detecting your location…
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowPickupMap(true)}
              className={`${inputCls} flex items-center gap-2 text-left ${pickupName ? 'border-brand-400 bg-brand-50' : ''}`}
            >
              <span>{pickupLat ? '✅' : '📍'}</span>
              <span className={pickupName ? 'text-gray-800' : 'text-gray-400'}>
                {pickupName || 'Tap to pin your pickup on map'}
              </span>
            </button>
            {pickupLat && (
              <p className="text-xs text-green-600">📡 Location auto-detected — tap to adjust if needed</p>
            )}
            </>) : (
            <LocationInput
              value={pickupName}
              onChange={setPickupName}
              placeholder="e.g. LB Nagar Metro, Gate 2…"
              className={inputCls}
            />
            )}
          </div>

          {/* Drop point — map pin */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              🏁 Where are you dropping off? <span className="text-red-500">*</span>
            </label>
            {FEATURES.MAPS_ENABLED ? (
            <button
              type="button"
              onClick={() => setShowDropMap(true)}
              className={`${inputCls} flex items-center gap-2 text-left`}
            >
              <span>🏁</span>
              <span className={dropName ? 'text-gray-800' : 'text-gray-400'}>
                {dropName || 'Tap to pin your drop-off on map'}
              </span>
            </button>
            ) : (
            <LocationInput
              value={dropName}
              onChange={setDropName}
              placeholder="e.g. Hitec City…"
              className={inputCls}
            />
            )}
            <p className="text-xs text-gray-400">Default is ride destination — change if getting off earlier.</p>
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
        </div>
      </div>

      {/* Pickup map modal */}
      {showPickupMap && (
        <MapPinModal
          title="Pin Your Pickup Point"
          defaultAlias={pickupName || ''}
          initialLat={ride.originLat}
          initialLng={ride.originLng}
          onConfirm={(loc: MapLocation) => {
            setPickupLat(loc.lat);
            setPickupLng(loc.lng);
            setPickupName(loc.alias || loc.address);
            setShowPickupMap(false);
            setError('');
          }}
          onClose={() => setShowPickupMap(false)}
        />
      )}

      {/* Drop map modal */}
      {showDropMap && (
        <MapPinModal
          title="Pin Your Drop-off Point"
          defaultAlias={dropName || ride.destinationName || ''}
          initialLat={ride.destinationLat}
          initialLng={ride.destinationLng}
          onConfirm={(loc: MapLocation) => {
            setDropName(loc.alias || loc.address);
            setShowDropMap(false);
          }}
          onClose={() => setShowDropMap(false)}
        />
      )}
    </div>
  );
}

// ── Conflict / Replace Modal ──────────────────────────────────────────────────
function ConflictModal({
  existingReq,
  newRide,
  onConfirm,
  onClose,
}: {
  existingReq: any;        // the current active request (has .ride, .status, .id)
  newRide: any;            // the ride the seeker wants to join
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const existing = existingReq?.ride;
  const statusLabel = existingReq?.status === 'CONFIRMED' ? '✅ Confirmed' : '⏳ Pending';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-gray-900">Switch Ride?</h2>
        <p className="text-sm text-gray-600">
          You already have an active request on another ride. You can only have one active request at a time.
        </p>

        {/* Existing ride */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Current request ({statusLabel})</p>
          <p className="text-sm font-medium text-gray-800 truncate">
            {existing?.originName ?? '—'} → {existing?.destinationName ?? '—'}
          </p>
          <p className="text-xs text-gray-500">
            📅 {existing?.departureDate ? new Date(existing.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : ''} · 🕐 {existing?.departureTime ?? ''}
          </p>
        </div>

        {/* Arrow */}
        <p className="text-center text-xs text-gray-400 font-medium">↓ cancel this & join instead ↓</p>

        {/* New ride */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">New ride</p>
          <p className="text-sm font-medium text-gray-800 truncate">
            {newRide?.originName ?? '—'} → {newRide?.destinationName ?? '—'}
          </p>
          <p className="text-xs text-gray-500">
            📅 {newRide?.departureDate ? new Date(newRide.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : ''} · 🕐 {newRide?.departureTime ?? ''}
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Keep current
          </button>
          <button
            onClick={async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } }}
            disabled={loading}
            className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {loading ? 'Switching...' : '🔄 Switch ride'}
          </button>
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
  const [requestedMap, setRequestedMap] = useState<Record<string, 'pending' | 'confirmed' | 'sent'>>({});
  const [radiusKm, setRadiusKm] = useState(10); // default 10 km, seeker-adjustable (1–50 km)
  const [womenOnlyFilter, setWomenOnlyFilter] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [boardingRide, setBoardingRide] = useState<any | null>(null);
  // set when API returns 409 — holds { existingReq, pendingData } so user can confirm switch
  const [conflictReq, setConflictReq] = useState<any | null>(null);
  const [pendingBoardingData, setPendingBoardingData] = useState<any | null>(null);
  // Monotonically-increasing counter — each call to search() gets a unique ID.
  // When the response arrives we check if it's still "current"; stale responses
  // (from a fast-followed mount search overrunning a later user-triggered search)
  // are discarded so they can't wipe out fresh results.
  const searchSeqRef = useRef(0);

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
      const active: Record<string, 'pending' | 'confirmed'> = {};
      for (const req of r.data ?? []) {
        if (req.status === 'PENDING') active[req.ride?.id] = 'pending';
        if (req.status === 'CONFIRMED') active[req.ride?.id] = 'confirmed';
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
    // Stamp this invocation so stale responses can be discarded.
    const mySeq = ++searchSeqRef.current;
    setLoading(true);
    setSearchError('');
    try {
      // Maps on: geo radius matching. Maps off: locations are display labels —
      // match rides by name text instead of coordinates.
      const { data } = await ridesApi.search(FEATURES.MAPS_ENABLED ? {
        originLat: form.originLat,
        originLng: form.originLng,
        destinationLat: form.destinationLat,
        destinationLng: form.destinationLng,
        date: form.date,
        radiusMeters: radiusKm * 1000,
      } : {
        originQuery: form.originName,
        destinationQuery: form.destinationName,
        date: form.date,
      });
      // Only apply results if this is still the most-recent search
      if (mySeq === searchSeqRef.current) setRides(data);
    } catch {
      if (mySeq === searchSeqRef.current) {
        setRides([]);
        setSearchError('Unable to fetch rides. Please check your connection and try again.');
      }
    } finally {
      if (mySeq === searchSeqRef.current) setLoading(false);
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
      // 409 = seeker already has an active request on ANOTHER ride
      // → fetch their existing request and show a "switch ride?" confirmation dialog
      if (e.response?.status === 409) {
        try {
          const { data: myReqs } = await requestsApi.getMine();
          const active = (myReqs ?? []).find((r: any) =>
            ['PENDING', 'CONFIRMED'].includes(r.status)
          );
          if (active) {
            setPendingBoardingData({ ...data, rideId: boardingRide.id });
            setConflictReq(active);
            setBoardingRide(null); // close boarding modal
            return;
          }
        } catch {
          // fall through to generic error
        }
      }
      throw new Error(text); // bubble up to modal's inline error
    }
  };

  // Cancel existing request then create the new one (called from ConflictModal confirm)
  const handleConflictReplace = async () => {
    if (!conflictReq || !pendingBoardingData) return;
    // Cancel the old request
    await requestsApi.cancel(conflictReq.id, 'Switched to a different ride');
    // Remove old ride from requestedMap
    setRequestedMap((prev) => {
      const next = { ...prev };
      delete next[conflictReq.ride?.id];
      return next;
    });
    // Create the new request
    await requestsApi.create({
      rideId: pendingBoardingData.rideId,
      pickupName: pendingBoardingData.pickupName,
      ...(pendingBoardingData.pickupLat !== undefined && { pickupLat: pendingBoardingData.pickupLat }),
      ...(pendingBoardingData.pickupLng !== undefined && { pickupLng: pendingBoardingData.pickupLng }),
      dropName: pendingBoardingData.dropName,
    });
    setRequestedMap((prev) => ({ ...prev, [pendingBoardingData.rideId]: 'sent' }));
    setConflictReq(null);
    setPendingBoardingData(null);
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

      {/* Conflict modal — shown when seeker already has an active request on another ride */}
      {conflictReq && pendingBoardingData && (
        <ConflictModal
          existingReq={conflictReq}
          newRide={rides.find((r) => r.id === pendingBoardingData.rideId) ?? { originName: '', destinationName: '' }}
          onConfirm={handleConflictReplace}
          onClose={() => { setConflictReq(null); setPendingBoardingData(null); }}
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
        {/* Saved location quick-fills */}
        {((user as any)?.homeLocation || (user as any)?.officeLocation) && (
          <div className="flex flex-wrap gap-2">
            {(user as any)?.homeLocation && (user as any)?.officeLocation && (
              <>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, originName: (user as any).homeLocation, destinationName: (user as any).officeLocation }))}
                  className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition"
                >
                  🏠→🏢 Home to Office
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, originName: (user as any).officeLocation, destinationName: (user as any).homeLocation }))}
                  className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition"
                >
                  🏢→🏠 Office to Home
                </button>
              </>
            )}
            {(user as any)?.homeLocation && !(user as any)?.officeLocation && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, originName: (user as any).homeLocation }))}
                className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition"
              >
                🏠 Fill Home
              </button>
            )}
            {(user as any)?.officeLocation && !(user as any)?.homeLocation && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, originName: (user as any).officeLocation }))}
                className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition"
              >
                🏢 Fill Office
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">📍 Pickup area</label>
            {FEATURES.MAPS_ENABLED ? (
            <OlaPlacesAutocomplete
              value={form.originName}
              onChange={(v) => setForm((f) => ({ ...f, originName: v }))}
              onSelect={(address, lat, lng) =>
                setForm((f) => ({
                  ...f,
                  originName: address,
                  ...(lat !== undefined && lng !== undefined
                    ? { originLat: lat, originLng: lng }
                    : {}),
                }))
              }
              placeholder="Kondapur"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            ) : (
            <LocationInput
              value={form.originName}
              onChange={(v) => setForm((f) => ({ ...f, originName: v }))}
              placeholder="Kondapur"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">🏢 Drop area</label>
            {FEATURES.MAPS_ENABLED ? (
            <OlaPlacesAutocomplete
              value={form.destinationName}
              onChange={(v) => setForm((f) => ({ ...f, destinationName: v }))}
              onSelect={(address, lat, lng) =>
                setForm((f) => ({
                  ...f,
                  destinationName: address,
                  ...(lat !== undefined && lng !== undefined
                    ? { destinationLat: lat, destinationLng: lng }
                    : {}),
                }))
              }
              placeholder="HITEC City"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            ) : (
            <LocationInput
              value={form.destinationName}
              onChange={(v) => setForm((f) => ({ ...f, destinationName: v }))}
              placeholder="HITEC City"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            )}
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

        {/* Search radius — seeker picks how far they'll travel to a meeting point.
            Hidden for the current release (10 km default applies). */}
        {FEATURES.RADIUS_SLIDER_ENABLED && <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>📍 Search radius</span>
            <span className="font-semibold text-brand-700">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min={1} max={50} step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1 km</span>
            <span>Default: 10 km</span>
            <span>50 km</span>
          </div>
        </div>}
      </div>

      {/* View toggle */}
      {FEATURES.MAPS_ENABLED && rides.length > 0 && (
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
      {FEATURES.MAPS_ENABLED && view === 'map' && rides.length > 0 && (
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
                    🕐 {ride.departureTime} · 📍 {formatDistance(ride.distanceFromOriginM)} from your location
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-brand-700">{ride.availableSeats} seats</p>
                  <p className="text-xs text-gray-400">available</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                {ride.status === 'ONGOING' && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">🚗 Ride in progress — board en route</span>
                )}
                {ride.womenOnly && <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded font-medium">👩 Women only</span>}
                {ride.vehicle?.photoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={ride.vehicle.photoUrl} alt="Vehicle"
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                )}
                <span className="bg-gray-100 px-2 py-0.5 rounded">{ride.vehicle?.make} {ride.vehicle?.model}</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded">{ride.vehicle?.color}</span>
                {ride.vehicle?.plateNumber && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-wide">
                    🔖 {ride.vehicle.plateNumber}
                  </span>
                )}
              </div>

              {(() => {
                const reqStatus = requestedMap[ride.id];
                const full = ride.availableSeats === 0;
                const isOwnRide = ride.rideGiver?.userId === user?.id;
                if (isOwnRide) return (
                  <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center bg-gray-50 text-gray-400 border border-gray-200">
                    🚗 Your ride
                  </div>
                );
                if (reqStatus === 'pending') return (
                  <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center bg-amber-50 text-amber-700 border border-amber-200">
                    ⏳ Awaiting giver's response
                  </div>
                );
                if (reqStatus === 'confirmed') return (
                  <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center bg-green-100 text-green-800 border border-green-300">
                    🎉 Seat Confirmed!
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
