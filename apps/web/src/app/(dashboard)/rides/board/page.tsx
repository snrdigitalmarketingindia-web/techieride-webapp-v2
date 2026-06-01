'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ridesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtShort = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function addDays(base: Date, n: number) {
  const d = new Date(base); d.setDate(d.getDate() + n); return d;
}
function isoDate(d: Date) { return d.toISOString().split('T')[0]; }

const ECO: Record<string, string> = { SEED: '🌱', SPROUT: '🌿', LEAF: '🍃', TREE: '🌳', FOREST: '🌲' };

// Fill rate bar — red when >80%, amber 50-80%, green <50%
function FillBar({ rate, filled, total }: { rate: number; filled: number; total: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${pct >= 80 ? 'text-red-600' : pct >= 50 ? 'text-amber-600' : 'text-green-600'}`}>
        {filled}/{total}
      </span>
    </div>
  );
}

// ── Date range presets ────────────────────────────────────────────────────────
type Preset = { label: string; from: Date; to: Date };

function getPresets(today: Date): Record<string, Preset> {
  return {
    today:    { label: 'Today',        from: today, to: today },
    tomorrow: { label: 'Tomorrow',     from: addDays(today, 1), to: addDays(today, 1) },
    week:     { label: 'Next 7 days',  from: today, to: addDays(today, 6) },
    pastWeek: { label: 'Past week',    from: addDays(today, -6), to: today },
    past4w:   { label: 'Past 4 weeks', from: addDays(today, -27), to: today },
    past3m:   { label: 'Past 3 months',from: addDays(today, -89), to: today },
  };
}

// ── Route Pattern Card ────────────────────────────────────────────────────────
function RoutePatternCard({ route, rides, isSeeker }: { route: string; rides: any[]; isSeeker: boolean }) {
  const totalSeats  = rides.reduce((s, r) => s + r.totalSeats, 0);
  const filledSeats = rides.reduce((s, r) => s + r.filledSeats, 0);
  const avgFillRate = totalSeats > 0 ? filledSeats / totalSeats : 0;
  const times = [...new Set(rides.map((r: any) => r.departureTime))].sort();
  const publishedRide = rides.find((r: any) => r.status === 'PUBLISHED');
  const givers = [...new Map(rides.map((r: any) => [r.rideGiver?.fullName, r.rideGiver])).values()].filter(Boolean);
  const [origin, dest] = route.split(' → ');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{origin} → {dest}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {rides.length} ride{rides.length !== 1 ? 's' : ''} · Usual times: {times.slice(0, 3).join(', ')}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
          avgFillRate >= 0.8 ? 'bg-red-100 text-red-700' :
          avgFillRate >= 0.5 ? 'bg-amber-100 text-amber-700' :
                               'bg-green-100 text-green-700'
        }`}>
          {avgFillRate >= 0.8 ? '🔥 High demand' : avgFillRate >= 0.5 ? '📈 Moderate' : '✅ Easy to book'}
        </span>
      </div>

      {/* Fill rate bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Average occupancy</span>
          <span>{Math.round(avgFillRate * 100)}%</span>
        </div>
        <FillBar rate={avgFillRate} filled={filledSeats} total={totalSeats} />
      </div>

      {/* Givers on this route */}
      <div className="flex items-center gap-2 flex-wrap">
        {givers.slice(0, 3).map((g: any) => (
          <div key={g.fullName} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1">
            <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
              {g.fullName?.[0]}
            </div>
            <span className="text-xs text-gray-700">{g.fullName?.split(' ')[0]}</span>
            <span className="text-xs">{ECO[g.ecoLevel] || '🌱'}</span>
            {g.averageRating && <span className="text-xs text-gray-400">⭐{g.averageRating.toFixed(1)}</span>}
          </div>
        ))}
      </div>

      {/* CTA if there's a live ride */}
      {publishedRide && isSeeker && (
        <Link href={`/rides/${publishedRide.id}`}
          className="block w-full text-center text-xs bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 transition font-medium">
          🟢 Live now — Request Seat on {fmtShort(publishedRide.departureDate)} {publishedRide.departureTime} →
        </Link>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommuteBoardPage() {
  const { user }  = useAuthStore();
  const isSeeker  = user?.role === 'RIDE_SEEKER' || user?.role === 'BOTH';

  const today    = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const presets  = useMemo(() => getPresets(today), [today]);

  const [preset, setPreset]   = useState<string>('today');
  const [rides, setRides]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [view, setView]       = useState<'routes' | 'feed'>('routes');

  const range = presets[preset];
  const isPast = range.to <= today && preset !== 'today';

  useEffect(() => {
    setLoading(true);
    ridesApi.community(isoDate(range.from), isoDate(range.to))
      .then((r) => setRides(r.data ?? []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [preset]);

  // Filter
  const filtered = filter.trim()
    ? rides.filter((r) =>
        r.originName?.toLowerCase().includes(filter.toLowerCase()) ||
        r.destinationName?.toLowerCase().includes(filter.toLowerCase()) ||
        r.rideGiver?.fullName?.toLowerCase().includes(filter.toLowerCase())
      )
    : rides;

  // Route patterns: group by "origin → destination"
  const routeMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of filtered) {
      const key = `${r.originName} → ${r.destinationName}`;
      (map[key] = map[key] || []).push(r);
    }
    // Sort routes by total rides desc
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  // Summary stats
  const totalRides   = filtered.length;
  const totalSeats   = filtered.reduce((s, r) => s + r.totalSeats, 0);
  const filledSeats  = filtered.reduce((s, r) => s + r.filledSeats, 0);
  const liveRides    = filtered.filter((r) => r.status === 'PUBLISHED' || r.status === 'ONGOING');
  const overallFill  = totalSeats > 0 ? Math.round(filledSeats / totalSeats * 100) : 0;

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">🗺️ Commute Board</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ride patterns, occupancy trends and live availability</p>
      </div>

      {/* Date range presets */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Object.entries(presets).map(([key, p]) => (
          <button key={key} onClick={() => setPreset(key)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition ${
              preset === key
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-400'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by area or giver name…"
          className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        />
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { val: totalRides,  label: 'Rides',    color: 'text-brand-600' },
            { val: liveRides.length, label: 'Live now', color: 'text-green-600' },
            { val: totalSeats - filledSeats, label: 'Open seats', color: 'text-blue-600' },
            { val: `${overallFill}%`, label: 'Avg fill',  color: overallFill >= 80 ? 'text-red-600' : overallFill >= 50 ? 'text-amber-600' : 'text-green-600' },
          ].map(({ val, label, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Insight banner for high-demand periods */}
      {!loading && overallFill >= 75 && totalRides > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          🔥 <span><strong>High demand period</strong> — {overallFill}% of seats fill up. Request early to secure your spot.</span>
        </div>
      )}

      {/* View toggle */}
      {!loading && totalRides > 0 && (
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('routes')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${view === 'routes' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            📊 Route Patterns
          </button>
          <button onClick={() => setView('feed')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${view === 'feed' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            🕐 Ride Feed
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : totalRides === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🛣️</div>
          <p className="text-gray-500 text-sm">No rides found for this period{filter ? ` matching "${filter}"` : ''}.</p>
        </div>
      ) : view === 'routes' ? (

        /* ── ROUTE PATTERNS VIEW ─────────────────────────────────────── */
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">
            {routeMap.length} route{routeMap.length !== 1 ? 's' : ''} · {range.label}
            {isPast ? ' (historical)' : ''}
          </p>
          {routeMap.map(([route, rideList]) => (
            <RoutePatternCard key={route} route={route} rides={rideList} isSeeker={isSeeker} />
          ))}
        </div>

      ) : (

        /* ── RIDE FEED VIEW ──────────────────────────────────────────── */
        <div className="space-y-3">
          {filtered
            .sort((a, b) => {
              const da = a.departureDate + a.departureTime;
              const db = b.departureDate + b.departureTime;
              return da.localeCompare(db);
            })
            .map((ride) => {
              const full = ride.availableSeats === 0;
              return (
                <div key={ride.id} className={`bg-white rounded-xl border overflow-hidden ${full ? 'border-gray-100 opacity-70' : 'border-gray-200'}`}>
                  <div className="p-4 space-y-3">
                    {/* Route + date */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {ride.originName} → {ride.destinationName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          🕐 {ride.departureTime} · 📅 {fmt(ride.departureDate)}
                          {ride.estimatedDistanceKm ? ` · 📏 ${ride.estimatedDistanceKm} km` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ride.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-700' :
                          ride.status === 'ONGOING'   ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-500'
                        }`}>{ride.status}</span>
                      </div>
                    </div>

                    {/* Fill rate */}
                    <FillBar rate={ride.fillRate} filled={ride.filledSeats} total={ride.totalSeats} />

                    {/* Giver strip */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 shrink-0">
                        {ride.rideGiver?.fullName?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{ride.rideGiver?.fullName}</p>
                          <span className="text-xs">{ECO[ride.rideGiver?.ecoLevel] || '🌱'}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          ⭐ {ride.rideGiver?.averageRating?.toFixed(1) || '—'} · {ride.rideGiver?.totalRidesGiven || 0} rides
                          {ride.vehicle ? ` · ${ride.vehicle.make} ${ride.vehicle.model}` : ''}
                        </p>
                      </div>
                      {ride.status === 'PUBLISHED' && isSeeker && !full && (
                        <Link href={`/rides/${ride.id}`}
                          className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition font-medium shrink-0">
                          Request →
                        </Link>
                      )}
                      {(ride.status === 'COMPLETED' || full) && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {ride.status === 'COMPLETED' ? 'Completed' : 'Full'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
