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
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const allowed_domains_1 = require("../../config/allowed-domains");
let UsersService = class UsersService {
    constructor(prisma, email) {
        this.prisma = prisma;
        this.email = email;
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
                trustScore: true,
                trustBand: true,
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
                ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
                ...(dto.profilePhoto !== undefined ? { profilePhoto: dto.profilePhoto } : {}),
                ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
                ...(dto.companyName !== undefined ? { companyName: dto.companyName } : {}),
                ...(dto.fcmToken !== undefined ? { fcmToken: dto.fcmToken } : {}),
                ...(dto.homeLocation !== undefined ? { homeLocation: dto.homeLocation } : {}),
                ...(dto.officeLocation !== undefined ? { officeLocation: dto.officeLocation } : {}),
                ...(dto.personalEmail !== undefined ? { personalEmail: dto.personalEmail } : {}),
                ...(dto.bloodGroup !== undefined ? { bloodGroup: dto.bloodGroup } : {}),
                ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
                ...(dto.countryCode !== undefined ? { countryCode: dto.countryCode } : {}),
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
    async requestEmailChange(userId, newEmail) {
        const emailLower = newEmail.toLowerCase().trim();
        if (!(0, allowed_domains_1.isAllowedDomain)(emailLower))
            throw new common_1.BadRequestException('Only corporate email addresses are allowed');
        const existing = await this.prisma.user.findUnique({ where: { email: emailLower } });
        if (existing)
            throw new common_1.BadRequestException('Email already in use');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException();
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: userId },
            data: { pendingEmail: emailLower, pendingEmailToken: token, pendingEmailExpiry: expiry },
        });
        await this.email.sendEmailChangeVerification(emailLower, user.fullName, token, false);
        return { message: `Verification email sent to ${emailLower}` };
    }
    async confirmEmailChange(token) {
        const user = await this.prisma.user.findUnique({ where: { pendingEmailToken: token } });
        if (!user)
            throw new common_1.BadRequestException('Invalid or expired token');
        if (user.pendingEmailExpiry && user.pendingEmailExpiry < new Date())
            throw new common_1.BadRequestException('Token expired — please request a new email change');
        await this.prisma.user.update({
            where: { id: user.id },
            data: { email: user.pendingEmail, pendingEmail: null, pendingEmailToken: null, pendingEmailExpiry: null },
        });
        return { message: 'Email updated successfully' };
    }
    async requestPersonalEmailChange(userId, newEmail) {
        const emailLower = newEmail.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException();
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: userId },
            data: { pendingEmail: `p:${emailLower}`, pendingEmailToken: token, pendingEmailExpiry: expiry },
        });
        await this.email.sendEmailChangeVerification(emailLower, user.fullName, token, true);
        return { message: `Confirmation email sent to ${emailLower}` };
    }
    async confirmPersonalEmailChange(token) {
        const user = await this.prisma.user.findUnique({ where: { pendingEmailToken: token } });
        if (!user)
            throw new common_1.BadRequestException('Invalid or expired token');
        if (user.pendingEmailExpiry && user.pendingEmailExpiry < new Date())
            throw new common_1.BadRequestException('Token expired — please request a new change');
        if (!user.pendingEmail?.startsWith('p:'))
            throw new common_1.BadRequestException('Invalid token type');
        const newPersonalEmail = user.pendingEmail.slice(2);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { personalEmail: newPersonalEmail, pendingEmail: null, pendingEmailToken: null, pendingEmailExpiry: null },
        });
        return { message: 'Personal email updated successfully' };
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], UsersService);
//# sourceMappingURL=users.service.js.map