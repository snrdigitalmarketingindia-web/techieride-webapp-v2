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

# Stamp the exact build number for THIS commit. Prefer the [vN] prefix the
# commit hook writes into the message (works on Render's shallow clone);
# fall back to commit count only when the clone has full history.
MSG=$(git log -1 --format=%s 2>/dev/null || echo "")
VERSION=$(echo "$MSG" | sed -n 's/^\[v\([0-9.]*\)\].*/\1/p')
if [ -z "$VERSION" ] && [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = "false" ]; then
  COUNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)
  [ "$COUNT" != "0" ] && VERSION="2.1.0.$COUNT"
fi
if [ -n "$VERSION" ]; then
  echo "{\"version\": \"$VERSION\", \"commit\": \"$(git rev-parse HEAD)\"}" > build-info.json
  echo "🔖 Stamped build-info.json: $VERSION"
fi

echo "✅ Done. Searching for main.js:"
find /opt/render/project/src -name "main.js" 2>/dev/null || find . -name "main.js" 2>/dev/null || echo "main.js not found anywhere!"
echo "Contents of apps/api:"
ls /opt/render/project/src/apps/api/ 2>/dev/null || ls . 2>/dev/null
