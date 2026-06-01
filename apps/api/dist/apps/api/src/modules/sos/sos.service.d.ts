import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class SosService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    trigger(userId: string, rideId: string | undefined, lat: number, lng: number): Promise<{
        sosId: string;
        message: string;
    }>;
    resolve(sosId: string, adminId: string, notes: string): Promise<{
        id: string;
        userId: string;
        status: import(".prisma/client").$Enums.SosStatus;
        rideId: string | null;
        lat: number;
        lng: number;
        resolvedBy: string | null;
        resolutionNotes: string | null;
        triggeredAt: Date;
        resolvedAt: Date | null;
    }>;
    getActive(): Promise<({
        user: {
            fullName: string;
            phone: string | null;
        };
        ride: {
            originName: string;
            destinationName: string;
        } | null;
    } & {
        id: string;
        userId: string;
        status: import(".prisma/client").$Enums.SosStatus;
        rideId: string | null;
        lat: number;
        lng: number;
        resolvedBy: string | null;
        resolutionNotes: string | null;
        triggeredAt: Date;
        resolvedAt: Date | null;
    })[]>;
}
