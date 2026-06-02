'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { ridesApi, gamificationApi, requestsApi } from '@/lib/api';
import { RideCard } from '@/components/ui/RideCard';
import { RideStatus, EcoLevel } from '@techieride/shared';

const ECO_BADGES: Record<string, string> = {
  SEED: '🌱', SPROUT: '🌿', LEAF: '🍃', TREE: '🌳', FOREST: '🌲',
};


export default function DashboardPage() {
  const { user } = useAuthStore();
  const role     = user?.role;
  const isGiver  = role === 'RIDE_GIVER' || role === 'BOTH';
  const isSeeker = role === 'RIDE_SEEKER' || role === 'BOTH';

  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [ecoSummary, setEcoSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!user) return; // wait for auth hydration so role is correct
    const ridesFetch = isGiver
      ? ridesApi.getGiven().then((r) => r.data.slice(0, 3))
      : ridesApi.getTaken().then((r) => r.data.slice(0, 3));
    Promise.all([
      ridesFetch.then((rides) => {
        setUpcomingRides(rides);
        if (isGiver) {
          rides.filter((r: any) => r.status === 'PUBLISHED').forEach((r: any) => {
            requestsApi.getIncoming(r.id).then((res) => {
              const pending = (res.data ?? []).filter((req: any) => req.status === 'PENDING');
              if (pending.length > 0) setPendingMap((prev) => ({ ...prev, [r.id]: pending }));
            }).catch(() => {});
          });
        }
      }),
      gamificationApi.getSummary().then((r) => setEcoSummary(r.data)),
    ]).finally(() => setLoading(false));
  }, [user?.role]);

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
            {upcomingRides.map((ride) => {
              const pending = pendingMap[ride.id] ?? [];
              const actions = pending.length > 0 ? (
                <Link href="/rides" className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">📥 {pending.length} pending request{pending.length > 1 ? 's' : ''}</span>
                  <span className="text-brand-600 hover:underline">Manage →</span>
                </Link>
              ) : undefined;
              return <RideCard key={ride.id} ride={ride} viewAs={isGiver ? 'giver' : 'seeker'} actions={actions} />;
            })}
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
