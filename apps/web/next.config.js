/** @type {import('next').NextConfig} */
// Version is stamped into root package.json by the release-notes GitHub Action on every push.
// Format: 2.1.0.{commit-count} — Vercel deploys the stamped commit so the number is always current.
const { version: fullVersion } = require('../../package.json');

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: fullVersion,
  },
  transpilePackages: ['mapbox-gl'],
  images: {
    domains: ['localhost', 'techieride-webapp-v2.onrender.com'],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
