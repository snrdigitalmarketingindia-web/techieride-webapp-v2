'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ verificationStatus: '', role: '' });

  const load = () => {
    setLoading(true);
    adminApi.listUsers(filter).then((r) => {
      setUsers(r.data.data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const STATUS_COLORS: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users ({total})</h1>
        <div className="flex gap-2">
          <select value={filter.verificationStatus} onChange={(e) => setFilter((f) => ({ ...f, verificationStatus: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select value={filter.role} onChange={(e) => setFilter((f) => ({ ...f, role: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All Roles</option>
            <option value="RIDE_GIVER">Ride Giver</option>
            <option value="RIDE_SEEKER">Ride Seeker</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Phone', 'Company', 'Role', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.fullName}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{u.companyName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[u.verificationStatus]}`}>
                      {u.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <button onClick={() => adminApi.suspendUser(u.id).then(load)}
                        className="text-xs text-red-600 hover:underline">Suspend</button>
                    ) : (
                      <button onClick={() => adminApi.activateUser(u.id).then(load)}
                        className="text-xs text-green-600 hover:underline">Activate</button>
                    )}
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
