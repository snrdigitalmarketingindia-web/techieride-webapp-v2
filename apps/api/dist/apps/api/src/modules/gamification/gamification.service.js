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
exports.GamificationService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const redis_module_1 = require("../../config/redis.module");
const prisma_service_1 = require("../../prisma/prisma.service");
const shared_1 = require("@techieride/shared");
let GamificationService = class GamificationService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async awardRideCompletion(seekerOrGiverId, rideId, role, distanceKm, passengers) {
        const points = role === 'giver' ? shared_1.ECO_POINTS.RIDE_GIVEN : shared_1.ECO_POINTS.RIDE_TAKEN;
        const co2SavedG = role === 'giver'
            ? Math.round(passengers * distanceKm * shared_1.CO2_PER_KM_PER_PERSON_GRAMS)
            : Math.round(distanceKm * shared_1.CO2_PER_KM_PER_PERSON_GRAMS);
        let userId;
        if (role === 'giver') {
            const giver = await this.prisma.rideGiver.findUnique({ where: { id: seekerOrGiverId } });
            userId = giver.userId;
            await this.prisma.rideGiver.update({
                where: { id: seekerOrGiverId },
                data: { totalRidesGiven: { increment: 1 } },
            });
        }
        else {
            const seeker = await this.prisma.rideSeeker.findUnique({ where: { id: seekerOrGiverId } });
            userId = seeker.userId;
            await this.prisma.rideSeeker.update({
                where: { id: seekerOrGiverId },
                data: { totalRidesTaken: { increment: 1 } },
            });
        }
        await this.addPoints(userId, points, 'RIDE_COMPLETED', rideId, co2SavedG);
    }
    async addPoints(userId, points, eventType, rideId, co2SavedG = 0) {
        await this.prisma.$transaction([
            this.prisma.gamificationPoint.create({
                data: { userId, eventType, points, rideId, co2SavedG },
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: { ecoPoints: { increment: points } },
            }),
        ]);
        await this.recalculateLevel(userId);
    }
    async recalculateLevel(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { ecoPoints: true } });
        if (!user)
            return;
        const pts = user.ecoPoints;
        let newLevel = shared_1.EcoLevel.SEED;
        if (pts >= shared_1.ECO_LEVEL_THRESHOLDS.FOREST)
            newLevel = shared_1.EcoLevel.FOREST;
        else if (pts >= shared_1.ECO_LEVEL_THRESHOLDS.TREE)
            newLevel = shared_1.EcoLevel.TREE;
        else if (pts >= shared_1.ECO_LEVEL_THRESHOLDS.LEAF)
            newLevel = shared_1.EcoLevel.LEAF;
        else if (pts >= shared_1.ECO_LEVEL_THRESHOLDS.SPROUT)
            newLevel = shared_1.EcoLevel.SPROUT;
        await this.prisma.user.update({ where: { id: userId }, data: { ecoLevel: newLevel } });
    }
    async getSummary(userId) {
        const [user, points] = await this.prisma.$transaction([
            this.prisma.user.findUnique({ where: { id: userId }, select: { ecoPoints: true, ecoLevel: true } }),
            this.prisma.gamificationPoint.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);
        const co2SavedG = await this.prisma.gamificationPoint.aggregate({
            where: { userId },
            _sum: { co2SavedG: true },
        });
        return {
            totalPoints: user?.ecoPoints || 0,
            ecoLevel: user?.ecoLevel,
            co2SavedKg: ((co2SavedG._sum.co2SavedG || 0) / 1000).toFixed(2),
            pointsHistory: points,
        };
    }
    async getLeaderboard(period = 'monthly', limit = 50) {
        const cacheKey = period === 'monthly' ? 'leaderboard:monthly' : 'leaderboard:alltime';
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const dateFilter = period === 'monthly'
            ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            : undefined;
        const results = await this.prisma.gamificationPoint.groupBy({
            by: ['userId'],
            where: dateFilter ? { createdAt: { gte: dateFilter } } : {},
            _sum: { points: true, co2SavedG: true },
            orderBy: { _sum: { points: 'desc' } },
            take: limit,
        });
        const leaderboard = await Promise.all(results.map(async (r, i) => {
            const user = await this.prisma.user.findUnique({
                where: { id: r.userId },
                select: { id: true, fullName: true, profilePhoto: true, ecoLevel: true },
            });
            return {
                rank: i + 1,
                ...user,
                points: r._sum.points || 0,
                co2SavedKg: ((r._sum.co2SavedG || 0) / 1000).toFixed(2),
            };
        }));
        await this.redis.setex(cacheKey, 3600, JSON.stringify(leaderboard));
        return leaderboard;
    }
};
exports.GamificationService = GamificationService;
exports.GamificationService = GamificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(redis_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ioredis_1.default])
], GamificationService);
//# sourceMappingURL=gamification.service.js.map