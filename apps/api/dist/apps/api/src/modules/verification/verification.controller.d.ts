import { VerificationService } from './verification.service';
export declare class VerificationController {
    private service;
    constructor(service: VerificationService);
    submitEmployeeDocs(userId: string, body: {
        employeeIdUrl: string;
        profilePhotoUrl?: string;
    }): Promise<{
        message: string;
    }>;
    submitDriverDocs(userId: string, body: {
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
}
