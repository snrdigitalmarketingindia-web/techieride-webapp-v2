'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [sosList, setSosList] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getAnalytics().then((r) => setAnalytics(r.data));
    adminApi.getActiveSos().then((r) => setSosList(r.data));
  }, []);

  const kpis = analytics ? [
    { label: 'Total Users',    value: analytics.totalUsers,    icon: '👤' },
    { label: 'Verified',       value: analytics.verifiedUsers, icon: '✅' },
    { label: 'Ride Givers',    value: analytics.giversCount,   icon: '🚗' },
    { label: 'Ride Seekers',   value: analytics.seekersCount,  icon: '🧳' },
    { label: 'Total Rides',    value: analytics.totalRides,    icon: '🛣️' },
    { label: 'Completed',      value: analytics.completedRides,icon: '✔️' },
    { label: 'CO₂ Saved',      value: `${analytics.totalCo2SavedKg} kg`, icon: '🌿' },
    { label: 'SOS Events',     value: analytics.sosEvents,     icon: '🆘', alert: analytics.sosEvents > 0 },
  ] : [];

  const womenKpis = analytics ? [
    { label: 'Women Users',        value: analytics.womenUsersCount,   icon: '👩' },
    { label: 'Women Ride Givers',  value: analytics.womenGiversCount,  icon: '👩‍✈️' },
    { label: 'Women Ride Seekers', value: analytics.womenSeekersCount, icon: '👩‍💼' },
    { label: 'Women-Only Rides',   value: analytics.womenOnlyRidesCount, icon: '🛡️' },
  ] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {sosList.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <p className="text-red-800 font-semibold text-sm">🆘 {sosList.length} Active SOS Alert{sosList.length > 1 ? 's' : ''}</p>
          {sosList.map((s) => (
            <div key={s.id} className="mt-2 text-sm text-red-700">
              {s.user?.fullName} — {new Date(s.triggeredAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} — {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-xl border p-5 ${(k as any).alert ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{k.value ?? '—'}</p>
            <p className="text-sm text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {womenKpis.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Women Participation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {womenKpis.map((k) => (
              <div key={k.label} className="bg-pink-50 rounded-xl border border-pink-100 p-5">
                <div className="text-2xl mb-1">{k.icon}</div>
                <p className="text-2xl font-bold text-pink-900">{k.value ?? '—'}</p>
                <p className="text-sm text-pink-600">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Women participation breakdown chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Women vs Total — Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: 'Users',      women: analytics.womenUsersCount,   total: analytics.totalUsers },
                { label: 'Givers',     women: analytics.womenGiversCount,  total: analytics.giversCount },
                { label: 'Seekers',    women: analytics.womenSeekersCount, total: analytics.seekersCount },
                { label: 'Women-Only Rides', women: analytics.womenOnlyRidesCount, total: analytics.totalRides },
              ].map(({ label, women, total }) => {
                const pct = total > 0 ? Math.round((women / total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">{label}</span>
                      <span className="text-pink-700 font-semibold">{women} / {total} ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
