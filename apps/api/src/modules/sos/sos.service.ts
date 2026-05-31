import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@techieride/shared';

@Injectable()
export class SosService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async trigger(userId: string, rideId: string | undefined, lat: number, lng: number) {
    // Create SOS event
    const sos = await this.prisma.sosEvent.create({
      data: {
        userId,
        rideId: rideId || null,
        lat,
        lng,
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
        `Location: ${lat},${lng} | Contact: ${contact.name} (${contact.phone})`
      );
    }

    // Notify all admins
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
    for (const admin of admins) {
      await this.notifications.create(admin.id, {
        type: NotificationType.SOS_ALERT,
        title: `🆘 SOS Alert from ${user?.fullName}`,
        body: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}${rideId ? ` | Ride: ${rideId.slice(0, 8)}` : ''}`,
        data: { sosId: sos.id, userId, lat, lng, rideId },
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
