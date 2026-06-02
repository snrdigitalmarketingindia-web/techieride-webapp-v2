import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@techieride/shared';

@Injectable()
export class RatingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async submitRating(
    raterId: string,
    dto: { rideId: string; rateeId: string; score: number; comment?: string },
  ) {
    const { rideId, rateeId, score, comment } = dto;

    // Validate score range (1–5 integers only)
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new BadRequestException('Score must be an integer between 1 and 5');
    }

    // Self-rating blocked
    if (raterId === rateeId) {
      throw new BadRequestException('You cannot rate yourself');
    }

    // Ride must exist
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        requests: {
          where: { status: { in: ['CONFIRMED', 'NO_SHOW'] } },
          select: { seekerId: true, status: true },
        },
      },
    });
    if (!ride) throw new NotFoundException('Ride not found');

    // Ride must be COMPLETED
    if (ride.status !== 'COMPLETED') {
      throw new BadRequestException(`Cannot rate a ride with status ${ride.status} — only COMPLETED rides can be rated`);
    }

    // Rater must be a participant (giver or confirmed/no-show seeker)
    const confirmedSeekerIds = ride.requests.map((r) => r.seekerId);
    const isGiver = ride.rideGiverId === raterId;
    const isSeeker = confirmedSeekerIds.includes(raterId);
    if (!isGiver && !isSeeker) {
      throw new ForbiddenException('Only ride participants can submit ratings');
    }

    // Ratee must also be a participant
    const rateeIsGiver = ride.rideGiverId === rateeId;
    const rateeIsSeeker = confirmedSeekerIds.includes(rateeId);
    if (!rateeIsGiver && !rateeIsSeeker) {
      throw new ForbiddenException('Ratee is not a participant of this ride');
    }

    // Duplicate rating blocked
    const existing = await this.prisma.rideRating.findUnique({
      where: { rideId_raterId_rateeId: { rideId, raterId, rateeId } },
    });
    if (existing) {
      throw new ConflictException('You have already rated this user for this ride');
    }

    // Create rating
    const rating = await this.prisma.rideRating.create({
      data: { rideId, raterId, rateeId, score, comment },
    });

    // Notify ratee
    const rater = await this.prisma.user.findUnique({
      where: { id: raterId },
      select: { fullName: true },
    });
    await this.notifications.create(rateeId, {
      type: NotificationType.RATING_RECEIVED,
      title: 'You received a new rating',
      body: `${rater?.fullName ?? 'Someone'} gave you ${score} star${score !== 1 ? 's' : ''}`,
      data: { ratingId: rating.id, rideId, score },
    });

    return { ratingId: rating.id, message: 'Rating submitted successfully' };
  }

  async getRideRatings(rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    return this.prisma.rideRating.findMany({
      where: { rideId },
      include: {
        rater: { select: { id: true, fullName: true } },
        ratee: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserRatingStats(userId: string) {
    const ratings = await this.prisma.rideRating.findMany({
      where: { rateeId: userId },
      select: { score: true },
    });

    if (ratings.length === 0) {
      return { averageRating: null, ratingCount: 0 };
    }

    const total = ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = Math.round((total / ratings.length) * 10) / 10;

    return { averageRating, ratingCount: ratings.length };
  }
}
