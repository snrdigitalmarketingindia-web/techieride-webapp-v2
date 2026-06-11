'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
        <div className="text-5xl">😕</div>
        <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500">
          Don&apos;t worry — your data is safe. Try again, or head back to the dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Go to Dashboard
          </a>
        </div>
        {error?.digest && <p className="text-[10px] text-gray-300">Error ref: {error.digest}</p>}
      </div>
    </div>
  );
}
