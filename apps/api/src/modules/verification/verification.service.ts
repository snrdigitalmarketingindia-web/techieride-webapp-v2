import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@techieride/shared';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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
    const req = await this.prisma.verificationRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Verification request not found');

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
        data: { verificationStatus: decision },
      }),
    ]);

    await this.notifications.create(req.userId, {
      type:
        decision === 'APPROVED'
          ? NotificationType.VERIFICATION_APPROVED
          : NotificationType.VERIFICATION_REJECTED,
      title:
        decision === 'APPROVED'
          ? 'Verification approved! 🎉'
          : 'Verification not approved',
      body:
        decision === 'APPROVED'
          ? 'You now have full access to Techie Ride'
          : rejectionReason || 'Please re-upload your documents',
      data: { requestId },
    });

    return { status: decision };
  }

  async getPendingQueue() {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
      orderBy: { submittedAt: 'asc' },
    });
  }
}
