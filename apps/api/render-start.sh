#!/bin/bash
set -e

echo "📁 Working dir: $(pwd)"
MAIN_JS="dist/apps/api/src/main.js"

# If dist doesn't exist, rebuild with memory limit
if [ ! -f "$MAIN_JS" ]; then
  echo "⚠️  $MAIN_JS not found — rebuilding..."
  cd ../..
  NODE_ENV=development npm install
  cd apps/api
  NODE_OPTIONS="--max-old-space-size=460" ./node_modules/.bin/nest build || \
  NODE_OPTIONS="--max-old-space-size=460" npx nest build
  echo "📂 After rebuild:"
  find dist -name "main.js" 2>/dev/null || echo "Still not found!"
fi

echo "🗄️  Running Prisma migrations..."
npx prisma generate --schema=../../prisma/schema.prisma
npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss

echo "🚀 Starting API server..."
node "$MAIN_JS"
