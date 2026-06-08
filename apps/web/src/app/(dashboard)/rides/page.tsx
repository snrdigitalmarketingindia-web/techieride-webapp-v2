'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ridesApi, requestsApi, quickMessagesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CallButton } from '@/components/ui/CallButton';
import { RideCard } from '@/components/ui/RideCard';
import { haversineMeters, formatDistance, estimatePickupTime } from '@/lib/geo';

export default function MyRidesPage() {
  const { user, _hasHydrated } = useAuthStore();
  const role = user?.role;
  const isGiver  = role === 'RIDE_GIVER' || role === 'ADMIN';
  const isSeeker = role === 'RIDE_SEEKER' || role === 'RIDE_GIVER' || role === 'ADMIN';

  // Default 'given' — corrected to 'taken' once role is known for pure seekers
  const [tab, setTab] = useState<'given' | 'taken'>('given');
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [showHistory, setShowHistory] = useState(true); // default Today period needs history enabled
  // Period filter
  type Period = 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom';
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  // Giver: pending requests per ride  { rideId: req[] }
  const [pendingMap, setPendingMap] = useState<Record<string, any[]>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // TODO [v2.3]: Pickup ETA override — localStorage only. Migrate to DB (RideRequest.pickupEtaOverride).
  const ETA_KEY = (reqId: string) => `tr_pickup_eta_${reqId}`;
  const [etaOverrides, setEtaOverrides] = useState<Record<string, string>>({});
  const [editingEta, setEditingEta] = useState<string | null>(null);
  const [etaDraft, setEtaDraft] = useState('');
  const saveEta = (reqId: string, value: string) => {
    try { if (value.trim()) localStorage.setItem(ETA_KEY(reqId), value.trim()); else localStorage.removeItem(ETA_KEY(reqId)); } catch {}
    setEtaOverrides(prev => value.trim() ? { ...prev, [reqId]: value.trim() } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== reqId)));
    setEditingEta(null);
  };
  const ridesRef = useRef<any[]>([]);
  // Seeker: pending/active requests not yet confirmed
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [quickMsgSending, setQuickMsgSending] = useState<string | null>(null);
  const [quickMsgOpen, setQuickMsgOpen] = useState<string | null>(null); // rideId

  const sendQuickMessage = async (rideId: string, messageKey: string) => {
    setQuickMsgSending(messageKey);
    try {
      await quickMessagesApi.send(rideId, messageKey);
      setQuickMsgOpen(null);
    } catch {}
    setQuickMsgSending(null);
  };

  // Once user role is known, set the correct default tab
  useEffect(() => {
    if (!user) return;
    setTab(isGiver ? 'given' : 'taken');
  }, [user?.role]);

  // Check for active ride once role is known
  useEffect(() => {
    if (!isGiver) return;
    ridesApi.getGiven().then((r) => {
      const active = (r.data ?? []).some((ride: any) =>
        ['PUBLISHED', 'ONGOING'].includes(ride.status)
      );
      setHasActiveRide(active);
    }).catch(() => {});
  }, [isGiver]);

  // Fetch rides when tab, hydration, or user identity changes.
  // user?.id is required: DashboardLayout fetches the profile async after _hasHydrated fires,
  // so the effect may run with _hasHydrated=true but user=null and early-return. Once
  // fetchProfile() completes and sets user, user?.id changes → effect re-fires correctly.
  // _hasHydrated is kept so givers (tab stays 'given') still get one guaranteed trigger.
  useEffect(() => {
    if (!user || !_hasHydrated) return;
    setLoading(true);
    const fetch = tab === 'given' ? ridesApi.getGiven() : ridesApi.getTaken();
    fetch.then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; }).finally(() => setLoading(false));
    if (tab === 'taken' && isSeeker) reloadMyRequests();
  }, [tab, _hasHydrated, user?.id]);

  const reloadMyRequests = () => {
    requestsApi.getMine().then((r) => {
      const pending = (r.data ?? []).filter((req: any) => req.status === 'PENDING');
      setMyRequests(pending);
      // also refresh taken rides so status badges update (PENDING→CONFIRMED)
      ridesApi.getTaken().then((res) => { setRides(res.data ?? []); ridesRef.current = res.data ?? []; }).catch(() => {});
    }).catch(() => {});
  };

  const reloadPending = async (rideId: string) => {
    const res = await requestsApi.getIncoming(rideId).catch(() => ({ data: [] }));
    setPendingMap((prev) => ({ ...prev, [rideId]: res.data }));
    // Load any saved ETA overrides for these requests
    const overrides: Record<string, string> = {};
    (res.data ?? []).forEach((r: any) => { try { const v = localStorage.getItem(`tr_pickup_eta_${r.id}`); if (v) overrides[r.id] = v; } catch {} });
    if (Object.keys(overrides).length) setEtaOverrides(prev => ({ ...prev, ...overrides }));
  };

  // Load pending requests for all PUBLISHED rides when given tab loads
  useEffect(() => {
    if (tab !== 'given') return;
    rides.filter((r) => r.status === 'PUBLISHED').forEach((r) => reloadPending(r.id));
  }, [rides, tab]);

  // Poll every 15s — giver sees new requests, seeker sees approval status updates
  useEffect(() => {
    const id = setInterval(() => {
      if (tab === 'given') {
        ridesRef.current.filter((r) => r.status === 'PUBLISHED').forEach((r) => reloadPending(r.id));
      } else if (tab === 'taken' && isSeeker) {
        reloadMyRequests();
      }
    }, 15000);
    return () => clearInterval(id);
  }, [tab, isSeeker]);

  const handleBoard = async (rideId: string) => {
    setProcessing(rideId);
    await ridesApi.board(rideId).catch(() => {});
    reloadMyRequests();
    setProcessing(null);
  };

  const handleDeboard = async (rideId: string) => {
    setProcessing(rideId);
    await ridesApi.deboard(rideId).catch(() => {});
    reloadMyRequests();
    setProcessing(null);
  };

  const handleNoShow = async (rideId: string, seekerProfileId: string) => {
    setProcessing(seekerProfileId);
    await ridesApi.markNoShow(rideId, seekerProfileId).catch(() => {});
    ridesApi.getGiven().then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; });
    setProcessing(null);
  };

  const handleApprove = async (reqId: string, rideId: string) => {
    setProcessing(reqId);
    await requestsApi.approve(reqId).catch(() => {});
    await reloadPending(rideId);
    // refresh ride to update seat count
    ridesApi.getGiven().then((r) => setRides(r.data ?? []));
    setProcessing(null);
  };

  const handleReject = async (reqId: string, rideId: string, reason: string) => {
    setProcessing(reqId);
    await requestsApi.reject(reqId, reason || undefined).catch(() => {});
    await reloadPending(rideId);
    setRejectingId(null);
    setRejectReason('');
    setProcessing(null);
  };

  const handleStart = async (rideId: string) => {
    await ridesApi.start(rideId);
    setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, status: 'ONGOING' } : r));
  };

  const handleComplete = async (rideId: string) => {
    await ridesApi.complete(rideId);
    setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, status: 'COMPLETED' } : r));
  };

  // ── Period filter helpers ──────────────────────────────────────────────────
  const toIST = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const applyPeriod = (allRides: any[]): any[] => {
    if (period === 'all') return allRides;
    const now   = toIST(new Date());
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    const inRange = (ride: any, from: Date, to: Date) => {
      const dep = ride.departureDate ? new Date(ride.departureDate) : null;
      if (!dep) return false;
      const depDay = new Date(dep.toISOString().split('T')[0] + 'T00:00:00');
      return depDay >= from && depDay <= to;
    };

    if (period === 'today') {
      const end = new Date(today); end.setHours(23, 59, 59, 999);
      return allRides.filter((r) => inRange(r, today, end));
    }
    if (period === 'tomorrow') {
      const tmr = new Date(today); tmr.setDate(today.getDate() + 1);
      const tmrEnd = new Date(tmr); tmrEnd.setHours(23, 59, 59, 999);
      return allRides.filter((r) => inRange(r, tmr, tmrEnd));
    }
    if (period === 'week') {
      const day = today.getDay();
      const diffToMon = (day === 0 ? -6 : 1 - day);
      const mon = new Date(today); mon.setDate(today.getDate() + diffToMon);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
      return allRides.filter((r) => inRange(r, mon, sun));
    }
    if (period === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      return allRides.filter((r) => inRange(r, start, end));
    }
    if (period === 'custom' && customFrom && customTo) {
      const from = new Date(customFrom + 'T00:00:00');
      const to   = new Date(customTo   + 'T23:59:59');
      return allRides.filter((r) => inRange(r, from, to));
    }
    return allRides;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Rides</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const next = !showHistory;
              setShowHistory(next);
              // When showing history, re-fetch with ?history=true to include archived rides
              if (tab === 'given') {
                ridesApi.getGiven(undefined, next).then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; });
              }
            }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${showHistory ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}
          >
            {showHistory ? '🕐 Hide History' : '🕐 Show History'}
          </button>
        {isGiver && (
          hasActiveRide ? (
            <span
              title="Complete or cancel your active ride before offering a new one"
              className="bg-gray-200 text-gray-400 text-sm px-4 py-2 rounded-lg cursor-not-allowed select-none"
            >
              + Offer Ride
            </span>
          ) : (
            <Link href="/rides/create" className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 transition">
              + Offer Ride
            </Link>
          )
        )}
        </div>
      </div>

      {/* RIDE_GIVER can both offer and take rides — show tabs */}
      {isGiver && isSeeker && (
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['given', 'taken'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPeriod('all'); setCustomFrom(''); setCustomTo(''); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {t === 'given' ? '🚗 Rides Given' : '🧳 Rides Taken'}
            </button>
          ))}
        </div>
      )}

      {/* Period filter tabs */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'today', 'tomorrow', 'week', 'month', 'custom'] as const).map((p) => {
            const labels: Record<string, string> = {
              all: 'All', today: 'Today', tomorrow: 'Tomorrow', week: 'This Week', month: 'This Month', custom: '📅 Custom',
            };
            return (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  // Any period other than 'all' should include history so past rides are visible
                  if (p !== 'all' && !showHistory) {
                    setShowHistory(true);
                    if (tab === 'given') ridesApi.getGiven(undefined, true).then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; });
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                  period === p
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-gray-300 text-gray-500 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
        {/* Custom date range inputs */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        )}
      </div>

      {/* Seeker: awaiting approval — shown even when rides list is empty */}
      {!loading && tab === 'taken' && myRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">⏳ Awaiting Approval ({myRequests.length})</p>
          {myRequests.map((req: any) => (
            <div key={req.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-amber-100">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {req.ride?.originName ?? '?'} → {req.ride?.destinationName ?? '?'}
                </p>
                <p className="text-xs text-gray-500">
                  {req.ride?.rideGiver?.user?.fullName ?? 'Giver'} · {req.ride?.departureDate ? new Date(req.ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : ''} {req.ride?.departureTime ?? ''}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 shrink-0">⏳ PENDING</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : rides.length > 0 && applyPeriod(rides).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-gray-500 text-sm">No rides found for this period</p>
          <button onClick={() => setPeriod('all')} className="mt-2 text-xs text-brand-600 hover:underline">Clear filter →</button>
        </div>
      ) : rides.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-2">{tab === 'given' ? '🚗' : '🧳'}</div>
          <p className="text-gray-500 text-sm">No {tab === 'given' ? 'rides offered' : 'rides taken'} yet</p>
          {/* Giver: rides=[] means only completed/cancelled exist — let them load history */}
          {tab === 'given' && (
            <button onClick={() => {
              setShowHistory(true);
              ridesApi.getGiven(undefined, true).then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; });
            }} className="mt-3 text-xs text-brand-600 hover:underline">🕐 Load ride history</button>
          )}
          {tab === 'taken' && (
            <p className="mt-2 text-xs text-gray-400">
              Completed rides appear here after your Ride Giver marks the ride done.{' '}
              <a href="/requests" className="text-brand-600 hover:underline">View all your seat requests →</a>
            </p>
          )}
        </div>
      ) : rides.filter((r: any) => tab === 'given'
            ? ['PUBLISHED','ONGOING'].includes(r.status) && !r.archivedAt
            : ['PUBLISHED','ONGOING'].includes(r.status) && !r.archivedAt
          ).length === 0 && tab === 'given' && !showHistory ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-gray-500 text-sm">No active rides</p>
          <button onClick={() => {
            setShowHistory(true);
            ridesApi.getGiven(undefined, true).then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; });
          }} className="mt-2 text-xs text-brand-600 hover:underline">
            Show history →
          </button>
        </div>
      ) : (
        <div className="space-y-3">

          {(() => {
            const TERMINAL = ['COMPLETED', 'CANCELLED'];
            // Active list definitions:
            //   Giver  → PUBLISHED or ONGOING (not DRAFT, not terminal, not archived)
            //   Seeker → rides where their request is PENDING or CONFIRMED
            const isActiveForGiver = (r: any) =>
              ['PUBLISHED', 'ONGOING'].includes(r.status) && !r.archivedAt;
            const isActiveForSeeker = (r: any) => {
              const myReq = myRequests.find((req: any) => req.rideId === r.id);
              if (myReq) return ['PENDING', 'CONFIRMED'].includes(myReq.status);
              // fallback: show PUBLISHED/ONGOING rides the seeker is a participant on
              return ['PUBLISHED', 'ONGOING'].includes(r.status) && !r.archivedAt;
            };
            const periodRides = applyPeriod(rides);
            const visibleRides = showHistory
              ? periodRides
              : tab === 'given'
                ? periodRides.filter(isActiveForGiver)
                : periodRides.filter(isActiveForSeeker);
            // hiddenCount only applies to the given tab — taken tab always shows all rides
            const hiddenCount = tab === 'given' ? periodRides.length - visibleRides.length : 0;
            return (<>
              {tab === 'given' && hiddenCount > 0 && !showHistory && (
                <button
                  onClick={() => {
                    setShowHistory(true);
                    ridesApi.getGiven(undefined, true).then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; });
                  }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition"
                >
                  🕐 {hiddenCount} past ride{hiddenCount > 1 ? 's' : ''} in history — tap to view
                </button>
              )}
              {tab === 'given' && visibleRides.length === 0 && hiddenCount > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 text-sm">No active rides</p>
                  <button onClick={() => { setShowHistory(true); ridesApi.getGiven(undefined, true).then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; }); }} className="mt-2 text-xs text-brand-600 hover:underline">
                    Show {hiddenCount} completed / cancelled
                  </button>
                </div>
              )}
            </>);
          })()}
          {/* Taken tab: always show all rides incl. history. Given tab: respect showHistory toggle. */}
          {(tab === 'taken' || showHistory ? applyPeriod(rides) : applyPeriod(rides).filter((r: any) => !['COMPLETED', 'CANCELLED'].includes(r.status))).map((ride, idx, arr) => {
            // Pending requests section for giver PUBLISHED rides
            const pendingReqs = tab === 'given' && ride.status === 'PUBLISHED'
              ? (pendingMap[ride.id] ?? []).filter((r: any) => r.status === 'PENDING')
              : [];

            const actions = (
              <div className="space-y-2">
                {/* Pending requests */}
                {pendingReqs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">📥 Pending ({pendingReqs.length})</p>
                    {pendingReqs.map((req: any) => (
                      <div key={req.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                            {req.seeker?.user?.fullName?.[0] ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {req.seeker?.user?.trid && <span className="text-brand-600 mr-1">{req.seeker.user.trid}</span>}
                              {req.seeker?.user?.fullName ?? 'Seeker'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {req.seeker?.user?.companyName && <span>{req.seeker.user.companyName}</span>}
                              {req.pickupName && <span> · 📍 {req.pickupName}</span>}
                              {req.pickupLat && req.pickupLng && ride?.originLat && ride?.originLng && (
                                <span> · 📏 {formatDistance(haversineMeters(ride.originLat, ride.originLng, req.pickupLat, req.pickupLng))} from your location</span>
                              )}
                            </p>
                            {editingEta === req.id ? (
                              <div className="flex items-center gap-1 mt-1">
                                <input type="time" value={etaDraft} onChange={e => setEtaDraft(e.target.value)}
                                  className="text-xs px-2 py-1 border border-brand-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                <button onClick={() => saveEta(req.id, etaDraft)} className="text-xs bg-brand-600 text-white px-2 py-1 rounded-lg">Save</button>
                                <button onClick={() => setEditingEta(null)} className="text-xs text-gray-400 px-1">Cancel</button>
                                {etaOverrides[req.id] && <button onClick={() => saveEta(req.id, '')} className="text-xs text-red-400 px-1">Clear</button>}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 mt-0.5">
                                {etaOverrides[req.id] ? (
                                  <span className="text-xs text-brand-600 font-medium">🕐 Pickup at {etaOverrides[req.id]}</span>
                                ) : (() => {
                                  const eta = estimatePickupTime(ride?.departureTime, ride?.originLat, ride?.originLng, req.pickupLat, req.pickupLng);
                                  return eta ? <span className="text-xs text-gray-400">🕐 Est. ~{eta}</span> : null;
                                })()}
                                <button onClick={() => { setEditingEta(req.id); setEtaDraft(etaOverrides[req.id] ?? ''); }}
                                  className="text-xs text-gray-300 hover:text-brand-500 ml-1" title="Set pickup time">✏️</button>
                              </div>
                            )}
                          </div>
                          {req.seeker?.user?.phone && (
                            <CallButton phone={req.seeker.user.phone} countryCode={req.seeker.user.countryCode}
                              receiverId={req.seeker.userId} rideId={ride.id} label="Call" size="sm" variant="ghost" />
                          )}
                          <button onClick={() => handleApprove(req.id, ride.id)} disabled={processing === req.id}
                            className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">✅ Approve</button>
                          <button
                            onClick={() => { setRejectingId(req.id); setRejectReason(''); }}
                            disabled={processing === req.id}
                            className="text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0">
                            ❌ Reject
                          </button>
                        </div>
                        {rejectingId === req.id && (
                          <div className="flex gap-2 pl-8">
                            <input
                              autoFocus
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason (optional)"
                              className="flex-1 text-xs px-2.5 py-1.5 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
                            />
                            <button
                              onClick={() => handleReject(req.id, ride.id, rejectReason)}
                              disabled={processing === req.id}
                              className="text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 shrink-0">
                              Confirm
                            </button>
                            <button onClick={() => setRejectingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Action buttons */}
                {(() => {
                  const participants: any[] = ride.participants ?? [];
                  const waitingPassengers = participants.filter((p: any) => p.boardingStatus === 'WAITING');
                  const unresolvedPassengers = participants.filter(
                    (p: any) => p.boardingStatus !== 'DEBOARDED' && p.boardingStatus !== 'NO_SHOW'
                  );
                  const canComplete = unresolvedPassengers.length === 0;

                  return (
                    <div className="space-y-2">
                      {/* Boarding warning only relevant once ride is ONGOING */}

                      {/* ONGOING: no-show buttons for WAITING passengers */}
                      {tab === 'given' && ride.status === 'ONGOING' && waitingPassengers.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-red-500 font-medium">
                            ⚠️ {waitingPassengers.length} passenger(s) still waiting — mark no-show or wait for them to board before completing
                          </p>
                          {waitingPassengers.map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 flex-1">
                                {p.seeker?.user?.trid && <span className="text-brand-600 mr-1">{p.seeker.user.trid}</span>}
                                {p.seeker?.user?.fullName ?? 'Passenger'}
                              </span>
                              <button
                                onClick={() => handleNoShow(ride.id, p.seeker?.id)}
                                disabled={processing === p.seeker?.id}
                                className="text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0"
                              >
                                👻 Mark No-Show
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {tab === 'given' && ride.status === 'PUBLISHED' && (
                          <>
                            <button onClick={() => handleStart(ride.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">▶ Start Ride</button>
                            <button
                              onClick={() => setQuickMsgOpen(quickMsgOpen === ride.id ? null : ride.id)}
                              className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition"
                            >💬 Quick Message</button>
                          </>
                        )}
                        {tab === 'given' && ride.status === 'PUBLISHED' && quickMsgOpen === ride.id && (
                          <div className="w-full mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                            <p className="text-xs font-medium text-amber-800 mb-1">Send to all passengers:</p>
                            {[
                              { key: 'ARRIVED_AT_START', label: '🚗 I\'ve arrived at the starting point' },
                              { key: 'ON_MY_WAY',        label: '⏱ On my way, arriving in 5 min' },
                              { key: 'LOOK_FOR_MY_CAR',  label: '🅿️ I\'m at the pickup area — look for my car' },
                              { key: 'CALL_ME_GIVER',    label: '📞 Can\'t find you — please call me' },
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => sendQuickMessage(ride.id, key)}
                                disabled={quickMsgSending === key}
                                className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-amber-100 disabled:opacity-50 transition text-amber-900"
                              >
                                {quickMsgSending === key ? '⏳ Sending...' : label}
                              </button>
                            ))}
                          </div>
                        )}
                        {tab === 'given' && ride.status === 'ONGOING' && (
                          <>
                            <button
                              onClick={() => handleComplete(ride.id)}
                              disabled={!canComplete}
                              title={!canComplete ? 'Mark all passengers as deboarded or no-show first' : ''}
                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              ✅ Complete Ride
                            </button>
                            <Link href={`/tracking/${ride.id}?giver=true`} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">📡 Share Location</Link>
                            <button
                              onClick={() => setQuickMsgOpen(quickMsgOpen === ride.id ? null : ride.id)}
                              className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition"
                            >💬 Quick Message</button>
                          </>
                        )}
                        {tab === 'given' && ride.status === 'ONGOING' && quickMsgOpen === ride.id && (
                          <div className="w-full mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                            <p className="text-xs font-medium text-amber-800 mb-1">Send to all passengers:</p>
                            {[
                              { key: 'ARRIVED_AT_START', label: '🚗 I\'ve arrived at the starting point' },
                              { key: 'ON_MY_WAY',        label: '⏱ On my way, arriving in 5 min' },
                              { key: 'LOOK_FOR_MY_CAR',  label: '🅿️ I\'m at the pickup area — look for my car' },
                              { key: 'LEAVING_SOON',     label: '⚠️ Leaving in 2 min — please hurry' },
                              { key: 'CALL_ME_GIVER',    label: '📞 Can\'t find you — please call me' },
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => sendQuickMessage(ride.id, key)}
                                disabled={quickMsgSending === key}
                                className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-amber-100 disabled:opacity-50 transition text-amber-900"
                              >
                                {quickMsgSending === key ? '⏳ Sending...' : label}
                              </button>
                            ))}
                          </div>
                        )}
                        {tab === 'taken' && ride.status === 'PUBLISHED' && (() => {
                          const myParticipant = (ride.participants ?? []).find(
                            (p: any) => p.seeker?.userId === user?.id
                          );
                          if (!myParticipant) return null;
                          return (
                            <p className="w-full text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                              🎉 Seat confirmed! <span className="font-medium">Board Now</span> button will appear once the Ride Giver starts the ride.
                            </p>
                          );
                        })()}
                        {tab === 'taken' && ride.status === 'ONGOING' && (() => {
                          const myParticipant = (ride.participants ?? []).find(
                            (p: any) => p.seeker?.userId === user?.id
                          );
                          const bs = myParticipant?.boardingStatus;
                          return (
                            <>
                              {bs === 'WAITING' && (
                                <button
                                  onClick={() => handleBoard(ride.id)}
                                  disabled={processing === ride.id}
                                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                                >
                                  ✅ I've Boarded
                                </button>
                              )}
                              {bs === 'BOARDED' && (
                                <button
                                  onClick={() => handleDeboard(ride.id)}
                                  disabled={processing === ride.id}
                                  className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
                                >
                                  🏁 I've Deboarded
                                </button>
                              )}
                              <Link href={`/tracking/${ride.id}`} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">📍 Track Live</Link>
                              <button
                                onClick={() => setQuickMsgOpen(quickMsgOpen === ride.id ? null : ride.id)}
                                className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition"
                              >💬 Quick Message</button>
                            </>
                          );
                        })()}
                        {tab === 'taken' && ride.status === 'ONGOING' && quickMsgOpen === ride.id && (
                          <div className="w-full mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                            <p className="text-xs font-medium text-amber-800 mb-1">Send to your Ride Giver:</p>
                            {[
                              { key: 'AT_PICKUP',      label: '📍 I\'m at the pickup point' },
                              { key: 'RUNNING_LATE',   label: '🙏 Running late, please wait 5 min' },
                              { key: 'ALMOST_THERE',   label: '🏃 Almost there, 1 min away' },
                              { key: 'CAN_SEE_CAR',    label: '✅ I can see your car — coming now' },
                              { key: 'CALL_ME_SEEKER', label: '📞 Can\'t find you — please call me' },
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => sendQuickMessage(ride.id, key)}
                                disabled={quickMsgSending === key}
                                className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-amber-100 disabled:opacity-50 transition text-amber-900"
                              >
                                {quickMsgSending === key ? '⏳ Sending...' : label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );

            const isTerminalRide = ['COMPLETED', 'CANCELLED'].includes(ride.status);
            // Show a "Past Rides" divider before the first terminal ride in the taken tab (when mixed with active)
            const prevRide = arr[idx - 1];
            const showPastDivider = tab === 'taken' && isTerminalRide && prevRide && !['COMPLETED', 'CANCELLED'].includes(prevRide.status);
            return (
              <div key={ride.id}>
                {showPastDivider && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1 px-1">🕐 Past Rides</p>
                )}
                <div className={isTerminalRide ? 'opacity-55' : ''}>
                  <RideCard
                    ride={ride}
                    viewAs={tab === 'given' ? 'giver' : 'seeker'}
                    actions={actions}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
