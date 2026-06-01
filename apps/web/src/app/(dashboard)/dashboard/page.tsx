'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { ridesApi, gamificationApi } from '@/lib/api';
import { CallButton } from '@/components/ui/CallButton';
import { RideStatus, EcoLevel } from '@techieride/shared';

const ECO_BADGES: Record<string, string> = {
  SEED: '🌱', SPROUT: '🌿', LEAF: '🍃', TREE: '🌳', FOREST: '🌲',
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  DRAFT: 'bg-yellow-100 text-yellow-700',
};

const BOARDING_BADGE: Record<string, { label: string; cls: string }> = {
  WAITING:   { label: '⏳ Waiting',   cls: 'bg-yellow-100 text-yellow-700' },
  BOARDED:   { label: '✅ Boarded',   cls: 'bg-green-100 text-green-700'   },
  DEBOARDED: { label: '🏁 Deboarded', cls: 'bg-gray-100 text-gray-500'     },
  NO_SHOW:   { label: '👻 No-show',   cls: 'bg-red-100 text-red-500'       },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role     = user?.role;
  const isGiver  = role === 'RIDE_GIVER' || role === 'BOTH';
  const isSeeker = role === 'RIDE_SEEKER' || role === 'BOTH';

  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [ecoSummary, setEcoSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ridesFetch = isGiver
      ? ridesApi.getGiven().then((r) => r.data.slice(0, 3))
      : ridesApi.getTaken().then((r) => r.data.slice(0, 3));
    Promise.all([
      ridesFetch.then(setUpcomingRides),
      gamificationApi.getSummary().then((r) => setEcoSummary(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {ECO_BADGES[user?.ecoLevel || 'SEED']} {user?.ecoLevel} · {user?.ecoPoints || 0} ECO points
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
          <p className="text-blue-800 text-sm font-medium">🚗 Driver verification in progress</p>
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
        {[
          isGiver  && { href: '/rides/create',      icon: '🚗', label: 'Offer Ride',  color: 'bg-brand-50 border-brand-200'   },
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
            {upcomingRides.map((ride) => (
              <div key={ride.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                {/* Ride header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{ride.originName} → {ride.destinationName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(ride.departureDate).toLocaleDateString()} · {ride.departureTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isGiver && ride.totalSeats && (
                      <span className="text-xs text-gray-400">{ride.availableSeats}/{ride.totalSeats} seats</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status]}`}>{ride.status}</span>
                    <Link href={`/rides/${ride.id}`} className="text-xs text-brand-600 font-medium hover:underline">View →</Link>
                  </div>
                </div>

                {/* Giver view: participants with boarding status + call */}
                {isGiver && ride.participants?.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 space-y-1.5">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">👥 Passengers</p>
                    {ride.participants.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                          {p.seeker?.user?.fullName?.[0] ?? '?'}
                        </div>
                        <p className="text-xs text-gray-800 flex-1 truncate">{p.seeker?.user?.fullName ?? 'Seeker'}</p>
                        {p.boardingStatus && BOARDING_BADGE[p.boardingStatus] && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${BOARDING_BADGE[p.boardingStatus].cls}`}>
                            {BOARDING_BADGE[p.boardingStatus].label}
                          </span>
                        )}
                        {p.seeker?.user?.phone && p.boardingStatus !== 'NO_SHOW' && (
                          <CallButton phone={p.seeker.user.phone} countryCode={p.seeker.user.countryCode}
                            receiverId={p.seeker.userId} rideId={ride.id} label="Call" size="sm" variant="ghost" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Seeker view: giver contact + call */}
                {isSeeker && !isGiver && ride.rideGiver?.user && (
                  <div className="border-t border-gray-100 pt-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {ride.rideGiver.user.fullName?.[0] ?? '?'}
                    </div>
                    <p className="text-xs text-gray-700 flex-1 truncate">{ride.rideGiver.user.fullName}</p>
                    {ride.rideGiver.user.phone && (
                      <CallButton phone={ride.rideGiver.user.phone} countryCode={ride.rideGiver.user.countryCode}
                        receiverId={ride.rideGiver.userId} rideId={ride.id} label="Call Giver" size="sm" variant="ghost" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
