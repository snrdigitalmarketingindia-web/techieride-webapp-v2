import { VerificationService } from './verification.service';
export declare class VerificationController {
    private service;
    constructor(service: VerificationService);
    submit(userId: string, body: {
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
}
