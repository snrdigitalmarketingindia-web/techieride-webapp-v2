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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                rideGiver: { select: { averageRating: true, totalRidesGiven: true } },
                rideSeeker: { select: { averageRating: true, totalRidesTaken: true } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const { passwordHash, emailVerificationToken, emailVerificationExpiry, passwordResetToken, passwordResetExpiry, ...safeUser } = user;
        return safeUser;
    }
    async getPublicProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                profilePhoto: true,
                ecoLevel: true,
                companyName: true,
                rideGiver: { select: { averageRating: true, totalRidesGiven: true } },
                rideSeeker: { select: { averageRating: true, totalRidesTaken: true } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateProfile(userId, dto) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                fullName: dto.fullName,
                profilePhoto: dto.profilePhoto,
                gender: dto.gender,
                companyName: dto.companyName,
                ...(dto.fcmToken !== undefined ? { fcmToken: dto.fcmToken } : {}),
            },
        });
    }
    async updateFcmToken(userId, fcmToken) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { fcmToken },
        });
    }
    async getEmergencyContacts(userId) {
        return this.prisma.emergencyContact.findMany({ where: { userId } });
    }
    async addEmergencyContact(userId, dto) {
        const count = await this.prisma.emergencyContact.count({ where: { userId } });
        if (count >= 3) {
            throw new Error('Maximum 3 emergency contacts allowed');
        }
        return this.prisma.emergencyContact.create({
            data: { userId, ...dto },
        });
    }
    async removeEmergencyContact(userId, contactId) {
        return this.prisma.emergencyContact.deleteMany({
            where: { id: contactId, userId },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map