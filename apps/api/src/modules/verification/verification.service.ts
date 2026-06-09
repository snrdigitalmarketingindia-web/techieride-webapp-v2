import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationType, TRID_START } from '@techieride/shared';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private email: EmailService,
    private trustScore: TrustScoreService,
  ) {}

  // ── Employee verification (Queue 3) ───────────────────────────────────────
  async submitEmployeeDocs(
    userId: string,
    docs: { employeeIdUrl: string; profilePhotoUrl?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!['DOCUMENT_VERIFICATION_PENDING', 'REJECTED'].includes(user.accountStatus)) {
      throw new BadRequestException('Documents can only be submitted during verification stages');
    }

    if (!docs.employeeIdUrl) throw new BadRequestException('Company ID card is required');

    await this.prisma.verificationRequest.upsert({
      where: { userId_verificationType: { userId, verificationType: 'EMPLOYEE' } },
      create: { userId, verificationType: 'EMPLOYEE', ...docs, status: 'PENDING' },
      update: { ...docs, status: 'PENDING', rejectionReason: null, reviewedBy: null, reviewedAt: null },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'PENDING', accountStatus: 'DOCUMENT_VERIFICATION_PENDING' },
    });

    return { message: 'Documents submitted. Admin will review within 2 business days.' };
  }

  // ── Seeker verification (Queue 3b) — requires EMPLOYEE_VERIFIED ─────────
  async submitSeekerDocs(
    userId: string,
    docs: { govtIdUrl: string; selfDeclarationAccepted: boolean },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!['EMPLOYEE_VERIFIED', 'SEEKER_VERIFICATION_PENDING', 'REJECTED'].includes(user.accountStatus)) {
      throw new ForbiddenException('You must complete company ID verification before submitting seeker documents');
    }
    if (!docs.govtIdUrl) throw new BadRequestException('Government ID is required');
    if (!docs.selfDeclarationAccepted) throw new BadRequestException('You must accept the self-declaration to proceed');

    await this.prisma.verificationRequest.upsert({
      where: { userId_verificationType: { userId, verificationType: 'SEEKER' } },
      create: { userId, verificationType: 'SEEKER', ...docs, status: 'PENDING' },
      update: { ...docs, status: 'PENDING', rejectionReason: null, reviewedBy: null, reviewedAt: null },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: 'SEEKER_VERIFICATION_PENDING' },
    });

    return { message: 'Seeker documents submitted. Admin will review within 2 business days.' };
  }

  // ── Driver verification (Queue 4) — requires EMPLOYEE_VERIFIED or SEEKER_VERIFIED ─
  async submitDriverDocs(
    userId: string,
    docs: { drivingLicenseUrl: string; rcUrl: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!['EMPLOYEE_VERIFIED', 'SEEKER_VERIFIED', 'DRIVER_VERIFICATION_PENDING'].includes(user.accountStatus)) {
      throw new ForbiddenException('You must be a verified employee before applying to become a Ride Giver');
    }

    if (!docs.drivingLicenseUrl) throw new BadRequestException('Driving License is required');
    if (!docs.rcUrl) throw new BadRequestException('Vehicle RC is required');

    await this.prisma.verificationRequest.upsert({
      where: { userId_verificationType: { userId, verificationType: 'DRIVER' } },
      create: { userId, verificationType: 'DRIVER', ...docs, status: 'PENDING' },
      update: { ...docs, status: 'PENDING', rejectionReason: null, reviewedBy: null, reviewedAt: null },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: 'DRIVER_VERIFICATION_PENDING' },
    });

    return { message: 'Driver documents submitted. Admin will review your driving license and RC.' };
  }

  // ── Status ────────────────────────────────────────────────────────────────
  async getStatus(userId: string) {
    const requests = await this.prisma.verificationRequest.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    const byType = Object.fromEntries(requests.map(r => [r.verificationType, r]));
    return {
      employee: byType['EMPLOYEE'] ? {
        status: byType['EMPLOYEE'].status,
        rejectionReason: byType['EMPLOYEE'].rejectionReason,
        submittedAt: byType['EMPLOYEE'].submittedAt,
      } : null,
      seeker: byType['SEEKER'] ? {
        status: byType['SEEKER'].status,
        rejectionReason: byType['SEEKER'].rejectionReason,
        submittedAt: byType['SEEKER'].submittedAt,
      } : null,
      driver: byType['DRIVER'] ? {
        status: byType['DRIVER'].status,
        rejectionReason: byType['DRIVER'].rejectionReason,
        submittedAt: byType['DRIVER'].submittedAt,
      } : null,
      exception: byType['EXCEPTION'] ? {
        status: byType['EXCEPTION'].status,
        rejectionReason: byType['EXCEPTION'].rejectionReason,
        submittedAt: byType['EXCEPTION'].submittedAt,
      } : null,
    };
  }

  // ── Admin review ──────────────────────────────────────────────────────────
  async review(
    requestId: string,
    adminId: string,
    decision: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    const req = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!req) throw new NotFoundException('Verification request not found');

    await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        rejectionReason: rejectionReason || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    let newAccountStatus: AccountStatus;
    let trid: string | undefined;

    // Helper: assign TRID if user doesn't have one yet
    const assignTridIfNeeded = async () => {
      if (!req.user.trid) {
        const approvedCount = await this.prisma.user.count({ where: { trid: { not: null } } });
        trid = `TR${String(TRID_START + approvedCount).padStart(4, '0')}`;
      }
    };

    if (decision === 'APPROVED') {
      if (req.verificationType === 'EMPLOYEE' || req.verificationType === 'EXCEPTION') {
        // Company ID approved → EMPLOYEE_VERIFIED, NO TRID yet.
        // TRID is only assigned when seeker or driver docs are approved.
        newAccountStatus = AccountStatus.EMPLOYEE_VERIFIED;
        const verificationMethod = req.verificationType === 'EXCEPTION' ? 'MANUAL_EXCEPTION' : 'EMAIL_VERIFIED';
        await this.prisma.user.update({
          where: { id: req.userId },
          data: { accountStatus: newAccountStatus, verificationStatus: 'APPROVED', verificationMethod },
        });

      } else if (req.verificationType === 'SEEKER') {
        // Seeker docs (govt ID + self-declaration) approved → SEEKER_VERIFIED + TRID
        await assignTridIfNeeded();
        newAccountStatus = AccountStatus.SEEKER_VERIFIED;
        await this.prisma.user.update({
          where: { id: req.userId },
          data: {
            accountStatus: newAccountStatus,
            verificationStatus: 'APPROVED',
            ...(trid ? { trid } : {}),
          },
        });

      } else {
        // DRIVER approved → DRIVER_VERIFIED + TRID (if not already assigned as seeker)
        await assignTridIfNeeded();
        newAccountStatus = AccountStatus.DRIVER_VERIFIED;
        await this.prisma.rideGiver.upsert({
          where: { userId: req.userId },
          create: { userId: req.userId },
          update: {},
        });
        await this.prisma.user.update({
          where: { id: req.userId },
          data: {
            accountStatus: newAccountStatus,
            role: 'RIDE_GIVER',
            ...(trid ? { trid } : {}),
          },
        });
      }
    } else {
      // Rejection: roll back to the appropriate previous status
      if (req.verificationType === 'DRIVER') {
        newAccountStatus = req.user.trid
          ? AccountStatus.SEEKER_VERIFIED  // already seeker-verified
          : AccountStatus.EMPLOYEE_VERIFIED;
      } else if (req.verificationType === 'SEEKER') {
        newAccountStatus = AccountStatus.EMPLOYEE_VERIFIED;
      } else {
        newAccountStatus = AccountStatus.REJECTED;
      }
      await this.prisma.user.update({
        where: { id: req.userId },
        data: { accountStatus: newAccountStatus, verificationStatus: 'REJECTED' },
      });
    }

    // Award trust score on approval
    if (decision === 'APPROVED') {
      const type = (req.verificationType === 'SEEKER' || req.verificationType === 'EMPLOYEE' || req.verificationType === 'EXCEPTION') ? 'EMPLOYEE' : 'DRIVER';
      await this.trustScore.onVerificationApproved(req.userId, type);
    }

    // In-app notification
    const notifTitle = decision === 'APPROVED'
      ? req.verificationType === 'DRIVER'   ? 'Driver verification approved! 🚗'
      : req.verificationType === 'SEEKER'   ? `Welcome, ${trid || req.user.trid}! 🎉`
      : req.verificationType === 'EMPLOYEE' ? 'Company identity verified ✅'
      : 'Exception request approved ✅'
      : 'Verification not approved';

    const notifBody = decision === 'APPROVED'
      ? req.verificationType === 'DRIVER'   ? 'You can now offer rides on TechieRide!'
      : req.verificationType === 'SEEKER'   ? `Your TechieRide ID is ${trid || req.user.trid}. You can now search and book rides.`
      : 'Next step: submit a government ID and self-declaration to become a verified Ride Seeker.'
      : rejectionReason || 'Please re-upload your documents.';

    await this.notifications.create(req.userId, {
      type: decision === 'APPROVED' ? NotificationType.VERIFICATION_APPROVED : NotificationType.VERIFICATION_REJECTED,
      title: notifTitle,
      body: notifBody,
      data: { requestId, trid, type: req.verificationType },
    });

    // Send approval email only when TRID is actually assigned (SEEKER or DRIVER approval)
    if (decision === 'APPROVED' && (req.verificationType === 'SEEKER' || req.verificationType === 'DRIVER')) {
      const finalTrid = trid || req.user.trid || '';
      // Notify office email
      await this.email.sendWelcomeApprovedEmail(req.user.email, req.user.fullName, finalTrid);
      // Notify verified personal email with login instructions
      if (req.user.personalEmail && req.user.personalEmailVerified) {
        await this.email.sendApprovalNotificationToPersonalEmail(
          req.user.personalEmail,
          req.user.email,
          req.user.fullName,
          finalTrid,
        );
      }
    }
    // For EMPLOYEE/EXCEPTION approval: "company ID verified — complete seeker verification" email
    if (decision === 'APPROVED' && (req.verificationType === 'EMPLOYEE' || req.verificationType === 'EXCEPTION')) {
      await this.email.sendCompanyIdApprovedEmail(req.user.email, req.user.fullName);
    }

    // ── Send contacts CSV for today's session ──────────────────────────────
    if (decision === 'APPROVED') {
      await this.sendTodayContactsCsv();
    }

    return { status: decision, trid, accountStatus: newAccountStatus };
  }

  // ── Queue helpers for admin ───────────────────────────────────────────────
  async getQueue(verificationType: 'EMPLOYEE' | 'SEEKER' | 'DRIVER' | 'EXCEPTION') {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING', verificationType },
      include: {
        user: { select: { fullName: true, email: true, phone: true, companyName: true, accountStatus: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async getPendingQueue() {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { fullName: true, email: true, phone: true, companyName: true, accountStatus: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // ── Contacts CSV helper ──────────────────────────────────────────────────
  // Queries all approvals for today (IST), builds contact list, sends CSV
  private async sendTodayContactsCsv() {
    try {
      // Start of today in IST
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const startOfDay = new Date(nowIST);
      startOfDay.setHours(0, 0, 0, 0);
      // Convert back to UTC for DB query
      const istOffset = 5.5 * 60 * 60 * 1000;
      const startUTC = new Date(startOfDay.getTime() - istOffset);

      const todayApprovals = await this.prisma.verificationRequest.findMany({
        where: {
          status: 'APPROVED',
          reviewedAt: { gte: startUTC },
        },
        include: {
          user: {
            include: {
              emergencyContacts: { take: 1, orderBy: { id: 'asc' } },
            },
          },
        },
        orderBy: { reviewedAt: 'asc' },
      });

      // Deduplicate by userId (user may have both EMPLOYEE + DRIVER approvals)
      const seen = new Set<string>();
      const contacts = todayApprovals
        .filter(r => {
          if (seen.has(r.userId)) return false;
          seen.add(r.userId);
          return true;
        })
        .filter(r => r.user.trid) // only fully approved users with TRID
        .map(r => {
          const u = r.user;
          const ec = u.emergencyContacts?.[0];
          return {
            trid: u.trid!,
            fullName: u.fullName,
            companyName: u.companyName,
            email: u.email,
            personalEmail: u.personalEmail,
            phone: u.phone,
            homeLocation: u.homeLocation,
            emergencyName: ec?.name,
            emergencyPhone: ec?.phone,
            role: u.role === 'RIDE_GIVER' ? 'Ride Giver' : 'Ride Seeker',
          };
        });

      if (contacts.length) {
        await this.email.sendContactsCsv(contacts);
      }
    } catch (err: any) {
      // Log but never throw — contact email failure must not break approval
      console.error('sendTodayContactsCsv error:', err.message);
    }
  }
}
