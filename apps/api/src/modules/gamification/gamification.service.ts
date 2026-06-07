import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.module';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ECO_POINTS,
  ECO_LEVEL_THRESHOLDS,
  CO2_PER_KM_PER_PERSON_GRAMS,
  EcoLevel,
} from '@techieride/shared';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async awardRideCompletion(
    seekerOrGiverId: string,
    rideId: string,
    role: 'giver' | 'seeker',
    distanceKm: number,
    passengers: number,
  ) {
    const points = role === 'giver' ? ECO_POINTS.RIDE_GIVEN : ECO_POINTS.RIDE_TAKEN;
    const co2SavedG = role === 'giver'
      ? Math.round(passengers * distanceKm * CO2_PER_KM_PER_PERSON_GRAMS)
      : Math.round(distanceKm * CO2_PER_KM_PER_PERSON_GRAMS);

    // Find user id from seeker/giver
    let userId: string;
    if (role === 'giver') {
      const giver = await this.prisma.rideGiver.findUnique({ where: { id: seekerOrGiverId } });
      userId = giver!.userId;
      await this.prisma.rideGiver.update({
        where: { id: seekerOrGiverId },
        data: { totalRidesGiven: { increment: 1 } },
      });
    } else {
      const seeker = await this.prisma.rideSeeker.findUnique({ where: { id: seekerOrGiverId } });
      userId = seeker!.userId;
      await this.prisma.rideSeeker.update({
        where: { id: seekerOrGiverId },
        data: { totalRidesTaken: { increment: 1 } },
      });
    }

    await this.addPoints(userId, points, 'RIDE_COMPLETED', rideId, co2SavedG);
  }

  async addPoints(
    userId: string,
    points: number,
    eventType: string,
    rideId?: string,
    co2SavedG = 0,
  ) {
    await this.prisma.$transaction([
      this.prisma.gamificationPoint.create({
        data: { userId, eventType, points, rideId, co2SavedG },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { ecoPoints: { increment: points } },
      }),
    ]);

    // Level recalc and cache invalidation are best-effort — never let them
    // block or undo the point award already committed above.
    try {
      await this.recalculateLevel(userId);
    } catch (e: any) {
      this.logger.error(`recalculateLevel failed for ${userId}: ${e.message}`);
    }
    try {
      // Invalidate both leaderboard caches so rankings reflect the new points immediately
      await this.redis.del('leaderboard:monthly', 'leaderboard:alltime');
    } catch (e: any) {
      this.logger.warn(`Leaderboard cache invalidation failed: ${e.message}`);
    }
  }

  async recalculateLevel(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { ecoPoints: true } });
    if (!user) return;

    const pts = user.ecoPoints;
    let newLevel: EcoLevel = EcoLevel.SEED;
    if (pts >= ECO_LEVEL_THRESHOLDS.FOREST) newLevel = EcoLevel.FOREST;
    else if (pts >= ECO_LEVEL_THRESHOLDS.TREE) newLevel = EcoLevel.TREE;
    else if (pts >= ECO_LEVEL_THRESHOLDS.LEAF) newLevel = EcoLevel.LEAF;
    else if (pts >= ECO_LEVEL_THRESHOLDS.SPROUT) newLevel = EcoLevel.SPROUT;

    await this.prisma.user.update({ where: { id: userId }, data: { ecoLevel: newLevel as any } });
  }

  async getSummary(userId: string) {
    const [user, points] = await this.prisma.$transaction([
      this.prisma.user.findUnique({ where: { id: userId }, select: { ecoPoints: true, ecoLevel: true } }),
      this.prisma.gamificationPoint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const co2SavedG = await this.prisma.gamificationPoint.aggregate({
      where: { userId },
      _sum: { co2SavedG: true },
    });

    return {
      totalPoints: user?.ecoPoints || 0,
      ecoLevel: user?.ecoLevel,
      co2SavedKg: ((co2SavedG._sum.co2SavedG || 0) / 1000).toFixed(2),
      pointsHistory: points,
    };
  }

  async getLeaderboard(period: 'monthly' | 'alltime' = 'monthly', limit = 50) {
    const cacheKey = period === 'monthly' ? 'leaderboard:monthly' : 'leaderboard:alltime';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const dateFilter = period === 'monthly'
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      : undefined;

    const results = await this.prisma.gamificationPoint.groupBy({
      by: ['userId'],
      where: dateFilter ? { createdAt: { gte: dateFilter } } : {},
      _sum: { points: true, co2SavedG: true },
      orderBy: { _sum: { points: 'desc' } },
      take: limit,
    });

    const leaderboard = await Promise.all(
      results.map(async (r, i) => {
        const user = await this.prisma.user.findUnique({
          where: { id: r.userId },
          select: { id: true, fullName: true, profilePhoto: true, ecoLevel: true },
        });
        return {
          rank: i + 1,
          ...user,
          points: r._sum.points || 0,
          co2SavedKg: ((r._sum.co2SavedG || 0) / 1000).toFixed(2),
        };
      }),
    );

    await this.redis.setex(cacheKey, 3600, JSON.stringify(leaderboard));
    return leaderboard;
  }
}
