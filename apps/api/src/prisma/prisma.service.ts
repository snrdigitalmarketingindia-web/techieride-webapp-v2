import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

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
        name: 'add archivedAt to Ride',
        sql: `ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3)`,
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
