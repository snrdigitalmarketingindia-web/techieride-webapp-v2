import {
  Injectable, BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { promises as dns } from 'dns';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { isAllowedDomain, getDomain } from '../../config/allowed-domains';
import {
  StartRegistrationDto, CompleteProfileDto, SubmitOfficeEmailDto,
  SubmitExceptionDto, UploadDocsDto,
} from './dto/registration.dto';
import { AccountStatus, VerificationStatus } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL_HOURS = 24;
const TRID_START = 2000;

async function hasMxRecord(domain: string): Promise<boolean> {
  if (process.env.SKIP_MX_CHECK === 'true') return true;
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

function tokenAndExpiry() {
  return {
    token: randomBytes(32).toString('hex'),
    expiry: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
  };
}

@Injectable()
export class RegistrationService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ── Step 1: Start registration with personal email ───────────────────

  async start(dto: StartRegistrationDto) {
    const personalEmail = dto.personalEmail.toLowerCase().trim();

    const existingUser = await this.prisma.user.findFirst({
      where: { personalEmail },
    });
    if (existingUser) {
      throw new ConflictException('An account with this personal email already exists');
    }

    const usedAsOffice = await this.prisma.user.findUnique({ where: { email: personalEmail } });
    if (usedAsOffice) {
      throw new ConflictException('This email is already registered as an office email.');
    }

    const existing = await this.prisma.pendingRegistration.findUnique({
      where: { personalEmail },
    });

    if (existing && existing.expiresAt > new Date() && existing.status !== 'REJECTED') {
      throw new ConflictException(
        'A registration is already in progress for this email. Check your inbox or try again later.',
      );
    }

    // Delete expired or rejected record if exists
    if (existing) {
      await this.prisma.pendingRegistration.delete({ where: { id: existing.id } });
    }

    const { token, expiry } = tokenAndExpiry();

    const pending = await this.prisma.pendingRegistration.create({
      data: {
        personalEmail,
        personalEmailToken: token,
        personalEmailExpiry: expiry,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
      },
    });

    await this.email.sendPersonalEmailVerificationV2(personalEmail, 'New User', token)
      .catch((e: any) => console.error(`Registration email failed: ${e.message}`));

    return { pendingId: pending.id, message: 'Verification link sent to your personal email.' };
  }

  // ── Resend personal email verification ──────────────────────────────

  async resendPersonal(pendingId: string) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (pending.personalEmailVerified) {
      throw new BadRequestException('Personal email is already verified.');
    }

    const { token, expiry } = tokenAndExpiry();
    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: { personalEmailToken: token, personalEmailExpiry: expiry },
    });

    await this.email.sendPersonalEmailVerificationV2(
      pending.personalEmail, pending.fullName || 'New User', token,
    ).catch((e: any) => console.error(`Resend personal email failed: ${e.message}`));

    return { message: 'Verification link resent to your personal email.' };
  }

  // ── Update personal email (before verification) ─────────────────────

  async updatePersonalEmail(pendingId: string, newEmail: string) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (pending.personalEmailVerified) {
      throw new BadRequestException('Cannot change personal email after verification.');
    }

    const emailLower = newEmail.toLowerCase().trim();

    const existingUser = await this.prisma.user.findFirst({ where: { personalEmail: emailLower } });
    if (existingUser) throw new ConflictException('This email is already associated with an account.');

    const existingPending = await this.prisma.pendingRegistration.findUnique({ where: { personalEmail: emailLower } });
    if (existingPending && existingPending.id !== pendingId) {
      throw new ConflictException('A registration is already in progress for this email.');
    }

    const { token, expiry } = tokenAndExpiry();
    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        personalEmail: emailLower,
        personalEmailToken: token,
        personalEmailExpiry: expiry,
      },
    });

    await this.email.sendPersonalEmailVerificationV2(emailLower, pending.fullName || 'New User', token)
      .catch((e: any) => console.error(`Update personal email send failed: ${e.message}`));

    return { message: 'Verification link sent to your updated personal email.' };
  }

  // ── Verify personal email token ─────────────────────────────────────

  async verifyPersonalEmail(token: string) {
    const pending = await this.prisma.pendingRegistration.findFirst({
      where: { personalEmailToken: token },
    });
    if (!pending) throw new NotFoundException('Invalid or expired verification link.');

    if (pending.personalEmailVerified) {
      return { pendingId: pending.id, message: 'Personal email already verified.' };
    }

    if (pending.personalEmailExpiry && pending.personalEmailExpiry < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        personalEmailVerified: true,
        personalEmailToken: null,
        personalEmailExpiry: null,
        status: 'PERSONAL_EMAIL_VERIFIED',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // extend to 7 days
      },
    });

    return { pendingId: pending.id, message: 'Personal email verified! Please complete your profile.' };
  }

  // ── Step 2: Complete profile ─────────────────────────────────────────

  async submitProfile(pendingId: string, dto: CompleteProfileDto) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (!pending.personalEmailVerified) {
      throw new BadRequestException('Please verify your personal email first.');
    }

    // Check phone uniqueness across both tables
    if (dto.phone) {
      const phoneInUsers = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneInUsers) throw new ConflictException('This phone number is already registered.');

      const phoneInPending = await this.prisma.pendingRegistration.findFirst({
        where: { phone: dto.phone, id: { not: pendingId } },
      });
      if (phoneInPending) throw new ConflictException('This phone number is already in use by another registration.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        fullName: dto.fullName.trim(),
        gender: dto.gender,
        passwordHash,
        phone: dto.phone?.trim() || null,
        countryCode: dto.countryCode || '+91',
        companyName: dto.companyName.trim(),
        bloodGroup: dto.bloodGroup || null,
        homeLocation: dto.homeLocation || null,
        officeLocation: dto.officeLocation || null,
        emergencyContactName: dto.emergencyContactName || null,
        emergencyContactPhone: dto.emergencyContactPhone || null,
      },
    });

    return { message: 'Profile saved. Please enter your office email.' };
  }

  // ── Step 3: Submit office email ──────────────────────────────────────

  async submitOfficeEmail(pendingId: string, dto: SubmitOfficeEmailDto) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (!pending.personalEmailVerified) {
      throw new BadRequestException('Please verify your personal email first.');
    }
    if (!pending.fullName) {
      throw new BadRequestException('Please complete your profile first.');
    }

    const officeEmail = dto.officeEmail.toLowerCase().trim();

    if (!isAllowedDomain(officeEmail)) {
      throw new BadRequestException('Only company/office email addresses are accepted. Personal emails (Gmail, Yahoo, etc.) are not allowed here.');
    }

    const domain = getDomain(officeEmail);
    const validMail = await hasMxRecord(domain);
    if (!validMail) {
      throw new BadRequestException(`The email domain "${domain}" does not appear to be a valid mail domain. Please check for typos.`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: officeEmail } });
    if (existingUser) throw new ConflictException('An account with this office email already exists.');

    const usedAsPersonal = await this.prisma.user.findFirst({ where: { personalEmail: officeEmail } });
    if (usedAsPersonal) throw new ConflictException('This email is already registered as a personal email by another user.');

    const { token, expiry } = tokenAndExpiry();

    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        officeEmail,
        officeEmailVerified: false,
        officeEmailToken: token,
        officeEmailExpiry: expiry,
        status: 'OFFICE_EMAIL_SENT',
      },
    });

    await this.email.sendOfficeEmailVerificationV2(officeEmail, pending.fullName!, token)
      .catch((e: any) => console.error(`Office email verification send failed: ${e.message}`));

    return { message: 'Verification link sent to your office email.' };
  }

  // ── Update office email (before verification) ───────────────────────

  async updateOfficeEmail(pendingId: string, newEmail: string) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (pending.officeEmailVerified) {
      throw new BadRequestException('Cannot change office email after verification.');
    }

    const officeEmail = newEmail.toLowerCase().trim();

    if (!isAllowedDomain(officeEmail)) {
      throw new BadRequestException('Only company/office email addresses are accepted.');
    }

    const domain = getDomain(officeEmail);
    const validMail = await hasMxRecord(domain);
    if (!validMail) {
      throw new BadRequestException(`The email domain "${domain}" does not appear to be a valid mail domain.`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: officeEmail } });
    if (existingUser) throw new ConflictException('An account with this office email already exists.');

    const usedAsPersonal = await this.prisma.user.findFirst({ where: { personalEmail: officeEmail } });
    if (usedAsPersonal) throw new ConflictException('This email is already registered as a personal email by another user.');

    const { token, expiry } = tokenAndExpiry();

    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        officeEmail,
        officeEmailToken: token,
        officeEmailExpiry: expiry,
      },
    });

    await this.email.sendOfficeEmailVerificationV2(officeEmail, pending.fullName || 'New User', token)
      .catch((e: any) => console.error(`Update office email send failed: ${e.message}`));

    return { message: 'Verification link sent to your updated office email.' };
  }

  // ── Resend office email verification ────────────────────────────────

  async resendOffice(pendingId: string) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (pending.officeEmailVerified) {
      throw new BadRequestException('Office email is already verified.');
    }
    if (!pending.officeEmail) {
      throw new BadRequestException('No office email set. Please submit your office email first.');
    }

    const { token, expiry } = tokenAndExpiry();
    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: { officeEmailToken: token, officeEmailExpiry: expiry },
    });

    await this.email.sendOfficeEmailVerificationV2(pending.officeEmail, pending.fullName || 'New User', token)
      .catch((e: any) => console.error(`Resend office email failed: ${e.message}`));

    return { message: 'Verification link resent to your office email.' };
  }

  // ── Verify office email token ───────────────────────────────────────

  async verifyOfficeEmail(token: string) {
    const pending = await this.prisma.pendingRegistration.findFirst({
      where: { officeEmailToken: token },
    });
    if (!pending) throw new NotFoundException('Invalid or expired verification link.');

    if (pending.officeEmailVerified) {
      return { pendingId: pending.id, message: 'Office email already verified.' };
    }

    if (pending.officeEmailExpiry && pending.officeEmailExpiry < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        officeEmailVerified: true,
        officeEmailToken: null,
        officeEmailExpiry: null,
        status: 'OFFICE_EMAIL_VERIFIED',
        verificationMethod: 'EMAIL_VERIFIED',
      },
    });

    return { pendingId: pending.id, message: 'Office email verified! Please upload your identity documents.' };
  }

  // ── Exception path (can't verify office email) ──────────────────────

  async submitException(pendingId: string, dto: SubmitExceptionDto) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (!pending.personalEmailVerified) {
      throw new BadRequestException('Please verify your personal email first.');
    }
    if (!pending.officeEmail) {
      throw new BadRequestException('Please submit your office email first.');
    }

    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        isException: true,
        exceptionReason: dto.reason.trim(),
        verificationMethod: 'MANUAL_EXCEPTION',
        status: 'EXCEPTION_REQUESTED',
      },
    });

    return { message: 'Exception request submitted. You can now upload your identity documents.' };
  }

  // ── Step 4: Upload documents ─────────────────────────────────────────

  async submitDocuments(pendingId: string, dto: UploadDocsDto) {
    const pending = await this.findPendingOrThrow(pendingId);

    if (!pending.personalEmailVerified) {
      throw new BadRequestException('Please verify your personal email first.');
    }

    const emailsVerified = pending.officeEmailVerified || pending.isException;
    if (!emailsVerified) {
      throw new BadRequestException('Please verify your office email or submit an exception request first.');
    }

    if (!dto.selfDeclarationAccepted) {
      throw new BadRequestException('You must accept the self-declaration to proceed.');
    }

    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        employeeIdUrl: dto.employeeIdUrl,
        govtIdUrl: dto.govtIdUrl,
        profilePhotoUrl: dto.profilePhotoUrl || null,
        selfDeclarationAccepted: true,
        status: 'PENDING_REVIEW',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for admin review
      },
    });

    return { message: 'Documents submitted! Your application is under review. You will receive an email once approved.' };
  }

  // ── Poll status ──────────────────────────────────────────────────────

  async getStatus(pendingId: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: pendingId },
      select: {
        id: true,
        personalEmail: true,
        personalEmailVerified: true,
        fullName: true,
        phone: true,
        officeEmail: true,
        officeEmailVerified: true,
        isException: true,
        employeeIdUrl: true,
        govtIdUrl: true,
        selfDeclarationAccepted: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },
    });

    if (!pending) throw new NotFoundException('Registration not found or expired.');
    return pending;
  }

  // ── Admin: Approve registration (creates User + RideSeeker + TRID) ──

  async approveRegistration(pendingId: string, adminId: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({ where: { id: pendingId } });
    if (!pending) throw new NotFoundException('Pending registration not found.');

    if (pending.status === 'APPROVED') {
      throw new BadRequestException('This registration has already been approved.');
    }
    if (pending.status !== 'PENDING_REVIEW' && pending.status !== 'REJECTED') {
      throw new BadRequestException('This registration is not ready for review.');
    }

    if (!pending.fullName || !pending.passwordHash || !pending.officeEmail || !pending.personalEmail) {
      throw new BadRequestException('Registration is incomplete — missing required fields.');
    }

    const emailTaken = await this.prisma.user.findUnique({ where: { email: pending.officeEmail } });
    if (emailTaken) throw new ConflictException('An account with this office email already exists.');

    const personalTaken = await this.prisma.user.findFirst({ where: { personalEmail: pending.personalEmail } });
    if (personalTaken) throw new ConflictException('An account with this personal email already exists.');

    if (pending.phone) {
      const phoneTaken = await this.prisma.user.findUnique({ where: { phone: pending.phone } });
      if (phoneTaken) throw new ConflictException('An account with this phone number already exists.');
    }

    // Assign TRID
    const approvedCount = await this.prisma.user.count({ where: { trid: { not: null } } });
    const trid = `TR${String(TRID_START + approvedCount).padStart(4, '0')}`;

    // Single transaction: create everything, delete pending
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: pending.officeEmail!,
          personalEmail: pending.personalEmail,
          personalEmailVerified: true,
          passwordHash: pending.passwordHash!,
          fullName: pending.fullName!,
          gender: pending.gender,
          companyName: pending.companyName,
          phone: pending.phone,
          countryCode: pending.countryCode,
          bloodGroup: pending.bloodGroup,
          homeLocation: pending.homeLocation,
          officeLocation: pending.officeLocation,
          role: 'RIDE_SEEKER',
          emailStatus: 'VERIFIED',
          accountStatus: AccountStatus.SEEKER_VERIFIED,
          verificationStatus: VerificationStatus.APPROVED,
          verificationMethod: pending.verificationMethod || 'EMAIL_VERIFIED',
          trid,
          isActive: true,
        },
      });

      await tx.rideSeeker.create({ data: { userId: newUser.id } });

      if (pending.emergencyContactName && pending.emergencyContactPhone) {
        await tx.emergencyContact.create({
          data: {
            userId: newUser.id,
            name: pending.emergencyContactName,
            phone: pending.emergencyContactPhone,
            relationship: 'Emergency Contact',
          },
        });
      }

      await tx.verificationRequest.create({
        data: {
          userId: newUser.id,
          verificationType: 'IDENTITY',
          employeeIdUrl: pending.employeeIdUrl,
          govtIdUrl: pending.govtIdUrl,
          profilePhotoUrl: pending.profilePhotoUrl,
          selfDeclarationAccepted: pending.selfDeclarationAccepted,
          isException: pending.isException,
          exceptionReason: pending.exceptionReason,
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      await tx.pendingRegistration.delete({ where: { id: pendingId } });

      return newUser;
    });

    // Post-transaction: send welcome emails (non-blocking)
    this.email.sendWelcomeApprovedEmail(user.email, user.fullName, trid).catch(() => {});
    this.email.sendApprovalNotificationToPersonalEmail(
      pending.personalEmail, pending.officeEmail!, user.fullName, trid,
    ).catch(() => {});

    return { userId: user.id, trid, message: `Registration approved. TRID: ${trid}` };
  }

  // ── Admin: Reject registration ──────────────────────────────────────

  async rejectRegistration(pendingId: string, adminId: string, reason: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({ where: { id: pendingId } });
    if (!pending) throw new NotFoundException('Pending registration not found.');

    await this.prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days to re-submit
      },
    });

    if (pending.personalEmail) {
      this.email.sendRegistrationRejectedEmail(
        pending.personalEmail, pending.fullName || 'Applicant', reason,
      ).catch(() => {});
    }

    return { message: 'Registration rejected.' };
  }

  // ── Cleanup expired registrations ───────────────────────────────────

  @Cron('0 */6 * * *')
  async cleanupExpired() {
    const deleted = await this.prisma.pendingRegistration.deleteMany({
      where: { expiresAt: { lt: new Date() }, status: { not: 'APPROVED' } },
    });
    if (deleted.count > 0) {
      console.log(`🧹 Cleaned ${deleted.count} expired pending registrations`);
    }
  }

  // ── Helper ──────────────────────────────────────────────────────────

  private async findPendingOrThrow(id: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({ where: { id } });
    if (!pending) throw new NotFoundException('Registration not found or expired.');
    if (pending.expiresAt < new Date()) {
      await this.prisma.pendingRegistration.delete({ where: { id } }).catch(() => {});
      throw new NotFoundException('Registration has expired. Please start again.');
    }
    return pending;
  }
}
