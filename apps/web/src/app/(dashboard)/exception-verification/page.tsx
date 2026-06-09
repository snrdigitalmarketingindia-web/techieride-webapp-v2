'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { authApi, api } from '@/lib/api';
import { convertToWebp } from '@/lib/convertToWebp';

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function ExceptionVerificationPage() {
  const { user, fetchProfile } = useAuthStore();
  const [form, setForm] = useState({ personalEmail: '', employeeId: '', reason: '' });
  const [companyIdUrl, setCompanyIdUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Guard: only for EMAIL_VERIFICATION_PENDING
  if (user && user.accountStatus === 'EXCEPTION_VERIFICATION_REQUESTED') {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold text-gray-900">Request under review</h1>
        <p className="text-gray-500 text-sm">
          Your exception request is being reviewed by the admin. You'll be notified at{' '}
          <strong>{user.personalEmail}</strong> within 2 business days.
        </p>
        <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  if (user && user.accountStatus !== 'EMAIL_VERIFICATION_PENDING') {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-gray-900">Your email is already verified</h1>
        <p className="text-gray-500 text-sm">This page is only for accounts with unverified company email.</p>
        <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    setUploading(true);
    setError('');
    try {
      const file = await convertToWebp(raw);
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/uploads/document?type=employee_id', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCompanyIdUrl(data.url);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 403) {
        setError('Upload blocked — please log out and log back in, then try again.');
      } else if (msg) {
        setError(`Upload failed: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
      } else {
        setError('Upload failed. Please try again or contact support.');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.personalEmail.includes('@')) return setError('Please enter a valid personal email');
    if (!form.employeeId.trim()) return setError('Employee ID is required');
    if (!companyIdUrl) return setError('Please upload your company ID card');
    if (form.reason.trim().length < 20) return setError('Please provide a detailed reason (at least 20 characters)');

    setSubmitting(true);
    try {
      await authApi.requestExceptionVerification({
        personalEmail: form.personalEmail.trim(),
        employeeId: form.employeeId.trim(),
        companyIdCardUrl: companyIdUrl,
        reason: form.reason.trim(),
      });
      await fetchProfile();
      setSubmitted(true);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!user?.email) return;
    try {
      await authApi.resendVerification(user.email);
      setResendMsg('Verification email resent. Check your inbox and spam folder.');
    } catch {
      setResendMsg('Could not resend. Try again in a minute.');
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-6xl">📬</div>
        <h1 className="text-2xl font-bold text-gray-900">Check your personal inbox!</h1>
        <p className="text-gray-600 text-sm">
          We sent a verification link to <strong>{form.personalEmail}</strong>.
          Click it to confirm your contact email — then your request will be sent to admin for review.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left space-y-1">
          <p className="font-medium">What happens after you verify:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700 mt-1">
            <li>Your exception request goes to admin</li>
            <li>Admin reviews your company ID card</li>
            <li>Decision sent to <strong>{form.personalEmail}</strong> within 2 business days</li>
          </ol>
        </div>
        <p className="text-xs text-gray-400">
          Check spam if you don't see it. The link expires in 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-brand-600">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Can't verify your company email?</h1>
        <p className="text-gray-500 text-sm mt-1">
          Request a manual exception. Admin will verify your identity using your company ID card.
        </p>
      </div>

      {/* Try email first */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-amber-800">Try the email link first</p>
        <p className="text-xs text-amber-700">
          Check your spam folder for a verification email from <strong>noreply@techieride.in</strong>.
          If you still can't find it:
        </p>
        <button onClick={handleResend}
          className="text-xs text-amber-800 underline font-medium">
          Resend verification email →
        </button>
        {resendMsg && <p className="text-xs text-amber-700 mt-1">{resendMsg}</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Exception form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Manual verification request</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Personal Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.personalEmail}
            onChange={e => update('personalEmail', e.target.value)}
            placeholder="yourname@gmail.com"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">Admin will contact you here with the decision</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee ID <span className="text-red-500">*</span>
          </label>
          <input
            value={form.employeeId}
            onChange={e => update('employeeId', e.target.value)}
            placeholder="EMP12345 / INF-00123"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company ID Card <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="flex-1">
              {companyIdUrl
                ? <p className="text-xs text-green-600 font-medium">✅ Uploaded</p>
                : <p className="text-xs text-gray-500">Upload a clear photo of your company ID card (front side)</p>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                companyIdUrl ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' :
                'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {uploading ? '⏳ Uploading…' : companyIdUrl ? 'Replace' : 'Upload'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">📷 Images only (jpg, png, heic etc.) — PDFs not accepted</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for exception <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.reason}
            onChange={e => update('reason', e.target.value)}
            rows={4}
            placeholder="e.g. My company uses a shared email system and I don't have individual access. My employee email is managed by IT and I cannot receive external links..."
            className={`${inputCls} resize-none`}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-400">Minimum 20 characters</p>
            <p className={`text-xs ${form.reason.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
              {form.reason.length} chars
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {submitting ? '⏳ Submitting…' : 'Submit Exception Request'}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Submitting false information will result in a permanent account ban.
      </p>
    </div>
  );
}
