/** @type {import('next').NextConfig} */
// Version is stamped into root package.json by the release-notes GitHub Action on every push.
// Format: 2.1.0.{commit-count} — Vercel deploys the stamped commit so the number is always current.
const { version: fullVersion } = require('../../package.json');

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
