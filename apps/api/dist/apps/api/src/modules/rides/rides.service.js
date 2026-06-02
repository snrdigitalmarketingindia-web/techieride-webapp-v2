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
var RidesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const shared_1 = require("@techieride/shared");
const GIVER_USER_SELECT = {
    id: true, fullName: true, profilePhoto: true,
    companyName: true, ecoLevel: true,
    phone: true, countryCode: true,
};
const SEEKER_USER_SELECT = {
    id: true, fullName: true, profilePhoto: true,
    companyName: true,
    phone: true, countryCode: true,
};
const gamification_service_1 = require("../gamification/gamification.service");
const notifications_service_1 = require("../notifications/notifications.service");
const email_service_1 = require("../email/email.service");
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
const DEPARTURE_TIMEOUT_MINUTES = 60;
let RidesService = RidesService_1 = class RidesService {
    constructor(prisma, gamification, notifications, email) {
        this.prisma = prisma;
        this.gamification = gamification;
        this.notifications = notifications;
        this.email = email;
        this.logger = new common_1.Logger(RidesService_1.name);
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
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.ForbiddenException('User not found');
        if (user.accountStatus !== 'DRIVER_VERIFIED') {
            throw new common_1.ForbiddenException('Driver verification is required before publishing rides. ' +
                'Complete employee verification first, then apply to become a Ride Giver.');
        }
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id: ride.vehicleId } });
        if (!vehicle || !vehicle.rcVerified) {
            throw new common_1.ForbiddenException('The vehicle\'s RC must be verified before publishing a ride. ' +
                'Please upload your RC document and wait for admin approval.');
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
        const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.status !== shared_1.RideStatus.PUBLISHED) {
            throw new common_1.BadRequestException('Only PUBLISHED rides can be started');
        }
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        const isGiver = giver && ride.rideGiverId === giver.id;
        if (!isGiver) {
            const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
            const isParticipant = seeker && await this.prisma.rideParticipant.findUnique({
                where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
            });
            if (!isParticipant)
                throw new common_1.ForbiddenException('Only the giver or a confirmed seeker can start this ride');
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
                title: 'Your ride has started! 🚗',
                body: `${ride.originName} → ${ride.destinationName}`,
                data: { rideId },
            });
        }
        return updated;
    }
    async board(rideId, userId) {
        const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.status !== shared_1.RideStatus.PUBLISHED && ride.status !== shared_1.RideStatus.ONGOING) {
            throw new common_1.BadRequestException('Ride is not active');
        }
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException('Only seekers can board');
        const participant = await this.prisma.rideParticipant.findUnique({
            where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
        });
        if (!participant)
            throw new common_1.ForbiddenException('You are not a confirmed participant of this ride');
        if (participant.boardingStatus === 'BOARDED')
            throw new common_1.BadRequestException('You have already boarded');
        if (participant.boardingStatus === 'DEBOARDED')
            throw new common_1.BadRequestException('You have already deboarded');
        await this.prisma.rideParticipant.update({
            where: { id: participant.id },
            data: { boardingStatus: 'BOARDED', boardedAt: new Date() },
        });
        const giverUser = await this.prisma.rideGiver.findUnique({
            where: { id: ride.rideGiverId },
        });
        if (giverUser) {
            const seekerUser = await this.prisma.user.findUnique({ where: { id: userId } });
            await this.notifications.create(giverUser.userId, {
                type: shared_1.NotificationType.SEEKER_BOARDED,
                title: `${seekerUser?.fullName?.split(' ')[0]} has boarded 🚗`,
                body: 'Check if all passengers are on board',
                data: { rideId },
            });
        }
        const allParticipants = await this.prisma.rideParticipant.findMany({ where: { rideId } });
        const allBoarded = allParticipants.every(p => p.id === participant.id ? true : p.boardingStatus === 'BOARDED' || p.boardingStatus === 'DEBOARDED');
        if (allBoarded && ride.status === shared_1.RideStatus.PUBLISHED) {
            await this.prisma.ride.update({
                where: { id: rideId },
                data: { status: shared_1.RideStatus.ONGOING, startedAt: new Date() },
            });
            const allWithUsers = await this.prisma.rideParticipant.findMany({
                where: { rideId },
                include: { seeker: { include: { user: true } } },
            });
            for (const p of allWithUsers) {
                await this.notifications.create(p.seeker.userId, {
                    type: shared_1.NotificationType.RIDE_STARTED,
                    title: 'All aboard! Ride has started 🚗',
                    body: `${ride.originName} → ${ride.destinationName}`,
                    data: { rideId },
                });
            }
            return { boardingStatus: 'BOARDED', rideAutoStarted: true };
        }
        return { boardingStatus: 'BOARDED', rideAutoStarted: false };
    }
    async deboard(rideId, userId) {
        const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.status !== shared_1.RideStatus.ONGOING) {
            throw new common_1.BadRequestException('Ride is not ongoing');
        }
        const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
        if (!seeker)
            throw new common_1.ForbiddenException('Only seekers can deboard');
        const participant = await this.prisma.rideParticipant.findUnique({
            where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
        });
        if (!participant)
            throw new common_1.ForbiddenException('You are not a participant of this ride');
        if (participant.boardingStatus !== 'BOARDED')
            throw new common_1.BadRequestException('You must be boarded to deboard');
        await this.prisma.rideParticipant.update({
            where: { id: participant.id },
            data: { boardingStatus: 'DEBOARDED', deboaredAt: new Date() },
        });
        const giverUser = await this.prisma.rideGiver.findUnique({ where: { id: ride.rideGiverId } });
        if (giverUser) {
            const seekerUser = await this.prisma.user.findUnique({ where: { id: userId } });
            await this.notifications.create(giverUser.userId, {
                type: shared_1.NotificationType.SEEKER_DEBOARDED,
                title: `${seekerUser?.fullName?.split(' ')[0]} has deboarded ✅`,
                body: 'You can complete the ride once all passengers have deboarded',
                data: { rideId },
            });
        }
        return { boardingStatus: 'DEBOARDED' };
    }
    async complete(rideId, userId) {
        const ride = await this.findRideForGiver(rideId, userId);
        if (ride.status !== shared_1.RideStatus.ONGOING) {
            throw new common_1.BadRequestException('Only ONGOING rides can be completed');
        }
        const boardingCheck = await this.prisma.rideParticipant.findMany({ where: { rideId } });
        const notYetResolved = boardingCheck.filter(p => p.boardingStatus !== 'DEBOARDED' && p.boardingStatus !== 'NO_SHOW');
        if (notYetResolved.length > 0) {
            throw new common_1.BadRequestException(`Cannot complete ride — ${notYetResolved.length} passenger(s) have not deboarded yet. Mark them as no-show if they didn't board.`);
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
    async autoExpireUnstartedRides() {
        const now = new Date();
        const published = await this.prisma.ride.findMany({
            where: { status: shared_1.RideStatus.PUBLISHED },
            include: {
                rideGiver: { include: { user: true } },
                participants: { include: { seeker: { include: { user: true } } } },
            },
        });
        const overdue = published.filter((ride) => {
            const [h, m] = ride.departureTime.split(':').map(Number);
            const departure = new Date(ride.departureDate);
            departure.setHours(h, m, 0, 0);
            const cutoff = new Date(departure.getTime() + DEPARTURE_TIMEOUT_MINUTES * 60 * 1000);
            return now > cutoff;
        });
        if (overdue.length === 0)
            return;
        this.logger.log(`⏰ Auto-cancelling ${overdue.length} unstarted ride(s) past departure + ${DEPARTURE_TIMEOUT_MINUTES}m`);
        for (const ride of overdue) {
            await this.prisma.ride.update({
                where: { id: ride.id },
                data: { status: shared_1.RideStatus.CANCELLED, cancelledAt: now, cancelReason: 'Ride not started — auto-cancelled' },
            });
            await this.notifications.create(ride.rideGiver.userId, {
                type: shared_1.NotificationType.RIDE_CANCELLED,
                title: 'Your ride was auto-cancelled',
                body: `${ride.originName} → ${ride.destinationName} was cancelled because it was not started within ${DEPARTURE_TIMEOUT_MINUTES} minutes of departure.`,
                data: { rideId: ride.id },
            });
            for (const p of ride.participants) {
                if (p.seeker?.userId) {
                    await this.notifications.create(p.seeker.userId, {
                        type: shared_1.NotificationType.RIDE_CANCELLED,
                        title: 'Your ride was cancelled',
                        body: `${ride.originName} → ${ride.destinationName} on ${new Date(ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} was not started and has been cancelled.`,
                        data: { rideId: ride.id },
                    });
                }
            }
            await this.prisma.rideRequest.updateMany({
                where: { rideId: ride.id, status: 'PENDING' },
                data: { status: 'CANCELLED', cancelReason: 'Ride auto-cancelled' },
            });
        }
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
        if ([shared_1.RideStatus.COMPLETED, shared_1.RideStatus.CANCELLED].includes(ride.status)) {
            throw new common_1.BadRequestException(`Cannot cancel a ${ride.status} ride`);
        }
        if (!isAdmin) {
            const departureDateTime = new Date(`${ride.departureDate.toISOString().split('T')[0]}T${ride.departureTime}:00`);
            const oneHourBefore = new Date(departureDateTime.getTime() - 60 * 60 * 1000);
            if (new Date() > oneHourBefore) {
                throw new common_1.BadRequestException('Rides can only be cancelled at least 1 hour before departure');
            }
        }
        const confirmedParticipants = await this.prisma.rideRequest.findMany({
            where: { rideId, status: { in: ['CONFIRMED'] } },
            include: { seeker: { include: { user: { select: { email: true, personalEmail: true, fullName: true } } } } },
        });
        await this.prisma.rideRequest.updateMany({
            where: { rideId, status: { in: ['PENDING', 'CONFIRMED'] } },
            data: { status: 'CANCELLED', cancelReason: 'Ride cancelled' },
        });
        const updated = await this.prisma.ride.update({
            where: { id: rideId },
            data: { status: shared_1.RideStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
        });
        for (const req of confirmedParticipants) {
            const seekerUser = req.seeker.user;
            await this.notifications.create(req.seeker.userId, {
                type: shared_1.NotificationType.RIDE_CANCELLED,
                title: 'Your ride has been cancelled',
                body: `${ride.originName} → ${ride.destinationName} was cancelled${reason ? `: ${reason}` : ''}`,
                data: { rideId },
            });
            const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#dc2626">Ride Cancelled 🚫</h2>
          <p>Hi ${seekerUser.fullName?.split(' ')[0]},</p>
          <p>Unfortunately your booked ride has been cancelled.</p>
          <p><strong>${ride.originName} → ${ride.destinationName}</strong></p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>Please book another ride from the app.</p>
        </div>`;
            await this.email.sendNotification(seekerUser.email, seekerUser.personalEmail, 'Your TechieRide ride was cancelled', html);
        }
        return updated;
    }
    async markNoShow(rideId, seekerId, giverId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId: giverId } });
        if (!giver)
            throw new common_1.ForbiddenException();
        const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (ride.rideGiverId !== giver.id)
            throw new common_1.ForbiddenException('Not your ride');
        if (ride.status !== shared_1.RideStatus.ONGOING) {
            throw new common_1.BadRequestException('Can only mark no-show during an ONGOING ride');
        }
        let seeker = await this.prisma.rideSeeker.findUnique({ where: { id: seekerId } });
        if (!seeker) {
            seeker = await this.prisma.rideSeeker.findUnique({ where: { userId: seekerId } });
        }
        if (!seeker)
            throw new common_1.NotFoundException('Seeker not found');
        const participant = await this.prisma.rideParticipant.findUnique({
            where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
        });
        if (!participant)
            throw new common_1.NotFoundException('Seeker is not a participant of this ride');
        if (participant.boardingStatus !== 'WAITING') {
            throw new common_1.BadRequestException(`Cannot mark no-show — seeker status is already ${participant.boardingStatus}`);
        }
        await this.prisma.$transaction([
            this.prisma.rideParticipant.update({
                where: { id: participant.id },
                data: { boardingStatus: 'NO_SHOW' },
            }),
            this.prisma.rideRequest.updateMany({
                where: { rideId, seekerId: seeker.id, status: 'CONFIRMED' },
                data: { status: 'NO_SHOW' },
            }),
            this.prisma.ride.update({
                where: { id: rideId },
                data: { availableSeats: { increment: 1 } },
            }),
        ]);
        await this.gamification.addPoints(seeker.userId, -10, 'NO_SHOW', rideId, 0);
        const seekerUser = await this.prisma.user.findUnique({ where: { id: seeker.userId } });
        await this.notifications.create(seeker.userId, {
            type: shared_1.NotificationType.SEEKER_NO_SHOW,
            title: 'Marked as No Show ⚠️',
            body: `You were marked as no-show for the ride on ${ride.originName} → ${ride.destinationName}. -10 ECO points applied.`,
            data: { rideId },
        });
        if (seekerUser) {
            const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#d97706">No Show Recorded ⚠️</h2>
          <p>Hi ${seekerUser.fullName?.split(' ')[0]},</p>
          <p>You have been marked as <strong>No Show</strong> for the following ride:</p>
          <p><strong>${ride.originName} → ${ride.destinationName}</strong></p>
          <p style="color:#dc2626">-10 ECO points have been deducted from your account.</p>
          <p>Please ensure you inform the giver in advance if you are unable to join a confirmed ride.</p>
        </div>`;
            await this.email.sendNotification(seekerUser.email, seekerUser.personalEmail, 'TechieRide — You were marked as No Show', html);
        }
        return { status: 'NO_SHOW', message: 'Seeker marked as no-show. -10 ECO points applied.' };
    }
    async edit(rideId, userId, updates) {
        const ride = await this.findRideForGiver(rideId, userId);
        if (ride.status !== shared_1.RideStatus.PUBLISHED) {
            throw new common_1.BadRequestException('Only PUBLISHED rides can be edited');
        }
        const departureDateTime = new Date(`${ride.departureDate.toISOString().split('T')[0]}T${ride.departureTime}:00`);
        const thirtyMinBefore = new Date(departureDateTime.getTime() - 30 * 60 * 1000);
        if (new Date() > thirtyMinBefore) {
            throw new common_1.BadRequestException('Rides can only be edited up to 30 minutes before departure');
        }
        const activeSeekersCount = await this.prisma.rideRequest.count({
            where: { rideId, status: { in: ['PENDING', 'CONFIRMED'] } },
        });
        if (activeSeekersCount > 0) {
            throw new common_1.BadRequestException('Cannot edit a ride that has pending or confirmed seat requests');
        }
        return this.prisma.ride.update({
            where: { id: rideId },
            data: {
                ...(updates.originName && { originName: updates.originName }),
                ...(updates.destinationName && { destinationName: updates.destinationName }),
                ...(updates.departureDate && { departureDate: new Date(updates.departureDate) }),
                ...(updates.departureTime && { departureTime: updates.departureTime }),
                ...(updates.totalSeats && { totalSeats: updates.totalSeats }),
                ...(updates.notes !== undefined && { notes: updates.notes }),
            },
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
                rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
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
                rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
                vehicle: true,
                participants: {
                    include: { seeker: { include: { user: { select: SEEKER_USER_SELECT } } } },
                },
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
            include: {
                vehicle: true,
                participants: {
                    include: { seeker: { include: { user: { select: SEEKER_USER_SELECT } } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
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
                    include: {
                        rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
                        vehicle: true,
                        participants: {
                            include: { seeker: { include: { user: { select: SEEKER_USER_SELECT } } } },
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                },
            },
            orderBy: { ride: { departureDate: 'desc' } },
        });
        return participants.map((p) => p.ride);
    }
    async getCommunityRides(from, to) {
        const fromDate = from ? new Date(from) : new Date();
        const toDate = to ? new Date(to) : new Date();
        toDate.setHours(23, 59, 59, 999);
        const rides = await this.prisma.ride.findMany({
            where: {
                status: { in: ['PUBLISHED', 'ONGOING', 'COMPLETED'] },
                departureDate: { gte: fromDate, lte: toDate },
            },
            include: {
                rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
                vehicle: { select: { make: true, model: true, color: true } },
                participants: { select: { boardingStatus: true } },
            },
            orderBy: [{ departureDate: 'asc' }, { departureTime: 'asc' }],
        });
        return rides.map((r) => ({
            id: r.id,
            originName: r.originName,
            destinationName: r.destinationName,
            departureDate: r.departureDate,
            departureTime: r.departureTime,
            totalSeats: r.totalSeats,
            availableSeats: r.availableSeats,
            filledSeats: r.totalSeats - r.availableSeats,
            fillRate: r.totalSeats > 0 ? (r.totalSeats - r.availableSeats) / r.totalSeats : 0,
            status: r.status,
            estimatedDistanceKm: r.estimatedDistanceKm,
            rideGiver: {
                fullName: r.rideGiver?.user?.fullName,
                ecoLevel: r.rideGiver?.user?.ecoLevel,
                averageRating: r.rideGiver?.averageRating,
                totalRidesGiven: r.rideGiver?.totalRidesGiven,
            },
            vehicle: r.vehicle,
        }));
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
__decorate([
    (0, schedule_1.Cron)('*/30 * * * *', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RidesService.prototype, "autoExpireUnstartedRides", null);
exports.RidesService = RidesService = RidesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gamification_service_1.GamificationService,
        notifications_service_1.NotificationsService,
        email_service_1.EmailService])
], RidesService);
//# sourceMappingURL=rides.service.js.map