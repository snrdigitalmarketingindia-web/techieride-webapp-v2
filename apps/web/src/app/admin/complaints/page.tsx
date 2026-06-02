'use client';

import { useEffect, useState } from 'react';
import { complaintsApi } from '@/lib/api';

const STATUS_OPTIONS = ['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];

const STATUS_BADGE: Record<string, string> = {
  OPEN:         'bg-yellow-100 text-yellow-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  RESOLVED:     'bg-green-100 text-green-700',
  DISMISSED:    'bg-gray-100 text-gray-500',
};

const REASON_LABELS: Record<string, string> = {
  HARASSMENT:            '😡 Harassment',
  NO_SHOW:               '👻 No-show',
  UNSAFE_DRIVING:        '⚠️ Unsafe driving',
  FRAUD:                 '🕵️ Fraud',
  INAPPROPRIATE_CONTENT: '🚫 Inappropriate content',
  OTHER:                 '📝 Other',
};

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  async function load(status?: string) {
    setLoading(true);
    try {
      const r = await complaintsApi.adminGetAll(status ? { status } : {});
      setComplaints(r.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(statusFilter || undefined); }, [statusFilter]);

  function openDetail(c: any) {
    setSelected(c);
    setNewStatus(c.status);
    setAdminNotes(c.adminNotes ?? '');
    setUpdateError('');
  }

  async function handleUpdate() {
    if (!selected) return;
    setUpdating(true);
    setUpdateError('');
    try {
      await complaintsApi.adminUpdate(selected.id, { status: newStatus, adminNotes: adminNotes.trim() || undefined });
      setSelected(null);
      load(statusFilter || undefined);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setUpdateError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Update failed'));
    } finally {
      setUpdating(false);
    }
  }

  const isTerminal = (s: string) => ['RESOLVED', 'DISMISSED'].includes(s);
  const openCount = complaints.filter((c) => c.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-sm text-gray-500 mt-0.5">User-reported issues requiring review</p>
        </div>
        {openCount > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full">
            {openCount} open
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              statusFilter === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-gray-500 text-sm">No complaints{statusFilter ? ` with status ${statusFilter}` : ''}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reporter</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reported</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ride</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Filed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {complaints.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.reporter?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{c.reported?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{REASON_LABELS[c.reason] ?? c.reason}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.ride ? (
                      <span>{c.ride.originName} → {c.ride.destinationName}</span>
                    ) : (
                      <span className="italic text-gray-400">Platform-level</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(c)}
                      className="text-xs text-brand-600 hover:underline font-medium"
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail / review modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Review Complaint</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Parties */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Reporter</p>
                  <p className="font-medium text-gray-900">{selected.reporter?.fullName}</p>
                  <p className="text-xs text-gray-500">{selected.reporter?.email}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Reported</p>
                  <p className="font-medium text-gray-900">{selected.reported?.fullName}</p>
                  <p className="text-xs text-gray-500">{selected.reported?.email}</p>
                </div>
              </div>

              {/* Reason + description */}
              <div className="text-sm space-y-1">
                <p className="text-xs text-gray-400">Reason</p>
                <p className="font-medium text-gray-800">{REASON_LABELS[selected.reason] ?? selected.reason}</p>
                {selected.description && (
                  <p className="text-gray-600 text-sm bg-gray-50 rounded-lg p-3 mt-1">{selected.description}</p>
                )}
              </div>

              {/* Ride context */}
              {selected.ride && (
                <div className="text-sm bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Ride context</p>
                  <p className="text-gray-800">{selected.ride.originName} → {selected.ride.destinationName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(selected.ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Status update */}
              {isTerminal(selected.status) ? (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500">
                    This complaint is <span className="font-medium">{selected.status}</span> and cannot be updated further.
                  </p>
                  {selected.adminNotes && (
                    <p className="mt-1 text-gray-600 italic">"{selected.adminNotes}"</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Update status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="OPEN">Open</option>
                      <option value="UNDER_REVIEW">Under review</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="DISMISSED">Dismissed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Admin notes <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Internal notes about this complaint…"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  {updateError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{updateError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelected(null)}
                      className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={updating}
                      className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                    >
                      {updating ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
