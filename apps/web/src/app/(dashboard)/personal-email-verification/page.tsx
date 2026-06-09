'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function PersonalEmailVerificationPage() {
  const { user, fetchProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If user already has a personal email → show "check inbox" state.
  // If not → show the "enter personal email" form.
  const hasEmail = !!user?.personalEmail;

  const handleSubmit = async () => {
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }
    setSubmitting(true);
    try {
      await api.post('/auth/personal-email', { personalEmail: email.trim() });
      await fetchProfile(); // refresh so user.personalEmail appears
      setSuccessMsg('Verification email sent! Check your personal inbox.');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to send verification email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccessMsg('');
    setResending(true);
    try {
      await api.post('/auth/resend-personal-verification');
      setSuccessMsg('Verification email resent! Check your inbox and spam folder.');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Could not resend. Try again in a minute.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <Image src="/TR_Logo_black.png" alt="TechieRide" width={80} height={80} className="object-contain" priority />
        </div>

        {!hasEmail && !successMsg ? (
          <>
            {/* ── Step 1: Enter personal email ── */}
            <div className="text-4xl mb-3">📱</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Add your personal email</h2>
            <p className="text-sm text-gray-500 mb-6">
              We need a verified personal email to send you admin decisions, ride notifications, and account recovery links.
            </p>

            <div className="bg-brand-50 rounded-xl p-3 text-xs text-brand-700 mb-6 text-left space-y-1">
              <p className="font-medium">Why we need this:</p>
              <ul className="list-disc list-inside space-y-1 text-brand-600">
                <li>Admin approval/rejection notification</li>
                <li>Ride booking alerts</li>
                <li>Account recovery (if office email changes)</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4 text-left">{error}</div>
            )}

            <div className="text-left mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className={inputCls}
                autoComplete="email"
              />
              <p className="text-xs text-gray-400 mt-1">Use Gmail, Yahoo, or any personal inbox you check regularly.</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Sending...' : 'Send Verification Email'}
            </button>
          </>
        ) : (
          <>
            {/* ── Step 2: Check inbox ── */}
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your personal inbox!</h2>
            <p className="text-sm text-gray-600 mb-2">
              We sent a verification link to{' '}
              <strong>{user?.personalEmail || email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Click the link to verify your personal email and continue onboarding.
              Check your spam folder if you don't see it.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4 text-left">{error}</div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4 text-left">{successMsg}</div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 mb-4 text-left">
              <p className="font-medium text-gray-700 mb-1">📌 After verifying:</p>
              <p>You'll be prompted to upload your company ID card for admin review.</p>
            </div>

            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-brand-600 hover:underline disabled:opacity-50"
            >
              {resending ? 'Resending...' : "Didn't receive it? Resend email"}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Wrong email?{' '}
              <button
                onClick={() => { setEmail(''); setSuccessMsg(''); setError(''); }}
                className="text-brand-600 underline"
              >
                Change it
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
