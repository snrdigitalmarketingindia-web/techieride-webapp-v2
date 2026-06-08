import { RatingsService } from './ratings.service';
declare class SubmitRatingDto {
    rideId: string;
    rateeId: string;
    score: number;
    comment?: string;
}
export declare class RatingsController {
    private ratingsService;
    constructor(ratingsService: RatingsService);
    submit(userId: string, dto: SubmitRatingDto): Promise<{
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
    getUserStats(userId: string): Promise<{
        averageRating: null;
        ratingCount: number;
    } | {
        averageRating: number;
        ratingCount: number;
    }>;
}
export {};
