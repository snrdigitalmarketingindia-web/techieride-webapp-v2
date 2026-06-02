'use client';

import { useState } from 'react';
import { complaintsApi } from '@/lib/api';

const REASONS = [
  { value: 'HARASSMENT',           label: 'Harassment' },
  { value: 'NO_SHOW',              label: 'No-show' },
  { value: 'UNSAFE_DRIVING',       label: 'Unsafe driving' },
  { value: 'FRAUD',                label: 'Fraud / misrepresentation' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'OTHER',                label: 'Other' },
];

interface Props {
  reportedId: string;
  reportedName: string;
  rideId?: string;
  onClose: () => void;
}

export function ReportUserModal({ reportedId, reportedName, rideId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError('Please select a reason.'); return; }
    setLoading(true);
    setError('');
    try {
      await complaintsApi.file({
        reportedId,
        rideId,
        reason,
        description: description.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to submit complaint. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Report User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-medium text-gray-900">Complaint submitted</p>
            <p className="text-sm text-gray-500">
              Our team will review your report and take appropriate action within 48 hours.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              Reporting <span className="font-medium text-gray-900">{reportedName}</span>
              {rideId && <span className="text-gray-400"> · linked to this ride</span>}
            </p>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a reason…</option>
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Additional details <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Describe what happened…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">{description.length}/1000</p>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
              >
                {loading ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
