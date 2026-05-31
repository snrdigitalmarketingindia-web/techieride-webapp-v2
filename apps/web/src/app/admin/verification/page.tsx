'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminVerificationPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getPendingVerifications().then((r) => setQueue(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const review = async (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    setProcessing(id);
    try {
      await adminApi.reviewVerification(id, { decision, rejectionReason: reason });
      setQueue((q) => q.filter((r) => r.id !== id));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
        <span className="bg-amber-100 text-amber-700 text-sm px-3 py-1 rounded-full font-medium">{queue.length} pending</span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-gray-500">All caught up! No pending verifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{req.user?.fullName}</p>
                  <p className="text-sm text-gray-500">{req.user?.email} · {req.user?.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">Submitted {new Date(req.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-3 mb-4">
                {req.employeeIdUrl && (
                  <a href={req.employeeIdUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-brand-600 border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition">
                    📄 Employee ID
                  </a>
                )}
                {req.drivingLicenseUrl && (
                  <a href={req.drivingLicenseUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-brand-600 border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition">
                    🪪 Driving License
                  </a>
                )}
                {req.rcUrl && (
                  <a href={req.rcUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-brand-600 border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition">
                    🚗 RC
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => review(req.id, 'APPROVED')}
                  disabled={processing === req.id}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Rejection reason:');
                    if (reason !== null) review(req.id, 'REJECTED', reason);
                  }}
                  disabled={processing === req.id}
                  className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
