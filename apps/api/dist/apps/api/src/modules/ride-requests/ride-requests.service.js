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
var RideRequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideRequestsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const ioredis_1 = require("ioredis");
const redis_module_1 = require("../../config/redis.module");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const shared_1 = require("@techieride/shared");
const PENDING_EXPIRY_HOURS = 4;
const USER_CONTACT_SELECT = {
    id: true, fullName: true, profilePhoto: true,
    companyName: true, phone: true, countryCode: true,
};
let RideRequestsService = RideRequestsService_1 = class RideRequestsService {
    constructor(prisma, notifications, redis) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.redis = redis;
        this.logger = new common_1.Logger(RideRequestsService_1.name);
    }
    async expirePendingRequests() {
        const cutoff = new Date(Date.now() - PENDING_EXPIRY_HOURS * 60 * 60 * 1000);
        const stale = await this.prisma.rideRequest.findMany({
            where: { status: 'PENDING', createdAt: { lt: cutoff } },
            include: {
                seeker: { include: { user: true } },
                ride: true,
            },
        });
        if (stale.length === 0)
            return;
        this.logger.log(`⏰ Auto-rejecting ${stale.length} stale PENDING request(s)`);
        for (const req of stale) {
            await this.prisma.rideRequest.update({
                where: { id: req.id },
                data: { status: 'REJECTED', cancelReason: 'Auto-expired after 24 hours' },
            });
            if (req.seeker?.userId) {
                await this.notifications.create(req.seeker.userId, {
                    type: shared_1.NotificationType.REQUEST_REJECTED,
                    title: 'Ride request expired',
                    body: `Your request for the ride on ${new Date(req.ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} was not responded to and has expired.`,
                    data: { rideId: req.rideId, requestId: req.id },
                });
            }
        }
    }
    async create(userId, dto) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException('You must be a Ride Seeker to request rides');
        const ride = await this.prisma.ride.findUnique({
            where: { id: dto.rideId },
            include: { rideGiver: { include: { user: { select: USER_CONTACT_SELECT } } } },
        });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.status !== 'PUBLISHED')
            throw new common_1.BadRequestException('Ride is not available');
        if (ride.availableSeats <= 0)
            throw new common_1.BadRequestException('No seats available');
        if (ride.womenOnly) {
            const requester = await this.prisma.user.findUnique({ where: { id: userId }, select: { gender: true } });
            if (requester?.gender !== 'FEMALE') {
                throw new common_1.ForbiddenException('This ride is for women only');
            }
        }
        if (ride.rideGiver.userId === userId) {
            throw new common_1.ForbiddenException('You cannot request a seat on your own ride');
        }
        const existing = await this.prisma.rideRequest.findUnique({
            where: { rideId_seekerId: { rideId: dto.rideId, seekerId: seeker.id } },
        });
        if (existing && !['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(existing.status)) {
            throw new common_1.ConflictException('You already have an active request for this ride');
        }
        const activeRequest = await this.prisma.rideRequest.findFirst({
            where: {
                seekerId: seeker.id,
                status: { in: ['PENDING', 'CONFIRMED'] },
                rideId: { not: dto.rideId },
            },
        });
        if (activeRequest) {
            throw new common_1.ConflictException('You already have an active ride request. Cancel it before requesting another ride.');
        }
        const request = await this.prisma.rideRequest.upsert({
            where: { rideId_seekerId: { rideId: dto.rideId, seekerId: seeker.id } },
            create: {
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
            update: {
                status: 'PENDING',
                holdExpiresAt: null,
                confirmedAt: null,
                cancelledAt: null,
                cancelReason: null,
                pickupLat: dto.pickupLat,
                pickupLng: dto.pickupLng,
                pickupName: dto.pickupName,
                dropLat: dto.dropLat,
                dropLng: dto.dropLng,
                dropName: dto.dropName,
            },
        });
        await this.notifications.create(ride.rideGiver.userId, {
            type: shared_1.NotificationType.GENERIC,
            title: '🙋 New seat request',
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
            include: { seeker: { include: { user: { select: USER_CONTACT_SELECT } } } },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getMyRequests(userId) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException();
        return this.prisma.rideRequest.findMany({
            where: { seekerId: seeker.id },
            include: { ride: { include: { rideGiver: { include: { user: { select: USER_CONTACT_SELECT } } } } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approve(requestId, userId) {
        const request = await this.getRequestForGiver(requestId, userId);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException('Request is no longer pending');
        }
        const ride = await this.prisma.ride.findUnique({ where: { id: request.rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        const seatUpdate = await this.prisma.ride.updateMany({
            where: { id: ride.id, availableSeats: { gt: 0 } },
            data: { availableSeats: { decrement: 1 } },
        });
        if (seatUpdate.count === 0) {
            throw new common_1.BadRequestException('No seats available');
        }
        const seeker = await this.prisma.rideSeeker.findUnique({
            where: { id: request.seekerId },
            include: { user: true },
        });
        await this.prisma.$transaction([
            this.prisma.rideRequest.update({
                where: { id: requestId },
                data: { status: 'CONFIRMED', confirmedAt: new Date() },
            }),
            this.prisma.rideParticipant.create({
                data: {
                    rideId: request.rideId,
                    seekerId: request.seekerId,
                    requestId,
                    pickupName: request.pickupName,
                    dropName: request.dropName,
                },
            }),
        ]);
        if (seeker) {
            await this.notifications.create(seeker.userId, {
                type: shared_1.NotificationType.REQUEST_APPROVED,
                title: 'Seat confirmed!',
                body: 'Your seat has been confirmed. You\'re all set for the ride!',
                data: { requestId },
            });
        }
        return { status: 'CONFIRMED' };
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
        const request = await this.prisma.rideRequest.findUnique({ where: { id: requestId } });
        if (!request || request.seekerId !== seeker.id)
            throw new common_1.NotFoundException();
        return { status: request.status };
    }
    async cancel(requestId, userId, reason) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException();
        const request = await this.prisma.rideRequest.findUnique({
            where: { id: requestId },
            include: { ride: { include: { rideGiver: true } } },
        });
        if (!request || request.seekerId !== seeker.id)
            throw new common_1.NotFoundException();
        if (['CANCELLED', 'REJECTED'].includes(request.status)) {
            throw new common_1.BadRequestException('Request already cancelled');
        }
        if (request.ride?.status === 'ONGOING') {
            throw new common_1.BadRequestException('Cannot cancel a request once the ride has started');
        }
        if (request.status === 'CONFIRMED') {
            await this.prisma.ride.update({
                where: { id: request.rideId },
                data: { availableSeats: { increment: 1 } },
            });
            await this.prisma.rideParticipant.deleteMany({
                where: { rideId: request.rideId, seekerId: seeker.id },
            });
            const seekerUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
            if (request.ride?.rideGiver?.userId) {
                await this.notifications.create(request.ride.rideGiver.userId, {
                    type: shared_1.NotificationType.RIDE_CANCELLED,
                    title: 'Passenger cancelled their seat',
                    body: `${seekerUser?.fullName ?? 'A passenger'} cancelled their booking on ${request.ride.originName} → ${request.ride.destinationName}`,
                    data: { rideId: request.rideId },
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
__decorate([
    (0, schedule_1.Cron)('0 * * * *', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RideRequestsService.prototype, "expirePendingRequests", null);
exports.RideRequestsService = RideRequestsService = RideRequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(redis_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        ioredis_1.default])
], RideRequestsService);
//# sourceMappingURL=ride-requests.service.js.map