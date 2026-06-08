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
exports.SosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const shared_1 = require("@techieride/shared");
const SOS_COOLDOWN_SECONDS = 60;
let SosService = class SosService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async trigger(userId, rideId, lat, lng) {
        const lastSos = await this.prisma.sosEvent.findFirst({
            where: { userId },
            orderBy: { triggeredAt: 'desc' },
        });
        if (lastSos) {
            const secondsSinceLast = (Date.now() - lastSos.triggeredAt.getTime()) / 1000;
            if (secondsSinceLast < SOS_COOLDOWN_SECONDS) {
                throw new common_1.HttpException(`SOS cooldown active — please wait ${Math.ceil(SOS_COOLDOWN_SECONDS - secondsSinceLast)} more second(s)`, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
        }
        if (rideId) {
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
            if (!ride) {
                throw new common_1.BadRequestException('Ride not found');
            }
            if (ride.status !== 'ONGOING') {
                throw new common_1.BadRequestException(`SOS can only be triggered during an ONGOING ride (current status: ${ride.status})`);
            }
            const isGiver = ride.rideGiver.userId === userId;
            const isSeeker = ride.requests.some((r) => r.seeker?.userId === userId);
            if (!isGiver && !isSeeker) {
                throw new common_1.ForbiddenException('You are not a participant of this ride');
            }
        }
        const sos = await this.prisma.sosEvent.create({
            data: {
                userId,
                rideId: rideId ?? null,
                lat: lat ?? 0,
                lng: lng ?? 0,
                status: 'TRIGGERED',
            },
        });
        const contacts = await this.prisma.emergencyContact.findMany({ where: { userId } });
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        for (const contact of contacts) {
            console.log(`🆘 SOS ALERT — ${user?.fullName} needs help! ` +
                `Location: ${lat ?? 'unknown'},${lng ?? 'unknown'} | Contact: ${contact.name} (${contact.phone})`);
        }
        const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
        const locationStr = lat != null && lng != null
            ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            : 'Location unavailable';
        for (const admin of admins) {
            await this.notifications.create(admin.id, {
                type: shared_1.NotificationType.SOS_ALERT,
                title: `🆘 SOS Alert from ${user?.fullName}`,
                body: `Location: ${locationStr}${rideId ? ` | Ride: ${rideId.slice(0, 8)}` : ''}`,
                data: { sosId: sos.id, userId, lat: lat ?? null, lng: lng ?? null, rideId: rideId ?? null },
            });
        }
        return {
            sosId: sos.id,
            message: `Emergency contacts notified. ${contacts.length} contact(s) alerted.`,
        };
    }
    async resolve(sosId, adminId, notes) {
        return this.prisma.sosEvent.update({
            where: { id: sosId },
            data: {
                status: 'RESOLVED',
                resolvedBy: adminId,
                resolutionNotes: notes,
                resolvedAt: new Date(),
            },
        });
    }
    async getActive() {
        return this.prisma.sosEvent.findMany({
            where: { status: { in: ['TRIGGERED', 'ACKNOWLEDGED'] } },
            include: {
                user: { select: { fullName: true, phone: true } },
                ride: { select: { originName: true, destinationName: true } },
            },
            orderBy: { triggeredAt: 'desc' },
        });
    }
};
exports.SosService = SosService;
exports.SosService = SosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], SosService);
//# sourceMappingURL=sos.service.js.map