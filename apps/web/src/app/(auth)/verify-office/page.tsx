'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { registrationApi } from '@/lib/api';
import Link from 'next/link';

export default function VerifyOfficePage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}><VerifyOfficeContent /></Suspense>;
}

function VerifyOfficeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Missing verification token.'); return; }
    registrationApi.verifyOffice(token)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message);
        if (res.data.pendingId) {
          localStorage.setItem('tr_pending_reg', JSON.stringify({ pendingId: res.data.pendingId }));
        }
      })
      .catch(e => {
        setStatus('error');
        setMessage(e.response?.data?.message || 'Verification failed.');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Verifying your office email...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        {status === 'success' ? (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Office Email Verified!</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link href="/signup-v2"
              className="inline-block w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 text-sm">
              Continue — Upload Documents →
            </Link>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link href="/signup-v2"
              className="inline-block w-full py-2.5 border border-brand-600 text-brand-600 rounded-lg font-medium hover:bg-brand-50 text-sm">
              Back to Registration
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
