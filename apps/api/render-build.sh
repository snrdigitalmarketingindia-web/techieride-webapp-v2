#!/bin/bash
set -e

echo "📁 Working dir: $(pwd)"
echo "📦 Installing dependencies..."
cd ../..
echo "📁 Repo root: $(pwd)"

# Install everything including devDeps (needed for nest build, tsc)
NODE_ENV=development npm install

echo "🔧 Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "🔨 Building API..."
cd apps/api
NODE_ENV=development npm run build

echo "✅ Done. Searching for main.js:"
find /opt/render/project/src -name "main.js" 2>/dev/null || find . -name "main.js" 2>/dev/null || echo "main.js not found anywhere!"
echo "Contents of apps/api:"
ls /opt/render/project/src/apps/api/ 2>/dev/null || ls . 2>/dev/null
