'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  IDENTITY: { label: '🪪 Identity Docs', cls: 'bg-blue-100 text-blue-700' },
  DRIVER:   { label: '🚗 Ride Giver Docs', cls: 'bg-purple-100 text-purple-700' },
};

const EXCEPTION_BADGE = { label: '🔍 Exception Path', cls: 'bg-orange-100 text-orange-700' };

const STATUS_BADGE: Record<string, string> = {
  DOCUMENT_VERIFICATION_PENDING: 'bg-yellow-100 text-yellow-700',
  DRIVER_VERIFICATION_PENDING:   'bg-purple-100 text-purple-700',
};

export default function AdminVerificationPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    adminApi.getPendingVerifications()
      .then((r) => setRequests(Array.isArray(r.data) ? r.data : []))
      .catch((e: any) => setLoadError(e?.response?.data?.message || e?.message || 'Failed to load'))
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

  const identityCount = requests.filter((r) => r.verificationType === 'IDENTITY').length;
  const driverCount   = requests.filter((r) => r.verificationType === 'DRIVER').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '…' : `${requests.length} pending review`}
            {!loading && identityCount > 0 && ` · ${identityCount} Identity`}
            {!loading && driverCount > 0 && ` · ${driverCount} Ride Giver`}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="text-sm text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition disabled:opacity-50">
          {loading ? '⏳' : '↻ Refresh'}
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          ⚠️ Error loading verifications: {loadError}
        </div>
      )}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-600 font-medium">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No pending verification requests.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-4">
            {requests.map((req) => {
              const badge = TYPE_BADGE[req.verificationType];
              const isRejecting  = rejectingId === req.id;
              const isProcessing = processing === req.id;
              return (
                <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  {/* User info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button onClick={() => router.push(`/admin/users/${req.userId}`)} className="text-left">
                        <p className="font-semibold text-gray-900">{req.user.fullName}{(req.user as any).trid && <span className="text-xs text-brand-600 font-mono ml-1">({(req.user as any).trid})</span>}</p>
                        <p className="text-xs text-gray-400 truncate">{req.user.email}</p>
                        {req.user.companyName && <p className="text-xs text-gray-400">{req.user.companyName}</p>}
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge?.cls}`}>{badge?.label}</span>
                      {req.isException && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXCEPTION_BADGE.cls}`}>{EXCEPTION_BADGE.label}</span>}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="flex flex-wrap gap-2">
                    {req.employeeIdUrl && <a href={req.employeeIdUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 bg-brand-50 border border-brand-100 px-2 py-1 rounded-lg">📋 Company ID</a>}
                    {req.govtIdUrl && <a href={req.govtIdUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 bg-brand-50 border border-brand-100 px-2 py-1 rounded-lg">🪪 Govt ID</a>}
                    {req.drivingLicenseUrl && <a href={req.drivingLicenseUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 bg-brand-50 border border-brand-100 px-2 py-1 rounded-lg">🪪 DL</a>}
                    {req.rcUrl && <a href={req.rcUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 bg-brand-50 border border-brand-100 px-2 py-1 rounded-lg">🚗 RC</a>}
                    {req.selfDeclarationAccepted && <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-lg">✅ Declaration</span>}
                    {!req.employeeIdUrl && !req.govtIdUrl && !req.drivingLicenseUrl && !req.rcUrl && <span className="text-xs text-gray-400">No docs uploaded</span>}
                  </div>
                  {req.vehicle && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                      <p className="text-xs font-medium text-gray-700">🚙 {req.vehicle.make} {req.vehicle.model} · {req.vehicle.color}</p>
                      <p className="text-xs text-gray-500 font-mono">{req.vehicle.plateNumber} · {req.vehicle.totalSeats} seats</p>
                      {req.vehicle.photoUrl && <a href={req.vehicle.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">📸 Vehicle Photo</a>}
                    </div>
                  )}
                  {req.exceptionReason && <p className="text-xs text-orange-600 italic">"{req.exceptionReason}"</p>}
                  <p className="text-xs text-gray-400">Submitted: {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>

                  {/* Actions */}
                  {isRejecting ? (
                    <div className="space-y-2">
                      <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2}
                        placeholder="Rejection reason (required)"
                        className="w-full text-sm px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => { if (rejectReason.trim()) review(req.id, 'REJECTED', rejectReason); }}
                          disabled={isProcessing || !rejectReason.trim()}
                          className="flex-1 text-sm bg-red-600 text-white py-2 rounded-lg disabled:opacity-50">
                          {isProcessing ? '⏳' : 'Reject'}
                        </button>
                        <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => review(req.id, 'APPROVED')} disabled={isProcessing}
                        className="flex-1 text-sm bg-green-600 text-white py-2 rounded-lg disabled:opacity-50">
                        {isProcessing ? '⏳' : '✅ Approve'}
                      </button>
                      <button onClick={() => setRejectingId(req.id)} disabled={isProcessing}
                        className="flex-1 text-sm bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg disabled:opacity-50">
                        ❌ Reject
                      </button>
                    </div>
                  )}
                  <button onClick={() => router.push(`/admin/users/${req.userId}`)} className="text-xs text-brand-600 hover:underline w-full text-center">
                    View Full Profile →
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                  const isRejecting  = rejectingId === req.id;
                  const isProcessing = processing === req.id;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <button onClick={() => router.push(`/admin/users/${req.userId}`)} className="text-left hover:underline">
                          <p className="font-medium text-gray-900">{req.user.fullName}{(req.user as any).trid && <span className="text-xs text-brand-600 font-mono ml-1">({(req.user as any).trid})</span>}</p>
                          <p className="text-xs text-gray-400">{req.user.email}</p>
                          {req.user.companyName && <p className="text-xs text-gray-400">{req.user.companyName}</p>}
                        </button>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[req.user.accountStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                          {req.user.accountStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge?.cls}`}>{badge?.label}</span>
                          {req.isException && <span className={`text-xs px-2 py-1 rounded-full font-medium ${EXCEPTION_BADGE.cls}`}>{EXCEPTION_BADGE.label}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {req.employeeIdUrl && <a href={req.employeeIdUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">📋 Company ID</a>}
                          {req.govtIdUrl && <a href={req.govtIdUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">🪪 Govt ID</a>}
                          {req.drivingLicenseUrl && <a href={req.drivingLicenseUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">🪪 Driving Licence</a>}
                          {req.rcUrl && <a href={req.rcUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">🚗 RC</a>}
                          {req.selfDeclarationAccepted && <span className="text-xs text-green-600">✅ Self-declaration accepted</span>}
                          {req.exceptionReason && <p className="text-xs text-orange-600 italic max-w-xs">"{req.exceptionReason}"</p>}
                          {!req.employeeIdUrl && !req.govtIdUrl && !req.drivingLicenseUrl && !req.rcUrl && <span className="text-xs text-gray-400">No docs uploaded yet</span>}
                          {req.vehicle && (
                            <div className="mt-1 pt-1 border-t border-gray-100 space-y-0.5">
                              <p className="text-xs font-medium text-gray-700">🚙 {req.vehicle.make} {req.vehicle.model} · {req.vehicle.color}</p>
                              <p className="text-xs text-gray-500 font-mono">{req.vehicle.plateNumber} · {req.vehicle.totalSeats} seats</p>
                              {req.vehicle.photoUrl && <a href={req.vehicle.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">📸 Vehicle Photo</a>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="px-4 py-4">
                        {isRejecting ? (
                          <div className="space-y-2 min-w-[200px]">
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2}
                              placeholder="Rejection reason (required)"
                              className="w-full text-xs px-2 py-1.5 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 resize-none" />
                            <div className="flex gap-1">
                              <button onClick={() => { if (rejectReason.trim()) review(req.id, 'REJECTED', rejectReason); }}
                                disabled={isProcessing || !rejectReason.trim()}
                                className="flex-1 text-xs bg-red-600 text-white py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                                {isProcessing ? '⏳' : 'Reject'}
                              </button>
                              <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button onClick={() => review(req.id, 'APPROVED')} disabled={isProcessing}
                              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                              {isProcessing ? '⏳' : '✅ Approve'}
                            </button>
                            <button onClick={() => setRejectingId(req.id)} disabled={isProcessing}
                              className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition">
                              ❌ Reject
                            </button>
                            <button onClick={() => router.push(`/admin/users/${req.userId}`)} className="text-xs text-brand-600 hover:underline">
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
        </>
      )}
    </div>
  );
}
