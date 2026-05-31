import { RideRequestsService } from './ride-requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
export declare class RideRequestsController {
    private service;
    constructor(service: RideRequestsService);
    create(userId: string, dto: CreateRequestDto): Promise<{
        requestId: string;
        status: string;
    }>;
    incoming(rideId: string, userId: string): Promise<({
        seeker: {
            user: {
                email: string;
                fullName: string;
                gender: import(".prisma/client").$Enums.Gender | null;
                companyName: string | null;
                employeeId: string | null;
                role: import(".prisma/client").$Enums.UserRole;
                phone: string | null;
                id: string;
                passwordHash: string;
                profilePhoto: string | null;
                verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
                emailStatus: import(".prisma/client").$Enums.EmailStatus;
                emailVerificationToken: string | null;
                emailVerificationExpiry: Date | null;
                passwordResetToken: string | null;
                passwordResetExpiry: Date | null;
                isActive: boolean;
                fcmToken: string | null;
                ecoPoints: number;
                ecoLevel: import(".prisma/client").$Enums.EcoLevel;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            averageRating: number;
            preferredGender: string;
            totalRidesTaken: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rideId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        seekerId: string;
        pickupName: string | null;
        dropName: string | null;
        pickupLat: number | null;
        pickupLng: number | null;
        dropLat: number | null;
        dropLng: number | null;
        holdExpiresAt: Date | null;
        confirmedAt: Date | null;
    })[]>;
    approve(id: string, userId: string): Promise<{
        status: string;
        holdExpiresAt: string;
    }>;
    reject(id: string, userId: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rideId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        seekerId: string;
        pickupName: string | null;
        dropName: string | null;
        pickupLat: number | null;
        pickupLng: number | null;
        dropLat: number | null;
        dropLng: number | null;
        holdExpiresAt: Date | null;
        confirmedAt: Date | null;
    }>;
    confirm(id: string, userId: string): Promise<{
        status: string;
    }>;
    cancel(id: string, userId: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rideId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        seekerId: string;
        pickupName: string | null;
        dropName: string | null;
        pickupLat: number | null;
        pickupLng: number | null;
        dropLat: number | null;
        dropLng: number | null;
        holdExpiresAt: Date | null;
        confirmedAt: Date | null;
    }>;
}
