"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(PrismaService_1.name);
    }
    async onModuleInit() {
        await this.$connect();
        await this.runSafeMigrations();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    async runSafeMigrations() {
        const migrations = [
            {
                name: 'add archivedAt to Ride',
                sql: `ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3)`,
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
                sql: `UPDATE "RideRequest" rr
              SET status = 'COMPLETED'
              FROM "Ride" r
              WHERE rr."rideId" = r.id
                AND rr.status = 'CONFIRMED'
                AND r.status = 'COMPLETED'`,
            },
        ];
        for (const m of migrations) {
            try {
                await this.$executeRawUnsafe(m.sql);
                this.logger.log(`✅ Migration OK: ${m.name}`);
            }
            catch (err) {
                this.logger.warn(`⚠️  Migration skipped (${m.name}): ${err.message}`);
            }
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map