'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { ridesApi, gamificationApi, requestsApi } from '@/lib/api';
import { RideCard } from '@/components/ui/RideCard';
import { CallButton } from '@/components/ui/CallButton';
import { RideStatus, EcoLevel } from '@techieride/shared';

const ECO_BADGES: Record<string, string> = {
  SEED: '🌱', SPROUT: '🌿', LEAF: '🍃', TREE: '🌳', FOREST: '🌲',
};

const TRUST_BAND: Record<string, { icon: string; color: string }> = {
  NEW:      { icon: '🆕', color: 'bg-gray-100 text-gray-600' },
  BRONZE:   { icon: '🥉', color: 'bg-orange-100 text-orange-700' },
  SILVER:   { icon: '🥈', color: 'bg-slate-100 text-slate-700' },
  GOLD:     { icon: '🥇', color: 'bg-yellow-100 text-yellow-700' },
  PLATINUM: { icon: '💎', color: 'bg-purple-100 text-purple-700' },
};


export default function DashboardPage() {
  const { user } = useAuthStore();
  const role     = user?.role;
  const isGiver  = role === 'RIDE_GIVER' || role === 'ADMIN';
  const isSeeker = role === 'RIDE_SEEKER' || role === 'RIDE_GIVER' || role === 'ADMIN';

  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [bookedRides, setBookedRides] = useState<any[]>([]);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [ecoSummary, setEcoSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState<Record<string, any[]>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const ridesRef = useRef<any[]>([]);

  const reloadPending = (rides: any[]) => {
    rides.filter((r: any) => r.status === 'PUBLISHED').forEach((r: any) => {
      requestsApi.getIncoming(r.id).then((res) => {
        setPendingMap((prev) => ({ ...prev, [r.id]: res.data ?? [] }));
      }).catch(() => {});
    });
  };

  useEffect(() => {
    if (!user) return;
    if (isGiver) {
      ridesApi.getGiven().then((r) => {
        const all = r.data ?? [];
        setHasActiveRide(all.some((ride: any) => ['PUBLISHED', 'ONGOING'].includes(ride.status)));
        const top3 = all.slice(0, 3);
        setUpcomingRides(top3);
        ridesRef.current = top3;
        reloadPending(top3);
      });
    }
    if (isSeeker) {
      // Check for active seeker requests (PENDING or CONFIRMED = ride accepted but not yet completed)
      requestsApi.getMine().then((r) => {
        const active = (r.data ?? []).some((req: any) => ['PENDING', 'CONFIRMED'].includes(req.status));
        setHasActiveRequest(active);
      });
      // Always fetch taken rides for seeker — for RIDE_GIVER shown as second section
      ridesApi.getTaken().then((res) => {
        const top3 = (res.data ?? []).slice(0, 3);
        if (isGiver) {
          setBookedRides(top3);   // RIDE_GIVER: separate section below given rides
        } else {
          setUpcomingRides(top3); // Seeker-only: main section
          ridesRef.current = top3;
        }
      });
    }
    gamificationApi.getSummary().then((r) => setEcoSummary(r.data)).finally(() => setLoading(false));
  }, [user?.role]);

  // Poll every 15s so new ride requests appear without manual refresh
  useEffect(() => {
    if (!isGiver) return;
    const id = setInterval(() => reloadPending(ridesRef.current), 15000);
    return () => clearInterval(id);
  }, [isGiver]);

  const refreshTaken = () => {
    ridesApi.getTaken().then((r) => {
      const top3 = (r.data ?? []).slice(0, 3);
      if (isGiver) setBookedRides(top3);
      else { setUpcomingRides(top3); ridesRef.current = top3; }
    });
    // Re-check active requests so Offer Ride re-enables after deboard/no-show
    requestsApi.getMine().then((r) => {
      setHasActiveRequest((r.data ?? []).some((req: any) => ['PENDING', 'CONFIRMED'].includes(req.status)));
    });
  };

  const handleBoard = async (rideId: string) => {
    setProcessing(rideId);
    await ridesApi.board(rideId).catch(() => {});
    refreshTaken();
    setProcessing(null);
  };

  const handleDeboard = async (rideId: string) => {
    setProcessing(rideId);
    await ridesApi.deboard(rideId).catch(() => {});
    refreshTaken();
    setProcessing(null);
  };

  const handleApprove = async (reqId: string, rideId: string) => {
    setProcessing(reqId);
    await requestsApi.approve(reqId).catch(() => {});
    const res = await requestsApi.getIncoming(rideId).catch(() => ({ data: [] }));
    setPendingMap((prev) => ({ ...prev, [rideId]: res.data ?? [] }));
    setProcessing(null);
  };

  const handleReject = async (reqId: string, rideId: string, reason: string) => {
    setProcessing(reqId);
    await requestsApi.reject(reqId, reason || undefined).catch(() => {});
    const res = await requestsApi.getIncoming(rideId).catch(() => ({ data: [] }));
    setPendingMap((prev) => ({ ...prev, [rideId]: res.data ?? [] }));
    setRejectingId(null);
    setRejectReason('');
    setProcessing(null);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* AGM announcement banner */}
      <div className="relative flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 shadow-sm overflow-hidden">
        {/* Subtle pulse ring */}
        <span className="relative flex items-center justify-center shrink-0">
          <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-yellow-300 opacity-40" />
          <span className="relative text-xl">📢</span>
        </span>
        <p className="flex-1 text-sm font-medium text-yellow-800">
          TechieRide's <strong>AGM Meeting 2026</strong> | <strong>21 June 2026</strong>
        </p>
      </div>

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {ECO_BADGES[user?.ecoLevel || 'SEED']} {user?.ecoLevel} · {user?.ecoPoints || 0} ECO points
          {user?.trustBand && (() => {
            const tb = TRUST_BAND[user.trustBand] ?? TRUST_BAND.NEW;
            return (
              <span className={`ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tb.color}`}>
                {tb.icon} {user.trustBand} · {user.trustScore ?? 0} pts
              </span>
            );
          })()}
        </p>
      </div>

      {/* Account status banners */}
      {user?.accountStatus === 'EMAIL_VERIFICATION_PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-amber-800 text-sm font-medium">📧 Verify your email</p>
              <p className="text-amber-700 text-sm">Check your office inbox for the verification link.</p>
            </div>
            <Link href="/verify-email" className="shrink-0 text-sm text-amber-700 font-medium underline">Resend</Link>
          </div>
          <p className="text-xs text-amber-600">
            Can't access your company email?{' '}
            <Link href="/exception-verification" className="underline font-medium">Request a manual exception →</Link>
          </p>
        </div>
      )}
      {user?.accountStatus === 'EXCEPTION_VERIFICATION_REQUESTED' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm font-medium">🔍 Manual verification requested</p>
          <p className="text-blue-700 text-sm">Admin is reviewing your exception request. You'll be notified within 2 business days.</p>
        </div>
      )}
      {user?.accountStatus === 'DOCUMENT_VERIFICATION_PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-amber-800 text-sm font-medium">📋 Upload your documents</p>
            <p className="text-amber-700 text-sm">Upload your company ID card to complete verification.</p>
          </div>
          <Link href="/profile" className="text-sm text-amber-700 font-medium underline">Upload</Link>
        </div>
      )}
      {user?.accountStatus === 'EMPLOYEE_VERIFIED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-green-800 text-sm font-medium">✅ Employee verified — {user.trid}</p>
            <p className="text-green-700 text-sm">You can search and book rides. Want to offer rides too?</p>
          </div>
          <Link href="/become-giver" className="text-sm text-green-700 font-medium underline">Become a Giver →</Link>
        </div>
      )}
      {user?.accountStatus === 'DRIVER_VERIFICATION_PENDING' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm font-medium">🚗 Ride Giver verification in progress</p>
          <p className="text-blue-700 text-sm">Your driving license and RC are being reviewed.</p>
        </div>
      )}
      {user?.accountStatus === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-red-800 text-sm font-medium">❌ Verification rejected</p>
            <p className="text-red-700 text-sm">Please re-upload your documents</p>
          </div>
          <Link href="/profile" className="text-sm text-red-700 font-medium underline">Re-upload</Link>
        </div>
      )}

      {/* Quick actions — role-aware */}
      <div className="grid grid-cols-2 gap-3">
        {isGiver && (
          (hasActiveRide || hasActiveRequest) ? (
            <div title={hasActiveRequest ? "Cancel your active ride request before offering a ride" : "Complete or cancel your active ride before offering a new one"}
              className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center gap-3 opacity-50 cursor-not-allowed select-none">
              <span className="text-2xl">🚗</span>
              <span className="font-medium text-gray-400">Offer Ride</span>
            </div>
          ) : (
            <Link href="/rides/create" className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3 hover:opacity-80 transition">
              <span className="text-2xl">🚗</span>
              <span className="font-medium text-gray-800">Offer Ride</span>
            </Link>
          )
        )}
        {[
          isSeeker && { href: '/rides/search',      icon: '🔍', label: 'Find Rides',  color: 'bg-blue-50 border-blue-200'     },
                       { href: '/rides',             icon: '📋', label: 'My Rides',   color: 'bg-purple-50 border-purple-200' },
                       { href: '/rides/leaderboard', icon: '🏆', label: 'Leaderboard',color: 'bg-yellow-50 border-yellow-200' },
        ].filter(Boolean).map((a: any) => (
          <Link key={a.href} href={a.href} className={`${a.color} border rounded-xl p-4 flex items-center gap-3 hover:opacity-80 transition`}>
            <span className="text-2xl">{a.icon}</span>
            <span className="font-medium text-gray-800">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Upcoming rides */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">{isGiver ? 'My Upcoming Rides' : 'My Booked Rides'}</h2>
          <Link href="/rides" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : upcomingRides.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-2">{isGiver ? '🚗' : '🧳'}</div>
            <p className="text-gray-500 text-sm">{isGiver ? 'No upcoming rides' : 'No booked rides yet'}</p>
            {isGiver ? (
              <Link href="/rides/create" className="inline-block mt-3 text-sm text-brand-600 font-medium hover:underline">
                Offer your first ride →
              </Link>
            ) : (
              <Link href="/rides/board" className="inline-block mt-3 text-sm text-brand-600 font-medium hover:underline">
                Find a ride →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingRides.map((ride) => {
              const pendingReqs = (pendingMap[ride.id] ?? []).filter((r: any) => r.status === 'PENDING');

              // Seeker board/deboard actions
              if (!isGiver && ride.status === 'ONGOING') {
                const myParticipant = (ride.participants ?? []).find(
                  (p: any) => p.seeker?.userId === user?.id
                );
                const bs = myParticipant?.boardingStatus;
                const seekerActions = (
                  <div className="flex gap-2 flex-wrap">
                    {bs === 'WAITING' && (
                      <button onClick={() => handleBoard(ride.id)} disabled={processing === ride.id}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                        ✅ I've Boarded
                      </button>
                    )}
                    {bs === 'BOARDED' && (
                      <button onClick={() => handleDeboard(ride.id)} disabled={processing === ride.id}
                        className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                        🏁 I've Deboarded
                      </button>
                    )}
                    <Link href={`/tracking/${ride.id}`} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
                      📍 Track Live
                    </Link>
                  </div>
                );
                return <RideCard key={ride.id} ride={ride} viewAs="seeker" actions={seekerActions} />;
              }

              const actions = pendingReqs.length > 0 ? (
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
              ) : undefined;
              return <RideCard key={ride.id} ride={ride} viewAs={isGiver ? 'giver' : 'seeker'} actions={actions} />;
            })}
          </div>
        )}
      </div>

      {/* Booked rides — shown for RIDE_GIVER (also a seeker) below their given rides */}
      {isGiver && isSeeker && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">My Booked Rides</h2>
            <Link href="/rides" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          {bookedRides.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-400 text-sm">No booked rides</p>
              <Link href="/rides/search" className="inline-block mt-2 text-sm text-brand-600 hover:underline">Find a ride →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookedRides.map((ride) => {
                const myParticipant = (ride.participants ?? []).find(
                  (p: any) => p.seeker?.userId === user?.id
                );
                const bs = myParticipant?.boardingStatus;
                const seekerActions = ride.status === 'ONGOING' ? (
                  <div className="flex gap-2 flex-wrap">
                    {bs === 'WAITING' && (
                      <button onClick={() => handleBoard(ride.id)} disabled={processing === ride.id}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                        ✅ I've Boarded
                      </button>
                    )}
                    {bs === 'BOARDED' && (
                      <button onClick={() => handleDeboard(ride.id)} disabled={processing === ride.id}
                        className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                        🏁 I've Deboarded
                      </button>
                    )}
                  </div>
                ) : undefined;
                return <RideCard key={ride.id} ride={ride} viewAs="seeker" actions={seekerActions} />;
              })}
            </div>
          )}
        </div>
      )}

      {/* ECO impact */}
      {ecoSummary && (
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-5 text-white">
          <p className="text-brand-100 text-sm font-medium mb-1">🌍 Your ECO Impact</p>
          <p className="text-3xl font-bold">{ecoSummary.co2SavedKg} kg CO₂</p>
          <p className="text-brand-200 text-sm mt-1">saved across {ecoSummary.totalRides || 0} rides</p>
        </div>
      )}
    </div>
  );
}
