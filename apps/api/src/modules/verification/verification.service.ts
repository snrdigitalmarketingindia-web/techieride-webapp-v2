import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { NotificationType, TRID_START } from '@techieride/shared';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private email: EmailService,
  ) {}

  async submitDocuments(
    userId: string,
    docs: { employeeIdUrl?: string; drivingLicenseUrl?: string; rcUrl?: string },
  ) {
    const request = await this.prisma.verificationRequest.upsert({
      where: { userId },
      create: {
        userId,
        ...docs,
        status: 'PENDING',
      },
      update: {
        ...docs,
        status: 'PENDING',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'PENDING' },
    });

    return { requestId: request.id, status: 'PENDING' };
  }

  async getStatus(userId: string) {
    const req = await this.prisma.verificationRequest.findUnique({ where: { userId } });
    if (!req) return { status: 'NOT_SUBMITTED' };
    return {
      status: req.status,
      rejectionReason: req.rejectionReason,
      submittedAt: req.submittedAt,
    };
  }

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

    // Generate TRID on approval
    let trid: string | undefined;
    if (decision === 'APPROVED' && !req.user.trid) {
      const approvedCount = await this.prisma.user.count({
        where: { trid: { not: null } },
      });
      const nextNumber = TRID_START + approvedCount;
      trid = `TR${String(nextNumber).padStart(4, '0')}`;
    }

    await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: decision,
          rejectionReason: rejectionReason || null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: req.userId },
        data: {
          verificationStatus: decision,
          ...(trid ? { trid } : {}),
        },
      }),
    ]);

    // Send in-app notification
    await this.notifications.create(req.userId, {
      type: decision === 'APPROVED'
        ? NotificationType.VERIFICATION_APPROVED
        : NotificationType.VERIFICATION_REJECTED,
      title: decision === 'APPROVED'
        ? `Verification approved! Welcome, ${trid} 🎉`
        : 'Verification not approved',
      body: decision === 'APPROVED'
        ? `Your TechieRide ID is ${trid}. You now have full access.`
        : rejectionReason || 'Please re-upload your documents',
      data: { requestId, trid },
    });

    // Send welcome email with TRID on approval
    if (decision === 'APPROVED' && trid) {
      await this.email.sendWelcomeApprovedEmail(
        req.user.personalEmail || req.user.email,
        req.user.fullName,
        trid,
      );
    }

    return { status: decision, trid };
  }

  async getPendingQueue() {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
      orderBy: { submittedAt: 'asc' },
    });
  }
}
