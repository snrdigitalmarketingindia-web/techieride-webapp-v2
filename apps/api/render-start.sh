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
  echo "✅ Build complete."
  # Return to apps/api (we may have changed dir inside npm run build)
  cd "$REPO_ROOT/apps/api"
fi

# ── Prisma client (runtime) ──────────────────────────────────────────────────
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=../../prisma/schema.prisma

# ── DB migrations ────────────────────────────────────────────────────────────
echo "🗄️  Pushing schema changes to DB (adds new columns, safe)..."

# Data migration: merged identity verification (commit 79cf0be)
# Must run BEFORE db push so old enum values are gone before Postgres tries to
# drop them. Safe no-ops if these values no longer exist in the DB.
echo "🔄  Migrating old enum values → new ones (safe no-op if already done)..."
npx prisma db execute --schema=../../prisma/schema.prisma --stdin <<'PRE_MIGRATION_SQL'
-- Add new AccountStatus values if they don't exist yet
DO $$ BEGIN
  ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'PERSONAL_EMAIL_PENDING';
  ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'SEEKER_VERIFIED';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add new VerificationType value if it doesn't exist yet
DO $$ BEGIN
  ALTER TYPE "VerificationType" ADD VALUE IF NOT EXISTS 'IDENTITY';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Migrate old AccountStatus values to their new equivalents
UPDATE users SET "accountStatus" = 'DOCUMENT_VERIFICATION_PENDING'
  WHERE "accountStatus" IN ('EMPLOYEE_VERIFIED', 'EXCEPTION_VERIFICATION_REQUESTED');

UPDATE users SET "accountStatus" = 'SEEKER_VERIFIED'
  WHERE "accountStatus" = 'SEEKER_VERIFICATION_PENDING';

-- Migrate old VerificationType values to IDENTITY
UPDATE verification_requests SET "verificationType" = 'IDENTITY'
  WHERE "verificationType" IN ('EMPLOYEE', 'SEEKER', 'EXCEPTION');
PRE_MIGRATION_SQL

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
