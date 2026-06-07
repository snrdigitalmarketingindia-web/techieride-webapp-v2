'use client';

import Image from 'next/image';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    authApi.verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Email verified!');
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
            <p className="text-gray-600">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link
              href="/login"
              className="block w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition"
            >
              Sign In to TechieRide
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
            <div className="border-t border-gray-100 pt-4 mt-2">
              <p className="text-xs text-gray-500 mb-2">Can't access your company email?</p>
              <Link href="/exception-verification" className="text-sm text-brand-600 hover:underline font-medium">
                Request a manual exception →
              </Link>
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 mt-8"><em>for a better society...</em></p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
