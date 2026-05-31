import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.module';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { NotificationType, REDIS_KEYS, SEAT_HOLD_TTL_SECONDS } from '@techieride/shared';

@Injectable()
export class RideRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async create(userId: string, dto: CreateRequestDto) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) throw new ForbiddenException('You must be a Ride Seeker to request rides');

    const ride = await this.prisma.ride.findUnique({
      where: { id: dto.rideId },
      include: { rideGiver: { include: { user: true } } },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== 'PUBLISHED') throw new BadRequestException('Ride is not available');
    if (ride.availableSeats <= 0) throw new BadRequestException('No seats available');

    const existing = await this.prisma.rideRequest.findUnique({
      where: { rideId_seekerId: { rideId: dto.rideId, seekerId: seeker.id } },
    });
    if (existing) throw new ConflictException('You already have a request for this ride');

    const request = await this.prisma.rideRequest.create({
      data: {
        rideId: dto.rideId,
        seekerId: seeker.id,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        pickupName: dto.pickupName,
        dropLat: dto.dropLat,
        dropLng: dto.dropLng,
        dropName: dto.dropName,
        status: 'PENDING',
      },
    });

    // Notify giver
    await this.notifications.create(ride.rideGiver.userId, {
      type: NotificationType.REQUEST_APPROVED,
      title: 'New seat request',
      body: `Someone wants to join your ride on ${new Date(ride.departureDate).toLocaleDateString()}`,
      data: { rideId: ride.id, requestId: request.id },
    });

    return { requestId: request.id, status: 'PENDING' };
  }

  async getIncomingRequests(rideId: string, userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException();
    const ride = await this.prisma.ride.findFirst({ where: { id: rideId, rideGiverId: giver.id } });
    if (!ride) throw new NotFoundException('Ride not found or not yours');

    return this.prisma.rideRequest.findMany({
      where: { rideId },
      include: { seeker: { include: { user: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMyRequests(userId: string) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) throw new ForbiddenException();
    return this.prisma.rideRequest.findMany({
      where: { seekerId: seeker.id },
      include: { ride: { include: { rideGiver: { include: { user: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(requestId: string, userId: string) {
    const request = await this.getRequestForGiver(requestId, userId);
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    const ride = await this.prisma.ride.findUnique({ where: { id: request.rideId } });
    if (!ride || ride.availableSeats <= 0) {
      throw new BadRequestException('No seats available');
    }

    const holdExpiresAt = new Date(Date.now() + SEAT_HOLD_TTL_SECONDS * 1000);

    await this.prisma.$transaction([
      this.prisma.rideRequest.update({
        where: { id: requestId },
        data: { status: 'HOLD', holdExpiresAt },
      }),
      this.prisma.ride.update({
        where: { id: ride.id },
        data: { availableSeats: { decrement: 1 } },
      }),
    ]);

    // Set Redis TTL for hold
    await this.redis.setex(
      REDIS_KEYS.SEAT_HOLD(ride.id, request.seekerId),
      SEAT_HOLD_TTL_SECONDS,
      requestId,
    );

    // Notify seeker
    const seeker = await this.prisma.rideSeeker.findUnique({
      where: { id: request.seekerId },
      include: { user: true },
    });
    if (seeker) {
      await this.notifications.create(seeker.userId, {
        type: NotificationType.REQUEST_APPROVED,
        title: 'Seat approved! Confirm now',
        body: 'You have 15 minutes to confirm your seat',
        data: { requestId, holdExpiresAt: holdExpiresAt.toISOString() },
      });
    }

    return { status: 'HOLD', holdExpiresAt: holdExpiresAt.toISOString() };
  }

  async reject(requestId: string, userId: string, reason?: string) {
    const request = await this.getRequestForGiver(requestId, userId);
    if (!['PENDING'].includes(request.status)) {
      throw new BadRequestException('Request cannot be rejected');
    }
    const updated = await this.prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', cancelReason: reason },
    });

    const seeker = await this.prisma.rideSeeker.findUnique({
      where: { id: request.seekerId },
      include: { user: true },
    });
    if (seeker) {
      await this.notifications.create(seeker.userId, {
        type: NotificationType.REQUEST_REJECTED,
        title: 'Seat request not approved',
        body: reason || 'The ride giver was unable to accommodate your request',
        data: { requestId },
      });
    }
    return updated;
  }

  async confirm(requestId: string, userId: string) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) throw new ForbiddenException();

    const request = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: { ride: { include: { rideGiver: { include: { user: true } } } } },
    });
    if (!request || request.seekerId !== seeker.id) throw new NotFoundException();
    if (request.status !== 'HOLD') throw new BadRequestException('Request is not in hold state');

    // Check Redis hold still valid
    const holdKey = REDIS_KEYS.SEAT_HOLD(request.rideId, seeker.id);
    const holdValue = await this.redis.get(holdKey);
    if (!holdValue) {
      // Hold already expired — rollback in DB too
      await this.prisma.rideRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED', cancelReason: 'hold_expired' },
      });
      throw new GoneException('Hold expired. Please request again.');
    }

    await this.prisma.$transaction([
      this.prisma.rideRequest.update({
        where: { id: requestId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      }),
      this.prisma.rideParticipant.create({
        data: {
          rideId: request.rideId,
          seekerId: seeker.id,
          requestId,
          pickupName: request.pickupName,
          dropName: request.dropName,
        },
      }),
    ]);

    await this.redis.del(holdKey);

    // Notify giver
    await this.notifications.create(request.ride.rideGiver.userId, {
      type: NotificationType.RIDE_CONFIRMED,
      title: 'Seat confirmed!',
      body: 'A seeker has confirmed their seat for your ride',
      data: { rideId: request.rideId, requestId },
    });

    return { status: 'CONFIRMED' };
  }

  async cancel(requestId: string, userId: string, reason?: string) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) throw new ForbiddenException();

    const request = await this.prisma.rideRequest.findUnique({ where: { id: requestId } });
    if (!request || request.seekerId !== seeker.id) throw new NotFoundException();
    if (['CANCELLED', 'REJECTED'].includes(request.status)) {
      throw new BadRequestException('Request already cancelled');
    }

    // If in hold, restore seat
    if (['HOLD', 'CONFIRMED'].includes(request.status)) {
      await this.prisma.ride.update({
        where: { id: request.rideId },
        data: { availableSeats: { increment: 1 } },
      });
      await this.redis.del(REDIS_KEYS.SEAT_HOLD(request.rideId, seeker.id));
      if (request.status === 'CONFIRMED') {
        await this.prisma.rideParticipant.deleteMany({
          where: { rideId: request.rideId, seekerId: seeker.id },
        });
      }
    }

    return this.prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }

  private async getRequestForGiver(requestId: string, userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException();
    const request = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: { ride: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.ride.rideGiverId !== giver.id) throw new ForbiddenException('Not your ride');
    return request;
  }
}
