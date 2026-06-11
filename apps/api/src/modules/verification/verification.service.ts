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

  // ── Identity verification (single admin approval) ────────────────────────
  // Collects company ID + govt ID + self-declaration in one step.
  // Works for both normal path (DOCUMENT_VERIFICATION_PENDING) and
  // exception path (isException = true on existing placeholder request).
  async submitIdentityDocs(
    userId: string,
    docs: {
      employeeIdUrl: string;
      govtIdUrl: string;
      selfDeclarationAccepted: boolean;
      profilePhotoUrl?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!['DOCUMENT_VERIFICATION_PENDING', 'REJECTED'].includes(user.accountStatus)) {
      throw new BadRequestException('Documents can only be submitted during verification stages');
    }
    if (!docs.employeeIdUrl) throw new BadRequestException('Company ID card is required');
    if (!docs.govtIdUrl) throw new BadRequestException('Government ID is required');
    if (!docs.selfDeclarationAccepted) throw new BadRequestException('You must accept the self-declaration to proceed');

    // Preserve isException flag if a placeholder IDENTITY request already exists (exception path)
    const existing = await this.prisma.verificationRequest.findUnique({
      where: { userId_verificationType: { userId, verificationType: 'IDENTITY' } },
    });

    await this.prisma.verificationRequest.upsert({
      where: { userId_verificationType: { userId, verificationType: 'IDENTITY' } },
      create: {
        userId,
        verificationType: 'IDENTITY',
        ...docs,
        isException: false,
        status: 'PENDING',
      },
      update: {
        ...docs,
        status: 'PENDING',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        // Keep existing isException — don't overwrite
        ...(existing ? {} : { isException: false }),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'PENDING', accountStatus: 'DOCUMENT_VERIFICATION_PENDING' },
    });

    return { message: 'Documents submitted. Admin will review within 2 business days.' };
  }

  // ── Driver verification (Queue 4) — requires SEEKER_VERIFIED ─────────────
  async submitDriverDocs(
    userId: string,
    docs: { drivingLicenseUrl: string; rcUrl: string; vehicleId?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!['SEEKER_VERIFIED', 'DRIVER_VERIFICATION_PENDING'].includes(user.accountStatus)) {
      throw new ForbiddenException('You must be a verified Ride Seeker before applying to become a Ride Giver');
    }

    if (!docs.drivingLicenseUrl) throw new BadRequestException('Driving License is required');
    if (!docs.rcUrl) throw new BadRequestException('Vehicle RC is required');
    if (!docs.vehicleId) throw new BadRequestException('Vehicle details are required');

    await this.prisma.verificationRequest.upsert({
      where: { userId_verificationType: { userId, verificationType: 'DRIVER' } },
      create: { userId, verificationType: 'DRIVER', ...docs, status: 'PENDING' },
      update: { ...docs, status: 'PENDING', rejectionReason: null, reviewedBy: null, reviewedAt: null },
    });

    // Create RideGiver record so the user can add/manage vehicles while pending review
    await this.prisma.rideGiver.upsert({
      where: { userId },
      create: { userId },
      update: {},
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
      identity: byType['IDENTITY'] ? {
        status: byType['IDENTITY'].status,
        isException: byType['IDENTITY'].isException,
        rejectionReason: byType['IDENTITY'].rejectionReason,
        submittedAt: byType['IDENTITY'].submittedAt,
        // true only when actual documents were uploaded (not just the exception placeholder)
        hasDocuments: !!(byType['IDENTITY'].employeeIdUrl || byType['IDENTITY'].govtIdUrl),
      } : null,
      driver: byType['DRIVER'] ? {
        status: byType['DRIVER'].status,
        rejectionReason: byType['DRIVER'].rejectionReason,
        submittedAt: byType['DRIVER'].submittedAt,
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
      if (req.verificationType === 'IDENTITY') {
        // Identity docs (company ID + govt ID + self-declaration) approved → SEEKER_VERIFIED + TRID
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
        const rideGiver = await this.prisma.rideGiver.upsert({
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
        // Mark the linked vehicle as RC-verified using the vehicleId stored on the request
        const vehicleToVerify = req.vehicleId
          ? await this.prisma.vehicle.findFirst({ where: { id: req.vehicleId, rideGiverId: rideGiver.id } })
          : await this.prisma.vehicle.findFirst({ where: { rideGiverId: rideGiver.id }, orderBy: { createdAt: 'desc' } });
        if (vehicleToVerify && req.rcUrl) {
          await this.prisma.vehicle.update({
            where: { id: vehicleToVerify.id },
            data: { rcUrl: req.rcUrl, rcVerified: true },
          });
        }
      }
    } else {
      // Rejection: roll back to the appropriate previous status
      if (req.verificationType === 'DRIVER') {
        // Roll back to SEEKER_VERIFIED if they had a TRID, else DOCUMENT_VERIFICATION_PENDING
        newAccountStatus = req.user.trid
          ? AccountStatus.SEEKER_VERIFIED
          : AccountStatus.DOCUMENT_VERIFICATION_PENDING;
      } else {
        // IDENTITY rejection → back to DOCUMENT_VERIFICATION_PENDING so they can re-upload
        newAccountStatus = AccountStatus.DOCUMENT_VERIFICATION_PENDING;
      }
      await this.prisma.user.update({
        where: { id: req.userId },
        data: { accountStatus: newAccountStatus, verificationStatus: 'REJECTED' },
      });
    }

    // Award trust score on approval
    if (decision === 'APPROVED') {
      const type = req.verificationType === 'DRIVER' ? 'DRIVER' : 'EMPLOYEE';
      await this.trustScore.onVerificationApproved(req.userId, type);
    }

    // In-app notification
    const notifTitle = decision === 'APPROVED'
      ? req.verificationType === 'DRIVER'   ? 'Ride Giver verification approved! 🚗'
      : `Welcome, ${trid || req.user.trid}! 🎉`
      : 'Verification not approved';

    const notifBody = decision === 'APPROVED'
      ? req.verificationType === 'DRIVER'
        ? 'You can now offer rides on TechieRide!'
        : `Your TechieRide ID is ${trid || req.user.trid}. You can now search and book rides.`
      : rejectionReason || 'Please re-upload your documents.';

    await this.notifications.create(req.userId, {
      type: decision === 'APPROVED' ? NotificationType.VERIFICATION_APPROVED : NotificationType.VERIFICATION_REJECTED,
      title: notifTitle,
      body: notifBody,
      data: { requestId, trid, type: req.verificationType },
    });

    // Send approval emails when TRID is assigned (IDENTITY or DRIVER approval)
    if (decision === 'APPROVED') {
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

    // ── Send contacts CSV for today's session ──────────────────────────────
    if (decision === 'APPROVED') {
      await this.sendTodayContactsCsv();
    }

    return { status: decision, trid, accountStatus: newAccountStatus };
  }

  // ── Queue helpers for admin ───────────────────────────────────────────────
  async getQueue(verificationType: 'IDENTITY' | 'DRIVER') {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING', verificationType },
      include: {
        user: { select: { fullName: true, email: true, phone: true, companyName: true, accountStatus: true, trid: true } },
        vehicle: { select: { make: true, model: true, color: true, plateNumber: true, totalSeats: true, photoUrl: true, rcVerified: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async getPendingQueue() {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { fullName: true, email: true, phone: true, companyName: true, accountStatus: true, trid: true } },
        vehicle: { select: { make: true, model: true, color: true, plateNumber: true, totalSeats: true, photoUrl: true, rcVerified: true } },
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
