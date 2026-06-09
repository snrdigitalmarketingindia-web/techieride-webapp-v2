'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function ExceptionVerificationPage() {
  const { user, fetchProfile } = useAuthStore();
  const searchParams = useSearchParams();
  const forceShow = searchParams.get('force') === '1';
  const [form, setForm] = useState({ personalEmail: '', employeeId: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Already submitted exception — show resend screen (unless ?force=1 to update email)
  if (user && user.accountStatus === 'PERSONAL_EMAIL_PENDING' && !forceShow) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">📬</div>
          <h1 className="text-xl font-bold text-gray-900">Personal email verification pending</h1>
          <p className="text-gray-500 text-sm">
            We sent a verification link to your personal email. Click it to continue.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-2">
          <p className="font-medium">Didn't receive the email?</p>
          <p className="text-xs text-amber-700">Check your spam/junk folder. The link expires in 24 hours.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">Want to use a different personal email or resend?</p>
          <p className="text-xs text-gray-500">Fill the form below to update your personal email and resend the verification link.</p>
          <Link href="/exception-verification?force=1" className="inline-block text-sm text-brand-600 underline font-medium">
            Update personal email →
          </Link>
        </div>
        <Link href="/dashboard" className="block text-center text-sm text-gray-400 hover:text-gray-600">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // Guard: only for EMAIL_VERIFICATION_PENDING or PERSONAL_EMAIL_PENDING+force
  if (user && !['EMAIL_VERIFICATION_PENDING', 'PERSONAL_EMAIL_PENDING'].includes(user.accountStatus)) {
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

  const handleSubmit = async () => {
    setError('');
    if (!form.personalEmail.includes('@')) return setError('Please enter a valid personal email');
    if (form.reason.trim().length < 20) return setError('Please provide a detailed reason (at least 20 characters)');

    setSubmitting(true);
    try {
      await authApi.requestExceptionVerification({
        personalEmail: form.personalEmail.trim(),
        employeeId: form.employeeId.trim() || undefined,
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
          Click it to confirm your personal email — then you'll be asked to upload your identity documents.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left space-y-1">
          <p className="font-medium">What happens next:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700 mt-1">
            <li>Verify your personal email (link sent above)</li>
            <li>Log in and upload your company ID + government ID</li>
            <li>Admin reviews everything in one go</li>
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
          Request a manual exception. Provide your personal email and reason — you'll upload your ID documents in the next step.
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
          <p className="text-xs text-gray-400 mt-1">We'll send a verification link here. Admin will also contact you at this email.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee ID <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            value={form.employeeId}
            onChange={e => update('employeeId', e.target.value)}
            placeholder="EMP12345 / INF-00123"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">You'll upload your company ID card in the next step</p>
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
          {submitting ? '⏳ Submitting…' : 'Continue → Verify Personal Email'}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Submitting false information will result in a permanent account ban.
      </p>
    </div>
  );
}
