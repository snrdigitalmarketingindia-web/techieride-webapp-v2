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
    { label: 'Total Users', value: analytics.totalUsers, icon: '👤' },
    { label: 'Verified', value: analytics.verifiedUsers, icon: '✅' },
    { label: 'Total Rides', value: analytics.totalRides, icon: '🚗' },
    { label: 'Completed', value: analytics.completedRides, icon: '✔️' },
    { label: 'CO₂ Saved', value: `${analytics.totalCo2SavedKg} kg`, icon: '🌿' },
    { label: 'SOS Events', value: analytics.sosEvents, icon: '🆘', alert: analytics.sosEvents > 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {sosList.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <p className="text-red-800 font-semibold text-sm">🆘 {sosList.length} Active SOS Alert{sosList.length > 1 ? 's' : ''}</p>
          {sosList.map((s) => (
            <div key={s.id} className="mt-2 text-sm text-red-700">
              {s.user?.fullName} — {new Date(s.triggeredAt).toLocaleTimeString()} — {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-xl border p-5 ${k.alert ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{k.value ?? '—'}</p>
            <p className="text-sm text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
