import {
  Injectable, UnauthorizedException, BadRequestException,
  ConflictException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { isAllowedDomain } from '../../config/allowed-domains';
import { RegisterDto, LoginDto, ResetPasswordDto, ExceptionVerificationDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  // ── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const emailLower = dto.email.toLowerCase().trim();

    if (!isAllowedDomain(emailLower)) {
      throw new ForbiddenException(
        'Only verified IT company email addresses are accepted. ' +
        'Personal emails (gmail, yahoo, etc.) are not allowed.'
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) throw new ConflictException('An account with this email already exists');

    // Check phone uniqueness upfront so we return a 409, not a 500 from Prisma P2002
    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneExists) throw new ConflictException('This phone number is already registered to another account');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(
      Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000
    );

    // Everyone starts as RIDE_SEEKER — role upgrades happen post-verification
    let user: any;
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
    } catch (e: any) {
      // P2002 = unique constraint — race condition between the pre-check and the insert
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const field = (e.meta?.target as string[] | undefined)?.[0] ?? 'field';
        if (field === 'phone') throw new ConflictException('This phone number is already registered');
        throw new ConflictException('An account with this email already exists');
      }
      throw e;
    }

    // All users get a seeker profile by default
    await this.prisma.rideSeeker.create({ data: { userId: user.id } });

    // Save emergency contact if provided
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
    } else {
      await this.email.sendVerificationEmail(emailLower, dto.fullName, emailVerificationToken);
    }

    // If personal email provided at registration, send verification (non-blocking)
    if (user.personalEmail) {
      try {
        const personalToken = randomBytes(32).toString('hex');
        const personalExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { pendingEmail: `p:${user.personalEmail}`, pendingEmailToken: personalToken, pendingEmailExpiry: personalExpiry },
        });
        await this.email.sendEmailChangeVerification(user.personalEmail, dto.fullName, personalToken, true);
      } catch (_) {
        // non-blocking — don't fail registration if personal email send fails
      }
    }

    return {
      message: isDev
        ? 'Account created! (Dev mode: email auto-verified)'
        : 'Account created! Please check your office email to verify your account.',
      email: emailLower,
    };
  }

  // ── Verify Email ─────────────────────────────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) throw new NotFoundException('Invalid or expired verification link');
    if (user.emailStatus === 'VERIFIED') {
      return { message: 'Email already verified. Please log in.' };
    }
    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
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

  // ── Request Exception Verification (can't verify company email) ───────────
  async requestExceptionVerification(userId: string, dto: ExceptionVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'EMAIL_VERIFICATION_PENDING') {
      throw new BadRequestException('Exception verification is only available for unverified accounts');
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

  // ── Resend Verification ───────────────────────────────────────────────────
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.emailStatus === 'VERIFIED') {
      return { message: 'If that email exists and is unverified, a new link has been sent.' };
    }

    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(
      Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken, emailVerificationExpiry },
    });

    await this.email.sendVerificationEmail(user.email, user.fullName, emailVerificationToken);
    return { message: 'Verification email resent. Please check your inbox.' };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const emailLower = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: emailLower } });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid email or password');

    if (user.accountStatus === 'BANNED') throw new UnauthorizedException('ACCOUNT_BANNED');
    if (user.accountStatus === 'DEACTIVATED') throw new UnauthorizedException('ACCOUNT_DEACTIVATED');
    if (!user.isActive) throw new UnauthorizedException('Account suspended. Contact admin.');
    if (user.emailStatus === 'BOUNCED') throw new UnauthorizedException('EMAIL_BOUNCED');

    return this.generateTokens(user);
  }

  // ── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const passwordResetToken = randomBytes(32).toString('hex');
    const passwordResetExpiry = new Date(
      Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken, passwordResetExpiry },
    });

    await this.email.sendPasswordResetEmail(user.email, user.fullName, passwordResetToken);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: dto.token } });
    if (!user) throw new NotFoundException('Invalid or expired reset link');
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    });

    return { message: 'Password reset successfully. You can now log in.' };
  }

  // ── Bounce Webhook ────────────────────────────────────────────────────────
  async handleEmailBounce(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailStatus: 'BOUNCED', isActive: false },
    });
  }

  // ── Refresh Tokens ────────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: { id: string; role: string; email: string }) {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    return { accessToken, refreshToken };
  }
}
