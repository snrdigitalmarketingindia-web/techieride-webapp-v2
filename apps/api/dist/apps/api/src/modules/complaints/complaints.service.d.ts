import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
export declare class ComplaintsService {
    private prisma;
    private notifications;
    private trustScore;
    constructor(prisma: PrismaService, notifications: NotificationsService, trustScore: TrustScoreService);
    fileComplaint(reporterId: string, dto: {
        reportedId: string;
        rideId?: string;
        reason: string;
        description?: string;
    }): Promise<{
        complaintId: string;
        message: string;
    }>;
    getMyComplaints(userId: string): Promise<({
        ride: {
            id: string;
            originName: string;
            destinationName: string;
            departureDate: Date;
        } | null;
        reported: {
            fullName: string;
            id: string;
        };
    } & {
        reason: import(".prisma/client").$Enums.ComplaintReason;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        description: string | null;
        rideId: string | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        reporterId: string;
        reportedId: string;
        adminNotes: string | null;
    })[]>;
    adminGetAll(filters: {
        status?: string;
        reportedId?: string;
    }): Promise<({
        ride: {
            id: string;
            originName: string;
            destinationName: string;
            departureDate: Date;
        } | null;
        reporter: {
            email: string;
            fullName: string;
            id: string;
        };
        reported: {
            email: string;
            fullName: string;
            id: string;
        };
    } & {
        reason: import(".prisma/client").$Enums.ComplaintReason;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        description: string | null;
        rideId: string | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        reporterId: string;
        reportedId: string;
        adminNotes: string | null;
    })[]>;
    adminUpdateStatus(complaintId: string, adminId: string, dto: {
        status: string;
        adminNotes?: string;
    }): Promise<{
        reason: import(".prisma/client").$Enums.ComplaintReason;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        description: string | null;
        rideId: string | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        reporterId: string;
        reportedId: string;
        adminNotes: string | null;
    }>;
}
