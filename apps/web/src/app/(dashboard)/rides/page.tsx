'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ridesApi, requestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CallButton } from '@/components/ui/CallButton';
import { RideCard } from '@/components/ui/RideCard';

export default function MyRidesPage() {
  const { user, _hasHydrated } = useAuthStore();
  const role = user?.role;
  const isGiver  = role === 'RIDE_GIVER' || role === 'BOTH';
  const isSeeker = role === 'RIDE_SEEKER' || role === 'BOTH';

  // Default 'given' — corrected to 'taken' once role is known for pure seekers
  const [tab, setTab] = useState<'given' | 'taken'>('given');
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Giver: pending requests per ride  { rideId: req[] }
  const [pendingMap, setPendingMap] = useState<Record<string, any[]>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const ridesRef = useRef<any[]>([]);
  // Seeker: pending/active requests not yet confirmed
  const [myRequests, setMyRequests] = useState<any[]>([]);

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

  // Fetch rides when tab changes — tab is only set after user hydrates (see effect above)
  // so this naturally waits for the correct role before fetching.
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetch = tab === 'given' ? ridesApi.getGiven() : ridesApi.getTaken();
    fetch.then((r) => { setRides(r.data ?? []); ridesRef.current = r.data ?? []; }).finally(() => setLoading(false));
    if (tab === 'taken' && isSeeker) reloadMyRequests();
  }, [tab]); // tab is only updated after role is known — no need for user?.role here

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Rides</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
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

      {/* Only show tabs for BOTH role — pure giver or seeker sees no tab */}
      {isGiver && isSeeker && (
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['given', 'taken'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {t === 'given' ? '🚗 Rides Given' : '🧳 Rides Taken'}
            </button>
          ))}
        </div>
      )}

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
                  {req.ride?.rideGiver?.user?.fullName ?? 'Giver'} · {req.ride?.departureDate ? new Date(req.ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} {req.ride?.departureTime ?? ''}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 shrink-0">⏳ PENDING</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : rides.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-2">{tab === 'given' ? '🚗' : '🧳'}</div>
          <p className="text-gray-500 text-sm">No {tab === 'given' ? 'rides offered' : 'rides taken'} yet</p>
        </div>
      ) : rides.filter((r: any) => !['COMPLETED','CANCELLED'].includes(r.status)).length === 0 && !showHistory ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-gray-500 text-sm">No active rides</p>
          <button onClick={() => setShowHistory(true)} className="mt-2 text-xs text-brand-600 hover:underline">
            Show {rides.length} completed / cancelled ride{rides.length > 1 ? 's' : ''}
          </button>
        </div>
      ) : (
        <div className="space-y-3">

          {(() => {
            const TERMINAL = ['COMPLETED', 'CANCELLED'];
            const visibleRides = showHistory ? rides : rides.filter((r: any) => !TERMINAL.includes(r.status));
            const hiddenCount = rides.length - visibleRides.length;
            return (<>
              {hiddenCount > 0 && !showHistory && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition"
                >
                  + {hiddenCount} completed / cancelled ride{hiddenCount > 1 ? 's' : ''} hidden — Show History
                </button>
              )}
              {visibleRides.length === 0 && hiddenCount > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 text-sm">No active rides</p>
                  <button onClick={() => setShowHistory(true)} className="mt-2 text-xs text-brand-600 hover:underline">
                    Show {hiddenCount} completed / cancelled
                  </button>
                </div>
              )}
            </>);
          })()}
          {(showHistory ? rides : rides.filter((r: any) => !['COMPLETED', 'CANCELLED'].includes(r.status))).map((ride) => {
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
                      {/* PUBLISHED: warn if passengers haven't boarded */}
                      {tab === 'given' && ride.status === 'PUBLISHED' && waitingPassengers.length > 0 && (
                        <p className="text-xs text-amber-600">
                          ⚠️ {waitingPassengers.length} passenger(s) yet to board — ask them to tap Board, or start as override
                        </p>
                      )}

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
                          <button onClick={() => handleStart(ride.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">▶ Start Ride</button>
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
                          </>
                        )}
                        {tab === 'taken' && ride.status === 'ONGOING' && (
                          <Link href={`/tracking/${ride.id}`} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">📍 Track Live</Link>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );

            return (
              <RideCard
                key={ride.id}
                ride={ride}
                viewAs={tab === 'given' ? 'giver' : 'seeker'}
                actions={actions}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
