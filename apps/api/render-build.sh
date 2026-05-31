#!/bin/bash
set -e

echo "📁 Working dir: $(pwd)"
echo "📦 Installing dependencies..."
cd ../..
echo "📁 Repo root: $(pwd)"

# Install everything including devDeps (needed for nest build, tsc)
NODE_ENV=development npm install

echo "🔨 Building API..."
cd apps/api
NODE_ENV=development npm run build

echo "✅ Done. Contents of dist:"
ls dist/ 2>/dev/null || echo "dist not found!"
