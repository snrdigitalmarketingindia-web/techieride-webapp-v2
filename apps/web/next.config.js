/** @type {import('next').NextConfig} */
// Version is stamped into root package.json by the release-notes GitHub Action on every push.
// Format: 2.1.0.{commit-count} — Vercel deploys the stamped commit so the number is always current.
const { version: pkgVersion } = require('../../package.json');

// Exact build number for THIS commit: the prepare-commit-msg hook stamps
// [v2.1.0.N] into every commit message, and Vercel exposes the built commit's
// message at build time. package.json (stamped only after a green CI run)
// is the fallback for commits made without the hook.
const msgMatch = (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').match(/^\[v(\d+\.\d+\.\d+\.\d+)\]/);
const fullVersion = msgMatch ? msgMatch[1] : pkgVersion;

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: fullVersion,
    // Exact commit this build was made from — Vercel injects VERCEL_GIT_COMMIT_SHA.
    // Unlike the version (stamped only after a green CI run, so one bump behind),
    // the SHA always identifies the deployed code precisely.
    NEXT_PUBLIC_APP_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'local',
  },
  transpilePackages: ['leaflet', 'maplibre-gl'],
  images: {
    domains: ['localhost', 'techieride-webapp-v2.onrender.com'],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
