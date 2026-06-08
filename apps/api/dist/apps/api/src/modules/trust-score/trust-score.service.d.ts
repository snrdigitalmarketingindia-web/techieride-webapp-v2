import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrustBand } from '@techieride/shared';
export declare class TrustScoreService {
    private prisma;
    private notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    adjust(userId: string, delta: number, eventType: string, reason?: string, referenceId?: string, adminId?: string): Promise<number>;
    bandFor(score: number): TrustBand;
    private handleThresholds;
    onVerificationApproved(userId: string, type: 'EMPLOYEE' | 'DRIVER'): Promise<void>;
    onRideCompletedGiver(giverId: string, rideId: string): Promise<void>;
    onRideCompletedSeeker(seekerId: string, rideId: string): Promise<void>;
    onRatingReceived(userId: string, stars: number, ratingId: string): Promise<void>;
    onNoShowSeeker(seekerUserId: string, rideId: string): Promise<void>;
    onNoShowGiver(giverUserId: string, rideId: string): Promise<void>;
    onGiverCancelledRide(giverUserId: string, rideId: string): Promise<void>;
    onComplaintVerified(reportedUserId: string, complaintId: string): Promise<void>;
    adminAdjust(userId: string, delta: number, reason: string, adminId: string): Promise<number>;
    adminReinstate(userId: string, adminId: string): Promise<void>;
    getScore(userId: string): Promise<{
        trustScore: number;
        trustBand: import(".prisma/client").$Enums.TrustBand;
    } | null>;
    getHistory(userId: string): Promise<{
        reason: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        delta: number;
        eventType: string;
        referenceId: string | null;
        scoreAfter: number;
        adminId: string | null;
    }[]>;
    decayInactiveUsers(): Promise<void>;
    private checkMilestone;
}
