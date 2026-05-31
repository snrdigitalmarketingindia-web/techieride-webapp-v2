"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveTrackingService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const redis_module_1 = require("../../config/redis.module");
const prisma_service_1 = require("../../prisma/prisma.service");
const shared_1 = require("@techieride/shared");
let LiveTrackingService = class LiveTrackingService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async storeLocation(rideId, gps) {
        const key = shared_1.REDIS_KEYS.GPS(rideId);
        await this.redis.setex(key, shared_1.GPS_TTL_SECONDS, JSON.stringify(gps));
    }
    async getLastLocation(rideId) {
        const val = await this.redis.get(shared_1.REDIS_KEYS.GPS(rideId));
        if (!val)
            return null;
        return JSON.parse(val);
    }
    async canAccessRide(userId, rideId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.role === 'ADMIN')
            return true;
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (giver) {
            const ride = await this.prisma.ride.findFirst({ where: { id: rideId, rideGiverId: giver.id } });
            if (ride)
                return true;
        }
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (seeker) {
            const participant = await this.prisma.rideParticipant.findFirst({
                where: { rideId, seekerId: seeker.id },
            });
            if (participant)
                return true;
        }
        return false;
    }
    async isRideGiver(userId, rideId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            return false;
        const ride = await this.prisma.ride.findFirst({ where: { id: rideId, rideGiverId: giver.id } });
        return !!ride;
    }
};
exports.LiveTrackingService = LiveTrackingService;
exports.LiveTrackingService = LiveTrackingService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(redis_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ioredis_1.default])
], LiveTrackingService);
//# sourceMappingURL=live-tracking.service.js.map