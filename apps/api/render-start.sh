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

# Dedup verification_requests before adding unique constraint (safe no-op if already clean)
echo "🧹 Deduplicating verification_requests..."
npx prisma db execute --schema=../../prisma/schema.prisma --stdin <<'DEDUP_SQL'
DELETE FROM verification_requests
WHERE id NOT IN (
  SELECT DISTINCT ON ("userId", "verificationType") id
  FROM verification_requests
  ORDER BY "userId", "verificationType", id DESC
);
DEDUP_SQL

echo "🚀 Starting API server..."
node "$MAIN_JS"
