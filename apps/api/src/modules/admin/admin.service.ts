import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(filters: { verificationStatus?: string; role?: string; page: number; limit: number }) {
    const where: any = {};
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    if (filters.role) where.role = filters.role;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fullName: true, phone: true, email: true,
          role: true, verificationStatus: true, isActive: true,
          companyName: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page: filters.page, limit: filters.limit };
  }

  async suspendUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  }

  async activateUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  }

  async getAnalytics(from: Date, to: Date) {
    const [
      totalUsers, verifiedUsers, totalRides,
      completedRides, cancelledRides, sosEvents,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.ride.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.ride.count({ where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } } }),
      this.prisma.ride.count({ where: { status: 'CANCELLED', createdAt: { gte: from, lte: to } } }),
      this.prisma.sosEvent.count({ where: { triggeredAt: { gte: from, lte: to } } }),
    ]);

    const co2 = await this.prisma.gamificationPoint.aggregate({
      _sum: { co2SavedG: true },
    });

    return {
      totalUsers, verifiedUsers, totalRides,
      completedRides, cancelledRides, sosEvents,
      totalCo2SavedKg: ((co2._sum.co2SavedG || 0) / 1000).toFixed(2),
    };
  }

  async listActiveSos() {
    return this.prisma.sosEvent.findMany({
      where: { status: { in: ['TRIGGERED', 'ACKNOWLEDGED'] } },
      include: { user: { select: { fullName: true, phone: true } }, ride: true },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  async resolveSos(sosId: string, adminId: string, notes: string) {
    return this.prisma.sosEvent.update({
      where: { id: sosId },
      data: { status: 'RESOLVED', resolvedBy: adminId, resolutionNotes: notes, resolvedAt: new Date() },
    });
  }

  async listAllRides(status?: string, page = 1, limit = 20) {
    const where: any = status ? { status } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ride.findMany({
        where,
        include: { rideGiver: { include: { user: { select: { fullName: true } } } }, vehicle: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ride.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
