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

# Ensure all dependencies are installed (catches stale cache after package.json changes)
echo "📦 Verifying dependencies..."
cd ../..
npm install --prefer-offline 2>/dev/null || npm install
cd apps/api

echo "🗄️  Running Prisma migrations..."
npx prisma generate --schema=../../prisma/schema.prisma

echo "🗄️  Pushing schema changes to DB (adds new columns, safe)..."

# ── Data migration: merged identity verification (commit 79cf0be) ───────────
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
