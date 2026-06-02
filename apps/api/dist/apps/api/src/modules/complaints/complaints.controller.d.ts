import { ComplaintsService } from './complaints.service';
import { ComplaintReason, ComplaintStatus } from '@techieride/shared';
declare class FileComplaintDto {
    reportedId: string;
    rideId?: string;
    reason: ComplaintReason;
    description?: string;
}
declare class UpdateComplaintDto {
    status: ComplaintStatus;
    adminNotes?: string;
}
export declare class ComplaintsController {
    private complaintsService;
    constructor(complaintsService: ComplaintsService);
    file(userId: string, dto: FileComplaintDto): Promise<{
        complaintId: string;
        message: string;
    }>;
    getMy(userId: string): Promise<({
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
        reportedId: string;
        reporterId: string;
        adminNotes: string | null;
    })[]>;
    adminGetAll(status?: string, reportedId?: string): Promise<({
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
        reportedId: string;
        reporterId: string;
        adminNotes: string | null;
    })[]>;
    adminUpdate(id: string, adminId: string, dto: UpdateComplaintDto): Promise<{
        reason: import(".prisma/client").$Enums.ComplaintReason;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        description: string | null;
        rideId: string | null;
        resolvedBy: string | null;
        resolvedAt: Date | null;
        reportedId: string;
        reporterId: string;
        adminNotes: string | null;
    }>;
}
export {};
