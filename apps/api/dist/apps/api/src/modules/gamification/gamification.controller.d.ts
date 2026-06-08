import { GamificationService } from './gamification.service';
export declare class GamificationController {
    private service;
    constructor(service: GamificationService);
    getSummary(userId: string): Promise<{
        totalPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel | undefined;
        co2SavedKg: string;
        pointsHistory: {
            id: string;
            createdAt: Date;
            userId: string;
            eventType: string;
            rideId: string | null;
            points: number;
            co2SavedG: number;
        }[];
    }>;
    getLeaderboard(period?: 'monthly' | 'alltime', limit?: number): Promise<any>;
}
