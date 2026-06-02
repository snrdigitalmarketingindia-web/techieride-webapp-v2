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
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const email_service_1 = require("../email/email.service");
const trust_score_service_1 = require("../trust-score/trust-score.service");
const shared_1 = require("@techieride/shared");
let VerificationService = class VerificationService {
    constructor(prisma, notifications, email, trustScore) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.email = email;
        this.trustScore = trustScore;
    }
    async submitEmployeeDocs(userId, docs) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (!['DOCUMENT_VERIFICATION_PENDING', 'REJECTED'].includes(user.accountStatus)) {
            throw new common_1.BadRequestException('Documents can only be submitted during verification stages');
        }
        if (!docs.employeeIdUrl)
            throw new common_1.BadRequestException('Company ID card is required');
        await this.prisma.verificationRequest.upsert({
            where: { userId_verificationType: { userId, verificationType: 'EMPLOYEE' } },
            create: { userId, verificationType: 'EMPLOYEE', ...docs, status: 'PENDING' },
            update: { ...docs, status: 'PENDING', rejectionReason: null, reviewedBy: null, reviewedAt: null },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { verificationStatus: 'PENDING', accountStatus: 'DOCUMENT_VERIFICATION_PENDING' },
        });
        return { message: 'Documents submitted. Admin will review within 2 business days.' };
    }
    async submitDriverDocs(userId, docs) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (!['EMPLOYEE_VERIFIED', 'DRIVER_VERIFICATION_PENDING'].includes(user.accountStatus)) {
            throw new common_1.ForbiddenException('You must be a verified employee before applying to become a Ride Giver');
        }
        if (!docs.drivingLicenseUrl)
            throw new common_1.BadRequestException('Driving License is required');
        if (!docs.rcUrl)
            throw new common_1.BadRequestException('Vehicle RC is required');
        await this.prisma.verificationRequest.upsert({
            where: { userId_verificationType: { userId, verificationType: 'DRIVER' } },
            create: { userId, verificationType: 'DRIVER', ...docs, status: 'PENDING' },
            update: { ...docs, status: 'PENDING', rejectionReason: null, reviewedBy: null, reviewedAt: null },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { accountStatus: 'DRIVER_VERIFICATION_PENDING' },
        });
        return { message: 'Driver documents submitted. Admin will review your driving license and RC.' };
    }
    async getStatus(userId) {
        const requests = await this.prisma.verificationRequest.findMany({
            where: { userId },
            orderBy: { submittedAt: 'desc' },
        });
        const byType = Object.fromEntries(requests.map(r => [r.verificationType, r]));
        return {
            employee: byType['EMPLOYEE'] ? {
                status: byType['EMPLOYEE'].status,
                rejectionReason: byType['EMPLOYEE'].rejectionReason,
                submittedAt: byType['EMPLOYEE'].submittedAt,
            } : null,
            driver: byType['DRIVER'] ? {
                status: byType['DRIVER'].status,
                rejectionReason: byType['DRIVER'].rejectionReason,
                submittedAt: byType['DRIVER'].submittedAt,
            } : null,
            exception: byType['EXCEPTION'] ? {
                status: byType['EXCEPTION'].status,
                rejectionReason: byType['EXCEPTION'].rejectionReason,
                submittedAt: byType['EXCEPTION'].submittedAt,
            } : null,
        };
    }
    async review(requestId, adminId, decision, rejectionReason) {
        const req = await this.prisma.verificationRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });
        if (!req)
            throw new common_1.NotFoundException('Verification request not found');
        await this.prisma.verificationRequest.update({
            where: { id: requestId },
            data: {
                status: decision,
                rejectionReason: rejectionReason || null,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
        });
        let newAccountStatus;
        let trid;
        if (decision === 'APPROVED') {
            if (req.verificationType === 'EMPLOYEE' || req.verificationType === 'EXCEPTION') {
                if (!req.user.trid) {
                    const approvedCount = await this.prisma.user.count({ where: { trid: { not: null } } });
                    const nextNumber = shared_1.TRID_START + approvedCount;
                    trid = `TR${String(nextNumber).padStart(4, '0')}`;
                }
                newAccountStatus = client_1.AccountStatus.EMPLOYEE_VERIFIED;
                const verificationMethod = req.verificationType === 'EXCEPTION' ? 'MANUAL_EXCEPTION' : 'EMAIL_VERIFIED';
                await this.prisma.user.update({
                    where: { id: req.userId },
                    data: {
                        accountStatus: newAccountStatus,
                        verificationStatus: 'APPROVED',
                        verificationMethod,
                        ...(trid ? { trid } : {}),
                    },
                });
            }
            else {
                newAccountStatus = client_1.AccountStatus.DRIVER_VERIFIED;
                const newRole = 'RIDE_GIVER';
                await this.prisma.rideGiver.upsert({
                    where: { userId: req.userId },
                    create: { userId: req.userId },
                    update: {},
                });
                await this.prisma.user.update({
                    where: { id: req.userId },
                    data: { accountStatus: newAccountStatus, role: newRole },
                });
            }
        }
        else {
            newAccountStatus = req.verificationType === 'DRIVER'
                ? client_1.AccountStatus.EMPLOYEE_VERIFIED
                : client_1.AccountStatus.REJECTED;
            await this.prisma.user.update({
                where: { id: req.userId },
                data: { accountStatus: newAccountStatus, verificationStatus: 'REJECTED' },
            });
        }
        if (decision === 'APPROVED') {
            const type = (req.verificationType === 'EMPLOYEE' || req.verificationType === 'EXCEPTION') ? 'EMPLOYEE' : 'DRIVER';
            await this.trustScore.onVerificationApproved(req.userId, type);
        }
        await this.notifications.create(req.userId, {
            type: decision === 'APPROVED' ? shared_1.NotificationType.VERIFICATION_APPROVED : shared_1.NotificationType.VERIFICATION_REJECTED,
            title: decision === 'APPROVED'
                ? req.verificationType === 'DRIVER' ? 'Driver verification approved! 🚗' : `Welcome, ${trid || req.user.trid}! 🎉`
                : 'Verification not approved',
            body: decision === 'APPROVED'
                ? req.verificationType === 'DRIVER'
                    ? 'You can now offer rides on TechieRide!'
                    : `Your TechieRide ID is ${trid || req.user.trid}. You can now search and book rides.`
                : rejectionReason || 'Please re-upload your documents.',
            data: { requestId, trid, type: req.verificationType },
        });
        if (decision === 'APPROVED' && req.verificationType !== 'DRIVER') {
            await this.email.sendWelcomeApprovedEmail(req.user.personalEmail || req.user.email, req.user.fullName, trid || req.user.trid || '');
        }
        return { status: decision, trid, accountStatus: newAccountStatus };
    }
    async getQueue(verificationType) {
        return this.prisma.verificationRequest.findMany({
            where: { status: 'PENDING', verificationType },
            include: {
                user: { select: { fullName: true, email: true, phone: true, companyName: true, accountStatus: true } },
            },
            orderBy: { submittedAt: 'asc' },
        });
    }
    async getPendingQueue() {
        return this.prisma.verificationRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                user: { select: { fullName: true, email: true, phone: true, companyName: true, accountStatus: true } },
            },
            orderBy: { submittedAt: 'asc' },
        });
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        email_service_1.EmailService,
        trust_score_service_1.TrustScoreService])
], VerificationService);
//# sourceMappingURL=verification.service.js.map