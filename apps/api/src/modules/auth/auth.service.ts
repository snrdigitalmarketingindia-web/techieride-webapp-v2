import {
  Injectable, UnauthorizedException, BadRequestException,
  ConflictException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { isAllowedDomain } from '../../config/allowed-domains';
import { RegisterDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';
import { UserRole } from '@techieride/shared';

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

    // 1. Domain whitelist check
    if (!isAllowedDomain(emailLower)) {
      throw new ForbiddenException(
        'Only verified IT company email addresses are accepted. ' +
        'Personal emails (gmail, yahoo, etc.) are not allowed.'
      );
    }

    // 2. Duplicate check
    const existing = await this.prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) throw new ConflictException('An account with this email already exists');

    // 3. Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 4. Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(
      Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000
    );

    // 5. Create user
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
        role: dto.role as unknown as UserRole,
        emailVerificationToken,
        emailVerificationExpiry,
        emailStatus: 'PENDING',
        accountStatus: 'EMAIL_PENDING',
      },
    });

    // 6. Create role profile
    if (dto.role === 'RIDE_GIVER' || dto.role === 'BOTH') {
      await this.prisma.rideGiver.create({ data: { userId: user.id } });
    }
    if (dto.role === 'RIDE_SEEKER' || dto.role === 'BOTH') {
      await this.prisma.rideSeeker.create({ data: { userId: user.id } });
    }

    // 7. Save emergency contact
    await this.prisma.emergencyContact.create({
      data: {
        userId: user.id,
        name: dto.emergencyContactName,
        phone: dto.emergencyContactPhone,
        relationship: 'Emergency Contact',
      },
    });

    // 8. In dev mode, auto-verify so tests work without email delivery
    const isDev = this.config.get('NODE_ENV') === 'development';
    if (isDev) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailStatus: 'VERIFIED', accountStatus: 'DOCS_PENDING', emailVerificationToken: null, emailVerificationExpiry: null },
      });
    } else {
      await this.email.sendVerificationEmail(emailLower, dto.fullName, emailVerificationToken);
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
        accountStatus: 'DOCS_PENDING',
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // Send welcome email
    await this.email.sendWelcomeEmail(user.email, user.fullName);

    return { message: 'Email verified successfully! You can now log in.' };
  }

  // ── Resend Verification ───────────────────────────────────────────────────
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Always return 200 — never reveal whether an account exists (prevents enumeration)
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

    if (user.accountStatus === 'BANNED') {
      throw new UnauthorizedException('ACCOUNT_BANNED');
    }
    if (user.accountStatus === 'DEACTIVATED') {
      throw new UnauthorizedException('ACCOUNT_DEACTIVATED');
    }
    if (!user.isActive) throw new UnauthorizedException('Account suspended. Contact admin.');

    if (user.emailStatus === 'BOUNCED') {
      throw new UnauthorizedException('EMAIL_BOUNCED');
    }

    return this.generateTokens(user);
  }

  // ── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
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
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: dto.token },
    });

    if (!user) throw new NotFoundException('Invalid or expired reset link');
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
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

  // ── Bounce Webhook (called by Resend) ────────────────────────────────────
  async handleEmailBounce(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
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

  // ── Token generator ───────────────────────────────────────────────────────
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
