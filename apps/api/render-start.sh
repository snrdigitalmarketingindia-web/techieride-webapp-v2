#!/bin/bash
set -e

echo "📁 Working dir: $(pwd)"
echo "🗄️  Running Prisma migrations..."
npx prisma generate --schema=../../prisma/schema.prisma
npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss

echo "🚀 Starting API server..."
node dist/main
