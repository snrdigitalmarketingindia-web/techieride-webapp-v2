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
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const emailVerificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const emailVerificationExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);
        const user = await this.prisma.user.create({
            data: {
                email: emailLower,
                personalEmail: dto.personalEmail?.toLowerCase().trim() || null,
                passwordHash,
                fullName: dto.fullName,
                gender: dto.gender,
                companyName: dto.companyName,
                employeeId: dto.employeeId,
                phone: dto.phone,
                bloodGroup: dto.bloodGroup || null,
                homeLocation: dto.homeLocation,
                officeLocation: dto.officeLocation,
                role: dto.role,
                emailVerificationToken,
                emailVerificationExpiry,
                emailStatus: 'PENDING',
            },
        });
        if (dto.role === 'RIDE_GIVER' || dto.role === 'BOTH') {
            await this.prisma.rideGiver.create({ data: { userId: user.id } });
        }
        if (dto.role === 'RIDE_SEEKER' || dto.role === 'BOTH') {
            await this.prisma.rideSeeker.create({ data: { userId: user.id } });
        }
        await this.prisma.emergencyContact.create({
            data: {
                userId: user.id,
                name: dto.emergencyContactName,
                phone: dto.emergencyContactPhone,
                relationship: 'Emergency Contact',
            },
        });
        const isDev = this.config.get('NODE_ENV') === 'development';
        if (isDev) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { emailStatus: 'VERIFIED', emailVerificationToken: null, emailVerificationExpiry: null },
            });
        }
        else {
            await this.email.sendVerificationEmail(emailLower, dto.fullName, emailVerificationToken);
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
                emailVerificationToken: null,
                emailVerificationExpiry: null,
            },
        });
        await this.email.sendWelcomeEmail(user.email, user.fullName);
        return { message: 'Email verified successfully! You can now log in.' };
    }
    async resendVerification(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
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
        if (!user.isActive)
            throw new common_1.UnauthorizedException('Account suspended. Contact admin.');
        if (user.emailStatus === 'BOUNCED') {
            throw new common_1.UnauthorizedException('EMAIL_BOUNCED');
        }
        if (user.emailStatus !== 'VERIFIED') {
            throw new common_1.UnauthorizedException('EMAIL_NOT_VERIFIED');
        }
        return this.generateTokens(user);
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
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
        const user = await this.prisma.user.findUnique({
            where: { passwordResetToken: dto.token },
        });
        if (!user)
            throw new common_1.NotFoundException('Invalid or expired reset link');
        if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
            throw new common_1.BadRequestException('Reset link has expired. Please request a new one.');
        }
        const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });
        return { message: 'Password reset successfully. You can now log in.' };
    }
    async handleEmailBounce(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
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