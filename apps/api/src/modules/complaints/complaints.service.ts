import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationType } from '@techieride/shared';

@Injectable()
export class ComplaintsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private trustScore: TrustScoreService,
  ) {}

  async fileComplaint(
    reporterId: string,
    dto: {
      reportedId: string;
      rideId?: string;
      reason: string;
      description?: string;
    },
  ) {
    const { reportedId, rideId, reason, description } = dto;

    // Cannot report yourself
    if (reporterId === reportedId) {
      throw new BadRequestException('You cannot file a complaint against yourself');
    }

    // Reported user must exist
    const reportedUser = await this.prisma.user.findUnique({ where: { id: reportedId } });
    if (!reportedUser) throw new NotFoundException('Reported user not found');

    // Cannot report an ADMIN
    if (reportedUser.role === 'ADMIN') {
      throw new ForbiddenException('You cannot file a complaint against an admin');
    }

    // If rideId provided — validate ride exists and both users were participants
    if (rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          rideGiver: { select: { userId: true } },
          requests: {
            where: { status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } },
            include: { seeker: { select: { userId: true } } },
          },
        },
      });
      if (!ride) throw new NotFoundException('Ride not found');

      // Compare against User.id (not RideGiver.id / RideSeeker.id)
      const participantUserIds = [
        ride.rideGiver.userId,
        ...ride.requests.map((r) => r.seeker?.userId).filter(Boolean) as string[],
      ];

      if (!participantUserIds.includes(reporterId)) {
        throw new ForbiddenException('You were not a participant of this ride');
      }
      if (!participantUserIds.includes(reportedId)) {
        throw new ForbiddenException('Reported user was not a participant of this ride');
      }
    }

    // Duplicate complaint: same reporter + reported + ride blocked
    if (rideId) {
      const existing = await this.prisma.complaint.findFirst({
        where: { reporterId, reportedId, rideId },
      });
      if (existing) {
        throw new ConflictException('You have already filed a complaint for this ride against this user');
      }
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        reporterId,
        reportedId,
        rideId: rideId ?? null,
        reason: reason as any,
        description,
        status: 'OPEN',
      },
    });

    // Notify all admins
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: { fullName: true },
    });
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
    });
    for (const admin of admins) {
      await this.notifications.create(admin.id, {
        type: NotificationType.COMPLAINT_FILED,
        title: '⚠️ New complaint filed',
        body: `${reporter?.fullName} reported ${reportedUser.fullName} for ${reason}`,
        data: { complaintId: complaint.id, reporterId, reportedId, reason },
      });
    }

    return { complaintId: complaint.id, message: 'Complaint filed successfully' };
  }

  async getMyComplaints(userId: string) {
    return this.prisma.complaint.findMany({
      where: { reporterId: userId },
      include: {
        reported: { select: { id: true, fullName: true } },
        ride: { select: { id: true, originName: true, destinationName: true, departureDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin ──────────────────────────────────────────────────────────────

  async adminGetAll(filters: { status?: string; reportedId?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.reportedId) where.reportedId = filters.reportedId;

    return this.prisma.complaint.findMany({
      where,
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        reported: { select: { id: true, fullName: true, email: true } },
        ride: { select: { id: true, originName: true, destinationName: true, departureDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminUpdateStatus(
    complaintId: string,
    adminId: string,
    dto: { status: string; adminNotes?: string },
  ) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const isTerminal = ['RESOLVED', 'DISMISSED'].includes(complaint.status);
    if (isTerminal) {
      throw new BadRequestException(`Complaint is already ${complaint.status} and cannot be updated`);
    }

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: dto.status as any,
        adminNotes: dto.adminNotes,
        resolvedBy: ['RESOLVED', 'DISMISSED'].includes(dto.status) ? adminId : undefined,
        resolvedAt: ['RESOLVED', 'DISMISSED'].includes(dto.status) ? new Date() : undefined,
      },
    });

    // Deduct trust score when complaint is resolved (verified) against the reported user
    if (dto.status === 'RESOLVED') {
      await this.trustScore.onComplaintVerified(complaint.reportedId, complaintId);
    }

    return updated;
  }
}
