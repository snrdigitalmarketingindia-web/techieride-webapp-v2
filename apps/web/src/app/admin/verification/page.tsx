'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface VerificationRequest {
  id: string;
  verificationType: 'EMPLOYEE' | 'DRIVER' | 'EXCEPTION';
  employeeIdUrl?: string;
  drivingLicenseUrl?: string;
  rcUrl?: string;
  exceptionReason?: string;
  submittedAt: string;
  user: { fullName: string; email: string; phone?: string; companyName?: string; accountStatus: string };
}

interface EmailPendingUser {
  id: string;
  fullName: string;
  email: string;
  companyName?: string;
  accountStatus: string;
  createdAt: string;
}

// ── Tabs config ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'email',      label: 'Email Pending',      icon: '📧', desc: 'Registered but email not verified' },
  { key: 'exception',  label: 'Exception Requests',  icon: '🔍', desc: 'Manual identity verification' },
  { key: 'document',   label: 'Document Review',     icon: '📋', desc: 'Employee ID + company ID card' },
  { key: 'driver',     label: 'Driver Review',       icon: '🚗', desc: 'Driving licence + RC' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Inline reject form ────────────────────────────────────────────────────
function RejectForm({ onSubmit, onCancel, loading }: {
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={2}
        placeholder="Rejection reason (e.g. Blurry photo, ID expired, not matching company)"
        className="w-full text-sm px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
      />
      <div className="flex gap-2">
        <button onClick={() => onSubmit(reason)} disabled={loading || !reason.trim()}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition">
          {loading ? '⏳ Rejecting…' : 'Confirm Reject'}
        </button>
        <button onClick={onCancel} disabled={loading}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Document links ─────────────────────────────────────────────────────────
function DocLinks({ req }: { req: VerificationRequest }) {
  return (
    <div className="flex flex-wrap gap-2">
      {req.employeeIdUrl && (
        <a href={req.employeeIdUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-600 border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition">
          🪪 Company ID
        </a>
      )}
      {req.drivingLicenseUrl && (
        <a href={req.drivingLicenseUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-600 border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition">
          📄 Driving License
        </a>
      )}
      {req.rcUrl && (
        <a href={req.rcUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-600 border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition">
          🚗 RC
        </a>
      )}
      {req.exceptionReason && (
        <div className="w-full mt-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800">
          <span className="font-medium">Exception reason: </span>{req.exceptionReason}
        </div>
      )}
    </div>
  );
}

// ── Verification card ──────────────────────────────────────────────────────
function VerificationCard({ req, onReview }: {
  req: VerificationRequest;
  onReview: (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<void>;
}) {
  const [processing, setProcessing] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const approve = async () => {
    setProcessing(true);
    try { await onReview(req.id, 'APPROVED'); }
    finally { setProcessing(false); }
  };

  const reject = async (reason: string) => {
    setProcessing(true);
    try { await onReview(req.id, 'REJECTED', reason); setShowReject(false); }
    finally { setProcessing(false); }
  };

  const typeLabels: Record<string, string> = {
    EMPLOYEE: '📋 Employee',
    DRIVER: '🚗 Driver',
    EXCEPTION: '🔍 Exception',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-900">{req.user.fullName}</p>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {typeLabels[req.verificationType]}
            </span>
          </div>
          <p className="text-sm text-gray-500">{req.user.email}</p>
          {req.user.phone && <p className="text-xs text-gray-400">{req.user.phone}</p>}
          {req.user.companyName && <p className="text-xs text-gray-400">{req.user.companyName}</p>}
        </div>
        <p className="text-xs text-gray-400 shrink-0">
          {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <DocLinks req={req} />

      {!showReject ? (
        <div className="flex gap-2">
          <button onClick={approve} disabled={processing}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
            {processing ? '⏳' : '✅ Approve'}
          </button>
          <button onClick={() => setShowReject(true)} disabled={processing}
            className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition">
            ❌ Reject
          </button>
        </div>
      ) : (
        <RejectForm onSubmit={reject} onCancel={() => setShowReject(false)} loading={processing} />
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminVerificationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('document');
  const [counts, setCounts] = useState<Record<TabKey, number>>({ email: 0, exception: 0, document: 0, driver: 0 });
  const [emailQueue, setEmailQueue] = useState<EmailPendingUser[]>([]);
  const [verificationQueues, setVerificationQueues] = useState<Record<string, VerificationRequest[]>>({
    exception: [], document: [], driver: [],
  });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [emailRes, exceptionRes, documentRes, driverRes] = await Promise.all([
        adminApi.getEmailPendingQueue(),
        adminApi.getExceptionQueue(),
        adminApi.getDocumentQueue(),
        adminApi.getDriverQueue(),
      ]);
      setEmailQueue(emailRes.data);
      setVerificationQueues({
        exception: exceptionRes.data,
        document: documentRes.data,
        driver: driverRes.data,
      });
      setCounts({
        email: emailRes.data.length,
        exception: exceptionRes.data.length,
        document: documentRes.data.length,
        driver: driverRes.data.length,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleReview = async (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    await adminApi.reviewVerification(id, { decision, rejectionReason: reason });
    // Remove from whichever queue it was in
    setVerificationQueues(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        updated[key] = updated[key].filter(r => r.id !== id);
      }
      return updated;
    });
    setCounts(prev => {
      const key = activeTab;
      return { ...prev, [key]: Math.max(0, prev[key] - 1) };
    });
  };

  const totalPending = counts.exception + counts.document + counts.driver;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Queues</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalPending} pending review · {counts.email} email unverified
          </p>
        </div>
        <button onClick={loadAll} disabled={loading}
          className="text-sm text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition disabled:opacity-50">
          {loading ? '⏳ Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap min-w-0 ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {counts[tab.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-sm text-gray-500">
        {TABS.find(t => t.key === activeTab)?.desc}
      </p>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading queues…</div>
      ) : (
        <>
          {/* ── Queue 1: Email Pending ──────────────────────────────────── */}
          {activeTab === 'email' && (
            emailQueue.length === 0 ? (
              <EmptyState icon="📧" message="No users stuck in email verification." />
            ) : (
              <div className="space-y-3">
                {emailQueue.map(u => (
                  <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{u.fullName}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      {u.companyName && <p className="text-xs text-gray-400">{u.companyName}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        Registered {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                      📧 Email Pending
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Queues 2, 3, 4: Verification requests with approve/reject ── */}
          {(activeTab === 'exception' || activeTab === 'document' || activeTab === 'driver') && (
            verificationQueues[activeTab]?.length === 0 ? (
              <EmptyState
                icon={activeTab === 'exception' ? '🔍' : activeTab === 'document' ? '📋' : '🚗'}
                message={`No pending ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} requests.`}
              />
            ) : (
              <div className="space-y-4">
                {verificationQueues[activeTab]?.map(req => (
                  <VerificationCard key={req.id} req={req} onReview={handleReview} />
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-500 text-sm">{message}</p>
      <p className="text-gray-400 text-xs mt-1">All caught up!</p>
    </div>
  );
}
