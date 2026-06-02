import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class RatingsService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    submitRating(raterId: string, dto: {
        rideId: string;
        rateeId: string;
        score: number;
        comment?: string;
    }): Promise<{
        ratingId: string;
        message: string;
    }>;
    getRideRatings(rideId: string): Promise<({
        rater: {
            fullName: string;
            id: string;
        };
        ratee: {
            fullName: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        rideId: string;
        rateeId: string;
        score: number;
        comment: string | null;
        raterId: string;
    })[]>;
    getUserRatingStats(userId: string): Promise<{
        averageRating: null;
        ratingCount: number;
    } | {
        averageRating: number;
        ratingCount: number;
    }>;
}
