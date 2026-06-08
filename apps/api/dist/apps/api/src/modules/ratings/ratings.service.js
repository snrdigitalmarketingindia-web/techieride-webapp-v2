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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const trust_score_service_1 = require("../trust-score/trust-score.service");
const shared_1 = require("@techieride/shared");
let RatingsService = class RatingsService {
    constructor(prisma, notifications, trustScore) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.trustScore = trustScore;
    }
    async submitRating(raterId, dto) {
        const { rideId, rateeId, score, comment } = dto;
        if (!Number.isInteger(score) || score < 1 || score > 5) {
            throw new common_1.BadRequestException('Score must be an integer between 1 and 5');
        }
        if (raterId === rateeId) {
            throw new common_1.BadRequestException('You cannot rate yourself');
        }
        const ride = await this.prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                rideGiver: { select: { userId: true } },
                requests: {
                    where: { status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } },
                    include: { seeker: { select: { userId: true } } },
                },
            },
        });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.status !== 'COMPLETED') {
            throw new common_1.BadRequestException(`Cannot rate a ride with status ${ride.status} — only COMPLETED rides can be rated`);
        }
        const giverUserId = ride.rideGiver.userId;
        const confirmedSeekerUserIds = ride.requests.map((r) => r.seeker?.userId).filter(Boolean);
        const isGiver = giverUserId === raterId;
        const isSeeker = confirmedSeekerUserIds.includes(raterId);
        if (!isGiver && !isSeeker) {
            throw new common_1.ForbiddenException('Only ride participants can submit ratings');
        }
        const rateeIsGiver = giverUserId === rateeId;
        const rateeIsSeeker = confirmedSeekerUserIds.includes(rateeId);
        if (!rateeIsGiver && !rateeIsSeeker) {
            throw new common_1.ForbiddenException('Ratee is not a participant of this ride');
        }
        const existing = await this.prisma.rideRating.findUnique({
            where: { rideId_raterId_rateeId: { rideId, raterId, rateeId } },
        });
        if (existing) {
            throw new common_1.ConflictException('You have already rated this user for this ride');
        }
        const rating = await this.prisma.rideRating.create({
            data: { rideId, raterId, rateeId, score, comment },
        });
        const rater = await this.prisma.user.findUnique({
            where: { id: raterId },
            select: { fullName: true },
        });
        await this.notifications.create(rateeId, {
            type: shared_1.NotificationType.RATING_RECEIVED,
            title: 'You received a new rating',
            body: `${rater?.fullName ?? 'Someone'} gave you ${score} star${score !== 1 ? 's' : ''}`,
            data: { ratingId: rating.id, rideId, score },
        });
        await this.trustScore.onRatingReceived(rateeId, score, rating.id);
        return { ratingId: rating.id, message: 'Rating submitted successfully' };
    }
    async getRideRatings(rideId) {
        const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        return this.prisma.rideRating.findMany({
            where: { rideId },
            include: {
                rater: { select: { id: true, fullName: true } },
                ratee: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getUserRatingStats(userId) {
        const ratings = await this.prisma.rideRating.findMany({
            where: { rateeId: userId },
            select: { score: true },
        });
        if (ratings.length === 0) {
            return { averageRating: null, ratingCount: 0 };
        }
        const total = ratings.reduce((sum, r) => sum + r.score, 0);
        const averageRating = Math.round((total / ratings.length) * 10) / 10;
        return { averageRating, ratingCount: ratings.length };
    }
};
exports.RatingsService = RatingsService;
exports.RatingsService = RatingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        trust_score_service_1.TrustScoreService])
], RatingsService);
//# sourceMappingURL=ratings.service.js.map