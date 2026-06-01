/** @type {import('next').NextConfig} */
// Version is stamped into package.json by the release-notes GitHub Action on every push.
// Format: 2.1.0.{commit-count} — always accurate, no git calls needed at build time.
const { version: fullVersion } = require('../../package.json');

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: fullVersion,
  },
  images: {
    domains: ['localhost', 'techieride-webapp-v2.onrender.com'],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
