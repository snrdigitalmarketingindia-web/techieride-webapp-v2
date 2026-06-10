import {
  Injectable, UnauthorizedException, BadRequestException,
  ConflictException, NotFoundException, ForbiddenException, InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { promises as dns } from 'dns';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { isAllowedDomain, getDomain } from '../../config/allowed-domains';
import { RegisterDto, LoginDto, ChangePasswordDto, ExceptionVerificationDto } from './dto/auth.dto';

/** Returns true if the domain has at least one MX record (i.e. it's a real mail domain). */
async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_TTL_HOURS = 24;

/** Generates a cryptographically random temp password: 4 segments of 4 chars each */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let pw = '';
  const bytes = randomBytes(16);
  for (let i = 0; i < 16; i++) {
    pw += chars[bytes[i] % chars.length];
  }
  return pw;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  // ── Check domain (used by frontend on email blur) ─────────────────────────
  async checkDomain(email: string): Promise<{ valid: boolean; reason?: string }> {
    if (!email?.includes('@')) return { valid: false, reason: 'Invalid email format' };
    const emailLower = email.toLowerCase().trim();
    if (!isAllowedDomain(emailLower)) {
      return { valid: false, reason: 'Personal emails are not accepted. Use your office email.' };
    }
    const domain = getDomain(emailLower);
    const hasMx = await hasMxRecord(domain);
    if (!hasMx) {
      return { valid: false, reason: `"${domain}" is not a valid mail domain. Please check your email.` };
    }
    return { valid: true };
  }

  // ── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const emailLower = dto.email.toLowerCase().trim();

    if (!isAllowedDomain(emailLower)) {
      throw new ForbiddenException(
        'Only verified IT company email addresses are accepted. ' +
        'Personal emails (gmail, yahoo, etc.) are not allowed.'
      );
    }

    // Verify the domain actually has mail servers — catches typos like wipiro.com
    const domain = getDomain(emailLower);
    const validMailDomain = await hasMxRecord(domain);
    if (!validMailDomain) {
      throw new BadRequestException(
        `The email domain "${domain}" does not appear to be a valid mail domain. Please check your email address.`
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
      await this.email.sendVerificationEmail(emailLower, dto.fullName, emailVerificationToken).catch((e: any) => console.error(`Registration email failed: ${e.message}`));
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
        // Move to PERSONAL_EMAIL_PENDING — user must now add + verify a personal email
        accountStatus: 'PERSONAL_EMAIL_PENDING',
        verificationMethod: 'EMAIL_VERIFIED',
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return { message: 'Office email verified! Please add and verify your personal email to continue.' };
  }

  // ── Request Exception Verification (can't verify company email) ───────────
  // Creates a placeholder IDENTITY request with isException=true.
  // Company ID + govt ID are collected later at /verify-identity (same as normal users).
  async requestExceptionVerification(userId: string, dto: ExceptionVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!['EMAIL_VERIFICATION_PENDING', 'PERSONAL_EMAIL_PENDING'].includes(user.accountStatus)) {
      throw new BadRequestException('Exception verification is only available for unverified accounts');
    }

    // Create a placeholder IDENTITY request tagged as exception.
    // Docs (company ID + govt ID) are uploaded later on /verify-identity.
    await this.prisma.verificationRequest.upsert({
      where: { userId_verificationType: { userId, verificationType: 'IDENTITY' } },
      create: {
        userId,
        verificationType: 'IDENTITY',
        isException: true,
        exceptionReason: dto.reason,
        status: 'PENDING',
      },
      update: {
        isException: true,
        exceptionReason: dto.reason,
        status: 'PENDING',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    const personalEmailToken = randomBytes(32).toString('hex');
    const personalEmailExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        personalEmail: dto.personalEmail.toLowerCase().trim(),
        personalEmailVerified: false,
        personalEmailToken,
        personalEmailExpiry,
        employeeId: dto.employeeId || null,
        // Move to PERSONAL_EMAIL_PENDING — verify personal email next
        accountStatus: 'PERSONAL_EMAIL_PENDING',
        verificationMethod: 'MANUAL_EXCEPTION',
      },
    });

    // Send verification to the personal email they just provided
    await this.email.sendPersonalEmailVerification(
      dto.personalEmail.toLowerCase().trim(),
      user.fullName,
      personalEmailToken,
    );

    return { message: 'Check your personal inbox! Verify your personal email to continue.' };
  }

  // ── Submit Personal Email (Path A — normal users after office email verified) ──
  async submitPersonalEmail(userId: string, personalEmail: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'PERSONAL_EMAIL_PENDING') {
      throw new BadRequestException('Personal email submission is only available at the PERSONAL_EMAIL_PENDING stage');
    }

    const emailLower = personalEmail.toLowerCase().trim();

    // Reject office-style emails — personal email must be a personal domain
    // (no enforcement here — any valid email accepted; admin sees it on review)

    const personalEmailToken = randomBytes(32).toString('hex');
    const personalEmailExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        personalEmail: emailLower,
        personalEmailVerified: false,
        personalEmailToken,
        personalEmailExpiry,
      },
    });

    await this.email.sendPersonalEmailVerification(emailLower, user.fullName, personalEmailToken);
    return { message: 'Verification email sent to your personal inbox.' };
  }

  // ── Verify Personal Email ─────────────────────────────────────────────────
  async verifyPersonalEmail(token: string) {
    const user = await this.prisma.user.findUnique({ where: { personalEmailToken: token } });
    if (!user) throw new NotFoundException('Invalid or expired verification link');
    if (user.personalEmailVerified) {
      return { message: 'Personal email already verified.' };
    }
    if (user.personalEmailExpiry && user.personalEmailExpiry < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new one from the app.');
    }

    // Both paths (normal + exception) → DOCUMENT_VERIFICATION_PENDING after personal email verified.
    // Exception users upload company ID + govt ID at /verify-identity, same as normal users.
    // Admin can distinguish via isException flag on the VerificationRequest.
    const nextStatus = 'DOCUMENT_VERIFICATION_PENDING';

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        personalEmailVerified: true,
        personalEmailToken: null,
        personalEmailExpiry: null,
        accountStatus: nextStatus,
      },
    });

    return { message: 'Personal email verified! Please log in and upload your identity documents to complete verification.', nextStatus };
  }

  // ── Resend Personal Email Verification ────────────────────────────────────
  async resendPersonalEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.personalEmail) {
      throw new BadRequestException('No personal email on record.');
    }
    if (user.personalEmailVerified) {
      return { message: 'Personal email is already verified.' };
    }

    const personalEmailToken = randomBytes(32).toString('hex');
    const personalEmailExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { personalEmailToken, personalEmailExpiry },
    });

    try {
      await this.email.sendPersonalEmailVerification(user.personalEmail, user.fullName, personalEmailToken);
    } catch (err: any) {
      throw new InternalServerErrorException(`Email delivery failed: ${err.message}`);
    }
    return { message: 'Verification email resent to your personal inbox.' };
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
    const tempMatch = !passwordMatch && await this.loginWithTempPassword(user, dto.password);
    if (!passwordMatch && !tempMatch) throw new UnauthorizedException('Invalid email or password');

    if (user.accountStatus === 'BANNED') throw new UnauthorizedException('ACCOUNT_BANNED');
    if (user.accountStatus === 'DEACTIVATED') throw new UnauthorizedException('ACCOUNT_DEACTIVATED');
    if (!user.isActive) throw new UnauthorizedException('Account suspended. Contact admin.');
    if (user.emailStatus === 'BOUNCED') throw new UnauthorizedException('EMAIL_BOUNCED');

    const tokens = this.generateTokens(user);
    return { ...tokens, mustChangePassword: user.mustChangePassword ?? false };
  }

  // ── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return same message to prevent email enumeration
    if (!user) return { message: 'If an account exists for that email, a temporary password has been sent to the registered personal email.' };

    if (!user.personalEmail) {
      throw new BadRequestException('No personal email on file. Please contact admin to reset your password.');
    }

    const tempPassword = generateTempPassword();
    const tempPasswordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    const ttlHours = parseInt(this.config.get('TEMP_PASSWORD_TTL_HOURS', '24'), 10);
    const tempPasswordExpiry = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { tempPassword: tempPasswordHash, tempPasswordExpiry, mustChangePassword: true },
    });

    await this.email.sendTemporaryPasswordEmail(user.personalEmail, user.fullName, tempPassword, ttlHours);
    return { message: 'If an account exists for that email, a temporary password has been sent to the registered personal email.' };
  }

  // ── Change Password (temp → permanent) ──────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Accept either the temp password or their existing password
    let validCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validCurrent && user.tempPassword) {
      if (user.tempPasswordExpiry && user.tempPasswordExpiry < new Date()) {
        throw new UnauthorizedException('TEMP_PASSWORD_EXPIRED');
      }
      validCurrent = await bcrypt.compare(currentPassword, user.tempPassword);
    }
    if (!validCurrent) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        tempPassword: null,
        tempPasswordExpiry: null,
        mustChangePassword: false,
      },
    });

    return { message: 'Password changed successfully.' };
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

  // ── Login with temp password ──────────────────────────────────────────────
  async loginWithTempPassword(user: any, password: string): Promise<boolean> {
    if (!user.tempPassword) return false;
    if (user.tempPasswordExpiry && user.tempPasswordExpiry < new Date()) return false;
    return bcrypt.compare(password, user.tempPassword);
  }
}
