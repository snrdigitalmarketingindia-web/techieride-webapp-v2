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
let SosService = class SosService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async trigger(userId, rideId, lat, lng) {
        const sos = await this.prisma.sosEvent.create({
            data: {
                userId,
                rideId: rideId || null,
                lat,
                lng,
                status: 'TRIGGERED',
            },
        });
        const contacts = await this.prisma.emergencyContact.findMany({ where: { userId } });
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        for (const contact of contacts) {
            console.log(`🆘 SOS ALERT — ${user?.fullName} needs help! ` +
                `Location: ${lat},${lng} | Contact: ${contact.name} (${contact.phone})`);
        }
        const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
        for (const admin of admins) {
            await this.notifications.create(admin.id, {
                type: shared_1.NotificationType.SOS_ALERT,
                title: `🆘 SOS Alert from ${user?.fullName}`,
                body: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}${rideId ? ` | Ride: ${rideId.slice(0, 8)}` : ''}`,
                data: { sosId: sos.id, userId, lat, lng, rideId },
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