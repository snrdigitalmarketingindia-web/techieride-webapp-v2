#!/bin/bash
set -e

# Render sets working dir to apps/api (root directory setting)
# We need to go to repo root to install all workspace deps
REPO_ROOT="$(cd ../.. && pwd)"
echo "📁 Repo root: $REPO_ROOT"

echo "📦 Installing all workspace dependencies..."
cd "$REPO_ROOT"
npm install

echo "🔨 Building shared package..."
npm run build --workspace=packages/shared

echo "🔨 Building API..."
npm run build --workspace=apps/api

echo "✅ Build complete"
