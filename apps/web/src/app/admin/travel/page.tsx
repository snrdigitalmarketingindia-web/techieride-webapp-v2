'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

type Pair = {
  giverUserId: string;
  giverName: string;
  seekerUserId: string;
  seekerName: string;
  rideCount: number;
  lastRideDate: string;
};

type Summary = {
  totalParticipations: number;
  uniqueGivers: number;
  uniqueSeekers: number;
  totalCompletedRides: number;
};

export default function TravelAnalyticsPage() {
  const router = useRouter();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pairs' | 'givers'>('pairs');

  useEffect(() => {
    adminApi.getTravelAnalytics().then((r) => {
      setSummary(r.data?.summary ?? null);
      setPairs(r.data?.pairs ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return pairs;
    const q = search.toLowerCase();
    return pairs.filter(p =>
      p.giverName.toLowerCase().includes(q) ||
      p.seekerName.toLowerCase().includes(q),
    );
  }, [pairs, search]);

  // Group by giver for the "by giver" view
  const byGiver = useMemo(() => {
    const map = new Map<string, { giverName: string; giverUserId: string; seekers: Pair[]; totalRides: number }>();
    for (const p of filtered) {
      const entry = map.get(p.giverUserId) ?? { giverName: p.giverName, giverUserId: p.giverUserId, seekers: [], totalRides: 0 };
      entry.seekers.push(p);
      entry.totalRides += p.rideCount;
      map.set(p.giverUserId, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.totalRides - a.totalRides);
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Travel Analytics — Who Travelled With Whom</h1>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Completed Rides',     value: summary.totalCompletedRides, icon: '✅' },
            { label: 'Participations',       value: summary.totalParticipations, icon: '🧳' },
            { label: 'Active Givers',        value: summary.uniqueGivers,        icon: '🚗' },
            { label: 'Active Seekers',       value: summary.uniqueSeekers,       icon: '👥' },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-2xl mb-1">{k.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-500">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setView('pairs')}
            className={`px-4 py-2 ${view === 'pairs' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Top Pairs
          </button>
          <button
            onClick={() => setView('givers')}
            className={`px-4 py-2 border-l border-gray-300 ${view === 'givers' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Giver
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : view === 'pairs' ? (
        <>
          {/* ── Top Pairs table ── */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Ride Giver', 'Ride Seeker', 'Rides Together', 'Last Ride'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.slice(0, 100).map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/users/${p.giverUserId}`)}
                        className="text-brand-700 hover:underline font-medium text-left"
                      >
                        {p.giverName}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/users/${p.seekerUserId}`)}
                        className="text-brand-700 hover:underline font-medium text-left"
                      >
                        {p.seekerName}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        p.rideCount >= 5 ? 'bg-green-100 text-green-700' :
                        p.rideCount >= 2 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {p.rideCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(p.lastRideDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No travel data found</td></tr>
                )}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">Showing top 100 of {filtered.length} pairs</p>
            )}
          </div>

          {/* Mobile pairs */}
          <div className="sm:hidden space-y-3">
            {filtered.slice(0, 50).map((p, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    p.rideCount >= 5 ? 'bg-green-100 text-green-700' :
                    p.rideCount >= 2 ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.rideCount} ride{p.rideCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(p.lastRideDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={() => router.push(`/admin/users/${p.giverUserId}`)} className="text-brand-700 hover:underline font-medium">{p.giverName}</button>
                  <span className="text-gray-400">→</span>
                  <button onClick={() => router.push(`/admin/users/${p.seekerUserId}`)} className="text-brand-700 hover:underline font-medium">{p.seekerName}</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-8 text-gray-400">No travel data found</p>}
          </div>
        </>
      ) : (
        <>
          {/* ── By Giver view ── */}
          <div className="space-y-4">
            {byGiver.map((g) => (
              <div key={g.giverUserId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <button
                    onClick={() => router.push(`/admin/users/${g.giverUserId}`)}
                    className="font-semibold text-brand-700 hover:underline text-sm"
                  >
                    🚗 {g.giverName}
                  </button>
                  <span className="text-xs text-gray-500">{g.seekers.length} unique seeker{g.seekers.length !== 1 ? 's' : ''} · {g.totalRides} total rides</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {g.seekers.map((p, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                      <button
                        onClick={() => router.push(`/admin/users/${p.seekerUserId}`)}
                        className="text-sm text-brand-700 hover:underline"
                      >
                        {p.seekerName}
                      </button>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{p.rideCount} ride{p.rideCount !== 1 ? 's' : ''}</span>
                        <span>{new Date(p.lastRideDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {byGiver.length === 0 && <p className="text-center py-8 text-gray-400">No travel data found</p>}
          </div>
        </>
      )}
    </div>
  );
}
