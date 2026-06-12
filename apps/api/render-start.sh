#!/bin/bash
set -e

echo "📁 Working dir: $(pwd)"
MAIN_JS="dist/apps/api/src/main.js"

# ── Build phase ───────────────────────────────────────────────────────────────
# render-build.sh runs during Render's BUILD phase and produces dist/.
# If dist/ is already present (Build phase ran correctly), skip the build here.
# If dist/ is missing (Build phase not configured or failed), run the full build
# now — we must install devDependencies first so that @nestjs/cli / tsc are available.
if [ ! -f "$MAIN_JS" ]; then
  echo "⚠️  $MAIN_JS not found — running full build (devDeps install + nest build)..."
  REPO_ROOT="$(cd ../.. && pwd)"
  echo "📁 Repo root: $REPO_ROOT"
  cd "$REPO_ROOT"
  echo "📦 Installing ALL dependencies (including devDeps for nest build)..."
  NODE_ENV=development npm install
  echo "🔧 Generating Prisma client (build-time)..."
  npx prisma generate --schema=./prisma/schema.prisma
  echo "🔨 Building API..."
  cd apps/api
  NODE_ENV=development npm run build
  MSG=$(git log -1 --format=%s 2>/dev/null || echo "")
  VERSION=$(echo "$MSG" | sed -n 's/^\[v\([0-9.]*\)\].*/\1/p')
  [ -n "$VERSION" ] && echo "{\"version\": \"$VERSION\", \"commit\": \"$(git rev-parse HEAD)\"}" > build-info.json
  echo "✅ Build complete."
  # Return to apps/api (we may have changed dir inside npm run build)
  cd "$REPO_ROOT/apps/api"
fi

# ── Prisma client (runtime) ──────────────────────────────────────────────────
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=../../prisma/schema.prisma

# ── DB migrations ────────────────────────────────────────────────────────────
# PostgreSQL rule: ALTER TYPE ... ADD VALUE cannot be used in the same
# transaction as queries that USE the new value. Split into two separate
# db execute calls so each runs in its own auto-committed transaction.

# STEP 1: Add new enum values only (committed immediately, no data changes)
echo "🔄  Step 1/2 — Adding new enum values (safe no-op if already present)..."
npx prisma db execute --schema=../../prisma/schema.prisma --stdin <<'ADD_ENUM_SQL'
DO $$ BEGIN
  ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'PERSONAL_EMAIL_PENDING';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'SEEKER_VERIFIED';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE "VerificationType" ADD VALUE IF NOT EXISTS 'IDENTITY';
EXCEPTION WHEN duplicate_object THEN null; END $$;
ADD_ENUM_SQL

# STEP 2: Migrate data using the newly committed enum values
echo "🔄  Step 2/2 — Migrating data to new enum values (safe no-op if already done)..."
npx prisma db execute --schema=../../prisma/schema.prisma --stdin <<'MIGRATE_DATA_SQL'
-- Cast to text before comparing so the query is a safe no-op when those
-- enum values no longer exist in the schema (avoids "invalid enum value" error).
UPDATE users SET "accountStatus" = 'DOCUMENT_VERIFICATION_PENDING'
  WHERE "accountStatus"::text IN ('EMPLOYEE_VERIFIED', 'EXCEPTION_VERIFICATION_REQUESTED');

UPDATE users SET "accountStatus" = 'SEEKER_VERIFIED'
  WHERE "accountStatus"::text = 'SEEKER_VERIFICATION_PENDING';

UPDATE verification_requests SET "verificationType" = 'IDENTITY'
  WHERE "verificationType"::text IN ('EMPLOYEE', 'SEEKER', 'EXCEPTION');
MIGRATE_DATA_SQL

echo "🗄️  Pushing schema changes to DB..."
npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss --skip-generate

# Dedup verification_requests (safe no-op if already clean)
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
