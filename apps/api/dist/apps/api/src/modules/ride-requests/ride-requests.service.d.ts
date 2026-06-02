import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
export declare class RideRequestsService {
    private prisma;
    private notifications;
    private redis;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService, redis: Redis);
    expirePendingRequests(): Promise<void>;
    create(userId: string, dto: CreateRequestDto): Promise<{
        requestId: string;
        status: string;
    }>;
    getIncomingRequests(rideId: string, userId: string): Promise<({
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
    getMyRequests(userId: string): Promise<({
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
    approve(requestId: string, userId: string): Promise<{
        status: string;
    }>;
    reject(requestId: string, userId: string, reason?: string): Promise<{
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
    confirm(requestId: string, userId: string): Promise<{
        status: import(".prisma/client").$Enums.RequestStatus;
    }>;
    cancel(requestId: string, userId: string, reason?: string): Promise<{
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
    private getRequestForGiver;
}
