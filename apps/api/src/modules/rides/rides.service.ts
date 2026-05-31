import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { RideStatus, NotificationType } from '@techieride/shared';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class RidesService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateRideDto) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException('You must be a Ride Giver to create rides');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, rideGiverId: giver.id, isActive: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.ride.create({
      data: {
        rideGiverId: giver.id,
        vehicleId: dto.vehicleId,
        originName: dto.originName,
        originLat: dto.originLat,
        originLng: dto.originLng,
        destinationName: dto.destinationName,
        destinationLat: dto.destinationLat,
        destinationLng: dto.destinationLng,
        departureDate: new Date(dto.departureDate),
        departureTime: dto.departureTime,
        totalSeats: dto.totalSeats,
        availableSeats: dto.totalSeats,
        notes: dto.notes,
        status: RideStatus.DRAFT,
      },
      include: { vehicle: true, rideGiver: { include: { user: true } } },
    });
  }

  async publish(rideId: string, userId: string) {
    const ride = await this.findRideForGiver(rideId, userId);
    if (ride.status !== RideStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT rides can be published');
    }
    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.PUBLISHED },
    });
  }

  async start(rideId: string, userId: string) {
    const ride = await this.findRideForGiver(rideId, userId);
    if (ride.status !== RideStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED rides can be started');
    }
    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.ONGOING, startedAt: new Date() },
    });

    // Notify all participants
    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId },
      include: { seeker: { include: { user: true } } },
    });
    for (const p of participants) {
      await this.notifications.create(p.seeker.userId, {
        type: NotificationType.RIDE_STARTED,
        title: 'Your ride has started!',
        body: `${ride.originName} → ${ride.destinationName}`,
        data: { rideId },
      });
    }
    return updated;
  }

  async complete(rideId: string, userId: string) {
    const ride = await this.findRideForGiver(rideId, userId);
    if (ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('Only ONGOING rides can be completed');
    }

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.COMPLETED, completedAt: new Date() },
    });

    // Award ECO points
    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId },
      include: { seeker: { include: { user: true } } },
    });

    await this.gamification.awardRideCompletion(
      ride.rideGiverId,
      rideId,
      'giver',
      ride.estimatedDistanceKm || 0,
      participants.length,
    );

    for (const p of participants) {
      await this.gamification.awardRideCompletion(
        p.seekerId,
        rideId,
        'seeker',
        ride.estimatedDistanceKm || 0,
        1,
      );
      await this.notifications.create(p.seeker.userId, {
        type: NotificationType.RIDE_COMPLETED,
        title: 'Ride completed! Rate your experience',
        body: `How was your ride with ${ride.originName} → ${ride.destinationName}?`,
        data: { rideId },
      });
    }

    return updated;
  }

  async cancel(rideId: string, userId: string, reason: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    const isOwner = giver && ride.rideGiverId === giver.id;
    const isAdmin = user?.role === 'ADMIN';
    if (!isOwner && !isAdmin) throw new ForbiddenException();

    // Cancel all pending/confirmed requests
    await this.prisma.rideRequest.updateMany({
      where: { rideId, status: { in: ['PENDING', 'APPROVED', 'HOLD', 'CONFIRMED'] } },
      data: { status: 'CANCELLED', cancelReason: 'Ride cancelled' },
    });

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
    });
  }

  async search(dto: SearchRidesDto) {
    const rides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.PUBLISHED,
        departureDate: {
          gte: new Date(dto.date),
          lt: new Date(new Date(dto.date).getTime() + 86400000),
        },
        availableSeats: { gt: 0 },
      },
      include: {
        rideGiver: { include: { user: true } },
        vehicle: true,
      },
    });

    return rides
      .map((ride) => {
        const distFromOrigin = haversineMeters(
          dto.originLat, dto.originLng,
          ride.originLat, ride.originLng,
        );
        const distFromDest = haversineMeters(
          dto.destinationLat, dto.destinationLng,
          ride.destinationLat, ride.destinationLng,
        );
        return { ...ride, distanceFromOriginM: Math.round(distFromOrigin), distanceFromDestinationM: Math.round(distFromDest) };
      })
      .filter((r) => r.distanceFromOriginM <= 500 && r.distanceFromDestinationM <= 500)
      .sort((a, b) => a.distanceFromOriginM - b.distanceFromOriginM)
      .slice((dto.page - 1) * dto.limit, dto.page * dto.limit);
  }

  async findById(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        rideGiver: { include: { user: true } },
        vehicle: true,
        participants: { include: { seeker: { include: { user: { select: { fullName: true, profilePhoto: true } } } } } },
      },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  async getGivenRides(userId: string, status?: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) return [];
    return this.prisma.ride.findMany({
      where: {
        rideGiverId: giver.id,
        ...(status ? { status: status as RideStatus } : {}),
      },
      include: { vehicle: true },
      orderBy: { departureDate: 'desc' },
    });
  }

  async getTakenRides(userId: string) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) return [];
    const participants = await this.prisma.rideParticipant.findMany({
      where: { seekerId: seeker.id },
      include: {
        ride: {
          include: { rideGiver: { include: { user: true } }, vehicle: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return participants.map((p) => p.ride);
  }

  private async findRideForGiver(rideId: string, userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException('Not a ride giver');
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.rideGiverId !== giver.id) throw new ForbiddenException('Not your ride');
    return ride;
  }
}
