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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listUsers(filters) {
        const where = {};
        if (filters.accountStatus)
            where.accountStatus = filters.accountStatus;
        if (filters.role)
            where.role = filters.role;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                skip: (filters.page - 1) * filters.limit,
                take: filters.limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, fullName: true, phone: true, email: true,
                    role: true, accountStatus: true, verificationStatus: true,
                    isActive: true, companyName: true, trid: true, createdAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { data, total, page: filters.page, limit: filters.limit };
    }
    async getUsersByAccountStatus(accountStatus) {
        return this.prisma.user.findMany({
            where: { accountStatus: accountStatus },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true, fullName: true, email: true, companyName: true,
                accountStatus: true, createdAt: true,
            },
        });
    }
    async suspendUser(userId) {
        return this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    }
    async activateUser(userId) {
        return this.prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    }
    async getAnalytics(from, to) {
        const [totalUsers, verifiedUsers, totalRides, completedRides, cancelledRides, sosEvents,] = await this.prisma.$transaction([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { accountStatus: { in: ['EMPLOYEE_VERIFIED', 'DRIVER_VERIFICATION_PENDING', 'DRIVER_VERIFIED'] } } }),
            this.prisma.ride.count({ where: { createdAt: { gte: from, lte: to } } }),
            this.prisma.ride.count({ where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } } }),
            this.prisma.ride.count({ where: { status: 'CANCELLED', createdAt: { gte: from, lte: to } } }),
            this.prisma.sosEvent.count({ where: { triggeredAt: { gte: from, lte: to } } }),
        ]);
        const co2 = await this.prisma.gamificationPoint.aggregate({
            _sum: { co2SavedG: true },
        });
        return {
            totalUsers, verifiedUsers, totalRides,
            completedRides, cancelledRides, sosEvents,
            totalCo2SavedKg: ((co2._sum.co2SavedG || 0) / 1000).toFixed(2),
        };
    }
    async listActiveSos() {
        return this.prisma.sosEvent.findMany({
            where: { status: { in: ['TRIGGERED', 'ACKNOWLEDGED'] } },
            include: { user: { select: { fullName: true, phone: true } }, ride: true },
            orderBy: { triggeredAt: 'desc' },
        });
    }
    async resolveSos(sosId, adminId, notes) {
        return this.prisma.sosEvent.update({
            where: { id: sosId },
            data: { status: 'RESOLVED', resolvedBy: adminId, resolutionNotes: notes, resolvedAt: new Date() },
        });
    }
    async listVehicles(onlyPending = false) {
        return this.prisma.vehicle.findMany({
            where: {
                isActive: true,
                ...(onlyPending ? { rcVerified: false } : {}),
            },
            include: {
                rideGiver: {
                    include: { user: { select: { fullName: true, email: true, phone: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async verifyVehicle(vehicleId) {
        return this.prisma.vehicle.update({
            where: { id: vehicleId },
            data: { rcVerified: true },
        });
    }
    async rejectVehicle(vehicleId, reason) {
        return this.prisma.vehicle.update({
            where: { id: vehicleId },
            data: { rcVerified: false },
        });
    }
    async listAllRides(status, page = 1, limit = 20) {
        const where = status ? { status } : {};
        const [data, total] = await this.prisma.$transaction([
            this.prisma.ride.findMany({
                where,
                include: { rideGiver: { include: { user: { select: { fullName: true } } } }, vehicle: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.ride.count({ where }),
        ]);
        return { data, total, page, limit };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map