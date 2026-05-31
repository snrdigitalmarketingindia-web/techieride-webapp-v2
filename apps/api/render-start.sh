#!/bin/bash
set -e

echo "📁 Working dir: $(pwd)"
echo "📂 Contents:"
ls -la

# If dist doesn't exist, rebuild
if [ ! -f "dist/main.js" ]; then
  echo "⚠️  dist/main.js not found — rebuilding..."
  cd ../..
  NODE_ENV=development npm install
  npm run build --workspace=apps/api
  cd apps/api
  echo "📂 After build:"
  ls -la dist/ 2>/dev/null || echo "dist still missing!"
fi

echo "🗄️  Running Prisma migrations..."
npx prisma generate --schema=../../prisma/schema.prisma
npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss

echo "🚀 Starting API server..."
node dist/main
