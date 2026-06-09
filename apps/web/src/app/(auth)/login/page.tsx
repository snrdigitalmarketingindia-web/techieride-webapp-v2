'use client';

import Image from 'next/image';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '';
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    setError('');
    try {
      setUnverifiedEmail('');
      await login(email.toLowerCase().trim(), password);
      const { user } = useAuthStore.getState();
      const status = user?.accountStatus;
      if (status === 'EMAIL_VERIFICATION_PENDING') {
        // Show inline banner so user can resend or request exception
        setUnverifiedEmail(email.toLowerCase().trim());
      } else if (status === 'PERSONAL_EMAIL_PENDING') {
        router.push('/personal-email-verification');
      } else {
        const dest = nextPath && nextPath.startsWith('/') ? nextPath : (user?.role === 'ADMIN' ? '/admin' : '/dashboard');
        router.push(dest);
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || '';
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(email.toLowerCase().trim());
        setError('');
      } else if (msg === 'EMAIL_BOUNCED') {
        setError('Your email address could not be reached. Please contact support.');
      } else {
        setError(msg || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail.toLowerCase().trim());
      setForgotSent(true);
    } catch {
      setForgotSent(true); // Always show success to prevent email enumeration
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot password view ──────────────────────────────────────────────
  if (forgotMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Image src="/TR_Logo_black.png" alt="TechieRide" width={80} height={80} className="object-contain" priority />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reset password</h2>
            <p className="text-sm text-gray-500 mt-1">We'll send a reset link to your office email</p>
          </div>

          {forgotSent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <p className="text-sm text-gray-700">
                If an account exists for <strong>{forgotEmail}</strong>, a reset link has been sent. Check your inbox.
              </p>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={handleForgot}
                disabled={forgotLoading || !forgotEmail}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                onClick={() => setForgotMode(false)}
                className="w-full text-sm text-gray-500 hover:text-brand-600 transition"
              >
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main login view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image src="/TR_Logo_black.png" alt="TechieRide" width={96} height={96} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
          <span className="inline-block mt-1 text-xs text-orange-400 font-medium">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </div>

        {unverifiedEmail && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm font-medium text-amber-800 mb-1">📧 Email not verified</p>
            <p className="text-sm text-amber-700">
              Please check your inbox and click the verify link sent to{' '}
              <strong>{unverifiedEmail}</strong>
            </p>
            <button
              onClick={async () => {
                try {
                  await authApi.resendVerification(unverifiedEmail);
                  setUnverifiedEmail('');
                  setError('Verification email resent — please check your inbox.');
                } catch {
                  setError('Could not resend. Please try again in a moment.');
                }
              }}
              className="mt-2 text-xs text-amber-700 underline hover:text-amber-900 block"
            >
              Didn't receive it? Resend verification email
            </button>
            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-xs text-amber-600">Can't access your company email?</p>
              <Link
                href="/exception-verification"
                className="text-xs text-amber-800 font-medium underline hover:text-amber-900"
              >
                Request an admin exception →
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="you@company.com"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="text-right mt-1">
              <button
                onClick={() => { setForgotMode(true); setForgotEmail(email); }}
                className="text-xs text-brand-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          New to TechieRide?{' '}
          <Link href="/signup" className="text-brand-600 font-medium hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></div>}>
      <LoginContent />
    </Suspense>
  );
}
