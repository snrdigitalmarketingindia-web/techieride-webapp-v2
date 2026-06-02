'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import Image from 'next/image';

function ConfirmEmailChangeContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No token provided.'); return; }
    usersApi.confirmEmailChange(token)
      .then((r) => { setStatus('success'); setMessage(r.data.message ?? 'Email updated successfully!'); })
      .catch((e) => { setStatus('error'); setMessage(e.response?.data?.message ?? 'Invalid or expired link.'); });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center space-y-4">
        <Image src="/TR_Logo_black.png" alt="TechieRide" width={72} height={72} className="mx-auto object-contain" />
        {status === 'loading' && <p className="text-gray-500 text-sm">Verifying your new email…</p>}
        {status === 'success' && (
          <>
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-gray-900">Email Updated!</p>
            <p className="text-sm text-gray-500">{message}</p>
            <p className="text-xs text-gray-400">Please log in again with your new email.</p>
            <button onClick={() => router.push('/login')}
              className="w-full bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 transition">
              Go to Login
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl">❌</div>
            <p className="font-semibold text-gray-900">Link Invalid</p>
            <p className="text-sm text-gray-500">{message}</p>
            <button onClick={() => router.push('/profile')}
              className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></div>}>
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}
