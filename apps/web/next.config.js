/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');
const { version } = require('../../package.json');

// On Vercel use the short commit SHA; locally fall back to git commit count
let buildSuffix = '0';
if (process.env.VERCEL_GIT_COMMIT_SHA) {
  buildSuffix = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
} else {
  try {
    buildSuffix = execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {}
}

const baseVersion = version.split('.').slice(0, 3).join('.');
const fullVersion = `${baseVersion}.${buildSuffix}`;

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
