'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f9fafb' }}>
          <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 48 }}>😕</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '12px 0' }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
              Don&apos;t worry — your data is safe.
            </p>
            <button
              onClick={reset}
              style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 500, cursor: 'pointer', marginRight: 12 }}
            >
              Try Again
            </button>
            <a href="/dashboard" style={{ color: '#374151', fontSize: 14 }}>Go to Dashboard</a>
          </div>
        </div>
      </body>
    </html>
  );
}
