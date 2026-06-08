import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
export declare class LiveTrackingService {
    private prisma;
    private redis;
    constructor(prisma: PrismaService, redis: Redis);
    storeLocation(rideId: string, gps: {
        lat: number;
        lng: number;
        speed?: number;
        timestamp: string;
    }): Promise<void>;
    getLastLocation(rideId: string): Promise<any>;
    canAccessRide(userId: string, rideId: string): Promise<boolean>;
    isRideGiver(userId: string, rideId: string): Promise<boolean>;
}
