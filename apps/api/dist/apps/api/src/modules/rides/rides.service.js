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
exports.RidesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shared_1 = require("@techieride/shared");
const gamification_service_1 = require("../gamification/gamification.service");
const notifications_service_1 = require("../notifications/notifications.service");
function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
let RidesService = class RidesService {
    constructor(prisma, gamification, notifications) {
        this.prisma = prisma;
        this.gamification = gamification;
        this.notifications = notifications;
    }
    async create(userId, dto) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException('You must be a Ride Giver to create rides');
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { id: dto.vehicleId, rideGiverId: giver.id, isActive: true },
        });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found');
        return this.prisma.ride.create({
            data: {
                rideGiverId: giver.id,
                vehicleId: dto.vehicleId,
                originName: dto.originName,
                originLat: dto.originLat,
                originLng: dto.originLng,
                destinationName: dto.destinationName,
                destinationLat: dto.destinationLat,
                destinationLng: dto.destinationLng,
                departureDate: new Date(dto.departureDate),
                departureTime: dto.departureTime,
                totalSeats: dto.totalSeats,
                availableSeats: dto.totalSeats,
                notes: dto.notes,
                status: shared_1.RideStatus.DRAFT,
            },
            include: { vehicle: true, rideGiver: { include: { user: true } } },
        });
    }
    async publish(rideId, userId) {
        const ride = await this.findRideForGiver(rideId, userId);
        if (ride.status !== shared_1.RideStatus.DRAFT) {
            throw new common_1.BadRequestException('Only DRAFT rides can be published');
        }
        const activeRide = await this.prisma.ride.findFirst({
            where: {
                rideGiverId: ride.rideGiverId,
                status: { in: [shared_1.RideStatus.PUBLISHED, shared_1.RideStatus.ONGOING] },
                id: { not: rideId },
            },
        });
        if (activeRide) {
            throw new common_1.BadRequestException('You already have an active ride. Complete or cancel it before publishing a new one.');
        }
        return this.prisma.ride.update({
            where: { id: rideId },
            data: { status: shared_1.RideStatus.PUBLISHED },
        });
    }
    async start(rideId, userId) {
        const ride = await this.findRideForGiver(rideId, userId);
        if (ride.status !== shared_1.RideStatus.PUBLISHED) {
            throw new common_1.BadRequestException('Only PUBLISHED rides can be started');
        }
        const updated = await this.prisma.ride.update({
            where: { id: rideId },
            data: { status: shared_1.RideStatus.ONGOING, startedAt: new Date() },
        });
        const participants = await this.prisma.rideParticipant.findMany({
            where: { rideId },
            include: { seeker: { include: { user: true } } },
        });
        for (const p of participants) {
            await this.notifications.create(p.seeker.userId, {
                type: shared_1.NotificationType.RIDE_STARTED,
                title: 'Your ride has started!',
                body: `${ride.originName} → ${ride.destinationName}`,
                data: { rideId },
            });
        }
        return updated;
    }
    async complete(rideId, userId) {
        const ride = await this.findRideForGiver(rideId, userId);
        if (ride.status !== shared_1.RideStatus.ONGOING) {
            throw new common_1.BadRequestException('Only ONGOING rides can be completed');
        }
        const updated = await this.prisma.ride.update({
            where: { id: rideId },
            data: { status: shared_1.RideStatus.COMPLETED, completedAt: new Date() },
        });
        const participants = await this.prisma.rideParticipant.findMany({
            where: { rideId },
            include: { seeker: { include: { user: true } } },
        });
        await this.gamification.awardRideCompletion(ride.rideGiverId, rideId, 'giver', ride.estimatedDistanceKm || 0, participants.length);
        for (const p of participants) {
            await this.gamification.awardRideCompletion(p.seekerId, rideId, 'seeker', ride.estimatedDistanceKm || 0, 1);
            await this.notifications.create(p.seeker.userId, {
                type: shared_1.NotificationType.RIDE_COMPLETED,
                title: 'Ride completed! Rate your experience',
                body: `How was your ride with ${ride.originName} → ${ride.destinationName}?`,
                data: { rideId },
            });
        }
        return updated;
    }
    async cancel(rideId, userId, reason) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        const isOwner = giver && ride.rideGiverId === giver.id;
        const isAdmin = user?.role === 'ADMIN';
        if (!isOwner && !isAdmin)
            throw new common_1.ForbiddenException();
        await this.prisma.rideRequest.updateMany({
            where: { rideId, status: { in: ['PENDING', 'APPROVED', 'HOLD', 'CONFIRMED'] } },
            data: { status: 'CANCELLED', cancelReason: 'Ride cancelled' },
        });
        return this.prisma.ride.update({
            where: { id: rideId },
            data: { status: shared_1.RideStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
        });
    }
    async search(dto) {
        const rides = await this.prisma.ride.findMany({
            where: {
                status: shared_1.RideStatus.PUBLISHED,
                departureDate: {
                    gte: new Date(dto.date),
                    lt: new Date(new Date(dto.date).getTime() + 86400000),
                },
                availableSeats: { gt: 0 },
            },
            include: {
                rideGiver: { include: { user: true } },
                vehicle: true,
            },
        });
        return rides
            .map((ride) => {
            const distFromOrigin = haversineMeters(dto.originLat, dto.originLng, ride.originLat, ride.originLng);
            const distFromDest = haversineMeters(dto.destinationLat, dto.destinationLng, ride.destinationLat, ride.destinationLng);
            return { ...ride, distanceFromOriginM: Math.round(distFromOrigin), distanceFromDestinationM: Math.round(distFromDest) };
        })
            .filter((r) => r.distanceFromOriginM <= 500 && r.distanceFromDestinationM <= 500)
            .sort((a, b) => a.distanceFromOriginM - b.distanceFromOriginM)
            .slice((dto.page - 1) * dto.limit, dto.page * dto.limit);
    }
    async findById(rideId) {
        const ride = await this.prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                rideGiver: { include: { user: true } },
                vehicle: true,
                participants: { include: { seeker: { include: { user: { select: { fullName: true, profilePhoto: true } } } } } },
            },
        });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        return ride;
    }
    async getGivenRides(userId, status) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            return [];
        return this.prisma.ride.findMany({
            where: {
                rideGiverId: giver.id,
                ...(status ? { status: status } : {}),
            },
            include: { vehicle: true },
            orderBy: { departureDate: 'desc' },
        });
    }
    async getTakenRides(userId) {
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            return [];
        const participants = await this.prisma.rideParticipant.findMany({
            where: { seekerId: seeker.id },
            include: {
                ride: {
                    include: { rideGiver: { include: { user: true } }, vehicle: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return participants.map((p) => p.ride);
    }
    async findRideForGiver(rideId, userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException('Not a ride giver');
        const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.rideGiverId !== giver.id)
            throw new common_1.ForbiddenException('Not your ride');
        return ride;
    }
};
exports.RidesService = RidesService;
exports.RidesService = RidesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gamification_service_1.GamificationService,
        notifications_service_1.NotificationsService])
], RidesService);
//# sourceMappingURL=rides.service.js.map