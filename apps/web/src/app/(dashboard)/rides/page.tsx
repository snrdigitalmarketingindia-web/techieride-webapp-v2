'use client';

import { useEffect, useState } from 'react';
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
  // Giver: pending requests per ride  { rideId: req[] }
  const [pendingMap, setPendingMap] = useState<Record<string, any[]>>({});
  const [processing, setProcessing] = useState<string | null>(null);
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
    fetch.then((r) => setRides(r.data ?? [])).finally(() => setLoading(false));
    if (tab === 'taken' && isSeeker) {
      requestsApi.getMine().then((r) => {
        const pending = (r.data ?? []).filter((req: any) =>
          ['PENDING'].includes(req.status)
        );
        setMyRequests(pending);
      }).catch(() => {});
    }
  }, [tab]); // tab is only updated after role is known — no need for user?.role here

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

          {rides.map((ride) => {
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
                      <div key={req.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                          {req.seeker?.user?.fullName?.[0] ?? '?'}
                        </div>
                        <p className="text-xs font-medium text-gray-800 flex-1 truncate">{req.seeker?.user?.fullName ?? 'Seeker'}</p>
                        {req.seeker?.user?.phone && (
                          <CallButton phone={req.seeker.user.phone} countryCode={req.seeker.user.countryCode}
                            receiverId={req.seeker.userId} rideId={ride.id} label="Call" size="sm" variant="ghost" />
                        )}
                        <button onClick={() => handleApprove(req.id, ride.id)} disabled={processing === req.id}
                          className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">✅ Approve</button>
                        <button onClick={() => handleReject(req.id, ride.id)} disabled={processing === req.id}
                          className="text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0">❌ Reject</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {tab === 'given' && ride.status === 'PUBLISHED' && (
                    <button onClick={() => handleStart(ride.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">▶ Start Ride</button>
                  )}
                  {tab === 'given' && ride.status === 'ONGOING' && (
                    <>
                      <button onClick={() => handleComplete(ride.id)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">✅ Complete Ride</button>
                      <Link href={`/tracking/${ride.id}?giver=true`} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">📡 Share Location</Link>
                    </>
                  )}
                  {tab === 'taken' && ride.status === 'ONGOING' && (
                    <Link href={`/tracking/${ride.id}`} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">📍 Track Live</Link>
                  )}
                </div>
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
