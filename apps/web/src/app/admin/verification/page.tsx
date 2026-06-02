'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  EMPLOYEE:  { label: '📋 Employee ID', cls: 'bg-blue-100 text-blue-700' },
  DRIVER:    { label: '🚗 Driver Docs', cls: 'bg-purple-100 text-purple-700' },
  EXCEPTION: { label: '🔍 Exception',   cls: 'bg-orange-100 text-orange-700' },
};

const STATUS_BADGE: Record<string, string> = {
  EMAIL_VERIFICATION_PENDING:    'bg-gray-100 text-gray-500',
  DOCUMENT_VERIFICATION_PENDING: 'bg-yellow-100 text-yellow-700',
  DRIVER_VERIFICATION_PENDING:   'bg-purple-100 text-purple-700',
  EXCEPTION_VERIFICATION_REQUESTED: 'bg-orange-100 text-orange-700',
};

export default function AdminVerificationPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getPendingVerifications()
      .then((r) => setRequests(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    setProcessing(id);
    try {
      await adminApi.reviewVerification(id, { decision, rejectionReason: reason });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setProcessing(null);
    }
  };

  const grouped = {
    EMPLOYEE:  requests.filter((r) => r.verificationType === 'EMPLOYEE'),
    DRIVER:    requests.filter((r) => r.verificationType === 'DRIVER'),
    EXCEPTION: requests.filter((r) => r.verificationType === 'EXCEPTION'),
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '…' : `${requests.length} pending review`}
            {!loading && grouped.EMPLOYEE.length > 0 && ` · ${grouped.EMPLOYEE.length} Employee`}
            {!loading && grouped.DRIVER.length > 0 && ` · ${grouped.DRIVER.length} Driver`}
            {!loading && grouped.EXCEPTION.length > 0 && ` · ${grouped.EXCEPTION.length} Exception`}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="text-sm text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition disabled:opacity-50">
          {loading ? '⏳' : '↻ Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-600 font-medium">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No pending verification requests.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'Type', 'Documents', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => {
                const badge = TYPE_BADGE[req.verificationType];
                const isRejecting = rejectingId === req.id;
                const isProcessing = processing === req.id;

                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    {/* User */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => router.push(`/admin/users/${req.userId}`)}
                        className="text-left hover:underline"
                      >
                        <p className="font-medium text-gray-900">{req.user.fullName}</p>
                        <p className="text-xs text-gray-400">{req.user.email}</p>
                        {req.user.companyName && <p className="text-xs text-gray-400">{req.user.companyName}</p>}
                      </button>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[req.user.accountStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                        {req.user.accountStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge?.cls}`}>
                        {badge?.label}
                      </span>
                    </td>

                    {/* Documents */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {req.employeeIdUrl && (
                          <a href={req.employeeIdUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-brand-600 hover:underline">📄 Employee ID</a>
                        )}
                        {req.drivingLicenseUrl && (
                          <a href={req.drivingLicenseUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-brand-600 hover:underline">🪪 Driving Licence</a>
                        )}
                        {req.rcUrl && (
                          <a href={req.rcUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-brand-600 hover:underline">🚗 RC</a>
                        )}
                        {req.exceptionReason && (
                          <p className="text-xs text-orange-600 italic max-w-xs">"{req.exceptionReason}"</p>
                        )}
                        {!req.employeeIdUrl && !req.drivingLicenseUrl && !req.rcUrl && (
                          <span className="text-xs text-gray-400">No docs uploaded</span>
                        )}
                      </div>
                    </td>

                    {/* Submitted */}
                    <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      {isRejecting ? (
                        <div className="space-y-2 min-w-[200px]">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={2}
                            placeholder="Rejection reason (required)"
                            className="w-full text-xs px-2 py-1.5 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => { if (rejectReason.trim()) review(req.id, 'REJECTED', rejectReason); }}
                              disabled={isProcessing || !rejectReason.trim()}
                              className="flex-1 text-xs bg-red-600 text-white py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                              {isProcessing ? '⏳' : 'Reject'}
                            </button>
                            <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => review(req.id, 'APPROVED')}
                            disabled={isProcessing}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                            {isProcessing ? '⏳' : '✅ Approve'}
                          </button>
                          <button
                            onClick={() => setRejectingId(req.id)}
                            disabled={isProcessing}
                            className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition">
                            ❌ Reject
                          </button>
                          <button
                            onClick={() => router.push(`/admin/users/${req.userId}`)}
                            className="text-xs text-brand-600 hover:underline">
                            View Full Profile →
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
