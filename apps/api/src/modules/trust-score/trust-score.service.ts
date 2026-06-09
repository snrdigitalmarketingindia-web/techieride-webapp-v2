import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TRUST_SCORE, TRUST_BAND_THRESHOLDS, TrustBand } from '@techieride/shared';
import { AccountStatus, NotificationType } from '@techieride/shared';

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ── Core: adjust score with idempotency guard ──────────────────────────

  async adjust(
    userId: string,
    delta: number,
    eventType: string,
    reason?: string,
    referenceId?: string,
    adminId?: string,
  ): Promise<number> {
    // Idempotency: skip if this exact event+reference already recorded
    if (referenceId) {
      const existing = await this.prisma.trustScoreEvent.findUnique({
        where: { userId_eventType_referenceId: { userId, eventType, referenceId } },
      });
      if (existing) return existing.scoreAfter;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trustScore: true, accountStatus: true },
    });
    if (!user) return 0;

    const raw = user.trustScore + delta;
    const newScore = Math.max(TRUST_SCORE.MIN_SCORE, Math.min(100, raw));
    const newBand = this.bandFor(newScore);

    await this.prisma.$transaction([
      this.prisma.trustScoreEvent.create({
        data: { userId, delta, eventType, reason, referenceId, scoreAfter: newScore, adminId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { trustScore: newScore, trustBand: newBand as any },
      }),
    ]);

    await this.handleThresholds(userId, newScore, user.accountStatus as AccountStatus);
    return newScore;
  }

  // ── Band calculation ───────────────────────────────────────────────────

  bandFor(score: number): TrustBand {
    if (score >= TRUST_BAND_THRESHOLDS.PLATINUM) return TrustBand.PLATINUM;
    if (score >= TRUST_BAND_THRESHOLDS.GOLD)     return TrustBand.GOLD;
    if (score >= TRUST_BAND_THRESHOLDS.SILVER)   return TrustBand.SILVER;
    if (score >= TRUST_BAND_THRESHOLDS.BRONZE)   return TrustBand.BRONZE;
    return TrustBand.NEW;
  }

  // ── Threshold checks: warning / suspension / ban ──────────────────────

  private async handleThresholds(userId: string, score: number, currentStatus: AccountStatus) {
    if (score <= TRUST_SCORE.MIN_SCORE && currentStatus !== AccountStatus.BANNED) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.BANNED as any },
      });
      await this.notifications.create(userId, {
        type: NotificationType.GENERIC,
        title: 'Account permanently banned',
        body: 'Your trust score has reached 0. Your account has been permanently banned.',
      });
      this.logger.warn(`User ${userId} BANNED — trust score reached 0`);
      return;
    }

    if (score < TRUST_SCORE.SUSPENSION_THRESHOLD && currentStatus !== AccountStatus.SUSPENDED && currentStatus !== AccountStatus.BANNED) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.SUSPENDED as any },
      });
      await this.notifications.create(userId, {
        type: NotificationType.GENERIC,
        title: 'Account suspended',
        body: `Your trust score has dropped below ${TRUST_SCORE.SUSPENSION_THRESHOLD}. Your account has been suspended. Contact support to appeal.`,
      });
      this.logger.warn(`User ${userId} SUSPENDED — trust score ${score}`);
      return;
    }

    if (score < TRUST_SCORE.WARNING_THRESHOLD) {
      await this.notifications.create(userId, {
        type: NotificationType.GENERIC,
        title: 'Trust score warning',
        body: `Your trust score is ${score}. Please note that further violations may result in suspension.`,
      });
    }
  }

  // ── Domain event handlers ──────────────────────────────────────────────

  async onVerificationApproved(userId: string, type: 'EMPLOYEE' | 'DRIVER') {
    const delta = type === 'EMPLOYEE' ? TRUST_SCORE.EMPLOYEE_VERIFIED : TRUST_SCORE.DRIVER_VERIFIED;
    const eventType = type === 'EMPLOYEE' ? 'EMPLOYEE_VERIFIED' : 'DRIVER_VERIFIED';
    await this.adjust(userId, delta, eventType, `${type} verification approved`, userId);
  }

  async onRideCompletedGiver(giverId: string, rideId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { id: giverId }, select: { userId: true, totalRidesGiven: true } });
    if (!giver) return;
    await this.adjust(giver.userId, TRUST_SCORE.RIDE_COMPLETED_GIVER, 'RIDE_COMPLETED_GIVER', 'Ride completed as giver', rideId);
    await this.checkMilestone(giver.userId, giver.totalRidesGiven, 'giver');
  }

  async onRideCompletedSeeker(seekerId: string, rideId: string) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { id: seekerId }, select: { userId: true, totalRidesTaken: true } });
    if (!seeker) return;
    await this.adjust(seeker.userId, TRUST_SCORE.RIDE_COMPLETED_SEEKER, 'RIDE_COMPLETED_SEEKER', 'Ride completed as seeker', rideId);
    await this.checkMilestone(seeker.userId, seeker.totalRidesTaken, 'seeker');
  }

  async onRatingReceived(userId: string, stars: number, ratingId: string) {
    const deltas: Record<number, number> = {
      5: TRUST_SCORE.RATING_5_STAR,
      4: TRUST_SCORE.RATING_4_STAR,
      3: TRUST_SCORE.RATING_3_STAR,
      2: TRUST_SCORE.RATING_2_STAR,
      1: TRUST_SCORE.RATING_1_STAR,
    };
    const delta = deltas[stars] ?? 0;
    if (delta === 0) return;
    await this.adjust(userId, delta, `RATING_${stars}_STAR`, `Received ${stars}-star rating`, ratingId);
  }

  async onNoShowSeeker(seekerUserId: string, rideId: string) {
    await this.adjust(seekerUserId, TRUST_SCORE.NO_SHOW_SEEKER, 'NO_SHOW_SEEKER', 'Marked as no-show by giver', rideId);
  }

  async onNoShowGiver(giverUserId: string, rideId: string) {
    await this.adjust(giverUserId, TRUST_SCORE.NO_SHOW_GIVER, 'NO_SHOW_GIVER', 'Ride auto-cancelled due to giver no-show', rideId);
  }

  async onGiverCancelledRide(giverUserId: string, rideId: string) {
    await this.adjust(giverUserId, TRUST_SCORE.GIVER_CANCELLED_RIDE, 'GIVER_CANCELLED_RIDE', 'Giver cancelled a published ride', rideId);
  }

  async onComplaintVerified(reportedUserId: string, complaintId: string) {
    await this.adjust(reportedUserId, TRUST_SCORE.COMPLAINT_VERIFIED, 'COMPLAINT_VERIFIED', 'Verified complaint filed against user', complaintId);
  }

  // ── Admin manual override ──────────────────────────────────────────────

  async adminAdjust(userId: string, delta: number, reason: string, adminId: string) {
    return this.adjust(userId, delta, 'ADMIN_OVERRIDE', reason, undefined, adminId);
  }

  async adminReinstate(userId: string, adminId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.DOCUMENT_VERIFICATION_PENDING },
    });
    await this.notifications.create(userId, {
      type: NotificationType.GENERIC,
      title: 'Account reinstated',
      body: 'Your account has been reinstated by an administrator.',
    });
    this.logger.log(`User ${userId} reinstated by admin ${adminId}`);
  }

  // ── Get trust info ─────────────────────────────────────────────────────

  async getScore(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trustScore: true, trustBand: true },
    });
    return user;
  }

  async getHistory(userId: string) {
    return this.prisma.trustScoreEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Cron: decay inactive users — runs daily at 03:00 IST ──────────────

  @Cron('0 3 * * *', { timeZone: 'Asia/Kolkata' })
  async decayInactiveUsers() {
    const now = new Date();
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const day60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const day90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Find last ride per user
    const recentRides = await this.prisma.ride.groupBy({
      by: ['rideGiverId'],
      where: { completedAt: { gte: day30 } },
      _max: { completedAt: true },
    });
    const activeGiverIds = new Set(recentRides.map(r => r.rideGiverId));

    const recentTaken = await this.prisma.rideParticipant.groupBy({
      by: ['seekerId'],
      where: { ride: { completedAt: { gte: day30 } } },
      _max: { createdAt: true },
    });
    const activeSeekerIds = new Set(recentTaken.map(r => r.seekerId));

    const allUsers = await this.prisma.user.findMany({
      where: { accountStatus: { notIn: ['BANNED', 'SUSPENDED', 'DEACTIVATED'] as any } },
      select: { id: true, trustScore: true, rideGiver: { select: { id: true } }, rideSeeker: { select: { id: true } } },
    });

    for (const user of allUsers) {
      const isActive = (user.rideGiver && activeGiverIds.has(user.rideGiver.id)) ||
                       (user.rideSeeker && activeSeekerIds.has(user.rideSeeker.id));
      if (isActive) continue;
      if (user.trustScore <= TRUST_SCORE.DECAY_FLOOR) continue;

      // Find last ride date to pick correct decay tier
      const lastRide = await this.prisma.ride.findFirst({
        where: { rideGiver: { userId: user.id }, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      });
      const lastDate = lastRide?.completedAt ?? new Date(0);

      let delta = 0;
      if (lastDate < day90)      delta = TRUST_SCORE.DECAY_90_DAYS;
      else if (lastDate < day60) delta = TRUST_SCORE.DECAY_60_DAYS;
      else if (lastDate < day30) delta = TRUST_SCORE.DECAY_30_DAYS;
      if (delta === 0) continue;

      // Don't decay below floor
      const newScore = Math.max(TRUST_SCORE.DECAY_FLOOR, user.trustScore + delta);
      if (newScore === user.trustScore) continue;

      await this.adjust(user.id, newScore - user.trustScore, 'INACTIVITY_DECAY', 'Inactivity decay');
    }

    this.logger.log('Trust score decay job completed');
  }

  // ── Milestone check ────────────────────────────────────────────────────

  private async checkMilestone(userId: string, totalRides: number, role: 'giver' | 'seeker') {
    const prefix = role === 'giver' ? 'GIVER' : 'SEEKER';
    if (totalRides === 10) {
      await this.adjust(userId, TRUST_SCORE.MILESTONE_10_RIDES, `MILESTONE_10_${prefix}`, '10 rides milestone', `milestone_10_${role}_${userId}`);
    } else if (totalRides === 50) {
      await this.adjust(userId, TRUST_SCORE.MILESTONE_50_RIDES, `MILESTONE_50_${prefix}`, '50 rides milestone', `milestone_50_${role}_${userId}`);
    }
  }
}
