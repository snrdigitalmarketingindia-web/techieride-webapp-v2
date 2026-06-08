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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const allowed_domains_1 = require("../../config/allowed-domains");
const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_HOURS = 1;
let AuthService = class AuthService {
    constructor(prisma, jwt, config, email) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.email = email;
    }
    async register(dto) {
        const emailLower = dto.email.toLowerCase().trim();
        if (!(0, allowed_domains_1.isAllowedDomain)(emailLower)) {
            throw new common_1.ForbiddenException('Only verified IT company email addresses are accepted. ' +
                'Personal emails (gmail, yahoo, etc.) are not allowed.');
        }
        const existing = await this.prisma.user.findUnique({ where: { email: emailLower } });
        if (existing)
            throw new common_1.ConflictException('An account with this email already exists');
        if (dto.phone) {
            const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
            if (phoneExists)
                throw new common_1.ConflictException('This phone number is already registered to another account');
        }
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const emailVerificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const emailVerificationExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);
        let user;
        try {
            user = await this.prisma.user.create({
                data: {
                    email: emailLower,
                    personalEmail: dto.personalEmail?.toLowerCase().trim() || null,
                    passwordHash,
                    fullName: dto.fullName,
                    gender: dto.gender || null,
                    companyName: dto.companyName,
                    employeeId: dto.employeeId || null,
                    phone: dto.phone || null,
                    countryCode: dto.countryCode || '+91',
                    bloodGroup: dto.bloodGroup || null,
                    homeLocation: dto.homeLocation || null,
                    officeLocation: dto.officeLocation || null,
                    role: 'RIDE_SEEKER',
                    emailVerificationToken,
                    emailVerificationExpiry,
                    emailStatus: 'PENDING',
                    accountStatus: 'EMAIL_VERIFICATION_PENDING',
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                const field = e.meta?.target?.[0] ?? 'field';
                if (field === 'phone')
                    throw new common_1.ConflictException('This phone number is already registered');
                throw new common_1.ConflictException('An account with this email already exists');
            }
            throw e;
        }
        await this.prisma.rideSeeker.create({ data: { userId: user.id } });
        if (dto.emergencyContactName && dto.emergencyContactPhone) {
            await this.prisma.emergencyContact.create({
                data: {
                    userId: user.id,
                    name: dto.emergencyContactName,
                    phone: dto.emergencyContactPhone,
                    relationship: 'Emergency Contact',
                },
            });
        }
        const isDev = this.config.get('NODE_ENV') === 'development';
        if (isDev) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    emailStatus: 'VERIFIED',
                    accountStatus: 'DOCUMENT_VERIFICATION_PENDING',
                    emailVerificationToken: null,
                    emailVerificationExpiry: null,
                },
            });
        }
        else {
            await this.email.sendVerificationEmail(emailLower, dto.fullName, emailVerificationToken);
        }
        if (user.personalEmail) {
            try {
                const personalToken = (0, crypto_1.randomBytes)(32).toString('hex');
                const personalExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { pendingEmail: `p:${user.personalEmail}`, pendingEmailToken: personalToken, pendingEmailExpiry: personalExpiry },
                });
                await this.email.sendEmailChangeVerification(user.personalEmail, dto.fullName, personalToken, true);
            }
            catch (_) {
            }
        }
        return {
            message: isDev
                ? 'Account created! (Dev mode: email auto-verified)'
                : 'Account created! Please check your office email to verify your account.',
            email: emailLower,
        };
    }
    async verifyEmail(token) {
        const user = await this.prisma.user.findUnique({
            where: { emailVerificationToken: token },
        });
        if (!user)
            throw new common_1.NotFoundException('Invalid or expired verification link');
        if (user.emailStatus === 'VERIFIED') {
            return { message: 'Email already verified. Please log in.' };
        }
        if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
            throw new common_1.BadRequestException('Verification link has expired. Please request a new one.');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailStatus: 'VERIFIED',
                accountStatus: 'DOCUMENT_VERIFICATION_PENDING',
                verificationMethod: 'EMAIL_VERIFIED',
                emailVerificationToken: null,
                emailVerificationExpiry: null,
            },
        });
        await this.email.sendWelcomeEmail(user.email, user.fullName);
        return { message: 'Email verified! Please upload your company ID card to complete verification.' };
    }
    async requestExceptionVerification(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.accountStatus !== 'EMAIL_VERIFICATION_PENDING') {
            throw new common_1.BadRequestException('Exception verification is only available for unverified accounts');
        }
        await this.prisma.verificationRequest.upsert({
            where: { userId_verificationType: { userId, verificationType: 'EXCEPTION' } },
            create: {
                userId,
                verificationType: 'EXCEPTION',
                employeeIdUrl: dto.companyIdCardUrl,
                exceptionReason: dto.reason,
                status: 'PENDING',
            },
            update: {
                employeeIdUrl: dto.companyIdCardUrl,
                exceptionReason: dto.reason,
                status: 'PENDING',
                rejectionReason: null,
                reviewedBy: null,
                reviewedAt: null,
            },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                personalEmail: dto.personalEmail.toLowerCase().trim(),
                employeeId: dto.employeeId,
                accountStatus: 'EXCEPTION_VERIFICATION_REQUESTED',
            },
        });
        return { message: 'Exception request submitted. Admin will review your documents within 2 business days.' };
    }
    async resendVerification(email) {
        const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || user.emailStatus === 'VERIFIED') {
            return { message: 'If that email exists and is unverified, a new link has been sent.' };
        }
        const emailVerificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const emailVerificationExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerificationToken, emailVerificationExpiry },
        });
        await this.email.sendVerificationEmail(user.email, user.fullName, emailVerificationToken);
        return { message: 'Verification email resent. Please check your inbox.' };
    }
    async login(dto) {
        const emailLower = dto.email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({ where: { email: emailLower } });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatch)
            throw new common_1.UnauthorizedException('Invalid email or password');
        if (user.accountStatus === 'BANNED')
            throw new common_1.UnauthorizedException('ACCOUNT_BANNED');
        if (user.accountStatus === 'DEACTIVATED')
            throw new common_1.UnauthorizedException('ACCOUNT_DEACTIVATED');
        if (!user.isActive)
            throw new common_1.UnauthorizedException('Account suspended. Contact admin.');
        if (user.emailStatus === 'BOUNCED')
            throw new common_1.UnauthorizedException('EMAIL_BOUNCED');
        return this.generateTokens(user);
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user)
            return { message: 'If that email exists, a reset link has been sent.' };
        const passwordResetToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const passwordResetExpiry = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken, passwordResetExpiry },
        });
        await this.email.sendPasswordResetEmail(user.email, user.fullName, passwordResetToken);
        return { message: 'If that email exists, a reset link has been sent.' };
    }
    async resetPassword(dto) {
        const user = await this.prisma.user.findUnique({ where: { passwordResetToken: dto.token } });
        if (!user)
            throw new common_1.NotFoundException('Invalid or expired reset link');
        if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
            throw new common_1.BadRequestException('Reset link has expired. Please request a new one.');
        }
        const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
        });
        return { message: 'Password reset successfully. You can now log in.' };
    }
    async handleEmailBounce(email) {
        const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user)
            return;
        await this.prisma.user.update({
            where: { id: user.id },
            data: { emailStatus: 'BOUNCED', isActive: false },
        });
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user || !user.isActive)
                throw new common_1.UnauthorizedException();
            return this.generateTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    generateTokens(user) {
        const payload = { sub: user.id, role: user.role, email: user.email };
        const accessToken = this.jwt.sign(payload);
        const refreshToken = this.jwt.sign(payload, {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        });
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map