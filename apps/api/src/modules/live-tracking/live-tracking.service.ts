import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.module';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_KEYS, GPS_TTL_SECONDS } from '@techieride/shared';

@Injectable()
export class LiveTrackingService {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async storeLocation(rideId: string, gps: { lat: number; lng: number; speed?: number; timestamp: string }) {
    const key = REDIS_KEYS.GPS(rideId);
    await this.redis.setex(key, GPS_TTL_SECONDS, JSON.stringify(gps));
  }

  async getLastLocation(rideId: string) {
    const val = await this.redis.get(REDIS_KEYS.GPS(rideId));
    if (!val) return null;
    return JSON.parse(val);
  }

  async canAccessRide(userId: string, rideId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'ADMIN') return true;

    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (giver) {
      const ride = await this.prisma.ride.findFirst({ where: { id: rideId, rideGiverId: giver.id } });
      if (ride) return true;
    }

    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (seeker) {
      const participant = await this.prisma.rideParticipant.findFirst({
        where: { rideId, seekerId: seeker.id },
      });
      if (participant) return true;
    }

    return false;
  }

  async isRideGiver(userId: string, rideId: string): Promise<boolean> {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) return false;
    const ride = await this.prisma.ride.findFirst({ where: { id: rideId, rideGiverId: giver.id } });
    return !!ride;
  }
}
