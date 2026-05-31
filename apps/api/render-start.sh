#!/bin/bash
set -e

REPO_ROOT="$(cd ../.. && pwd)"
echo "🗄️  Running Prisma migrations..."
cd "$REPO_ROOT"
npx prisma generate --schema=./prisma/schema.prisma
npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss

echo "🚀 Starting API server..."
cd apps/api
node dist/main
