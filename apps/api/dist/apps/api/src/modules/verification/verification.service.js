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
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const shared_1 = require("@techieride/shared");
let VerificationService = class VerificationService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async submitDocuments(userId, docs) {
        const request = await this.prisma.verificationRequest.upsert({
            where: { userId },
            create: {
                userId,
                ...docs,
                status: 'PENDING',
            },
            update: {
                ...docs,
                status: 'PENDING',
                rejectionReason: null,
                reviewedBy: null,
                reviewedAt: null,
            },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { verificationStatus: 'PENDING' },
        });
        return { requestId: request.id, status: 'PENDING' };
    }
    async getStatus(userId) {
        const req = await this.prisma.verificationRequest.findUnique({ where: { userId } });
        if (!req)
            return { status: 'NOT_SUBMITTED' };
        return {
            status: req.status,
            rejectionReason: req.rejectionReason,
            submittedAt: req.submittedAt,
        };
    }
    async review(requestId, adminId, decision, rejectionReason) {
        const req = await this.prisma.verificationRequest.findUnique({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException('Verification request not found');
        await this.prisma.$transaction([
            this.prisma.verificationRequest.update({
                where: { id: requestId },
                data: {
                    status: decision,
                    rejectionReason: rejectionReason || null,
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                },
            }),
            this.prisma.user.update({
                where: { id: req.userId },
                data: { verificationStatus: decision },
            }),
        ]);
        await this.notifications.create(req.userId, {
            type: decision === 'APPROVED'
                ? shared_1.NotificationType.VERIFICATION_APPROVED
                : shared_1.NotificationType.VERIFICATION_REJECTED,
            title: decision === 'APPROVED'
                ? 'Verification approved! 🎉'
                : 'Verification not approved',
            body: decision === 'APPROVED'
                ? 'You now have full access to Techie Ride'
                : rejectionReason || 'Please re-upload your documents',
            data: { requestId },
        });
        return { status: decision };
    }
    async getPendingQueue() {
        return this.prisma.verificationRequest.findMany({
            where: { status: 'PENDING' },
            include: { user: { select: { fullName: true, email: true, phone: true } } },
            orderBy: { submittedAt: 'asc' },
        });
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], VerificationService);
//# sourceMappingURL=verification.service.js.map