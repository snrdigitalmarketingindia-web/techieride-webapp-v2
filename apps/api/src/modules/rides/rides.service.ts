import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { RideStatus, NotificationType } from '@techieride/shared';

// ── Safe user select — includes phone for direct calling, excludes sensitive fields
const GIVER_USER_SELECT = {
  id: true, fullName: true, profilePhoto: true,
  companyName: true, ecoLevel: true,
  phone: true, countryCode: true,
  trustScore: true, trustBand: true,
} as const;

const SEEKER_USER_SELECT = {
  id: true, fullName: true, profilePhoto: true,
  companyName: true,
  phone: true, countryCode: true,
} as const;
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { AuditLogService } from '../audit-log/audit-log.service';

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

// Auto-archive PUBLISHED/ONGOING rides 4 hours after departure — hides from active list, never cancels
const ARCHIVE_AFTER_HOURS = 4;
const DRAFT_EXPIRY_DAYS = 3; // Auto-delete DRAFT rides older than 3 days (never published)
// Auto-force-complete ONGOING rides 5 hours after departure — giver forgot to close the ride
const AUTO_COMPLETE_AFTER_HOURS = 5;

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private notifications: NotificationsService,
    private email: EmailService,
    private trustScore: TrustScoreService,
    private auditLog: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateRideDto) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException('You must be a Ride Giver to create rides');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, rideGiverId: giver.id, isActive: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const estimatedDistanceKm = (dto.originLat && dto.originLng && dto.destinationLat && dto.destinationLng)
      ? Math.round(haversineMeters(dto.originLat, dto.originLng, dto.destinationLat, dto.destinationLng)) / 1000
      : null;

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
        womenOnly: dto.womenOnly ?? false,
        status: RideStatus.DRAFT,
        ...(estimatedDistanceKm !== null ? { estimatedDistanceKm } : {}),
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

    // Enforce: departure must be at least 15 minutes from now
    const [dh, dm] = ride.departureTime.split(':').map(Number);
    const departureAt = new Date(ride.departureDate);
    departureAt.setHours(dh, dm, 0, 0);
    const fifteenMinFromNow = new Date(Date.now() + 15 * 60 * 1000);
    if (departureAt < fifteenMinFromNow) {
      throw new BadRequestException('Departure time must be at least 15 minutes from now');
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

    // Block if giver has an active booking as seeker (PENDING or CONFIRMED)
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (seeker) {
      const activeRequest = await this.prisma.rideRequest.findFirst({
        where: { seekerId: seeker.id, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      if (activeRequest) {
        throw new BadRequestException('You have an active ride booking as a passenger. Complete or cancel it before offering a ride.');
      }
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
    if (ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('You can only board an ongoing ride');
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

    if (allBoarded && ride.status === RideStatus.ONGOING) {
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
      data: { boardingStatus: 'DEBOARDED', deboardedAt: new Date() },
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

    const [updated] = await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.COMPLETED, completedAt: new Date() },
      }),
      // Mark CONFIRMED requests as COMPLETED so seekers are freed to request new rides
      this.prisma.rideRequest.updateMany({
        where: { rideId, status: 'CONFIRMED' },
        data: { status: 'COMPLETED' },
      }),
      // Reject any still-PENDING requests
      this.prisma.rideRequest.updateMany({
        where: { rideId, status: 'PENDING' },
        data: { status: 'REJECTED', cancelReason: 'Ride has been completed' },
      }),
    ]);

    // Award ECO + Trust points
    // Only award seekers who actually boarded and deboarded — NO_SHOW passengers didn't ride
    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId },
      include: { seeker: { include: { user: true } } },
    });
    const boardedParticipants = participants.filter(p => p.boardingStatus === 'DEBOARDED');

    // Fall back to haversine if estimatedDistanceKm was never stored (older rides)
    const distanceKm = ride.estimatedDistanceKm
      || ((ride.originLat && ride.originLng && ride.destinationLat && ride.destinationLng)
          ? Math.round(haversineMeters(ride.originLat, ride.originLng, ride.destinationLat, ride.destinationLng)) / 1000
          : 0);

    // Giver points: isolate so a failure doesn't block seeker awards
    try {
      await this.gamification.awardRideCompletion(
        ride.rideGiverId,
        rideId,
        'giver',
        distanceKm,
        boardedParticipants.length,
      );
      await this.trustScore.onRideCompletedGiver(ride.rideGiverId, rideId);
    } catch (e: any) {
      this.logger.error(`Gamification/trust failed for giver ${ride.rideGiverId}: ${e.message}`);
    }

    for (const p of boardedParticipants) {
      try {
        await this.gamification.awardRideCompletion(
          p.seekerId,
          rideId,
          'seeker',
          distanceKm,
          1,
        );
        await this.trustScore.onRideCompletedSeeker(p.seekerId, rideId);
      } catch (e: any) {
        this.logger.error(`Gamification/trust failed for seeker ${p.seekerId}: ${e.message}`);
      }
      await this.notifications.create(p.seeker.userId, {
        type: NotificationType.RIDE_COMPLETED,
        title: 'Ride completed! Rate your experience',
        body: `How was your ride on ${ride.originName} → ${ride.destinationName}?`,
        data: { rideId },
      });
    }

    // Notify no-show passengers separately (they didn't ride, so no rating prompt)
    for (const p of participants.filter(p => p.boardingStatus === 'NO_SHOW')) {
      await this.notifications.create(p.seeker.userId, {
        type: NotificationType.RIDE_COMPLETED,
        title: 'Ride completed',
        body: `The ride on ${ride.originName} → ${ride.destinationName} has ended.`,
        data: { rideId },
      });
    }

    // Notify giver that their ride is completed
    const giverUser = await this.prisma.rideGiver.findUnique({ where: { id: ride.rideGiverId } });
    if (giverUser) {
      await this.notifications.create(giverUser.userId, {
        type: NotificationType.RIDE_COMPLETED,
        title: 'Ride completed! ✅',
        body: `${ride.originName} → ${ride.destinationName} has been completed.`,
        data: { rideId },
      });
    }

    return updated;
  }

  // ── Force-complete a ride (admin or auto-cron) ───────────────────────────
  // Marks unresolved passengers as NO_SHOW, then completes the ride.
  // Used by admin "Force Complete" action and auto-complete cron.
  async forceCompleteRide(rideId: string, triggeredBy: 'admin' | 'cron' = 'admin') {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: { include: { seeker: { include: { user: true } } } },
        rideGiver: true,
      },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('Only ONGOING rides can be force-completed');
    }

    // Mark WAITING participants as NO_SHOW, BOARDED as DEBOARDED
    const now = new Date();
    for (const p of ride.participants) {
      if (p.boardingStatus === 'WAITING') {
        await this.prisma.rideParticipant.update({
          where: { id: p.id },
          data: { boardingStatus: 'NO_SHOW' },
        });
      } else if (p.boardingStatus === 'BOARDED') {
        await this.prisma.rideParticipant.update({
          where: { id: p.id },
          data: { boardingStatus: 'DEBOARDED', deboardedAt: now },
        });
      }
    }

    // Complete the ride and settle requests
    await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.COMPLETED, completedAt: now, archivedAt: now },
      }),
      this.prisma.rideRequest.updateMany({
        where: { rideId, status: 'CONFIRMED' },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.rideRequest.updateMany({
        where: { rideId, status: 'PENDING' },
        data: { status: 'REJECTED', cancelReason: 'Ride auto-completed by system' },
      }),
    ]);

    // Award points only for participants who actually boarded (DEBOARDED after force-complete)
    const distanceKm = ride.estimatedDistanceKm
      || ((ride.originLat && ride.originLng && ride.destinationLat && ride.destinationLng)
          ? Math.round(haversineMeters(ride.originLat, ride.originLng, ride.destinationLat, ride.destinationLng)) / 1000
          : 0);

    const resolvedParticipants = await this.prisma.rideParticipant.findMany({
      where: { rideId },
      include: { seeker: { include: { user: true } } },
    });
    const boardedParticipants = resolvedParticipants.filter(p => p.boardingStatus === 'DEBOARDED');

    try {
      await this.gamification.awardRideCompletion(ride.rideGiverId, rideId, 'giver', distanceKm, boardedParticipants.length);
      await this.trustScore.onRideCompletedGiver(ride.rideGiverId, rideId);
    } catch (e: any) {
      this.logger.error(`Force-complete gamification failed for giver ${ride.rideGiverId}: ${e.message}`);
    }

    for (const p of boardedParticipants) {
      try {
        await this.gamification.awardRideCompletion(p.seekerId, rideId, 'seeker', distanceKm, 1);
        await this.trustScore.onRideCompletedSeeker(p.seekerId, rideId);
      } catch (e: any) {
        this.logger.error(`Force-complete gamification failed for seeker ${p.seekerId}: ${e.message}`);
      }
    }

    // Notify all participants
    const label = triggeredBy === 'cron' ? 'auto-closed by system' : 'closed by admin';
    for (const p of resolvedParticipants) {
      const wasNoShow = p.boardingStatus === 'NO_SHOW';
      await this.notifications.create(p.seeker.userId, {
        type: NotificationType.RIDE_COMPLETED,
        title: wasNoShow ? 'Ride ended' : 'Ride completed',
        body: wasNoShow
          ? `The ride on ${ride.originName} → ${ride.destinationName} has ended (${label}).`
          : `Your ride on ${ride.originName} → ${ride.destinationName} has been completed (${label}).`,
        data: { rideId },
      });
    }
    if (ride.rideGiver) {
      await this.notifications.create(ride.rideGiver.userId, {
        type: NotificationType.RIDE_COMPLETED,
        title: triggeredBy === 'cron' ? '🔒 Ride auto-completed' : '🔒 Ride closed by admin',
        body: `${ride.originName} → ${ride.destinationName} has been ${label}.`,
        data: { rideId },
      });
    }

    await this.auditLog.system('RIDE_FORCE_COMPLETED', 'ride', rideId, {
      triggeredBy,
      participantsResolved: resolvedParticipants.length,
    });

    this.logger.log(`✅ Force-completed ride ${rideId} (${label})`);
    return { message: 'Ride force-completed', rideId };
  }

  // Runs every 30 min — auto-force-completes ONGOING rides 5+ hours past departure time.
  @Cron('*/30 * * * *', { timeZone: 'Asia/Kolkata' })
  async autoCompleteStuckRides() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - AUTO_COMPLETE_AFTER_HOURS * 60 * 60 * 1000);

    const stuckRides = await this.prisma.ride.findMany({
      where: { status: RideStatus.ONGOING, departureDate: { lte: cutoff } },
      select: { id: true, departureDate: true, departureTime: true, originName: true, destinationName: true },
    });

    // Filter by actual departure datetime (departureDate is date-only, departureTime is "HH:MM")
    const toComplete = stuckRides.filter((ride) => {
      const [h, m] = ride.departureTime.split(':').map(Number);
      const departure = new Date(ride.departureDate);
      departure.setHours(h, m, 0, 0);
      return now.getTime() - departure.getTime() >= AUTO_COMPLETE_AFTER_HOURS * 60 * 60 * 1000;
    });

    if (toComplete.length === 0) return;
    this.logger.log(`⏱️ Auto-completing ${toComplete.length} stuck ONGOING ride(s)`);

    for (const ride of toComplete) {
      try {
        await this.forceCompleteRide(ride.id, 'cron');
      } catch (e: any) {
        this.logger.error(`Auto-complete failed for ride ${ride.id}: ${e.message}`);
      }
    }
  }

  // Runs every 30 min — auto-archives rides that are 4+ hours past their departure time.
  // Does NOT cancel or change ride status — just sets archivedAt so they drop off the active list.
  // Giver and seekers can still see them under history.
  @Cron('*/30 * * * *', { timeZone: 'Asia/Kolkata' })
  async autoArchiveOldRides() {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - ARCHIVE_AFTER_HOURS * 60 * 60 * 1000);

    // Find PUBLISHED or ONGOING rides whose departure was more than 4 hours ago, not yet archived
    const staleRides = await this.prisma.ride.findMany({
      where: {
        status: { in: [RideStatus.PUBLISHED, RideStatus.ONGOING] },
        archivedAt: null,
        departureDate: { lte: cutoffTime },
      },
      select: { id: true, departureDate: true, departureTime: true, originName: true, destinationName: true },
    });

    // Further filter by actual departure datetime (departureDate is date-only, departureTime is "HH:MM")
    const toArchive = staleRides.filter((ride) => {
      const [h, m] = ride.departureTime.split(':').map(Number);
      const departure = new Date(ride.departureDate);
      departure.setHours(h, m, 0, 0);
      return now.getTime() - departure.getTime() >= ARCHIVE_AFTER_HOURS * 60 * 60 * 1000;
    });

    if (toArchive.length === 0) return;
    this.logger.log(`📦 Auto-archiving ${toArchive.length} ride(s) — 4h past departure`);

    const archiveIds = toArchive.map((r) => r.id);

    await this.prisma.ride.updateMany({
      where: { id: { in: archiveIds } },
      data: { archivedAt: now },
    });

    // Fix #2: Immediately expire any PENDING requests on archived rides so seekers
    // aren't left waiting for a response that will never come
    const stalePending = await this.prisma.rideRequest.findMany({
      where: { rideId: { in: archiveIds }, status: 'PENDING' },
      include: { seeker: { include: { user: true } }, ride: true },
    });

    for (const req of stalePending) {
      await this.prisma.rideRequest.update({
        where: { id: req.id },
        data: { status: 'REJECTED', cancelReason: 'Ride archived — request auto-expired' },
      });
      if (req.seeker?.userId) {
        await this.notifications.create(req.seeker.userId, {
          type: NotificationType.REQUEST_REJECTED,
          title: 'Ride request expired',
          body: `Your request for ${req.ride.originName} → ${req.ride.destinationName} has expired as the ride has passed.`,
          data: { rideId: req.rideId, requestId: req.id },
        });
      }
    }

    // Audit log for traceability
    for (const ride of toArchive) {
      await this.auditLog.system('RIDE_AUTO_ARCHIVED', 'ride', ride.id, {
        reason: `Ride archived — ${ARCHIVE_AFTER_HOURS}h past departure`,
        departureTime: ride.departureTime,
        origin: ride.originName,
        destination: ride.destinationName,
      });
    }
  }

  // Runs daily at midnight IST — cleans up DRAFT rides older than 3 days (never published)
  @Cron('0 0 * * *', { timeZone: 'Asia/Kolkata' })
  async cleanupStaleDrafts() {
    const cutoff = new Date(Date.now() - DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.prisma.ride.deleteMany({
      where: {
        status: RideStatus.DRAFT,
        createdAt: { lt: cutoff },
      },
    });
    if (result.count > 0) {
      this.logger.log(`🗑️ Cleaned up ${result.count} stale DRAFT ride(s) older than ${DRAFT_EXPIRY_DAYS} days`);
    }
  }

  // Runs every 30 min — sends departure reminder 60 min before departure
  @Cron('*/30 * * * *', { timeZone: 'Asia/Kolkata' })
  async sendDepartureReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);  // 55 min from now
    const windowEnd   = new Date(now.getTime() + 65 * 60 * 1000);  // 65 min from now

    const rides = await this.prisma.ride.findMany({
      where: { status: RideStatus.PUBLISHED },
      include: {
        rideGiver: { include: { user: true } },
        participants: { include: { seeker: { include: { user: true } } } },
      },
    });

    for (const ride of rides) {
      const [h, m] = ride.departureTime.split(':').map(Number);
      const departure = new Date(ride.departureDate);
      departure.setHours(h, m, 0, 0);

      if (departure < windowStart || departure > windowEnd) continue;

      const label = `${ride.originName} → ${ride.destinationName} at ${ride.departureTime}`;

      // Notify giver
      await this.notifications.create(ride.rideGiver.userId, {
        type: NotificationType.RIDE_STARTED,
        title: '⏰ Departure in 1 hour',
        body: `Your ride ${label} departs soon. Make sure you're ready!`,
        data: { rideId: ride.id },
      });

      // Notify confirmed seekers (participants)
      for (const p of ride.participants) {
        await this.notifications.create(p.seeker.userId, {
          type: NotificationType.RIDE_STARTED,
          title: '⏰ Your ride departs in 1 hour',
          body: `${label} — be at your pickup point on time.`,
          data: { rideId: ride.id },
        });
      }

      this.logger.log(`⏰ Sent departure reminder for ride ${ride.id}`);
    }
  }

  // Emergency abort for an ONGOING ride — marks all WAITING/BOARDED participants as NO_SHOW,
  // increments seats back, sets ride to CANCELLED, and notifies all confirmed passengers.
  async abort(rideId: string, userId: string, reason: string) {
    if (!reason?.trim()) {
      throw new BadRequestException('Abort reason is required and cannot be empty');
    }

    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    const user  = await this.prisma.user.findUnique({ where: { id: userId } });
    const ride  = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    const isOwner = giver && ride.rideGiverId === giver.id;
    const isAdmin = user?.role === 'ADMIN';
    if (!isOwner && !isAdmin) throw new ForbiddenException();

    if (ride.status !== RideStatus.ONGOING) {
      throw new BadRequestException('Only ONGOING rides can be aborted. Use cancel for PUBLISHED rides.');
    }

    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId },
      include: { seeker: { include: { user: true } } },
    });

    // Mark unresolved participants as NO_SHOW so seats are freed
    for (const p of participants) {
      if (p.boardingStatus === 'WAITING' || p.boardingStatus === 'BOARDED') {
        await this.prisma.$transaction([
          this.prisma.rideParticipant.update({
            where: { id: p.id },
            data: { boardingStatus: 'NO_SHOW' },
          }),
          this.prisma.rideRequest.updateMany({
            where: { rideId, seekerId: p.seekerId, status: 'CONFIRMED' },
            data: { status: 'CANCELLED', cancelReason: reason || 'Ride aborted by giver' },
          }),
        ]);
      }
    }

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
    });

    // Deduct trust score — mid-route abort is worse than a pre-departure cancel
    if (isOwner) {
      await this.trustScore.onGiverCancelledRide(userId, rideId);
    }

    // Notify all confirmed passengers
    for (const p of participants) {
      await this.notifications.create(p.seeker.userId, {
        type: NotificationType.RIDE_CANCELLED,
        title: 'Ride aborted mid-route ⚠️',
        body: `Your ride on ${ride.originName} → ${ride.destinationName} was stopped${reason ? `: ${reason}` : ''}. Sorry for the inconvenience.`,
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

    if ([RideStatus.COMPLETED, RideStatus.CANCELLED, RideStatus.ONGOING].includes(ride.status as RideStatus)) {
      throw new BadRequestException(`Cannot cancel a ${ride.status} ride`);
    }

    // Block cancellation only if a seeker's request has been CONFIRMED (accepted) by the giver.
    // PENDING requests do NOT block — the giver hasn't committed to those seekers yet.
    if (!isAdmin) {
      const confirmedBooking = await this.prisma.rideRequest.findFirst({
        where: { rideId, status: 'CONFIRMED' },
      });
      if (confirmedBooking) {
        throw new BadRequestException(
          'This ride cannot be cancelled because one or more passengers have confirmed seats. ' +
          'Please contact admin for assistance.',
        );
      }
    }

    // Find all active (CONFIRMED + PENDING) requesters before cancelling so we can notify them
    const confirmedParticipants = await this.prisma.rideRequest.findMany({
      where: { rideId, status: { in: ['CONFIRMED', 'PENDING'] } },
      include: { seeker: { include: { user: { select: { email: true, personalEmail: true, fullName: true } } } } },
    });

    // Cancel all active requests
    await this.prisma.rideRequest.updateMany({
      where: { rideId, status: { in: ['PENDING', 'CONFIRMED'] } },
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

    // Deduct trust score when giver cancels a PUBLISHED ride
    if (isOwner && ride.status === RideStatus.PUBLISHED) {
      await this.trustScore.onGiverCancelledRide(userId, rideId);
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
    await this.trustScore.onNoShowSeeker(seeker.userId, rideId);

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

    // Must be more than 15 minutes before departure (same threshold as publish)
    const departureDateTime = new Date(`${ride.departureDate.toISOString().split('T')[0]}T${ride.departureTime}:00`);
    const fifteenMinBefore = new Date(departureDateTime.getTime() - 15 * 60 * 1000);
    if (new Date() > fifteenMinBefore) {
      throw new BadRequestException('Rides can only be edited up to 15 minutes before departure');
    }

    // No active seekers allowed
    const activeSeekersCount = await this.prisma.rideRequest.count({
      where: { rideId, status: { in: ['PENDING', 'CONFIRMED'] } },
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
        ...(updates.totalSeats && { totalSeats: updates.totalSeats, availableSeats: updates.totalSeats }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      },
    });
  }

  async search(dto: SearchRidesDto) {
    // Determine if requester is FEMALE to decide whether to show womenOnly rides
    let requesterGender: string | null = null;
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { gender: true } });
      requesterGender = user?.gender ?? null;
    }

    const genderFilter = requesterGender !== 'FEMALE' ? { womenOnly: false } : {};

    // PUBLISHED rides: apply date window filter (departure day must match search date)
    const publishedRides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.PUBLISHED,
        departureDate: {
          gte: new Date(dto.date),
          lt: new Date(new Date(dto.date).getTime() + 86400000),
        },
        availableSeats: { gt: 0 },
        archivedAt: null,
        ...genderFilter,
      },
      include: {
        rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
        vehicle: true,
      },
    });

    // ONGOING rides: bypass date filter — ride is already in progress, departure date is irrelevant.
    // Seeker boards mid-route so origin distance is also irrelevant — only include, let seeker decide.
    const ongoingRides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.ONGOING,
        availableSeats: { gt: 0 },
        archivedAt: null,
        ...genderFilter,
      },
      include: {
        rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
        vehicle: true,
      },
    });

    const originLat = Number(dto.originLat) || 0;
    const originLng = Number(dto.originLng) || 0;
    const destLat   = Number(dto.destinationLat) || 0;
    const destLng   = Number(dto.destinationLng) || 0;
    const hasCoords = originLat !== 0 || originLng !== 0 || destLat !== 0 || destLng !== 0;

    const radius = dto.radiusMeters ?? 10_000; // default 10 km

    const withDistances = (rides: typeof publishedRides, skipOriginFilter = false) =>
      rides
        .map((ride) => {
          const distFromOrigin = haversineMeters(originLat, originLng, ride.originLat, ride.originLng);
          const distFromDest   = haversineMeters(destLat,   destLng,   ride.destinationLat, ride.destinationLng);
          return { ...ride, distanceFromOriginM: Math.round(distFromOrigin), distanceFromDestinationM: Math.round(distFromDest) };
        })
        .filter((r) => {
          if (!hasCoords) return true; // no coordinates provided — return all (used in tests / admin views)
          if (skipOriginFilter) return r.distanceFromDestinationM <= radius; // ONGOING: only destination proximity matters
          return r.distanceFromOriginM <= radius && r.distanceFromDestinationM <= radius;
        });

    const results = [
      ...withDistances(publishedRides, false),
      ...withDistances(ongoingRides, true),
    ];

    return results
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
          include: {
            seeker: { include: { user: { select: SEEKER_USER_SELECT } } },
            request: { select: { pickupLat: true, pickupLng: true, pickupName: true } },
          },
        },
      },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  async getGivenRides(userId: string, status?: string, includeHistory = false) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) return [];
    return this.prisma.ride.findMany({
      where: {
        rideGiverId: giver.id,
        ...(status ? { status: status as RideStatus } : {}),
        // Active list: only show PUBLISHED/ONGOING (no DRAFT/CANCELLED/COMPLETED clutter).
        // History view shows all rides including archived and completed.
        ...(!includeHistory && !status ? { status: { in: [RideStatus.PUBLISHED, RideStatus.ONGOING] } } : {}),
        ...(!includeHistory ? { archivedAt: null } : {}),
      },
      include: {
        vehicle: true,
        participants: {
          include: {
            seeker: { include: { user: { select: SEEKER_USER_SELECT } } },
            request: { select: { pickupLat: true, pickupLng: true, pickupName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ departureDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getTakenRides(userId: string) {
    const seeker = await this.prisma.rideSeeker.findUnique({ where: { userId } });
    if (!seeker) return [];
    const participants = await this.prisma.rideParticipant.findMany({
      where: { seekerId: seeker.id },
      include: {
        ride: {
          include: {
            rideGiver: { include: { user: { select: GIVER_USER_SELECT } } },
            vehicle: true,
            participants: {
              include: {
                seeker: { include: { user: { select: SEEKER_USER_SELECT } } },
                request: { select: { pickupLat: true, pickupLng: true, pickupName: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: [{ ride: { departureDate: 'desc' } }, { ride: { createdAt: 'desc' } }],
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
