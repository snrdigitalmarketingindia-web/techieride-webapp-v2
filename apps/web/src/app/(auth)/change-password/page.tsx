'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();

  const [current,  setCurrent]  = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const strengthCheck = (pw: string) => {
    const checks = [
      pw.length >= 8,
      /[A-Z]/.test(pw),
      /[0-9]/.test(pw),
      /[^A-Za-z0-9]/.test(pw),
    ];
    return checks.filter(Boolean).length;
  };
  const strength = strengthCheck(newPw);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'][strength];

  const submit = async () => {
    if (!current)                      { setError('Enter your current (or temporary) password'); return; }
    if (newPw.length < 8)              { setError('New password must be at least 8 characters'); return; }
    if (newPw !== confirm)             { setError('Passwords do not match'); return; }
    if (newPw === current)             { setError('New password must be different from the current one'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.changePassword(current, newPw);
      await fetchProfile(); // refresh mustChangePassword flag in store
      setDone(true);
    } catch (e: any) {
      const msg = e.response?.data?.message ?? '';
      if (msg === 'TEMP_PASSWORD_EXPIRED') {
        setError('Your temporary password has expired. Please request a new one from the login screen.');
      } else {
        setError(msg || 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image src="/TR_Logo_black.png" alt="TechieRide" width={80} height={80} className="object-contain" priority />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Set new password</h2>
          <p className="text-sm text-gray-500 mt-1">Enter the temporary password from your email, then choose a new one</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <p className="text-sm text-gray-700 font-medium">Password changed successfully!</p>
            <p className="text-xs text-gray-500">You can now use your new password to log in.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Current / temp password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary / Current Password</label>
              <div className="relative">
                <input
                  type={showCur ? 'text' : 'password'}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="From the email we sent"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                />
                <button type="button" onClick={() => setShowCur(!showCur)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {showCur ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 chars, mixed case + symbol"
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
              {newPw.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : strength === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                    {strengthLabel} — {strength < 4 ? 'add uppercase, numbers, or symbols to strengthen' : 'Great password!'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${confirm && confirm !== newPw ? 'border-red-400' : 'border-gray-300'}`}
              />
              {confirm && confirm !== newPw && <p className="text-xs text-red-500 mt-1">Passwords don&apos;t match</p>}
            </div>

            <button
              onClick={submit}
              disabled={loading || !current || !newPw || !confirm}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving…' : 'Set New Password'}
            </button>

            <button
              onClick={() => router.push('/login')}
              className="w-full text-center text-sm text-gray-500 hover:text-brand-600"
            >
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
