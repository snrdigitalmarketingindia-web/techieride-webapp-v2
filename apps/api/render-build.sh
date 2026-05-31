#!/bin/bash
set -e

REPO_ROOT="$(cd ../.. && pwd)"
echo "📁 Repo root: $REPO_ROOT"

echo "📦 Installing all dependencies (including devDeps for build)..."
cd "$REPO_ROOT"
npm install --include=dev

echo "🔨 Building shared package..."
npm run build --workspace=packages/shared

echo "🔨 Building API..."
npm run build --workspace=apps/api

echo "✅ Build complete"
