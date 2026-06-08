import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
export declare class RatingsService {
    private prisma;
    private notifications;
    private trustScore;
    constructor(prisma: PrismaService, notifications: NotificationsService, trustScore: TrustScoreService);
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
        raterId: string;
        rateeId: string;
        score: number;
        comment: string | null;
    })[]>;
    getUserRatingStats(userId: string): Promise<{
        averageRating: null;
        ratingCount: number;
    } | {
        averageRating: number;
        ratingCount: number;
    }>;
}
