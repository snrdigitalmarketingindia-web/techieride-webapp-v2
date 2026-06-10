'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

function complianceFlags(u: any): string[] {
  const flags: string[] = [];
  if (u.rideSeeker?.noShowCount > 2)           flags.push('🚩 No-shows');
  if (u.rideSeeker?.recentCancellationCount > 3) flags.push('⚠️ Cancellations');
  if ((u.rideGiver?.averageRating ?? 5) < 3 && (u.rideGiver?.totalRidesGiven ?? 0) > 5)   flags.push('⭐ Low rating');
  if ((u.rideSeeker?.averageRating ?? 5) < 3 && (u.rideSeeker?.totalRidesTaken ?? 0) > 5)  flags.push('⭐ Low rating');
  return flags;
}

const ACCOUNT_STATUS_COLORS: Record<string, string> = {
  DRIVER_VERIFIED:              'bg-green-100 text-green-700',
  SEEKER_VERIFIED:              'bg-green-100 text-green-700',
  DRIVER_VERIFICATION_PENDING:  'bg-purple-100 text-purple-700',
  DOCUMENT_VERIFICATION_PENDING:'bg-yellow-100 text-yellow-700',
  PERSONAL_EMAIL_PENDING:       'bg-amber-100 text-amber-700',
  EMAIL_VERIFICATION_PENDING:   'bg-gray-100 text-gray-600',
  REJECTED:    'bg-red-100 text-red-700',
  SUSPENDED:   'bg-red-100 text-red-700',
  BANNED:      'bg-red-200 text-red-800',
  DEACTIVATED: 'bg-gray-200 text-gray-600',
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  DRIVER_VERIFIED:              '✅ Ride Giver Verified',
  SEEKER_VERIFIED:              '✅ Ride Seeker Verified',
  DRIVER_VERIFICATION_PENDING:  '⏳ Ride Giver Review',
  DOCUMENT_VERIFICATION_PENDING:'⏳ Identity Pending',
  PERSONAL_EMAIL_PENDING:       '📬 Personal Email Pending',
  EMAIL_VERIFICATION_PENDING:   '📧 Email Pending',
  REJECTED:    '❌ Rejected',
  SUSPENDED:   '🚫 Suspended',
  BANNED:      '🔴 Banned',
  DEACTIVATED: '⛔ Deactivated',
  DRAFT:       '📝 Draft',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ accountStatus: '', role: '', search: '', compliance: false });
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);

  const load = () => {
    setLoading(true);
    setSelected(new Set());
    const params: any = { accountStatus: filter.accountStatus, role: filter.role, search: filter.search };
    if (filter.compliance) params.compliance = 'true';
    adminApi.listUsers(params).then((r) => {
      setUsers(r.data.data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allSelected = users.length > 0 && users.every(u => selected.has(u.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(users.map(u => u.id)));

  const sendBulkEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setBulkLoading(true);
    try {
      const res = await adminApi.bulkEmailUsers(Array.from(selected), emailSubject.trim(), emailBody.trim());
      setEmailResult(res.data);
      setEmailSubject('');
      setEmailBody('');
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkAction = async (action: 'suspend' | 'activate') => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      if (action === 'suspend') await adminApi.bulkSuspendUsers(ids);
      else await adminApi.bulkActivateUsers(ids);
      load();
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Users ({total})</h1>
        <a
          href={adminApi.exportUsersCsvUrl()}
          download
          className="text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
        >
          ⬇️ Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setFilter((f) => ({ ...f, search: searchInput })); }}
            placeholder="Search name, email, TRID..."
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button onClick={() => setFilter((f) => ({ ...f, search: searchInput }))}
            className="text-sm bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 transition">🔍</button>
          {filter.search && (
            <button onClick={() => { setSearchInput(''); setFilter((f) => ({ ...f, search: '' })); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filter.accountStatus} onChange={(e) => setFilter((f) => ({ ...f, accountStatus: e.target.value }))}
            className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-2">
            <option value="">All Statuses</option>
            <option value="EMAIL_VERIFICATION_PENDING">📧 Email Pending</option>
            <option value="PERSONAL_EMAIL_PENDING">📬 Personal Email</option>
            <option value="DOCUMENT_VERIFICATION_PENDING">⏳ Identity Pending</option>
            <option value="SEEKER_VERIFIED">✅ Seeker Verified</option>
            <option value="DRIVER_VERIFICATION_PENDING">⏳ Giver Review</option>
            <option value="DRIVER_VERIFIED">✅ Giver Verified</option>
            <option value="REJECTED">❌ Rejected</option>
            <option value="SUSPENDED">🚫 Suspended</option>
          </select>
          <select value={filter.role} onChange={(e) => setFilter((f) => ({ ...f, role: e.target.value }))}
            className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-2">
            <option value="">All Roles</option>
            <option value="RIDE_GIVER">Ride Giver / Seeker</option>
            <option value="RIDE_SEEKER">Ride Seeker Only</option>
          </select>
          <button
            onClick={() => setFilter((f) => ({ ...f, compliance: !f.compliance }))}
            className={`text-sm px-3 py-2 rounded-lg border transition whitespace-nowrap ${filter.compliance ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-300 hover:bg-red-50'}`}
          >
            🚩 Flagged Only
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
          <button
            onClick={() => bulkAction('suspend')}
            disabled={bulkLoading}
            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            🚫 Suspend
          </button>
          <button
            onClick={() => bulkAction('activate')}
            disabled={bulkLoading}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            ✅ Activate
          </button>
          <button
            onClick={() => { setEmailModal(true); setEmailResult(null); }}
            disabled={bulkLoading}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            ✉️ Send Email
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-blue-600 hover:underline ml-auto">
            Clear
          </button>
        </div>
      )}

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <>
          {/* ── Desktop table (rendered first in DOM so .first() locators in E2E find the visible table row) ── */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300" />
                  </th>
                  {['Name', 'TRID', 'Company', 'Role', 'Account Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)} className={`hover:bg-gray-50 cursor-pointer ${selected.has(u.id) ? 'bg-blue-50' : ''} ${!u.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(u.id); }}>
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                      {complianceFlags(u).map((f) => (
                        <span key={f} className="inline-block text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded mr-1 mt-0.5">{f}</span>
                      ))}
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
                        <button onClick={(e) => { e.stopPropagation(); adminApi.suspendUser(u.id).then(load); }}
                          className="text-xs text-red-600 hover:underline">Suspend</button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); adminApi.activateUser(u.id).then(load); }}
                          className="text-xs text-green-600 hover:underline">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list (after desktop table in DOM so .first() locators find the visible table row) ── */}
          <div className="sm:hidden space-y-3">
            {users.length === 0 && <p className="text-center py-8 text-gray-400">No users found</p>}
            {users.map((u) => (
              <div key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)}
                className={`bg-white rounded-xl border p-4 cursor-pointer active:bg-gray-50 ${selected.has(u.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} ${!u.isActive ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <input type="checkbox" checked={selected.has(u.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(u.id)}
                      className="mt-0.5 rounded border-gray-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{u.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    {u.trid && <p className="text-xs font-mono text-brand-600 font-semibold mt-0.5">{u.trid}</p>}
                    {u.companyName && <p className="text-xs text-gray-500 mt-0.5">{u.companyName}</p>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {complianceFlags(u).map((f) => (
                        <span key={f} className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                  </div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${ACCOUNT_STATUS_COLORS[u.accountStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {ACCOUNT_STATUS_LABELS[u.accountStatus] || u.accountStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{u.role}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); u.isActive ? adminApi.suspendUser(u.id).then(load) : adminApi.activateUser(u.id).then(load); }}
                    className={`text-xs px-3 py-1 rounded-lg font-medium ${u.isActive ? 'text-red-600 bg-red-50 border border-red-200' : 'text-green-600 bg-green-50 border border-green-200'}`}>
                    {u.isActive ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bulk email compose modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Send Email to {selected.size} user{selected.size !== 1 ? 's' : ''}</h2>
              <button onClick={() => { setEmailModal(false); setEmailResult(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {emailResult ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-3xl">✉️</p>
                <p className="font-semibold text-gray-800">Emails sent</p>
                <p className="text-sm text-gray-500">{emailResult.sent} sent · {emailResult.failed} failed</p>
                <button onClick={() => { setEmailModal(false); setEmailResult(null); setSelected(new Set()); }}
                  className="mt-4 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">Subject</label>
                    <input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Important update from TechieRide"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">Message</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      placeholder="Write your message here. Use {name} to personalise — we'll replace it with each user's first name automatically."
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setEmailModal(false)}
                    className="text-sm text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button
                    onClick={sendBulkEmail}
                    disabled={bulkLoading || !emailSubject.trim() || !emailBody.trim()}
                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {bulkLoading ? 'Sending…' : `Send to ${selected.size} user${selected.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
