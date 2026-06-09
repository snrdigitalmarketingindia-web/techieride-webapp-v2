'use client';

import Image from 'next/image';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function VerifyPersonalEmailContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [nextStatus, setNextStatus] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    api.get(`/auth/verify-personal-email?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Personal email verified!');
        setNextStatus(res.data?.nextStatus || '');
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <Image src="/TR_Logo_black.png" alt="TechieRide" width={80} height={80} className="object-contain" priority />
        </div>

        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-gray-600">Verifying your personal email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Personal Email Verified!</h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>

            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800 mb-6 text-left">
              <p className="font-medium mb-1">Next step:</p>
              <p className="text-brand-700">Log in and upload your company ID + government ID to complete identity verification.</p>
            </div>

            <Link
              href="/login"
              className="block w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition"
            >
              Log In to Continue
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link
              href="/login"
              className="block w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition mb-3"
            >
              Back to Login
            </Link>
            <p className="text-xs text-gray-400">
              The link may have expired. Log in and request a new verification email from the app.
            </p>
          </>
        )}

        <p className="text-xs text-gray-400 mt-8"><em>for a better society...</em></p>
      </div>
    </div>
  );
}

export default function VerifyPersonalEmailPage() {
  return (
    <Suspense>
      <VerifyPersonalEmailContent />
    </Suspense>
  );
}
