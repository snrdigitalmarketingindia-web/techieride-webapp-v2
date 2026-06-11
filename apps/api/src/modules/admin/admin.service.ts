import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async listUsers(filters: { accountStatus?: string; role?: string; search?: string; compliance?: boolean; page: number; limit: number }) {
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
    if (filters.compliance) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      where.OR = [
        // Seeker with 3+ no-shows
        { rideSeeker: { rideRequests: { some: { status: 'NO_SHOW' } } } },
        // Seeker with recent cancellations
        { rideSeeker: { rideRequests: { some: { status: 'CANCELLED', updatedAt: { gte: sevenDaysAgo } } } } },
        // Giver with low average rating
        { rideGiver: { averageRating: { gt: 0, lt: 3 } } },
        // Seeker with low average rating
        { rideSeeker: { averageRating: { gt: 0, lt: 3 } } },
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

  // Hard-delete a user and all related records — for testing/admin use only
  async deleteUser(userId: string) {
    // Delete in dependency order to avoid FK constraint errors
    await this.prisma.auditLog.deleteMany({ where: { actor: userId } }); // actor stores userId
    await this.prisma.notification.deleteMany({ where: { userId } });
    await this.prisma.emergencyContact.deleteMany({ where: { userId } });
    await this.prisma.sosEvent.deleteMany({ where: { userId } });
    await this.prisma.gamificationPoint.deleteMany({ where: { userId } });
    await this.prisma.verificationRequest.deleteMany({ where: { userId } });
    // Ratings where this user is rater or ratee
    await this.prisma.rideRating.deleteMany({ where: { OR: [{ raterId: userId }, { rateeId: userId }] } });

    // Ride-related: delete participant records for rides this user took as seeker
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (seeker) {
      await this.prisma.rideParticipant.deleteMany({ where: { seekerId: seeker.id } });
      await this.prisma.rideRequest.deleteMany({ where: { seekerId: seeker.id } });
      await this.prisma.rideSeeker.delete({ where: { userId } });
    }

    // Giver-related: delete rides and their dependents
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (giver) {
      const rides = await this.prisma.ride.findMany({ where: { rideGiverId: giver.id }, select: { id: true } });
      const rideIds = rides.map(r => r.id);
      if (rideIds.length) {
        await this.prisma.rideParticipant.deleteMany({ where: { rideId: { in: rideIds } } });
        await this.prisma.rideRequest.deleteMany({ where: { rideId: { in: rideIds } } });
        await this.prisma.rideRating.deleteMany({ where: { rideId: { in: rideIds } } });
        await this.prisma.commuteTemplate.deleteMany({ where: { rideGiverId: giver.id } });
        await this.prisma.ride.deleteMany({ where: { rideGiverId: giver.id } });
      }
      await this.prisma.vehicle.deleteMany({ where: { rideGiverId: giver.id } });
      await this.prisma.rideGiver.delete({ where: { userId } });
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'User permanently deleted' };
  }

  async getAnalytics(from: Date, to: Date) {
    const [
      totalUsers, verifiedUsers, totalRides,
      completedRides, cancelledRides, sosEvents,
      womenUsersCount, womenGiversCount, womenSeekersCount, womenOnlyRidesCount,
      giversCount, seekersCount,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { accountStatus: { in: ['SEEKER_VERIFIED', 'DRIVER_VERIFICATION_PENDING', 'DRIVER_VERIFIED'] } } }),
      this.prisma.ride.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.ride.count({ where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } } }),
      this.prisma.ride.count({ where: { status: 'CANCELLED', createdAt: { gte: from, lte: to } } }),
      this.prisma.sosEvent.count({ where: { triggeredAt: { gte: from, lte: to } } }),
      this.prisma.user.count({ where: { gender: 'FEMALE' } }),
      this.prisma.rideGiver.count({ where: { user: { gender: 'FEMALE' } } }),
      this.prisma.rideSeeker.count({ where: { user: { gender: 'FEMALE' } } }),
      this.prisma.ride.count({ where: { womenOnly: true } }),
      this.prisma.rideGiver.count(),
      this.prisma.rideSeeker.count(),
    ]);

    const co2 = await this.prisma.gamificationPoint.aggregate({
      _sum: { co2SavedG: true },
    });

    return {
      totalUsers, verifiedUsers, totalRides,
      completedRides, cancelledRides, sosEvents,
      totalCo2SavedKg: ((co2._sum.co2SavedG || 0) / 1000).toFixed(2),
      giversCount, seekersCount,
      womenUsersCount, womenGiversCount, womenSeekersCount, womenOnlyRidesCount,
    };
  }

  async getTimeSeriesMetrics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const [userRows, rideRows] = await Promise.all([
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "created_at" AT TIME ZONE 'Asia/Kolkata') AS day, COUNT(*) AS count
        FROM users
        WHERE created_at >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "created_at" AT TIME ZONE 'Asia/Kolkata') AS day, COUNT(*) AS count
        FROM rides
        WHERE created_at >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
    ]);

    // Build a complete date series so gaps show as 0
    const result: { date: string; users: number; rides: number }[] = [];
    const userMap = new Map(userRows.map(r => [r.day.toISOString().slice(0, 10), Number(r.count)]));
    const rideMap = new Map(rideRows.map(r => [r.day.toISOString().slice(0, 10), Number(r.count)]));

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, users: userMap.get(key) ?? 0, rides: rideMap.get(key) ?? 0 });
    }
    return result;
  }

  async bulkSuspendUsers(userIds: string[]) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { accountStatus: 'SUSPENDED' as any, isActive: false },
    });
    return { updated: userIds.length };
  }

  async bulkActivateUsers(userIds: string[]) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive: true },
    });
    return { updated: userIds.length };
  }

  async bulkForceCompleteRides(olderThanHours = 24, statuses = ['PUBLISHED', 'ONGOING']) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const stale = await this.prisma.ride.findMany({
      where: { status: { in: statuses as any[] }, createdAt: { lt: cutoff } },
      select: { id: true },
    });
    let completed = 0;
    let failed = 0;
    for (const { id } of stale) {
      try {
        // Mark all unresolved participants as NO_SHOW then complete
        await this.prisma.rideParticipant.updateMany({
          where: { rideId: id, boardingStatus: { in: ['WAITING', 'BOARDED'] } },
          data: { boardingStatus: 'NO_SHOW' },
        });
        await this.prisma.ride.update({
          where: { id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        completed++;
      } catch {
        failed++;
      }
    }
    return { found: stale.length, completed, failed };
  }

  // ── System config ────────────────────────────────────────────────────────

  private readonly SUSPICIOUS_RULES_KEY = 'suspicious_rules';
  private readonly SUSPICIOUS_RULES_DEFAULTS = {
    noShowThreshold:          3,
    noShowDays:               30,
    cancellationThreshold:    5,
    cancellationDays:         7,
    minRating:                2.5,
    minRatedRides:            5,
    openComplaintsThreshold:  2,
    sosThreshold:             3,
  };

  async getSuspiciousRulesConfig() {
    const row = await this.prisma.systemConfig.findUnique({ where: { key: this.SUSPICIOUS_RULES_KEY } });
    return { ...this.SUSPICIOUS_RULES_DEFAULTS, ...(row?.value as object ?? {}) };
  }

  async setSuspiciousRulesConfig(updates: Partial<typeof this.SUSPICIOUS_RULES_DEFAULTS>) {
    const current = await this.getSuspiciousRulesConfig();
    const merged = { ...current, ...updates };
    await this.prisma.systemConfig.upsert({
      where:  { key: this.SUSPICIOUS_RULES_KEY },
      create: { key: this.SUSPICIOUS_RULES_KEY, value: merged },
      update: { value: merged },
    });
    return merged;
  }

  async getSuspiciousUsers() {
    const cfg = await this.getSuspiciousRulesConfig();

    const noShowSince         = new Date(Date.now() - cfg.noShowDays         * 86400000);
    const cancellationSince   = new Date(Date.now() - cfg.cancellationDays   * 86400000);

    // Run all five signal queries in parallel
    const [noShows, cancellations, lowRating, complaints, sos] = await Promise.all([
      // Signal 1: seekers with ≥ noShowThreshold no-shows in last noShowDays days
      this.prisma.rideSeeker.findMany({
        where: { rideRequests: { some: { status: 'NO_SHOW', updatedAt: { gte: noShowSince } } } },
        select: {
          userId: true,
          user: { select: { id: true, fullName: true, email: true, accountStatus: true } },
          _count: { select: { rideRequests: { where: { status: 'NO_SHOW', updatedAt: { gte: noShowSince } } } } },
        },
      }),

      // Signal 2: seekers with ≥ cancellationThreshold cancellations in last cancellationDays days
      this.prisma.rideSeeker.findMany({
        where: { rideRequests: { some: { status: 'CANCELLED', updatedAt: { gte: cancellationSince } } } },
        select: {
          userId: true,
          user: { select: { id: true, fullName: true, email: true, accountStatus: true } },
          _count: { select: { rideRequests: { where: { status: 'CANCELLED', updatedAt: { gte: cancellationSince } } } } },
        },
      }),

      // Signal 3: givers OR seekers with average rating < minRating and ≥ minRatedRides rides
      this.prisma.user.findMany({
        where: {
          OR: [
            { rideGiver: { averageRating: { gt: 0, lt: cfg.minRating }, totalRidesGiven: { gte: cfg.minRatedRides } } },
            { rideSeeker: { averageRating: { gt: 0, lt: cfg.minRating }, totalRidesTaken: { gte: cfg.minRatedRides } } },
          ],
        },
        select: {
          id: true, fullName: true, email: true, accountStatus: true,
          rideGiver:  { select: { averageRating: true, totalRidesGiven: true } },
          rideSeeker: { select: { averageRating: true, totalRidesTaken: true } },
        },
      }),

      // Signal 4: users with ≥ openComplaintsThreshold open complaints against them
      this.prisma.user.findMany({
        where: { complaintsReceived: { some: { status: 'OPEN' } } },
        select: {
          id: true, fullName: true, email: true, accountStatus: true,
          _count: { select: { complaintsReceived: { where: { status: 'OPEN' } } } },
        },
      }),

      // Signal 5: users with ≥ sosThreshold SOS events
      this.prisma.user.findMany({
        where: { sosEvents: { some: {} } },
        select: {
          id: true, fullName: true, email: true, accountStatus: true,
          _count: { select: { sosEvents: true } },
        },
      }),
    ]);

    // Merge into a map keyed by userId
    const map = new Map<string, { userId: string; fullName: string; email: string; accountStatus: string; flags: string[] }>();

    const getOrCreate = (id: string, fullName: string, email: string, accountStatus: string) => {
      if (!map.has(id)) map.set(id, { userId: id, fullName, email, accountStatus, flags: [] });
      return map.get(id)!;
    };

    for (const s of noShows) {
      const count = s._count.rideRequests;
      if (count >= cfg.noShowThreshold)
        getOrCreate(s.user.id, s.user.fullName, s.user.email, s.user.accountStatus as string)
          .flags.push(`🚫 ${count} no-show${count !== 1 ? 's' : ''} (${cfg.noShowDays}d)`);
    }
    for (const s of cancellations) {
      const count = s._count.rideRequests;
      if (count >= cfg.cancellationThreshold)
        getOrCreate(s.user.id, s.user.fullName, s.user.email, s.user.accountStatus as string)
          .flags.push(`⚠️ ${count} cancellations (${cfg.cancellationDays}d)`);
    }
    for (const u of lowRating) {
      const rating = u.rideGiver?.averageRating ?? u.rideSeeker?.averageRating ?? 0;
      getOrCreate(u.id, u.fullName, u.email, u.accountStatus as string)
        .flags.push(`⭐ Rating ${rating.toFixed(1)}`);
    }
    for (const u of complaints) {
      const count = u._count.complaintsReceived;
      if (count >= cfg.openComplaintsThreshold)
        getOrCreate(u.id, u.fullName, u.email, u.accountStatus as string)
          .flags.push(`📋 ${count} open complaint${count !== 1 ? 's' : ''}`);
    }
    for (const u of sos) {
      const count = u._count.sosEvents;
      if (count >= cfg.sosThreshold)
        getOrCreate(u.id, u.fullName, u.email, u.accountStatus as string)
          .flags.push(`🆘 ${count} SOS event${count !== 1 ? 's' : ''}`);
    }

    return {
      config: cfg,
      users: Array.from(map.values()).sort((a, b) => b.flags.length - a.flags.length),
    };
  }

  async getTravelAnalytics() {
    // Top giver-seeker pairs by completed-ride count
    const pairs = await this.prisma.$queryRaw<{
      giverUserId: string;
      giverName: string;
      seekerUserId: string;
      seekerName: string;
      rideCount: bigint;
      lastRideDate: Date;
    }[]>`
      SELECT
        gu.id            AS "giverUserId",
        gu.full_name     AS "giverName",
        su.id            AS "seekerUserId",
        su.full_name     AS "seekerName",
        COUNT(rp.id)     AS "rideCount",
        MAX(r.departure_date) AS "lastRideDate"
      FROM ride_participants rp
      JOIN rides           r   ON r.id   = rp.ride_id
      JOIN ride_givers     rg  ON rg.id  = r.ride_giver_id
      JOIN users           gu  ON gu.id  = rg.user_id
      JOIN ride_seekers    rs  ON rs.id  = rp.seeker_id
      JOIN users           su  ON su.id  = rs.user_id
      WHERE r.status IN ('COMPLETED', 'ONGOING')
      GROUP BY gu.id, gu.full_name, su.id, su.full_name
      ORDER BY "rideCount" DESC, "lastRideDate" DESC
      LIMIT 200
    `;

    // Summary stats
    const [totalParticipations, uniqueGivers, uniqueSeekers, totalRides] = await Promise.all([
      this.prisma.rideParticipant.count(),
      this.prisma.rideGiver.count({ where: { rides: { some: { status: { in: ['COMPLETED', 'ONGOING'] } } } } }),
      this.prisma.rideSeeker.count({ where: { rideParticipants: { some: {} } } }),
      this.prisma.ride.count({ where: { status: 'COMPLETED' } }),
    ]);

    return {
      summary: { totalParticipations, uniqueGivers, uniqueSeekers, totalCompletedRides: totalRides },
      pairs: pairs.map(p => ({
        giverUserId:  p.giverUserId,
        giverName:    p.giverName,
        seekerUserId: p.seekerUserId,
        seekerName:   p.seekerName,
        rideCount:    Number(p.rideCount),
        lastRideDate: p.lastRideDate,
      })),
    };
  }

  async getUserLoginHistory(userId: string, limit = 50) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true },
    });
  }

  async getOccupancyStats() {
    const rows = await this.prisma.$queryRaw<{
      giverId: string;
      fullName: string;
      totalRides: bigint;
      completedRides: bigint;
      totalSeats: bigint;
      filledSeats: bigint;
    }[]>`
      SELECT
        rg.id                                         AS "giverId",
        u.full_name                                   AS "fullName",
        COUNT(r.id)                                   AS "totalRides",
        COUNT(r.id) FILTER (WHERE r.status = 'COMPLETED') AS "completedRides",
        COALESCE(SUM(r.total_seats), 0)              AS "totalSeats",
        COALESCE(SUM(r.total_seats - r.available_seats), 0) AS "filledSeats"
      FROM ride_givers rg
      JOIN users u ON u.id = rg.user_id
      LEFT JOIN rides r ON r.ride_giver_id = rg.id AND r.status IN ('COMPLETED','ONGOING','PUBLISHED')
      GROUP BY rg.id, u.full_name
      ORDER BY "completedRides" DESC, "totalRides" DESC
      LIMIT 100
    `;

    return rows.map(r => ({
      giverId:        r.giverId,
      fullName:       r.fullName,
      totalRides:     Number(r.totalRides),
      completedRides: Number(r.completedRides),
      totalSeats:     Number(r.totalSeats),
      filledSeats:    Number(r.filledSeats),
      occupancyPct:   r.totalSeats > 0 ? Math.round((Number(r.filledSeats) / Number(r.totalSeats)) * 100) : 0,
    }));
  }

  async bulkEmailUsers(userIds: string[], subject: string, body: string) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true, fullName: true },
    });
    return this.emailService.sendAdminBulkEmail(users, subject, body);
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

  // ── Ride 360° Detail ────────────────────────────────────────────────────
  async getRideDetail(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        vehicle: true,
        rideGiver: {
          include: {
            user: {
              select: {
                id: true, fullName: true, email: true, phone: true,
                profilePhoto: true, trustScore: true, trustBand: true,
                accountStatus: true, createdAt: true,
              },
            },
          },
        },
        requests: {
          include: {
            seeker: {
              include: {
                user: {
                  select: {
                    id: true, fullName: true, email: true, phone: true,
                    profilePhoto: true, trustScore: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        participants: {
          include: {
            seeker: {
              include: {
                user: {
                  select: {
                    id: true, fullName: true, email: true, profilePhoto: true,
                  },
                },
              },
            },
          },
        },
        ratings: {
          include: {
            rater: { select: { id: true, fullName: true } },
            ratee: { select: { id: true, fullName: true } },
          },
        },
        sosEvents: { orderBy: { triggeredAt: 'desc' }, take: 5 },
        complaints: {
          include: {
            reporter: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!ride) throw new NotFoundException('Ride not found');

    // Giver's last 5 rides for history panel
    const giverHistory = await this.prisma.ride.findMany({
      where: { rideGiverId: ride.rideGiverId, id: { not: rideId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, status: true, originName: true, destinationName: true,
        departureDate: true, totalSeats: true, availableSeats: true, createdAt: true,
      },
    });

    return { ...ride, giverHistory };
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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalRidesGiven, totalRidesTaken, completedRidesGiven, cancelledRidesGiven,
      noShowCount, recentCancellationCount, totalRatingsCount,
    ] = await Promise.all([
      this.prisma.ride.count({ where: { rideGiver: { userId } } }),
      this.prisma.rideRequest.count({ where: { seeker: { userId }, status: 'CONFIRMED' } }),
      this.prisma.ride.count({ where: { rideGiver: { userId }, status: 'COMPLETED' } }),
      this.prisma.ride.count({ where: { rideGiver: { userId }, status: 'CANCELLED' } }),
      this.prisma.rideRequest.count({ where: { seeker: { userId }, status: 'NO_SHOW' } }),
      this.prisma.rideRequest.count({ where: { seeker: { userId }, status: 'CANCELLED', updatedAt: { gte: sevenDaysAgo } } }),
      this.prisma.rideRating.count({ where: { rateeId: userId } }),
    ]);

    return {
      user,
      summary: {
        totalRidesGiven,
        totalRidesTaken,
        completedRidesGiven,
        cancelledRidesGiven,
        totalEcoPointsEarned: ecoTransactions.reduce((s, t) => s + (t.points > 0 ? t.points : 0), 0),
        totalEcoPointsLost: ecoTransactions.reduce((s, t) => s + (t.points < 0 ? t.points : 0), 0),
        openComplaints: complaints.filter(c => c.status === 'OPEN').length,
        noShowCount,
        recentCancellationCount,
        totalRatingsCount,
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

  async getUserSavedLocations(userId: string) {
    return this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, alias: true, address: true, lat: true, lng: true, sourceType: true, isFavorite: true, createdAt: true },
    });
  }

  async exportUserscsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        trid: true, fullName: true, email: true, phone: true, role: true,
        accountStatus: true, gender: true, companyName: true,
        trustScore: true, ecoPoints: true, createdAt: true,
        rideGiver: { select: { totalRidesGiven: true, averageRating: true } },
        rideSeeker: { select: { totalRidesTaken: true, averageRating: true } },
      },
    });

    const header = 'TRID,Name,Email,Phone,Role,Status,Gender,Company,TrustScore,EcoPoints,RidesGiven,GiverRating,RidesTaken,SeekerRating,JoinedAt';
    const rows = users.map((u) => [
      u.trid ?? '',
      `"${(u.fullName ?? '').replace(/"/g, '""')}"`,
      u.email,
      u.phone ?? '',
      u.role,
      u.accountStatus,
      u.gender ?? '',
      `"${(u.companyName ?? '').replace(/"/g, '""')}"`,
      u.trustScore,
      u.ecoPoints,
      u.rideGiver?.totalRidesGiven ?? 0,
      u.rideGiver?.averageRating?.toFixed(1) ?? '',
      u.rideSeeker?.totalRidesTaken ?? 0,
      u.rideSeeker?.averageRating?.toFixed(1) ?? '',
      new Date(u.createdAt).toISOString().split('T')[0],
    ].join(','));

    return [header, ...rows].join('\n');
  }
}
