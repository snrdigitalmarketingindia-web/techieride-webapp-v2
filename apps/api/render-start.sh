#!/bin/bash
set -e

echo "📁 Working dir: $(pwd)"
echo "📂 Contents:"
ls -la

echo "📂 dist contents:"
ls -la dist/ 2>/dev/null || echo "dist folder missing!"
echo "📂 dist recursive:"
find dist -type f 2>/dev/null || echo "no files in dist"

# If dist/main.js doesn't exist, rebuild
if [ ! -f "dist/main.js" ]; then
  echo "⚠️  dist/main.js not found — rebuilding..."
  cd ../..
  NODE_ENV=development npm install
  npm run build --workspace=apps/api
  cd apps/api
  echo "📂 After rebuild — dist recursive:"
  find dist -type f 2>/dev/null || echo "dist still empty!"
fi

echo "🗄️  Running Prisma migrations..."
npx prisma generate --schema=../../prisma/schema.prisma
npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss

echo "🚀 Starting API server..."
node dist/main
