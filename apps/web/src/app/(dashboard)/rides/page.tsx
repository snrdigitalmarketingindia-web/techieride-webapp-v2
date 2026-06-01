'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ridesApi, requestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CallButton } from '@/components/ui/CallButton';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  DRAFT: 'bg-yellow-100 text-yellow-700',
};

const BOARDING_BADGE: Record<string, { label: string; cls: string }> = {
  WAITING:   { label: '⏳ Waiting',   cls: 'bg-yellow-100 text-yellow-700' },
  BOARDED:   { label: '✅ Boarded',   cls: 'bg-green-100 text-green-700' },
  DEBOARDED: { label: '🏁 Deboarded', cls: 'bg-gray-100 text-gray-500' },
  NO_SHOW:   { label: '👻 No-show',   cls: 'bg-red-100 text-red-500' },
};

export default function MyRidesPage() {
  const { user } = useAuthStore();
  const role = user?.role;
  const isGiver  = role === 'RIDE_GIVER' || role === 'BOTH';
  const isSeeker = role === 'RIDE_SEEKER' || role === 'BOTH';

  const [tab, setTab] = useState<'given' | 'taken'>(isGiver ? 'given' : 'taken');
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  // Giver: pending requests per ride  { rideId: req[] }
  const [pendingMap, setPendingMap] = useState<Record<string, any[]>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  // Seeker: pending/active requests not yet confirmed
  const [myRequests, setMyRequests] = useState<any[]>([]);

  // Check for active ride once on mount so Offer Ride button reflects real state
  useEffect(() => {
    if (!isGiver) return;
    ridesApi.getGiven().then((r) => {
      const active = (r.data ?? []).some((ride: any) =>
        ['PUBLISHED', 'ONGOING'].includes(ride.status)
      );
      setHasActiveRide(active);
    }).catch(() => {});
  }, [isGiver]);

  useEffect(() => {
    setLoading(true);
    const fetch = tab === 'given' ? ridesApi.getGiven() : ridesApi.getTaken();
    fetch.then((r) => setRides(r.data ?? [])).finally(() => setLoading(false));
    // Load seeker's pending requests when on taken tab
    if (tab === 'taken' && isSeeker) {
      requestsApi.getMine().then((r) => {
        const pending = (r.data ?? []).filter((req: any) =>
          ['PENDING'].includes(req.status)
        );
        setMyRequests(pending);
      }).catch(() => {});
    }
  }, [tab]);

  const reloadPending = async (rideId: string) => {
    const res = await requestsApi.getIncoming(rideId).catch(() => ({ data: [] }));
    setPendingMap((prev) => ({ ...prev, [rideId]: res.data }));
  };

  // Load pending requests for all PUBLISHED rides when given tab loads
  useEffect(() => {
    if (tab !== 'given') return;
    rides.filter((r) => r.status === 'PUBLISHED').forEach((r) => reloadPending(r.id));
  }, [rides, tab]);

  const handleApprove = async (reqId: string, rideId: string) => {
    setProcessing(reqId);
    await requestsApi.approve(reqId).catch(() => {});
    await reloadPending(rideId);
    // refresh ride to update seat count
    ridesApi.getGiven().then((r) => setRides(r.data ?? []));
    setProcessing(null);
  };

  const handleReject = async (reqId: string, rideId: string) => {
    setProcessing(reqId);
    await requestsApi.reject(reqId).catch(() => {});
    await reloadPending(rideId);
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

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : rides.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-2">{tab === 'given' ? '🚗' : '🧳'}</div>
          <p className="text-gray-500 text-sm">No {tab === 'given' ? 'rides offered' : 'rides taken'} yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Seeker: pending requests awaiting giver approval */}
          {tab === 'taken' && myRequests.length > 0 && (
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

          {rides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{ride.originName} → {ride.destinationName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📅 {new Date(ride.departureDate).toLocaleDateString()} · 🕐 {ride.departureTime}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{ride.vehicle?.make} {ride.vehicle?.model}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status]}`}>{ride.status}</span>
              </div>

              {tab === 'given' && (
                <div className="space-y-3">
                  {/* Participants list */}
                  {ride.participants?.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">👥 Passengers ({ride.participants.length})</p>
                      {ride.participants.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2">
                          {/* Avatar */}
                          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                            {p.seeker?.user?.fullName?.[0] || '?'}
                          </div>

                          {/* Name + pickup */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{p.seeker?.user?.fullName || 'Seeker'}</p>
                            {p.pickupName && <p className="text-xs text-gray-400 truncate">📍 {p.pickupName}</p>}
                          </div>

                          {/* Boarding status badge */}
                          {p.boardingStatus && BOARDING_BADGE[p.boardingStatus] && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${BOARDING_BADGE[p.boardingStatus].cls}`}>
                              {BOARDING_BADGE[p.boardingStatus].label}
                            </span>
                          )}

                          {/* Call — disabled for no-shows */}
                          {p.seeker?.user?.phone && p.boardingStatus !== 'NO_SHOW' && (
                            <CallButton
                              phone={p.seeker.user.phone}
                              countryCode={p.seeker.user.countryCode}
                              receiverId={p.seeker.userId}
                              rideId={ride.id}
                              label="Call"
                              size="sm"
                              variant="ghost"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Pending requests inline for PUBLISHED rides */}
                  {ride.status === 'PUBLISHED' && (() => {
                    const pending = (pendingMap[ride.id] ?? []).filter((r: any) => r.status === 'PENDING');
                    if (pending.length === 0) return null;
                    return (
                      <div className="border-t border-amber-100 pt-3 space-y-2">
                        <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">📥 Pending Requests ({pending.length})</p>
                        {pending.map((req: any) => (
                          <div key={req.id} className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                              {req.seeker?.user?.fullName?.[0] ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{req.seeker?.user?.fullName ?? 'Seeker'}</p>
                              {req.pickupName && <p className="text-xs text-gray-400 truncate">📍 {req.pickupName}</p>}
                            </div>
                            {req.seeker?.user?.phone && (
                              <CallButton phone={req.seeker.user.phone} countryCode={req.seeker.user.countryCode}
                                receiverId={req.seeker.userId} rideId={ride.id} label="Call" size="sm" variant="ghost" />
                            )}
                            <button onClick={() => handleApprove(req.id, ride.id)} disabled={processing === req.id}
                              className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">
                              ✅ Approve
                            </button>
                            <button onClick={() => handleReject(req.id, ride.id)} disabled={processing === req.id}
                              className="text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0">
                              ❌ Reject
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {ride.status === 'PUBLISHED' && (
                      <button onClick={() => handleStart(ride.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                        ▶ Start Ride
                      </button>
                    )}
                    {ride.status === 'ONGOING' && (
                      <>
                        <button onClick={() => handleComplete(ride.id)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                          ✅ Complete Ride
                        </button>
                        <Link href={`/tracking/${ride.id}?giver=true`} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
                          📡 Share Location
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === 'taken' && (
                <div className="flex gap-2 flex-wrap items-center">
                  {ride.rideGiver?.user?.phone && (
                    <CallButton
                      phone={ride.rideGiver.user.phone}
                      countryCode={ride.rideGiver.user.countryCode}
                      receiverId={ride.rideGiver.userId}
                      rideId={ride.id}
                      label="Call Giver"
                      size="sm"
                      variant="ghost"
                    />
                  )}
                  {ride.status === 'ONGOING' && (
                    <Link href={`/tracking/${ride.id}`} className="inline-flex items-center gap-1 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
                      📍 Track Live
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
