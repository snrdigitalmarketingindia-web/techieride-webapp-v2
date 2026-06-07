import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@techieride/shared';

const SOS_COOLDOWN_SECONDS = 60;

@Injectable()
export class SosService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async trigger(
    userId: string,
    rideId: string | undefined,
    lat: number | undefined,
    lng: number | undefined,
  ) {
    // 60-second cooldown — check last SOS by this user
    const lastSos = await this.prisma.sosEvent.findFirst({
      where: { userId },
      orderBy: { triggeredAt: 'desc' },
    });
    if (lastSos) {
      const secondsSinceLast = (Date.now() - lastSos.triggeredAt.getTime()) / 1000;
      if (secondsSinceLast < SOS_COOLDOWN_SECONDS) {
        throw new HttpException(
          `SOS cooldown active — please wait ${Math.ceil(SOS_COOLDOWN_SECONDS - secondsSinceLast)} more second(s)`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // If a rideId is provided, validate ride state and participation
    if (rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          rideGiver: { select: { userId: true } },
          requests: {
            where: { status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } },
            include: { seeker: { select: { userId: true } } },
          },
        },
      });

      if (!ride) {
        throw new BadRequestException('Ride not found');
      }

      // Ride must be ONGOING to trigger SOS with a rideId
      if (ride.status !== 'ONGOING') {
        throw new BadRequestException(
          `SOS can only be triggered during an ONGOING ride (current status: ${ride.status})`,
        );
      }

      // Compare against User.id (not RideGiver.id / RideSeeker.id)
      const isGiver = ride.rideGiver.userId === userId;
      const isSeeker = ride.requests.some((r) => r.seeker?.userId === userId);
      if (!isGiver && !isSeeker) {
        throw new ForbiddenException('You are not a participant of this ride');
      }
    }

    // Create SOS event
    const sos = await this.prisma.sosEvent.create({
      data: {
        userId,
        rideId: rideId ?? null,
        lat: lat ?? 0,
        lng: lng ?? 0,
        status: 'TRIGGERED',
      },
    });

    // Notify emergency contacts
    const contacts = await this.prisma.emergencyContact.findMany({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    for (const contact of contacts) {
      // In production: send SMS + email to contact.phone
      console.log(
        `🆘 SOS ALERT — ${user?.fullName} needs help! ` +
        `Location: ${lat ?? 'unknown'},${lng ?? 'unknown'} | Contact: ${contact.name} (${contact.phone})`,
      );
    }

    // Notify all admins
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
    const locationStr =
      lat != null && lng != null
        ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        : 'Location unavailable';

    for (const admin of admins) {
      await this.notifications.create(admin.id, {
        type: NotificationType.SOS_ALERT,
        title: `🆘 SOS Alert from ${user?.fullName}`,
        body: `Location: ${locationStr}${rideId ? ` | Ride: ${rideId.slice(0, 8)}` : ''}`,
        data: { sosId: sos.id, userId, lat: lat ?? null, lng: lng ?? null, rideId: rideId ?? null },
      });
    }

    return {
      sosId: sos.id,
      message: `Emergency contacts notified. ${contacts.length} contact(s) alerted.`,
    };
  }

  async resolve(sosId: string, adminId: string, notes: string) {
    return this.prisma.sosEvent.update({
      where: { id: sosId },
      data: {
        status: 'RESOLVED',
        resolvedBy: adminId,
        resolutionNotes: notes,
        resolvedAt: new Date(),
      },
    });
  }

  async getActive() {
    return this.prisma.sosEvent.findMany({
      where: { status: { in: ['TRIGGERED', 'ACKNOWLEDGED'] } },
      include: {
        user: { select: { fullName: true, phone: true } },
        ride: { select: { originName: true, destinationName: true } },
      },
      orderBy: { triggeredAt: 'desc' },
    });
  }
}
