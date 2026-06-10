'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

type GiverOccupancy = {
  giverId: string;
  fullName: string;
  totalRides: number;
  completedRides: number;
  totalSeats: number;
  filledSeats: number;
  occupancyPct: number;
};

export default function OccupancyPage() {
  const router = useRouter();
  const [data, setData] = useState<GiverOccupancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getOccupancyStats()
      .then((r) => setData(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, []);

  const avg = data.length
    ? Math.round(data.reduce((s, g) => s + g.occupancyPct, 0) / data.length)
    : 0;

  const activeGivers = data.filter(g => g.totalRides > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Ride Occupancy — Per Giver</h1>
        <span className="text-sm text-gray-500">{activeGivers.length} givers with rides</span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Givers',      value: data.length,                       icon: '🚗' },
          { label: 'Active Givers',     value: activeGivers.length,               icon: '📋' },
          { label: 'Avg Occupancy',     value: `${avg}%`,                         icon: '💺' },
          { label: 'Total Seats Filled',value: data.reduce((s, g) => s + g.filledSeats, 0), icon: '🧳' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-sm text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Giver', 'Total Rides', 'Completed', 'Seats Offered', 'Seats Filled', 'Occupancy'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((g) => (
                  <tr key={g.giverId}
                    onClick={() => router.push(`/admin/users/${g.giverId}`)}
                    className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-gray-900">{g.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{g.totalRides}</td>
                    <td className="px-4 py-3 text-gray-600">{g.completedRides}</td>
                    <td className="px-4 py-3 text-gray-600">{g.totalSeats}</td>
                    <td className="px-4 py-3 text-gray-600">{g.filledSeats}</td>
                    <td className="px-4 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${g.occupancyPct >= 70 ? 'bg-green-400' : g.occupancyPct >= 40 ? 'bg-amber-400' : 'bg-red-300'}`}
                            style={{ width: `${g.occupancyPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-9 text-right">{g.occupancyPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {data.map((g) => (
              <div key={g.giverId}
                onClick={() => router.push(`/admin/users/${g.giverId}`)}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{g.fullName}</p>
                  <span className={`text-sm font-bold ${g.occupancyPct >= 70 ? 'text-green-600' : g.occupancyPct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                    {g.occupancyPct}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${g.occupancyPct >= 70 ? 'bg-green-400' : g.occupancyPct >= 40 ? 'bg-amber-400' : 'bg-red-300'}`}
                    style={{ width: `${g.occupancyPct}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{g.totalRides} rides</span>
                  <span>{g.completedRides} completed</span>
                  <span>{g.filledSeats}/{g.totalSeats} seats</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
