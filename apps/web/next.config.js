/** @type {import('next').NextConfig} */
const { version: pkgVersion } = require('../../package.json');
// On Vercel: use short SHA so the displayed version is always accurate regardless of
// which commit Vercel picked up. Falls back to package.json version in local dev.
const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
const base = pkgVersion.split('.').slice(0, 3).join('.');
const fullVersion = sha ? `${base}-${sha}` : pkgVersion;

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
