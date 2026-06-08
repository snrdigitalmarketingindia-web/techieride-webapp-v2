import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@techieride/shared';

// Pre-defined messages — no free text allowed
export const QUICK_MESSAGES: Record<string, { text: string; role: 'giver' | 'seeker' | 'both' }> = {
  // Giver → Seekers
  ARRIVED_AT_START:   { text: '🚗 I\'ve arrived at the starting point',         role: 'giver' },
  ON_MY_WAY:          { text: '⏱ On my way, arriving in 5 min',                  role: 'giver' },
  LOOK_FOR_MY_CAR:    { text: '🅿️ I\'m at the pickup area — look for my car',    role: 'giver' },
  CALL_ME_GIVER:      { text: '📞 Can\'t find you — please call me',              role: 'giver' },
  LEAVING_SOON:       { text: '⚠️ Leaving in 2 min — please hurry',              role: 'giver' },
  // Seeker → Giver
  AT_PICKUP:          { text: '📍 I\'m at the pickup point',                      role: 'seeker' },
  RUNNING_LATE:       { text: '🙏 Running late, please wait 5 min',               role: 'seeker' },
  CAN_SEE_CAR:        { text: '✅ I can see your car — coming now',               role: 'seeker' },
  CALL_ME_SEEKER:     { text: '📞 Can\'t find you — please call me',              role: 'seeker' },
  ALMOST_THERE:       { text: '🏃 Almost there, 1 min away',                      role: 'seeker' },
};

@Injectable()
export class QuickMessagesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async send(senderId: string, rideId: string, messageKey: string, customText?: string) {
    // Allow free-text custom messages under the special 'CUSTOM' key
    let msgText: string;
    let msgRole: 'giver' | 'seeker' | 'both';

    if (messageKey === 'CUSTOM') {
      if (!customText || customText.trim().length === 0) {
        throw new BadRequestException('Custom message text cannot be empty');
      }
      if (customText.trim().length > 300) {
        throw new BadRequestException('Custom message cannot exceed 300 characters');
      }
      msgText = `✏️ ${customText.trim()}`;
      msgRole = 'both'; // role validated below via ride membership check
    } else {
      const msg = QUICK_MESSAGES[messageKey];
      if (!msg) throw new BadRequestException(`Invalid message key: ${messageKey}`);
      msgText = msg.text;
      msgRole = msg.role;
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        rideGiver: true,
        participants: { include: { seeker: { include: { user: true } } } },
        requests: { where: { status: 'CONFIRMED' }, include: { seeker: { include: { user: true } } } },
      },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    if (!['PUBLISHED', 'ONGOING'].includes(ride.status)) {
      throw new BadRequestException('Quick messages only available on active rides');
    }

    const isGiver = ride.rideGiver.userId === senderId;
    const confirmedSeekerUserIds = ride.requests.map((r: any) => r.seeker.userId);
    const isSeeker = confirmedSeekerUserIds.includes(senderId);

    if (!isGiver && !isSeeker) {
      throw new ForbiddenException('Only the giver or confirmed seekers can send quick messages');
    }

    // Role check (skip for CUSTOM — any ride member can send)
    if (msgRole === 'giver' && !isGiver) throw new ForbiddenException('This message is for the ride giver only');
    if (msgRole === 'seeker' && !isSeeker) throw new ForbiddenException('This message is for seekers only');

    const senderUser = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true },
    });
    const senderName = senderUser?.fullName?.split(' ')[0] ?? 'Someone';
    const rideLabel = `${ride.originName} → ${ride.destinationName}`;

    if (isGiver) {
      // Giver → all confirmed seekers
      for (const seekerUserId of confirmedSeekerUserIds) {
        await this.notifications.create(seekerUserId, {
          type: NotificationType.QUICK_MESSAGE,
          title: `${senderName} says:`,
          body: `${msgText}  —  ${rideLabel}`,
          data: { rideId, messageKey },
        });
      }
    } else {
      // Seeker → giver
      await this.notifications.create(ride.rideGiver.userId, {
        type: NotificationType.QUICK_MESSAGE,
        title: `${senderName} says:`,
        body: `${msgText}  —  ${rideLabel}`,
        data: { rideId, messageKey },
      });
    }

    return { sent: true, message: msgText };
  }
}
