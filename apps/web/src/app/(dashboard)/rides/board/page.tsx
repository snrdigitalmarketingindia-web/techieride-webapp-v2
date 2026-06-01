'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ridesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const ECO_BADGES: Record<string, { icon: string; color: string }> = {
  SEED:   { icon: '🌱', color: 'text-green-600' },
  SPROUT: { icon: '🌿', color: 'text-green-600' },
  LEAF:   { icon: '🍃', color: 'text-green-700' },
  TREE:   { icon: '🌳', color: 'text-brand-700' },
  FOREST: { icon: '🌲', color: 'text-brand-800' },
};

function timeSlot(time: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const [h] = time.split(':').map(Number);
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

const SLOT_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  morning:   { label: 'Morning Commute',   icon: '🌅', desc: '5 am – 12 pm' },
  afternoon: { label: 'Afternoon',         icon: '☀️',  desc: '12 pm – 5 pm' },
  evening:   { label: 'Evening Commute',   icon: '🌆', desc: '5 pm – 9 pm'  },
  night:     { label: 'Night',             icon: '🌙', desc: '9 pm – 5 am'  },
};

export default function CommuteBoardPage() {
  const { user } = useAuthStore();
  const isSeeker = user?.role === 'RIDE_SEEKER' || user?.role === 'BOTH';

  const [rides, setRides]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  useEffect(() => {
    // Fetch next 7 days of published rides — no origin/destination filter
    const today = new Date().toISOString().split('T')[0];
    ridesApi.search({ date: today, limit: 100 })
      .then((r) => setRides(r.data ?? []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter.trim()
    ? rides.filter((r) =>
        r.originName?.toLowerCase().includes(filter.toLowerCase()) ||
        r.destinationName?.toLowerCase().includes(filter.toLowerCase()) ||
        r.rideGiver?.user?.fullName?.toLowerCase().includes(filter.toLowerCase())
      )
    : rides;

  // Group by time slot then sort within each group by time
  const grouped: Record<string, any[]> = {};
  for (const ride of filtered) {
    const slot = timeSlot(ride.departureTime || '00:00');
    (grouped[slot] = grouped[slot] || []).push(ride);
  }
  const slotOrder = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🗺️ Commute Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">Today's published rides — find a regular commute match</p>
        </div>
        <Link href="/rides/search" className="text-xs text-brand-600 font-medium border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition shrink-0">
          Advanced Search
        </Link>
      </div>

      {/* Filter bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by area or giver name…"
          className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        />
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-600">{rides.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rides today</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {rides.reduce((s, r) => s + (r.availableSeats || 0), 0)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Seats available</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">
              {new Set(rides.map((r) => r.rideGiver?.userId)).size}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Active givers</p>
          </div>
        </div>
      )}

      {/* Rides grouped by time slot */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading rides…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🚗</div>
          <p className="text-gray-500 text-sm">No rides found{filter ? ` for "${filter}"` : ' for today'}.</p>
        </div>
      ) : (
        slotOrder
          .filter((slot) => grouped[slot]?.length > 0)
          .map((slot) => (
            <div key={slot} className="space-y-3">
              {/* Slot heading */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{SLOT_LABELS[slot].icon}</span>
                <span className="font-semibold text-gray-800 text-sm">{SLOT_LABELS[slot].label}</span>
                <span className="text-xs text-gray-400">{SLOT_LABELS[slot].desc}</span>
                <span className="ml-auto text-xs text-gray-400">{grouped[slot].length} ride{grouped[slot].length !== 1 ? 's' : ''}</span>
              </div>

              {/* Ride cards */}
              {grouped[slot]
                .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
                .map((ride) => {
                  const giver     = ride.rideGiver;
                  const giverUser = giver?.user;
                  const eco       = ECO_BADGES[giverUser?.ecoLevel || 'SEED'];
                  const full      = ride.availableSeats === 0;

                  return (
                    <div key={ride.id} className={`bg-white rounded-xl border overflow-hidden transition ${full ? 'border-gray-100 opacity-70' : 'border-gray-200 hover:border-brand-300 hover:shadow-sm'}`}>
                      <div className="p-4 space-y-3">
                        {/* Route + time */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {ride.originName} → {ride.destinationName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-500">🕐 {ride.departureTime}</span>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-gray-500">📅 {new Date(ride.departureDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                              {ride.estimatedDistanceKm && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-xs text-gray-400">📏 {ride.estimatedDistanceKm} km</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${full ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {full ? 'Full' : `${ride.availableSeats}/${ride.totalSeats} seats`}
                          </span>
                        </div>

                        {/* Giver profile strip */}
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 shrink-0">
                            {giverUser?.fullName?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 truncate">{giverUser?.fullName}</p>
                              <span className={`text-xs ${eco.color}`}>{eco.icon}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              <span>⭐ {giver?.averageRating?.toFixed(1) || '—'}</span>
                              <span className="text-gray-300">·</span>
                              <span>{giver?.totalRidesGiven || 0} rides given</span>
                              {ride.vehicle && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span>{ride.vehicle.make} {ride.vehicle.model}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* CTA */}
                          {isSeeker && !full ? (
                            <Link href={`/rides/${ride.id}`}
                              className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition shrink-0 font-medium">
                              Request →
                            </Link>
                          ) : (
                            <Link href={`/rides/${ride.id}`}
                              className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition shrink-0">
                              View
                            </Link>
                          )}
                        </div>

                        {/* Notes */}
                        {ride.notes && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-100">
                            💬 {ride.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))
      )}
    </div>
  );
}
