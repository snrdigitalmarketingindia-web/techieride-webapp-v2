import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
export declare class GamificationService {
    private prisma;
    private redis;
    constructor(prisma: PrismaService, redis: Redis);
    awardRideCompletion(seekerOrGiverId: string, rideId: string, role: 'giver' | 'seeker', distanceKm: number, passengers: number): Promise<void>;
    addPoints(userId: string, points: number, eventType: string, rideId?: string, co2SavedG?: number): Promise<void>;
    recalculateLevel(userId: string): Promise<void>;
    getSummary(userId: string): Promise<{
        totalPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel | undefined;
        co2SavedKg: string;
        pointsHistory: {
            id: string;
            createdAt: Date;
            userId: string;
            eventType: string;
            points: number;
            rideId: string | null;
            co2SavedG: number;
        }[];
    }>;
    getLeaderboard(period?: 'monthly' | 'alltime', limit?: number): Promise<any>;
}
