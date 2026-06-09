import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(filters: { accountStatus?: string; role?: string; search?: string; page: number; limit: number }) {
    const where: any = {};
    if (filters.accountStatus) where.accountStatus = filters.accountStatus as AccountStatus;
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { fullName:    { contains: q, mode: 'insensitive' } },
        { email:       { contains: q, mode: 'insensitive' } },
        { trid:        { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { phone:       { contains: q } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fullName: true, phone: true, email: true,
          role: true, accountStatus: true, verificationStatus: true,
          isActive: true, companyName: true, trid: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page: filters.page, limit: filters.limit };
  }

  async getUsersByAccountStatus(accountStatus: string) {
    return this.prisma.user.findMany({
      where: { accountStatus: accountStatus as AccountStatus },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, fullName: true, email: true, companyName: true,
        accountStatus: true, createdAt: true,
      },
    });
  }

  async getUserDetail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, personalEmail: true,
        phone: true, countryCode: true, isPhoneVerified: true,
        gender: true, bloodGroup: true, profilePhoto: true,
        companyName: true, employeeId: true,
        homeLocation: true, officeLocation: true,
        role: true, accountStatus: true, verificationStatus: true,
        emailStatus: true, trid: true, isActive: true,
        trustScore: true, trustBand: true,
        ecoPoints: true, ecoLevel: true,
        createdAt: true, updatedAt: true,
        verificationRequests: {
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true, verificationType: true, status: true,
            employeeIdUrl: true, profilePhotoUrl: true,
            drivingLicenseUrl: true, rcUrl: true,
            rejectionReason: true, reviewedAt: true, submittedAt: true,
          },
        },
        rideGiver: { select: { id: true, licenseVerified: true, totalRidesGiven: true, averageRating: true } },
        rideSeeker: { select: { id: true, totalRidesTaken: true, averageRating: true } },
      },
    });
  }

  async assignRole(userId: string, role: 'RIDE_SEEKER' | 'RIDE_GIVER' | 'ADMIN') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // RIDE_GIVER and ADMIN both need RideGiver + RideSeeker records
    if (role === 'RIDE_GIVER' || role === 'ADMIN') {
      await this.prisma.rideSeeker.upsert({ where: { userId }, create: { userId }, update: {} });
      await this.prisma.rideGiver.upsert({ where: { userId }, create: { userId }, update: {} });
    }
    // RIDE_SEEKER only needs RideSeeker
    if (role === 'RIDE_SEEKER') {
      await this.prisma.rideSeeker.upsert({ where: { userId }, create: { userId }, update: {} });
    }

    return this.prisma.user.update({ where: { id: userId }, data: { role: role as any } });
  }

  async suspendUser(userId: string, reason?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, accountStatus: 'SUSPENDED' as any },
    });
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, accountStatus: 'DEACTIVATED' as any },
    });
  }

  async rejectUser(userId: string, reason: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, accountStatus: 'REJECTED' as any, verificationStatus: 'REJECTED' as any },
    });
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
      this.prisma.user.count({ where: { accountStatus: { in: ['SEEKER_VERIFIED', 'DRIVER_VERIFICATION_PENDING', 'DRIVER_VERIFIED'] } } }),
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

  async listVehicles(onlyPending = false) {
    return this.prisma.vehicle.findMany({
      where: {
        isActive: true,
        ...(onlyPending ? { rcVerified: false } : {}),
      },
      include: {
        rideGiver: {
          include: { user: { select: { fullName: true, email: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyVehicle(vehicleId: string) {
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { rcVerified: true },
    });
  }

  async rejectVehicle(vehicleId: string, reason?: string) {
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { rcVerified: false },
    });
  }

  async listAllRides(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      const q = search.trim();
      where.OR = [
        { originName:      { contains: q, mode: 'insensitive' } },
        { destinationName: { contains: q, mode: 'insensitive' } },
        { rideGiver: { user: { fullName: { contains: q, mode: 'insensitive' } } } },
        { rideGiver: { user: { email:    { contains: q, mode: 'insensitive' } } } },
        { vehicle: { plateNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }
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

  // ── User Audit — one-shot complaint debugger ──────────────────────────────
  async getUserAudit(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, phone: true, trid: true,
        role: true, accountStatus: true, emailStatus: true,
        trustScore: true, trustBand: true,
        ecoPoints: true, ecoLevel: true,
        isActive: true, createdAt: true,
        companyName: true, employeeId: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [
      ridesGiven,
      ridesTaken,
      ecoTransactions,
      notifications,
      sosEvents,
      complaints,
      ratings,
    ] = await Promise.all([
      // Last 10 rides given
      this.prisma.ride.findMany({
        where: { rideGiver: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, status: true, originName: true, destinationName: true,
          departureTime: true, totalSeats: true, availableSeats: true,
          createdAt: true,
        },
      }),

      // Last 10 ride requests (taken)
      this.prisma.rideRequest.findMany({
        where: { seeker: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, status: true, createdAt: true,
          ride: {
            select: {
              id: true, originName: true, destinationName: true,
              departureTime: true, status: true,
            },
          },
        },
      }),

      // Last 20 ECO point transactions
      this.prisma.gamificationPoint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, points: true, eventType: true, rideId: true, createdAt: true },
      }),

      // Last 10 notifications
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, body: true, type: true, isRead: true, createdAt: true },
      }),

      // Last 5 SOS events
      this.prisma.sosEvent.findMany({
        where: { userId },
        orderBy: { triggeredAt: 'desc' },
        take: 5,
        select: { id: true, rideId: true, lat: true, lng: true, triggeredAt: true },
      }),

      // Complaints filed against this user
      this.prisma.complaint.findMany({
        where: { reportedId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, status: true, description: true, createdAt: true,
          reporter: { select: { fullName: true, email: true } },
        reported: { select: { fullName: true, email: true } },
        },
      }),

      // Last 10 ratings received
      this.prisma.rideRating.findMany({
        where: { rateeId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, score: true, comment: true, rideId: true, createdAt: true,
          rater: { select: { fullName: true } },
        },
      }),
    ]);

    return {
      user,
      summary: {
        totalRidesGiven: await this.prisma.ride.count({ where: { rideGiver: { userId } } }),
        totalRidesTaken: await this.prisma.rideRequest.count({ where: { seeker: { userId }, status: 'CONFIRMED' } }),
        totalEcoPointsEarned: ecoTransactions.reduce((s, t) => s + (t.points > 0 ? t.points : 0), 0),
        totalEcoPointsLost: ecoTransactions.reduce((s, t) => s + (t.points < 0 ? t.points : 0), 0),
        openComplaints: complaints.filter(c => c.status === 'OPEN').length,
        averageRating: ratings.length
          ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
          : null,
      },
      ridesGiven,
      ridesTaken,
      ecoTransactions,
      notifications,
      sosEvents,
      complaints,
      ratings,
    };
  }
}
