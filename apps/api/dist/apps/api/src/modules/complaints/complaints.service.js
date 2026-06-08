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
exports.ComplaintsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const trust_score_service_1 = require("../trust-score/trust-score.service");
const shared_1 = require("@techieride/shared");
let ComplaintsService = class ComplaintsService {
    constructor(prisma, notifications, trustScore) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.trustScore = trustScore;
    }
    async fileComplaint(reporterId, dto) {
        const { reportedId, rideId, reason, description } = dto;
        if (reporterId === reportedId) {
            throw new common_1.BadRequestException('You cannot file a complaint against yourself');
        }
        const reportedUser = await this.prisma.user.findUnique({ where: { id: reportedId } });
        if (!reportedUser)
            throw new common_1.NotFoundException('Reported user not found');
        if (reportedUser.role === 'ADMIN') {
            throw new common_1.ForbiddenException('You cannot file a complaint against an admin');
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
            if (!ride)
                throw new common_1.NotFoundException('Ride not found');
            const participantUserIds = [
                ride.rideGiver.userId,
                ...ride.requests.map((r) => r.seeker?.userId).filter(Boolean),
            ];
            if (!participantUserIds.includes(reporterId)) {
                throw new common_1.ForbiddenException('You were not a participant of this ride');
            }
            if (!participantUserIds.includes(reportedId)) {
                throw new common_1.ForbiddenException('Reported user was not a participant of this ride');
            }
        }
        if (rideId) {
            const existing = await this.prisma.complaint.findFirst({
                where: { reporterId, reportedId, rideId },
            });
            if (existing) {
                throw new common_1.ConflictException('You have already filed a complaint for this ride against this user');
            }
        }
        const complaint = await this.prisma.complaint.create({
            data: {
                reporterId,
                reportedId,
                rideId: rideId ?? null,
                reason: reason,
                description,
                status: 'OPEN',
            },
        });
        const reporter = await this.prisma.user.findUnique({
            where: { id: reporterId },
            select: { fullName: true },
        });
        const admins = await this.prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
        });
        for (const admin of admins) {
            await this.notifications.create(admin.id, {
                type: shared_1.NotificationType.COMPLAINT_FILED,
                title: '⚠️ New complaint filed',
                body: `${reporter?.fullName} reported ${reportedUser.fullName} for ${reason}`,
                data: { complaintId: complaint.id, reporterId, reportedId, reason },
            });
        }
        return { complaintId: complaint.id, message: 'Complaint filed successfully' };
    }
    async getMyComplaints(userId) {
        return this.prisma.complaint.findMany({
            where: { reporterId: userId },
            include: {
                reported: { select: { id: true, fullName: true } },
                ride: { select: { id: true, originName: true, destinationName: true, departureDate: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async adminGetAll(filters) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.reportedId)
            where.reportedId = filters.reportedId;
        return this.prisma.complaint.findMany({
            where,
            include: {
                reporter: { select: { id: true, fullName: true, email: true } },
                reported: { select: { id: true, fullName: true, email: true } },
                ride: { select: { id: true, originName: true, destinationName: true, departureDate: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async adminUpdateStatus(complaintId, adminId, dto) {
        const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
        if (!complaint)
            throw new common_1.NotFoundException('Complaint not found');
        const isTerminal = ['RESOLVED', 'DISMISSED'].includes(complaint.status);
        if (isTerminal) {
            throw new common_1.BadRequestException(`Complaint is already ${complaint.status} and cannot be updated`);
        }
        const updated = await this.prisma.complaint.update({
            where: { id: complaintId },
            data: {
                status: dto.status,
                adminNotes: dto.adminNotes,
                resolvedBy: ['RESOLVED', 'DISMISSED'].includes(dto.status) ? adminId : undefined,
                resolvedAt: ['RESOLVED', 'DISMISSED'].includes(dto.status) ? new Date() : undefined,
            },
        });
        if (dto.status === 'RESOLVED') {
            await this.trustScore.onComplaintVerified(complaint.reportedId, complaintId);
        }
        return updated;
    }
};
exports.ComplaintsService = ComplaintsService;
exports.ComplaintsService = ComplaintsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        trust_score_service_1.TrustScoreService])
], ComplaintsService);
//# sourceMappingURL=complaints.service.js.map