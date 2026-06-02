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
                fullName: string;
                companyName: string | null;
                phone: string | null;
                countryCode: string;
                id: string;
                profilePhoto: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            totalRidesTaken: number;
            averageRating: number;
            preferredGender: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        rideId: string;
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
    mine(userId: string): Promise<({
        ride: {
            rideGiver: {
                user: {
                    fullName: string;
                    companyName: string | null;
                    phone: string | null;
                    countryCode: string;
                    id: string;
                    profilePhoto: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string;
                averageRating: number;
                preferredGender: string;
                drivingLicenseUrl: string | null;
                licenseVerified: boolean;
                totalRidesGiven: number;
                isAvailable: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.RideStatus;
            rideGiverId: string;
            vehicleId: string;
            templateId: string | null;
            originName: string;
            originLat: number;
            originLng: number;
            destinationName: string;
            destinationLat: number;
            destinationLng: number;
            routePolyline: import("@prisma/client/runtime/library").JsonValue | null;
            estimatedDistanceKm: number | null;
            estimatedDurationMin: number | null;
            departureDate: Date;
            departureTime: string;
            estimatedArrivalTime: string | null;
            totalSeats: number;
            availableSeats: number;
            womenOnly: boolean;
            notes: string | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        rideId: string;
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
    }>;
    reject(id: string, userId: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        rideId: string;
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
        status: import(".prisma/client").$Enums.RequestStatus;
    }>;
    cancel(id: string, userId: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        rideId: string;
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
