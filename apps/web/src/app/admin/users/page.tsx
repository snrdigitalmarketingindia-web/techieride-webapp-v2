'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

const ACCOUNT_STATUS_COLORS: Record<string, string> = {
  DRIVER_VERIFIED: 'bg-green-100 text-green-700',
  EMPLOYEE_VERIFIED: 'bg-blue-100 text-blue-700',
  DRIVER_VERIFICATION_PENDING: 'bg-purple-100 text-purple-700',
  DOCUMENT_VERIFICATION_PENDING: 'bg-yellow-100 text-yellow-700',
  EXCEPTION_VERIFICATION_REQUESTED: 'bg-orange-100 text-orange-700',
  EMAIL_VERIFICATION_PENDING: 'bg-gray-100 text-gray-600',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  BANNED: 'bg-red-200 text-red-800',
  DEACTIVATED: 'bg-gray-200 text-gray-600',
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  DRIVER_VERIFIED: '✅ Driver Verified',
  EMPLOYEE_VERIFIED: '✅ Employee Verified',
  DRIVER_VERIFICATION_PENDING: '⏳ Driver Review',
  DOCUMENT_VERIFICATION_PENDING: '⏳ Docs Pending',
  EXCEPTION_VERIFICATION_REQUESTED: '🔍 Exception Review',
  EMAIL_VERIFICATION_PENDING: '📧 Email Pending',
  REJECTED: '❌ Rejected',
  SUSPENDED: '🚫 Suspended',
  BANNED: '🔴 Banned',
  DEACTIVATED: '⛔ Deactivated',
  DRAFT: '📝 Draft',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ accountStatus: '', role: '', search: '' });
  const [searchInput, setSearchInput] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.listUsers(filter).then((r) => {
      setUsers(r.data.data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Users ({total})</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setFilter((f) => ({ ...f, search: searchInput })); }}
              placeholder="Search name, email, TRID, phone..."
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button onClick={() => setFilter((f) => ({ ...f, search: searchInput }))}
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
              🔍
            </button>
            {filter.search && (
              <button onClick={() => { setSearchInput(''); setFilter((f) => ({ ...f, search: '' })); }}
                className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
            )}
          </div>
          <select value={filter.accountStatus} onChange={(e) => setFilter((f) => ({ ...f, accountStatus: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All Statuses</option>
            <option value="EMAIL_VERIFICATION_PENDING">📧 Email Pending</option>
            <option value="EXCEPTION_VERIFICATION_REQUESTED">🔍 Exception Requests</option>
            <option value="DOCUMENT_VERIFICATION_PENDING">⏳ Docs Pending</option>
            <option value="EMPLOYEE_VERIFIED">✅ Employee Verified</option>
            <option value="DRIVER_VERIFICATION_PENDING">⏳ Driver Review</option>
            <option value="DRIVER_VERIFIED">✅ Driver Verified</option>
            <option value="REJECTED">❌ Rejected</option>
            <option value="SUSPENDED">🚫 Suspended</option>
          </select>
          <select value={filter.role} onChange={(e) => setFilter((f) => ({ ...f, role: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All Roles</option>
            <option value="RIDE_GIVER">Ride Giver / Seeker</option>
            <option value="RIDE_SEEKER">Ride Seeker Only</option>
          </select>
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'TRID', 'Company', 'Role', 'Account Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)} className={`hover:bg-gray-50 cursor-pointer ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.fullName}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.trid || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.companyName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACCOUNT_STATUS_COLORS[u.accountStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {ACCOUNT_STATUS_LABELS[u.accountStatus] || u.accountStatus}
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
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
