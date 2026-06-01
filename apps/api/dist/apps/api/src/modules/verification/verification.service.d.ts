import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
export declare class VerificationService {
    private prisma;
    private notifications;
    private email;
    constructor(prisma: PrismaService, notifications: NotificationsService, email: EmailService);
    submitEmployeeDocs(userId: string, docs: {
        employeeIdUrl: string;
        profilePhotoUrl?: string;
    }): Promise<{
        message: string;
    }>;
    submitDriverDocs(userId: string, docs: {
        drivingLicenseUrl: string;
        rcUrl: string;
    }): Promise<{
        message: string;
    }>;
    getStatus(userId: string): Promise<{
        employee: {
            status: import(".prisma/client").$Enums.VerificationStatus;
            rejectionReason: string | null;
            submittedAt: Date;
        } | null;
        driver: {
            status: import(".prisma/client").$Enums.VerificationStatus;
            rejectionReason: string | null;
            submittedAt: Date;
        } | null;
        exception: {
            status: import(".prisma/client").$Enums.VerificationStatus;
            rejectionReason: string | null;
            submittedAt: Date;
        } | null;
    }>;
    review(requestId: string, adminId: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<{
        status: "REJECTED" | "APPROVED";
        trid: string | undefined;
        accountStatus: "EMPLOYEE_VERIFIED" | "DRIVER_VERIFIED" | "REJECTED";
    }>;
    getQueue(verificationType: 'EMPLOYEE' | 'DRIVER' | 'EXCEPTION'): Promise<({
        user: {
            email: string;
            fullName: string;
            companyName: string | null;
            phone: string | null;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
        };
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        verificationType: import(".prisma/client").$Enums.VerificationType;
        employeeIdUrl: string | null;
        profilePhotoUrl: string | null;
        drivingLicenseUrl: string | null;
        rcUrl: string | null;
        exceptionReason: string | null;
        status: import(".prisma/client").$Enums.VerificationStatus;
        rejectionReason: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        submittedAt: Date;
    })[]>;
    getPendingQueue(): Promise<({
        user: {
            email: string;
            fullName: string;
            companyName: string | null;
            phone: string | null;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
        };
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        verificationType: import(".prisma/client").$Enums.VerificationType;
        employeeIdUrl: string | null;
        profilePhotoUrl: string | null;
        drivingLicenseUrl: string | null;
        rcUrl: string | null;
        exceptionReason: string | null;
        status: import(".prisma/client").$Enums.VerificationStatus;
        rejectionReason: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        submittedAt: Date;
    })[]>;
}
