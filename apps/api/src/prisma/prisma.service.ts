import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = process.env.DATABASE_URL ?? '';
    // Neon free tier: max 9 connections total. Cap Prisma pool at 3 so
    // multiple dyno restarts / self-ping cycles can't exhaust the limit.
    // Append only if not already present (idempotent).
    const url = dbUrl.includes('connection_limit')
      ? dbUrl
      : dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=20';
    super({ datasources: { db: { url } } });
  }

  async onModuleInit() {
    await this.$connect();
    await this.runSafeMigrations();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Safe, idempotent schema migrations that run on every startup.
   * Uses IF NOT EXISTS / IF EXISTS — always safe to re-run.
   * Add new columns/indexes here instead of manual DB operations.
   */
  private async runSafeMigrations() {
    const migrations: { name: string; sql: string }[] = [
      {
        name: 'add archivedAt to rides',
        // Table is "rides" (@@map), NOT "Ride"
        sql: `ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3)`,
      },
      {
        name: 'rename deboaredAt → deboardedAt in ride_participants',
        // Safe: only renames if the old typo column still exists
        sql: `DO $$ BEGIN
                IF EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'ride_participants' AND column_name = 'deboaredAt'
                ) THEN
                  ALTER TABLE "ride_participants" RENAME COLUMN "deboaredAt" TO "deboardedAt";
                END IF;
              END $$`,
      },
      {
        name: 'add deboardedAt to ride_participants if missing',
        sql: `ALTER TABLE "ride_participants" ADD COLUMN IF NOT EXISTS "deboardedAt" TIMESTAMP(3)`,
      },
      {
        name: 'add COMPLETED to RequestStatus enum',
        sql: `ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'COMPLETED'`,
      },
      {
        name: 'add rcMatchStatus to vehicles',
        sql: `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "rcMatchStatus" TEXT`,
      },
      {
        name: 'add rcParsedData to vehicles',
        sql: `ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "rcParsedData" JSONB`,
      },
      {
        name: 'fix stuck CONFIRMED requests on COMPLETED rides',
        // Table is "ride_requests" (@@map), NOT "RideRequest"
        sql: `UPDATE "ride_requests" rr
              SET status = 'COMPLETED'
              FROM "rides" r
              WHERE rr."rideId" = r.id
                AND rr.status = 'CONFIRMED'
                AND r.status = 'COMPLETED'`,
      },
    ];

    for (const m of migrations) {
      try {
        await this.$executeRawUnsafe(m.sql);
        this.logger.log(`✅ Migration OK: ${m.name}`);
      } catch (err: any) {
        // Log but never crash the server — migration may have already run
        this.logger.warn(`⚠️  Migration skipped (${m.name}): ${err.message}`);
      }
    }
  }
}
