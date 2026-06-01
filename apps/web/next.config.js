/** @type {import('next').NextConfig} */
const { version } = require('../../package.json');

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  images: {
    domains: ['localhost', 'techieride-webapp-v2.onrender.com'],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
