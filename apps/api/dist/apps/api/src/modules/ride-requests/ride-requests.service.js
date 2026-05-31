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
exports.RideRequestsService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const redis_module_1 = require("../../config/redis.module");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const shared_1 = require("@techieride/shared");
let RideRequestsService = class RideRequestsService {
    constructor(prisma, notifications, redis) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.redis = redis;
    }
    async create(userId, dto) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException('You must be a Ride Seeker to request rides');
        const ride = await this.prisma.ride.findUnique({
            where: { id: dto.rideId },
            include: { rideGiver: { include: { user: true } } },
        });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.status !== 'PUBLISHED')
            throw new common_1.BadRequestException('Ride is not available');
        if (ride.availableSeats <= 0)
            throw new common_1.BadRequestException('No seats available');
        if (ride.rideGiver.userId === userId) {
            throw new common_1.ForbiddenException('You cannot request a seat on your own ride');
        }
        const existing = await this.prisma.rideRequest.findUnique({
            where: { rideId_seekerId: { rideId: dto.rideId, seekerId: seeker.id } },
        });
        if (existing)
            throw new common_1.ConflictException('You already have a request for this ride');
        const activeRequest = await this.prisma.rideRequest.findFirst({
            where: {
                seekerId: seeker.id,
                status: { in: ['PENDING', 'HOLD', 'CONFIRMED'] },
                rideId: { not: dto.rideId },
            },
        });
        if (activeRequest) {
            throw new common_1.ConflictException('You already have an active ride request. Cancel it before requesting another ride.');
        }
        const request = await this.prisma.rideRequest.create({
            data: {
                rideId: dto.rideId,
                seekerId: seeker.id,
                pickupLat: dto.pickupLat,
                pickupLng: dto.pickupLng,
                pickupName: dto.pickupName,
                dropLat: dto.dropLat,
                dropLng: dto.dropLng,
                dropName: dto.dropName,
                status: 'PENDING',
            },
        });
        await this.notifications.create(ride.rideGiver.userId, {
            type: shared_1.NotificationType.REQUEST_APPROVED,
            title: 'New seat request',
            body: `Someone wants to join your ride on ${new Date(ride.departureDate).toLocaleDateString()}`,
            data: { rideId: ride.id, requestId: request.id },
        });
        return { requestId: request.id, status: 'PENDING' };
    }
    async getIncomingRequests(rideId, userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException();
        const ride = await this.prisma.ride.findFirst({ where: { id: rideId, rideGiverId: giver.id } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found or not yours');
        return this.prisma.rideRequest.findMany({
            where: { rideId },
            include: { seeker: { include: { user: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getMyRequests(userId) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException();
        return this.prisma.rideRequest.findMany({
            where: { seekerId: seeker.id },
            include: { ride: { include: { rideGiver: { include: { user: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approve(requestId, userId) {
        const request = await this.getRequestForGiver(requestId, userId);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException('Request is no longer pending');
        }
        const ride = await this.prisma.ride.findUnique({ where: { id: request.rideId } });
        if (!ride || ride.availableSeats <= 0) {
            throw new common_1.BadRequestException('No seats available');
        }
        const holdExpiresAt = new Date(Date.now() + shared_1.SEAT_HOLD_TTL_SECONDS * 1000);
        await this.prisma.$transaction([
            this.prisma.rideRequest.update({
                where: { id: requestId },
                data: { status: 'HOLD', holdExpiresAt },
            }),
            this.prisma.ride.update({
                where: { id: ride.id },
                data: { availableSeats: { decrement: 1 } },
            }),
        ]);
        await this.redis.setex(shared_1.REDIS_KEYS.SEAT_HOLD(ride.id, request.seekerId), shared_1.SEAT_HOLD_TTL_SECONDS, requestId);
        const seeker = await this.prisma.rideSeeker.findUnique({
            where: { id: request.seekerId },
            include: { user: true },
        });
        if (seeker) {
            await this.notifications.create(seeker.userId, {
                type: shared_1.NotificationType.REQUEST_APPROVED,
                title: 'Seat approved! Confirm now',
                body: 'You have 15 minutes to confirm your seat',
                data: { requestId, holdExpiresAt: holdExpiresAt.toISOString() },
            });
        }
        return { status: 'HOLD', holdExpiresAt: holdExpiresAt.toISOString() };
    }
    async reject(requestId, userId, reason) {
        const request = await this.getRequestForGiver(requestId, userId);
        if (!['PENDING'].includes(request.status)) {
            throw new common_1.BadRequestException('Request cannot be rejected');
        }
        const updated = await this.prisma.rideRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED', cancelReason: reason },
        });
        const seeker = await this.prisma.rideSeeker.findUnique({
            where: { id: request.seekerId },
            include: { user: true },
        });
        if (seeker) {
            await this.notifications.create(seeker.userId, {
                type: shared_1.NotificationType.REQUEST_REJECTED,
                title: 'Seat request not approved',
                body: reason || 'The ride giver was unable to accommodate your request',
                data: { requestId },
            });
        }
        return updated;
    }
    async confirm(requestId, userId) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException();
        const request = await this.prisma.rideRequest.findUnique({
            where: { id: requestId },
            include: { ride: { include: { rideGiver: { include: { user: true } } } } },
        });
        if (!request || request.seekerId !== seeker.id)
            throw new common_1.NotFoundException();
        if (request.status !== 'HOLD')
            throw new common_1.BadRequestException('Request is not in hold state');
        const holdKey = shared_1.REDIS_KEYS.SEAT_HOLD(request.rideId, seeker.id);
        const holdValue = await this.redis.get(holdKey);
        if (!holdValue) {
            await this.prisma.rideRequest.update({
                where: { id: requestId },
                data: { status: 'CANCELLED', cancelReason: 'hold_expired' },
            });
            throw new common_1.GoneException('Hold expired. Please request again.');
        }
        await this.prisma.$transaction([
            this.prisma.rideRequest.update({
                where: { id: requestId },
                data: { status: 'CONFIRMED', confirmedAt: new Date() },
            }),
            this.prisma.rideParticipant.create({
                data: {
                    rideId: request.rideId,
                    seekerId: seeker.id,
                    requestId,
                    pickupName: request.pickupName,
                    dropName: request.dropName,
                },
            }),
        ]);
        await this.redis.del(holdKey);
        await this.notifications.create(request.ride.rideGiver.userId, {
            type: shared_1.NotificationType.RIDE_CONFIRMED,
            title: 'Seat confirmed!',
            body: 'A seeker has confirmed their seat for your ride',
            data: { rideId: request.rideId, requestId },
        });
        return { status: 'CONFIRMED' };
    }
    async cancel(requestId, userId, reason) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException();
        const request = await this.prisma.rideRequest.findUnique({ where: { id: requestId } });
        if (!request || request.seekerId !== seeker.id)
            throw new common_1.NotFoundException();
        if (['CANCELLED', 'REJECTED'].includes(request.status)) {
            throw new common_1.BadRequestException('Request already cancelled');
        }
        if (['HOLD', 'CONFIRMED'].includes(request.status)) {
            await this.prisma.ride.update({
                where: { id: request.rideId },
                data: { availableSeats: { increment: 1 } },
            });
            await this.redis.del(shared_1.REDIS_KEYS.SEAT_HOLD(request.rideId, seeker.id));
            if (request.status === 'CONFIRMED') {
                await this.prisma.rideParticipant.deleteMany({
                    where: { rideId: request.rideId, seekerId: seeker.id },
                });
            }
        }
        return this.prisma.rideRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
        });
    }
    async getRequestForGiver(requestId, userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException();
        const request = await this.prisma.rideRequest.findUnique({
            where: { id: requestId },
            include: { ride: true },
        });
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        if (request.ride.rideGiverId !== giver.id)
            throw new common_1.ForbiddenException('Not your ride');
        return request;
    }
};
exports.RideRequestsService = RideRequestsService;
exports.RideRequestsService = RideRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(redis_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        ioredis_1.default])
], RideRequestsService);
//# sourceMappingURL=ride-requests.service.js.map