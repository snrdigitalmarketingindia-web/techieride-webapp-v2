'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  DRAFT: 'bg-yellow-100 text-yellow-700',
};

export default function AdminRidesPage() {
  const [rides, setRides] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.listRides({ status: status || undefined }).then((r) => {
      setRides(r.data.data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rides ({total})</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
          <option value="">All Status</option>
          {['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Giver', 'Route', 'Date / Time', 'Seats', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rides.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.rideGiver?.user?.fullName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {r.originName} → {r.destinationName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(r.departureDate).toLocaleDateString()} · {r.departureTime}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.availableSeats}/{r.totalSeats}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
