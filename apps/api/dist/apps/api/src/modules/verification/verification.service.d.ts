import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
export declare class VerificationService {
    private prisma;
    private notifications;
    private email;
    constructor(prisma: PrismaService, notifications: NotificationsService, email: EmailService);
    submitDocuments(userId: string, docs: {
        employeeIdUrl?: string;
        drivingLicenseUrl?: string;
        rcUrl?: string;
    }): Promise<{
        requestId: string;
        status: string;
    }>;
    getStatus(userId: string): Promise<{
        status: string;
        rejectionReason?: undefined;
        submittedAt?: undefined;
    } | {
        status: import(".prisma/client").$Enums.VerificationStatus;
        rejectionReason: string | null;
        submittedAt: Date;
    }>;
    review(requestId: string, adminId: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<{
        status: "APPROVED" | "REJECTED";
        trid: string | undefined;
    }>;
    getPendingQueue(): Promise<({
        user: {
            email: string;
            fullName: string;
            phone: string | null;
        };
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        drivingLicenseUrl: string | null;
        rcUrl: string | null;
        status: import(".prisma/client").$Enums.VerificationStatus;
        employeeIdUrl: string | null;
        rejectionReason: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        submittedAt: Date;
    })[]>;
}
