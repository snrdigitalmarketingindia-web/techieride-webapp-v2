'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { verificationApi, api } from '@/lib/api';
import { uploadDocument } from '@/lib/uploadDocument';

const STEPS = ['Requirements', 'Documents', 'Declaration', 'Submit'];

const GOVT_ID_TYPES = ['Passport', 'Voter ID', 'Driving Licence'];

// ── Reusable upload button ─────────────────────────────────────────────────
function UploadBtn({
  label, hint, url, uploading, onFile,
}: {
  label: string; hint?: string; url: string;
  uploading: boolean; onFile: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
        <div className="flex-1 text-sm">
          {url
            ? <span className="text-green-600 font-medium">✅ Uploaded</span>
            : <span className="text-gray-400">{hint || 'Upload a clear photo or scan'}</span>}
        </div>
        <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
            uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : url ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
          {uploading ? '⏳ Uploading…' : url ? 'Replace' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

export default function BecomeSeekerPage() {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [govtIdType, setGovtIdType] = useState('');
  const [govtIdUrl, setGovtIdUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Guard: only EMPLOYEE_VERIFIED (no TRID yet) and SEEKER_VERIFICATION_PENDING can access
  const status = user?.accountStatus;
  if (user && !['EMPLOYEE_VERIFIED', 'SEEKER_VERIFICATION_PENDING'].includes(status ?? '')) {
    if (status === 'SEEKER_VERIFIED' || user.trid) {
      return (
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold text-gray-900">You're already a verified Ride Seeker!</h1>
          <p className="text-gray-500 text-sm">Your TRID is <strong>{user.trid}</strong>. You can now search and book rides.</p>
          <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
            Go to Dashboard
          </Link>
        </div>
      );
    }
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-900">Company ID verification required first</h1>
        <p className="text-gray-500 text-sm">Please complete your company ID verification before submitting seeker documents.</p>
        <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Already submitted — show pending state
  if (status === 'SEEKER_VERIFICATION_PENDING') {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold text-gray-900">Documents under review</h1>
        <p className="text-gray-500 text-sm">
          Your government ID and self-declaration are being reviewed by the admin.
          You'll be notified at <strong>{user?.personalEmail}</strong> within 2 business days.
        </p>
        <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-700 text-left">
          <p className="font-medium mb-1">What admin reviews:</p>
          <ul className="list-disc list-inside space-y-1 text-brand-600">
            <li>Government ID photo (address proof)</li>
            <li>Self-declaration acceptance</li>
            <li>Cross-check with company ID on file</li>
          </ul>
        </div>
        <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const url = await uploadDocument(file, 'govt_id');
      setGovtIdUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!govtIdUrl) { setError('Please upload your government ID'); return; }
    if (!declared) { setError('Please accept the self-declaration to continue'); return; }
    setSubmitting(true);
    try {
      // This page is superseded by /verify-identity — redirect there
      window.location.href = '/verify-identity';
      return;
      await fetchProfile();
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = [
    true,                      // step 0 — requirements (always ok)
    !!govtIdUrl && !!govtIdType, // step 1 — govt ID uploaded + type selected
    declared,                  // step 2 — declaration accepted
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-brand-600">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Become a Ride Seeker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Submit your government ID and self-declaration. Admin will assign your TRID on approval.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
            <p className={`text-xs mt-1 text-center ${i === step ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>{s}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* ── Step 0: Requirements ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">What you'll need</h2>

          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="text-2xl">🪪</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Government ID (address proof)</p>
                <p className="text-xs text-gray-500">Passport, Voter ID, or Driving Licence</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Self-declaration</p>
                <p className="text-xs text-gray-500">Acknowledge TechieRide's community standards and usage policy</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Why we need this:</strong> Government ID confirms your address and real identity, ensuring
            a safe and trusted carpool community for everyone.
          </div>

          <div className="bg-brand-50 rounded-lg p-3 text-xs text-brand-700">
            <strong>Your TRID</strong> (TechieRide Member ID) is assigned once admin approves your documents.
            It appears on your profile and is shared with Ride Givers when you book a seat.
          </div>
        </div>
      )}

      {/* ── Step 1: Government ID upload ─────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Upload Government ID</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Type <span className="text-red-500">*</span>
            </label>
            <select
              value={govtIdType}
              onChange={e => setGovtIdType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select ID type...</option>
              {GOVT_ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <UploadBtn
            label={`${govtIdType || 'Government ID'} — Front side`}
            hint="Upload a clear photo or scanned copy (JPG, PNG, PDF)"
            url={govtIdUrl}
            uploading={uploading}
            onFile={handleUpload}
          />

          {govtIdUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
              ✅ Government ID uploaded successfully. Proceed to the next step.
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Self-declaration ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Self-Declaration</h2>
          <p className="text-sm text-gray-500">
            Please read the following declaration carefully and accept to continue.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto">
            <p className="font-medium text-gray-800">I, {user?.fullName}, hereby declare that:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>The information and documents I have submitted are genuine, accurate, and belong to me.</li>
              <li>I will use TechieRide solely for legitimate carpooling purposes with verified colleagues.</li>
              <li>I will not misuse the platform or the personal information of other members.</li>
              <li>I understand that submitting false information will result in a permanent account ban.</li>
              <li>I agree to TechieRide's community standards and code of conduct.</li>
              <li>I consent to TechieRide storing and processing my personal data for verification purposes.</li>
            </ol>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={declared}
              onChange={e => setDeclared(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the above self-declaration. I confirm all submitted information is accurate.
            </span>
          </label>
        </div>
      )}

      {/* ── Step 3: Review & Submit ──────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Review & Submit</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Government ID type</span>
              <span className="text-sm font-medium text-gray-900">{govtIdType}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Government ID photo</span>
              <span className="text-sm font-medium text-green-600">✅ Uploaded</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Self-declaration</span>
              <span className="text-sm font-medium text-green-600">✅ Accepted</span>
            </div>
          </div>

          <div className="bg-brand-50 rounded-lg p-3 text-xs text-brand-700">
            Admin will review your documents within <strong>2 business days</strong>.
            Approval notification will be sent to <strong>{user?.personalEmail}</strong>.
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {submitting ? '⏳ Submitting…' : 'Submit for Review'}
          </button>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2">
        {step > 0 && (
          <button
            onClick={() => { setError(''); setStep(s => s - 1); }}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            ← Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            onClick={() => { setError(''); if (canNext[step]) setStep(s => s + 1); else setError('Please complete this step first.'); }}
            disabled={!canNext[step]}
            className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
