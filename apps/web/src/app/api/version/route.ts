import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Deploy verification endpoint — reports which commit Vercel actually built.
 * VERCEL_GIT_COMMIT_SHA is injected by Vercel at build/runtime.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    ts: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
  });
}
