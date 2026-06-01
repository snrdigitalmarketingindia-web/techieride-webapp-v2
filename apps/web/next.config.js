/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');
const { version } = require('../../package.json');

// Build number = total git commit count; falls back gracefully in CI/Vercel
let buildNumber = '0';
try {
  buildNumber = execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {}

// Strip any existing 4th segment from package.json version, then append live build number
const baseVersion = version.split('.').slice(0, 3).join('.');
const fullVersion = `${baseVersion}.${buildNumber}`;

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
