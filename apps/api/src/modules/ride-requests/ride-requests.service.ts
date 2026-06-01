import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.module';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { NotificationType, REDIS_KEYS } from '@techieride/shared';

const USER_CONTACT_SELECT = {
  id: true, fullName: true, profilePhoto: true,
  companyName: true, phone: true, countryCode: true,
} as const;

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
      include: { rideGiver: { include: { user: { select: USER_CONTACT_SELECT } } } },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== 'PUBLISHED') throw new BadRequestException('Ride is not available');
    if (ride.availableSeats <= 0) throw new BadRequestException('No seats available');

    // BOTH-role users cannot request a seat on a ride they own as giver
    if (ride.rideGiver.userId === userId) {
      throw new ForbiddenException('You cannot request a seat on your own ride');
    }

    const existing = await this.prisma.rideRequest.findUnique({
      where: { rideId_seekerId: { rideId: dto.rideId, seekerId: seeker.id } },
    });
    // Allow re-request after terminal states (CANCELLED, REJECTED, NO_SHOW)
    if (existing && !['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(existing.status)) {
      throw new ConflictException('You already have an active request for this ride');
    }

    // Block if seeker already has an active request on another ride
    const activeRequest = await this.prisma.rideRequest.findFirst({
      where: {
        seekerId: seeker.id,
        status: { in: ['PENDING', 'HOLD', 'CONFIRMED'] },
        rideId: { not: dto.rideId },
      },
    });
    if (activeRequest) {
      throw new ConflictException('You already have an active ride request. Cancel it before requesting another ride.');
    }

    // Upsert: if a terminal record (CANCELLED/REJECTED) exists for this ride+seeker,
    // reset it to PENDING rather than inserting a duplicate (@@unique constraint).
    const request = await this.prisma.rideRequest.upsert({
      where: { rideId_seekerId: { rideId: dto.rideId, seekerId: seeker.id } },
      create: {
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
      update: {
        status: 'PENDING',
        holdExpiresAt: null,
        confirmedAt: null,
        cancelledAt: null,
        cancelReason: null,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        pickupName: dto.pickupName,
        dropLat: dto.dropLat,
        dropLng: dto.dropLng,
        dropName: dto.dropName,
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
      include: { seeker: { include: { user: { select: USER_CONTACT_SELECT } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMyRequests(userId: string) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) throw new ForbiddenException();
    return this.prisma.rideRequest.findMany({
      where: { seekerId: seeker.id },
      include: { ride: { include: { rideGiver: { include: { user: { select: USER_CONTACT_SELECT } } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(requestId: string, userId: string) {
    const request = await this.getRequestForGiver(requestId, userId);
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    const ride = await this.prisma.ride.findUnique({ where: { id: request.rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    // Atomic conditional decrement — only succeeds if availableSeats > 0 at write time.
    // This prevents the race condition where two concurrent approvals both read seats > 0
    // then both decrement, resulting in negative seat counts.
    const seatUpdate = await this.prisma.ride.updateMany({
      where: { id: ride.id, availableSeats: { gt: 0 } },
      data: { availableSeats: { decrement: 1 } },
    });
    if (seatUpdate.count === 0) {
      throw new BadRequestException('No seats available');
    }

    await this.prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: 'HOLD', holdExpiresAt: null },
    });

    // Notify seeker
    const seeker = await this.prisma.rideSeeker.findUnique({
      where: { id: request.seekerId },
      include: { user: true },
    });
    if (seeker) {
      await this.notifications.create(seeker.userId, {
        type: NotificationType.REQUEST_APPROVED,
        title: 'Seat approved!',
        body: 'Your seat has been approved. Confirm your seat to lock it in.',
        data: { requestId },
      });
    }

    return { status: 'HOLD' };
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
      include: { ride: { include: { rideGiver: { include: { user: { select: USER_CONTACT_SELECT } } } } } },
    });
    if (!request || request.seekerId !== seeker.id) throw new NotFoundException();
    if (request.status !== 'HOLD') throw new BadRequestException('Request is not in hold state');

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
