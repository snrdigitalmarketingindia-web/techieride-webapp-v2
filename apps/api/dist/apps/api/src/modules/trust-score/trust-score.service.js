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
var TrustScoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustScoreService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const shared_1 = require("@techieride/shared");
const shared_2 = require("@techieride/shared");
let TrustScoreService = TrustScoreService_1 = class TrustScoreService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.logger = new common_1.Logger(TrustScoreService_1.name);
    }
    async adjust(userId, delta, eventType, reason, referenceId, adminId) {
        if (referenceId) {
            const existing = await this.prisma.trustScoreEvent.findUnique({
                where: { userId_eventType_referenceId: { userId, eventType, referenceId } },
            });
            if (existing)
                return existing.scoreAfter;
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { trustScore: true, accountStatus: true },
        });
        if (!user)
            return 0;
        const raw = user.trustScore + delta;
        const newScore = Math.max(shared_1.TRUST_SCORE.MIN_SCORE, Math.min(100, raw));
        const newBand = this.bandFor(newScore);
        await this.prisma.$transaction([
            this.prisma.trustScoreEvent.create({
                data: { userId, delta, eventType, reason, referenceId, scoreAfter: newScore, adminId },
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: { trustScore: newScore, trustBand: newBand },
            }),
        ]);
        await this.handleThresholds(userId, newScore, user.accountStatus);
        return newScore;
    }
    bandFor(score) {
        if (score >= shared_1.TRUST_BAND_THRESHOLDS.PLATINUM)
            return shared_1.TrustBand.PLATINUM;
        if (score >= shared_1.TRUST_BAND_THRESHOLDS.GOLD)
            return shared_1.TrustBand.GOLD;
        if (score >= shared_1.TRUST_BAND_THRESHOLDS.SILVER)
            return shared_1.TrustBand.SILVER;
        if (score >= shared_1.TRUST_BAND_THRESHOLDS.BRONZE)
            return shared_1.TrustBand.BRONZE;
        return shared_1.TrustBand.NEW;
    }
    async handleThresholds(userId, score, currentStatus) {
        if (score <= shared_1.TRUST_SCORE.MIN_SCORE && currentStatus !== shared_2.AccountStatus.BANNED) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { accountStatus: shared_2.AccountStatus.BANNED },
            });
            await this.notifications.create(userId, {
                type: shared_2.NotificationType.GENERIC,
                title: 'Account permanently banned',
                body: 'Your trust score has reached 0. Your account has been permanently banned.',
            });
            this.logger.warn(`User ${userId} BANNED — trust score reached 0`);
            return;
        }
        if (score < shared_1.TRUST_SCORE.SUSPENSION_THRESHOLD && currentStatus !== shared_2.AccountStatus.SUSPENDED && currentStatus !== shared_2.AccountStatus.BANNED) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { accountStatus: shared_2.AccountStatus.SUSPENDED },
            });
            await this.notifications.create(userId, {
                type: shared_2.NotificationType.GENERIC,
                title: 'Account suspended',
                body: `Your trust score has dropped below ${shared_1.TRUST_SCORE.SUSPENSION_THRESHOLD}. Your account has been suspended. Contact support to appeal.`,
            });
            this.logger.warn(`User ${userId} SUSPENDED — trust score ${score}`);
            return;
        }
        if (score < shared_1.TRUST_SCORE.WARNING_THRESHOLD) {
            await this.notifications.create(userId, {
                type: shared_2.NotificationType.GENERIC,
                title: 'Trust score warning',
                body: `Your trust score is ${score}. Please note that further violations may result in suspension.`,
            });
        }
    }
    async onVerificationApproved(userId, type) {
        const delta = type === 'EMPLOYEE' ? shared_1.TRUST_SCORE.EMPLOYEE_VERIFIED : shared_1.TRUST_SCORE.DRIVER_VERIFIED;
        const eventType = type === 'EMPLOYEE' ? 'EMPLOYEE_VERIFIED' : 'DRIVER_VERIFIED';
        await this.adjust(userId, delta, eventType, `${type} verification approved`, userId);
    }
    async onRideCompletedGiver(giverId, rideId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { id: giverId }, select: { userId: true, totalRidesGiven: true } });
        if (!giver)
            return;
        await this.adjust(giver.userId, shared_1.TRUST_SCORE.RIDE_COMPLETED_GIVER, 'RIDE_COMPLETED_GIVER', 'Ride completed as giver', rideId);
        await this.checkMilestone(giver.userId, giver.totalRidesGiven, 'giver');
    }
    async onRideCompletedSeeker(seekerId, rideId) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { id: seekerId }, select: { userId: true, totalRidesTaken: true } });
        if (!seeker)
            return;
        await this.adjust(seeker.userId, shared_1.TRUST_SCORE.RIDE_COMPLETED_SEEKER, 'RIDE_COMPLETED_SEEKER', 'Ride completed as seeker', rideId);
        await this.checkMilestone(seeker.userId, seeker.totalRidesTaken, 'seeker');
    }
    async onRatingReceived(userId, stars, ratingId) {
        const deltas = {
            5: shared_1.TRUST_SCORE.RATING_5_STAR,
            4: shared_1.TRUST_SCORE.RATING_4_STAR,
            3: shared_1.TRUST_SCORE.RATING_3_STAR,
            2: shared_1.TRUST_SCORE.RATING_2_STAR,
            1: shared_1.TRUST_SCORE.RATING_1_STAR,
        };
        const delta = deltas[stars] ?? 0;
        if (delta === 0)
            return;
        await this.adjust(userId, delta, `RATING_${stars}_STAR`, `Received ${stars}-star rating`, ratingId);
    }
    async onNoShowSeeker(seekerUserId, rideId) {
        await this.adjust(seekerUserId, shared_1.TRUST_SCORE.NO_SHOW_SEEKER, 'NO_SHOW_SEEKER', 'Marked as no-show by giver', rideId);
    }
    async onNoShowGiver(giverUserId, rideId) {
        await this.adjust(giverUserId, shared_1.TRUST_SCORE.NO_SHOW_GIVER, 'NO_SHOW_GIVER', 'Ride auto-cancelled due to giver no-show', rideId);
    }
    async onGiverCancelledRide(giverUserId, rideId) {
        await this.adjust(giverUserId, shared_1.TRUST_SCORE.GIVER_CANCELLED_RIDE, 'GIVER_CANCELLED_RIDE', 'Giver cancelled a published ride', rideId);
    }
    async onComplaintVerified(reportedUserId, complaintId) {
        await this.adjust(reportedUserId, shared_1.TRUST_SCORE.COMPLAINT_VERIFIED, 'COMPLAINT_VERIFIED', 'Verified complaint filed against user', complaintId);
    }
    async adminAdjust(userId, delta, reason, adminId) {
        return this.adjust(userId, delta, 'ADMIN_OVERRIDE', reason, undefined, adminId);
    }
    async adminReinstate(userId, adminId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { accountStatus: shared_2.AccountStatus.EMPLOYEE_VERIFIED },
        });
        await this.notifications.create(userId, {
            type: shared_2.NotificationType.GENERIC,
            title: 'Account reinstated',
            body: 'Your account has been reinstated by an administrator.',
        });
        this.logger.log(`User ${userId} reinstated by admin ${adminId}`);
    }
    async getScore(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { trustScore: true, trustBand: true },
        });
        return user;
    }
    async getHistory(userId) {
        return this.prisma.trustScoreEvent.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async decayInactiveUsers() {
        const now = new Date();
        const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const day60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const day90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const recentRides = await this.prisma.ride.groupBy({
            by: ['rideGiverId'],
            where: { completedAt: { gte: day30 } },
            _max: { completedAt: true },
        });
        const activeGiverIds = new Set(recentRides.map(r => r.rideGiverId));
        const recentTaken = await this.prisma.rideParticipant.groupBy({
            by: ['seekerId'],
            where: { ride: { completedAt: { gte: day30 } } },
            _max: { createdAt: true },
        });
        const activeSeekerIds = new Set(recentTaken.map(r => r.seekerId));
        const allUsers = await this.prisma.user.findMany({
            where: { accountStatus: { notIn: ['BANNED', 'SUSPENDED', 'DEACTIVATED'] } },
            select: { id: true, trustScore: true, rideGiver: { select: { id: true } }, rideSeeker: { select: { id: true } } },
        });
        for (const user of allUsers) {
            const isActive = (user.rideGiver && activeGiverIds.has(user.rideGiver.id)) ||
                (user.rideSeeker && activeSeekerIds.has(user.rideSeeker.id));
            if (isActive)
                continue;
            if (user.trustScore <= shared_1.TRUST_SCORE.DECAY_FLOOR)
                continue;
            const lastRide = await this.prisma.ride.findFirst({
                where: { rideGiver: { userId: user.id }, completedAt: { not: null } },
                orderBy: { completedAt: 'desc' },
                select: { completedAt: true },
            });
            const lastDate = lastRide?.completedAt ?? new Date(0);
            let delta = 0;
            if (lastDate < day90)
                delta = shared_1.TRUST_SCORE.DECAY_90_DAYS;
            else if (lastDate < day60)
                delta = shared_1.TRUST_SCORE.DECAY_60_DAYS;
            else if (lastDate < day30)
                delta = shared_1.TRUST_SCORE.DECAY_30_DAYS;
            if (delta === 0)
                continue;
            const newScore = Math.max(shared_1.TRUST_SCORE.DECAY_FLOOR, user.trustScore + delta);
            if (newScore === user.trustScore)
                continue;
            await this.adjust(user.id, newScore - user.trustScore, 'INACTIVITY_DECAY', 'Inactivity decay');
        }
        this.logger.log('Trust score decay job completed');
    }
    async checkMilestone(userId, totalRides, role) {
        const prefix = role === 'giver' ? 'GIVER' : 'SEEKER';
        if (totalRides === 10) {
            await this.adjust(userId, shared_1.TRUST_SCORE.MILESTONE_10_RIDES, `MILESTONE_10_${prefix}`, '10 rides milestone', `milestone_10_${role}_${userId}`);
        }
        else if (totalRides === 50) {
            await this.adjust(userId, shared_1.TRUST_SCORE.MILESTONE_50_RIDES, `MILESTONE_50_${prefix}`, '50 rides milestone', `milestone_50_${role}_${userId}`);
        }
    }
};
exports.TrustScoreService = TrustScoreService;
__decorate([
    (0, schedule_1.Cron)('0 3 * * *', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TrustScoreService.prototype, "decayInactiveUsers", null);
exports.TrustScoreService = TrustScoreService = TrustScoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], TrustScoreService);
//# sourceMappingURL=trust-score.service.js.map