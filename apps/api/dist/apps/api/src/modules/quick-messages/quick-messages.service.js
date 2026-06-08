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
exports.QuickMessagesService = exports.QUICK_MESSAGES = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const shared_1 = require("@techieride/shared");
exports.QUICK_MESSAGES = {
    ARRIVED_AT_START: { text: '🚗 I\'ve arrived at the starting point', role: 'giver' },
    ON_MY_WAY: { text: '⏱ On my way, arriving in 5 min', role: 'giver' },
    LOOK_FOR_MY_CAR: { text: '🅿️ I\'m at the pickup area — look for my car', role: 'giver' },
    CALL_ME_GIVER: { text: '📞 Can\'t find you — please call me', role: 'giver' },
    LEAVING_SOON: { text: '⚠️ Leaving in 2 min — please hurry', role: 'giver' },
    AT_PICKUP: { text: '📍 I\'m at the pickup point', role: 'seeker' },
    RUNNING_LATE: { text: '🙏 Running late, please wait 5 min', role: 'seeker' },
    CAN_SEE_CAR: { text: '✅ I can see your car — coming now', role: 'seeker' },
    CALL_ME_SEEKER: { text: '📞 Can\'t find you — please call me', role: 'seeker' },
    ALMOST_THERE: { text: '🏃 Almost there, 1 min away', role: 'seeker' },
};
let QuickMessagesService = class QuickMessagesService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async send(senderId, rideId, messageKey) {
        const msg = exports.QUICK_MESSAGES[messageKey];
        if (!msg)
            throw new common_1.BadRequestException(`Invalid message key: ${messageKey}`);
        const ride = await this.prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                rideGiver: true,
                participants: { include: { seeker: { include: { user: true } } } },
                requests: { where: { status: 'CONFIRMED' }, include: { seeker: { include: { user: true } } } },
            },
        });
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (!['PUBLISHED', 'ONGOING'].includes(ride.status)) {
            throw new common_1.BadRequestException('Quick messages only available on active rides');
        }
        const isGiver = ride.rideGiver.userId === senderId;
        const confirmedSeekerUserIds = ride.requests.map((r) => r.seeker.userId);
        const isSeeker = confirmedSeekerUserIds.includes(senderId);
        if (!isGiver && !isSeeker) {
            throw new common_1.ForbiddenException('Only the giver or confirmed seekers can send quick messages');
        }
        if (msg.role === 'giver' && !isGiver)
            throw new common_1.ForbiddenException('This message is for the ride giver only');
        if (msg.role === 'seeker' && !isSeeker)
            throw new common_1.ForbiddenException('This message is for seekers only');
        const senderUser = await this.prisma.user.findUnique({
            where: { id: senderId },
            select: { fullName: true },
        });
        const senderName = senderUser?.fullName?.split(' ')[0] ?? 'Someone';
        const rideLabel = `${ride.originName} → ${ride.destinationName}`;
        if (isGiver) {
            for (const seekerUserId of confirmedSeekerUserIds) {
                await this.notifications.create(seekerUserId, {
                    type: shared_1.NotificationType.QUICK_MESSAGE,
                    title: `${senderName} says:`,
                    body: `${msg.text}  —  ${rideLabel}`,
                    data: { rideId, messageKey },
                });
            }
        }
        else {
            await this.notifications.create(ride.rideGiver.userId, {
                type: shared_1.NotificationType.QUICK_MESSAGE,
                title: `${senderName} says:`,
                body: `${msg.text}  —  ${rideLabel}`,
                data: { rideId, messageKey },
            });
        }
        return { sent: true, message: msg.text };
    }
};
exports.QuickMessagesService = QuickMessagesService;
exports.QuickMessagesService = QuickMessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], QuickMessagesService);
//# sourceMappingURL=quick-messages.service.js.map