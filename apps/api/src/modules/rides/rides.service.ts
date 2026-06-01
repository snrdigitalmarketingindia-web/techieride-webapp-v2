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

// ── Safe user select — includes phone for direct calling, excludes sensitive fields
const GIVER_USER_SELECT = {
  id: true, fullName: true, profilePhoto: true,
  companyName: true, ecoLevel: true,
  phone: true, countryCode: true,
} as const;

const SEEKER_USER_SELECT = {
  id: true, fullName: true, profilePhoto: true,
  companyName: true,
  phone: true, countryCode: true,
} as const;
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

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
    private email: EmailService,
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

    // Enforce: giver must have DRIVER_VERIFIED status before publishing
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');
    if (user.accountStatus !== 'DRIVER_VERIFIED') {
      throw new ForbiddenException(
        'Driver verification is required before publishing rides. ' +
        'Complete employee verification first, then apply to become a Ride Giver.',
      );
    }

    // Enforce: the vehicle used must have a verified RC
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: ride.vehicleId } });
    if (!vehicle || !vehicle.rcVerified) {
      throw new ForbiddenException(
        'The vehicle\'s RC must be verified before publishing a ride. ' +
        'Please upload your RC document and wait for admin approval.',
      );
    }

    // Block if giver already has an active ride
    const activeRide = await this.prisma.ride.findFirst({
      where: {
        rideGiverId: ride.rideGiverId,
        status: { in: [RideStatus.PUBLISHED, RideStatus.ONGOING] },
        id: { not: rideId },
      },
    });
    if (activeRide) {
      throw new BadRequestException('You already have an active ride. Complete or cancel it before publishing a new one.');
    }

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.PUBLISHED },
    });
  }

  async start(rideId: string, userId: string) {
    // Allow giver (manual override) OR confirmed seeker to start the ride
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED rides can be started');
    }

    // Verify caller is giver or confirmed participant
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    const isGiver = giver && ride.rideGiverId === giver.id;

    if (!isGiver) {
      const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
      const isParticipant = seeker && await this.prisma.rideParticipant.findUnique({
        where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
      });
      if (!isParticipant) throw new ForbiddenException('Only the giver or a confirmed seeker can start this ride');
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
        title: 'Your ride has started! 🚗',
        body: `${ride.originName} → ${ride.destinationName}`,
        data: { rideId },
      });
    }
    return updated;
  }

  async board(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.PUBLISHED && ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('Ride is not active');
    }

    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) throw new ForbiddenException('Only seekers can board');

    const participant = await this.prisma.rideParticipant.findUnique({
      where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
    });
    if (!participant) throw new ForbiddenException('You are not a confirmed participant of this ride');
    if (participant.boardingStatus === 'BOARDED') throw new BadRequestException('You have already boarded');
    if (participant.boardingStatus === 'DEBOARDED') throw new BadRequestException('You have already deboarded');

    await this.prisma.rideParticipant.update({
      where: { id: participant.id },
      data: { boardingStatus: 'BOARDED', boardedAt: new Date() },
    });

    // Notify giver
    const giverUser = await this.prisma.rideGiver.findUnique({
      where: { id: ride.rideGiverId },
    });
    if (giverUser) {
      const seekerUser = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.notifications.create(giverUser.userId, {
        type: NotificationType.SEEKER_BOARDED,
        title: `${seekerUser?.fullName?.split(' ')[0]} has boarded 🚗`,
        body: 'Check if all passengers are on board',
        data: { rideId },
      });
    }

    // Check if ALL participants have boarded → auto-start ride
    const allParticipants = await this.prisma.rideParticipant.findMany({ where: { rideId } });
    const allBoarded = allParticipants.every(p =>
      p.id === participant.id ? true : p.boardingStatus === 'BOARDED' || p.boardingStatus === 'DEBOARDED'
    );

    if (allBoarded && ride.status === RideStatus.PUBLISHED) {
      await this.prisma.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.ONGOING, startedAt: new Date() },
      });
      // Notify all that ride has auto-started
      const allWithUsers = await this.prisma.rideParticipant.findMany({
        where: { rideId },
        include: { seeker: { include: { user: true } } },
      });
      for (const p of allWithUsers) {
        await this.notifications.create(p.seeker.userId, {
          type: NotificationType.RIDE_STARTED,
          title: 'All aboard! Ride has started 🚗',
          body: `${ride.originName} → ${ride.destinationName}`,
          data: { rideId },
        });
      }
      return { boardingStatus: 'BOARDED', rideAutoStarted: true };
    }

    return { boardingStatus: 'BOARDED', rideAutoStarted: false };
  }

  async deboard(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('Ride is not ongoing');
    }

    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) throw new ForbiddenException('Only seekers can deboard');

    const participant = await this.prisma.rideParticipant.findUnique({
      where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
    });
    if (!participant) throw new ForbiddenException('You are not a participant of this ride');
    if (participant.boardingStatus !== 'BOARDED') throw new BadRequestException('You must be boarded to deboard');

    await this.prisma.rideParticipant.update({
      where: { id: participant.id },
      data: { boardingStatus: 'DEBOARDED', deboaredAt: new Date() },
    });

    // Notify giver
    const giverUser = await this.prisma.rideGiver.findUnique({ where: { id: ride.rideGiverId } });
    if (giverUser) {
      const seekerUser = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.notifications.create(giverUser.userId, {
        type: NotificationType.SEEKER_DEBOARDED,
        title: `${seekerUser?.fullName?.split(' ')[0]} has deboarded ✅`,
        body: 'You can complete the ride once all passengers have deboarded',
        data: { rideId },
      });
    }

    return { boardingStatus: 'DEBOARDED' };
  }

  async complete(rideId: string, userId: string) {
    const ride = await this.findRideForGiver(rideId, userId);
    if (ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('Only ONGOING rides can be completed');
    }

    // Block completion until ALL participants have deboarded
    const boardingCheck = await this.prisma.rideParticipant.findMany({ where: { rideId } });
    // Allow DEBOARDED or NO_SHOW — both count as resolved
    const notYetResolved = boardingCheck.filter(
      p => p.boardingStatus !== 'DEBOARDED' && p.boardingStatus !== 'NO_SHOW'
    );
    if (notYetResolved.length > 0) {
      throw new BadRequestException(
        `Cannot complete ride — ${notYetResolved.length} passenger(s) have not deboarded yet. Mark them as no-show if they didn't board.`
      );
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

    if ([RideStatus.COMPLETED, RideStatus.CANCELLED].includes(ride.status as RideStatus)) {
      throw new BadRequestException(`Cannot cancel a ${ride.status} ride`);
    }

    // Enforce: must cancel at least 1 hour before departure (admin can override)
    if (!isAdmin) {
      const departureDateTime = new Date(`${ride.departureDate.toISOString().split('T')[0]}T${ride.departureTime}:00`);
      const oneHourBefore = new Date(departureDateTime.getTime() - 60 * 60 * 1000);
      if (new Date() > oneHourBefore) {
        throw new BadRequestException('Rides can only be cancelled at least 1 hour before departure');
      }
    }

    // Find confirmed participants before cancelling so we can notify them
    const confirmedParticipants = await this.prisma.rideRequest.findMany({
      where: { rideId, status: { in: ['HOLD', 'CONFIRMED'] } },
      include: { seeker: { include: { user: { select: { email: true, personalEmail: true, fullName: true } } } } },
    });

    // Cancel all active requests
    await this.prisma.rideRequest.updateMany({
      where: { rideId, status: { in: ['PENDING', 'APPROVED', 'HOLD', 'CONFIRMED'] } },
      data: { status: 'CANCELLED', cancelReason: 'Ride cancelled' },
    });

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
    });

    // Notify all participants — in-app + email
    for (const req of confirmedParticipants) {
      const seekerUser = req.seeker.user;
      await this.notifications.create(req.seeker.userId, {
        type: NotificationType.RIDE_CANCELLED,
        title: 'Your ride has been cancelled',
        body: `${ride.originName} → ${ride.destinationName} was cancelled${reason ? `: ${reason}` : ''}`,
        data: { rideId },
      });
      // Send email notification
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#dc2626">Ride Cancelled 🚫</h2>
          <p>Hi ${seekerUser.fullName?.split(' ')[0]},</p>
          <p>Unfortunately your booked ride has been cancelled.</p>
          <p><strong>${ride.originName} → ${ride.destinationName}</strong></p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>Please book another ride from the app.</p>
        </div>`;
      await this.email.sendNotification(seekerUser.email, seekerUser.personalEmail, 'Your TechieRide ride was cancelled', html);
    }

    return updated;
  }

  async markNoShow(rideId: string, seekerId: string, giverId: string) {
    // Verify giver owns this ride
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId: giverId } });
    if (!giver) throw new ForbiddenException();

    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.rideGiverId !== giver.id) throw new ForbiddenException('Not your ride');
    if (ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('Can only mark no-show during an ONGOING ride');
    }

    // Find the participant by seekerId (the RideSeeker.id or User.id)
    // Accept both RideSeeker.id and User.id for flexibility
    let seeker = await this.prisma.rideSeeker.findUnique({ where: { id: seekerId } });
    if (!seeker) {
      seeker = await this.prisma.rideSeeker.findUnique({ where: { userId: seekerId } });
    }
    if (!seeker) throw new NotFoundException('Seeker not found');

    const participant = await this.prisma.rideParticipant.findUnique({
      where: { rideId_seekerId: { rideId, seekerId: seeker.id } },
    });
    if (!participant) throw new NotFoundException('Seeker is not a participant of this ride');
    if (participant.boardingStatus !== 'WAITING') {
      throw new BadRequestException(
        `Cannot mark no-show — seeker status is already ${participant.boardingStatus}`
      );
    }

    // Mark as NO_SHOW + update request status + restore seat
    await this.prisma.$transaction([
      this.prisma.rideParticipant.update({
        where: { id: participant.id },
        data: { boardingStatus: 'NO_SHOW' },
      }),
      this.prisma.rideRequest.updateMany({
        where: { rideId, seekerId: seeker.id, status: 'CONFIRMED' },
        data: { status: 'NO_SHOW' },
      }),
      this.prisma.ride.update({
        where: { id: rideId },
        data: { availableSeats: { increment: 1 } },
      }),
    ]);

    // Deduct ECO points penalty from seeker
    await this.gamification.addPoints(seeker.userId, -10, 'NO_SHOW', rideId, 0);

    // Notify seeker
    const seekerUser = await this.prisma.user.findUnique({ where: { id: seeker.userId } });
    await this.notifications.create(seeker.userId, {
      type: NotificationType.SEEKER_NO_SHOW,
      title: 'Marked as No Show ⚠️',
      body: `You were marked as no-show for the ride on ${ride.originName} → ${ride.destinationName}. -10 ECO points applied.`,
      data: { rideId },
    });

    // Send email to seeker
    if (seekerUser) {
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#d97706">No Show Recorded ⚠️</h2>
          <p>Hi ${seekerUser.fullName?.split(' ')[0]},</p>
          <p>You have been marked as <strong>No Show</strong> for the following ride:</p>
          <p><strong>${ride.originName} → ${ride.destinationName}</strong></p>
          <p style="color:#dc2626">-10 ECO points have been deducted from your account.</p>
          <p>Please ensure you inform the giver in advance if you are unable to join a confirmed ride.</p>
        </div>`;
      await this.email.sendNotification(
        seekerUser.email,
        seekerUser.personalEmail,
        'TechieRide — You were marked as No Show',
        html,
      );
    }

    return { status: 'NO_SHOW', message: 'Seeker marked as no-show. -10 ECO points applied.' };
  }

  async edit(
    rideId: string,
    userId: string,
    updates: {
      originName?: string; destinationName?: string;
      departureDate?: string; departureTime?: string;
      totalSeats?: number; notes?: string;
    },
  ) {
    const ride = await this.findRideForGiver(rideId, userId);

    if (ride.status !== RideStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED rides can be edited');
    }

    // Must be more than 30 minutes before departure
    const departureDateTime = new Date(`${ride.departureDate.toISOString().split('T')[0]}T${ride.departureTime}:00`);
    const thirtyMinBefore = new Date(departureDateTime.getTime() - 30 * 60 * 1000);
    if (new Date() > thirtyMinBefore) {
      throw new BadRequestException('Rides can only be edited up to 30 minutes before departure');
    }

    // No active seekers allowed
    const activeSeekersCount = await this.prisma.rideRequest.count({
      where: { rideId, status: { in: ['PENDING', 'HOLD', 'CONFIRMED'] } },
    });
    if (activeSeekersCount > 0) {
      throw new BadRequestException('Cannot edit a ride that has pending or confirmed seat requests');
    }

    return this.prisma.ride.update({
      where: { id: rideId },
      data: {
        ...(updates.originName && { originName: updates.originName }),
        ...(updates.destinationName && { destinationName: updates.destinationName }),
        ...(updates.departureDate && { departureDate: new Date(updates.departureDate) }),
        ...(updates.departureTime && { departureTime: updates.departureTime }),
        ...(updates.totalSeats && { totalSeats: updates.totalSeats }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      },
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
        rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
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
        rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
        vehicle: true,
        participants: {
          include: { seeker: { include: { user: { select: SEEKER_USER_SELECT } } } },
        },
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
      orderBy: { ride: { departureDate: 'desc' } },
    });
    return participants.map((p) => p.ride);
  }

  async getCommunityRides(from: string, to: string) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate   = to   ? new Date(to)   : new Date();
    // Include both ends of the range
    toDate.setHours(23, 59, 59, 999);

    const rides = await this.prisma.ride.findMany({
      where: {
        status: { in: ['PUBLISHED', 'ONGOING', 'COMPLETED'] },
        departureDate: { gte: fromDate, lte: toDate },
      },
      include: {
        rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
        vehicle:   { select: { make: true, model: true, color: true } },
        participants: { select: { boardingStatus: true } },
      },
      orderBy: [{ departureDate: 'asc' }, { departureTime: 'asc' }],
    });

    return rides.map((r) => ({
      id:              r.id,
      originName:      r.originName,
      destinationName: r.destinationName,
      departureDate:   r.departureDate,
      departureTime:   r.departureTime,
      totalSeats:      r.totalSeats,
      availableSeats:  r.availableSeats,
      filledSeats:     r.totalSeats - r.availableSeats,
      fillRate:        r.totalSeats > 0 ? (r.totalSeats - r.availableSeats) / r.totalSeats : 0,
      status:          r.status,
      estimatedDistanceKm: r.estimatedDistanceKm,
      rideGiver: {
        fullName:       r.rideGiver?.user?.fullName,
        ecoLevel:       r.rideGiver?.user?.ecoLevel,
        averageRating:  r.rideGiver?.averageRating,
        totalRidesGiven: r.rideGiver?.totalRidesGiven,
      },
      vehicle: r.vehicle,
    }));
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
