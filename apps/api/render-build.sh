#!/bin/bash
set -e

echo "📦 Installing dependencies from repo root..."
cd ../..
npm ci

echo "🔨 Building shared package..."
npm run build --workspace=packages/shared

echo "🔨 Building API..."
cd apps/api
./node_modules/.bin/nest build || npx nest build

echo "✅ Build complete"
