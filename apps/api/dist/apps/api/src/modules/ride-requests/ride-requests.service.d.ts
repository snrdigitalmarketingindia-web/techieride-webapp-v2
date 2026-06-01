import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
export declare class RideRequestsService {
    private prisma;
    private notifications;
    private redis;
    constructor(prisma: PrismaService, notifications: NotificationsService, redis: Redis);
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
        rideId: string;
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
            vehicleId: string;
            originName: string;
            originLat: number;
            originLng: number;
            destinationName: string;
            destinationLat: number;
            destinationLng: number;
            departureDate: Date;
            departureTime: string;
            totalSeats: number;
            notes: string | null;
            rideGiverId: string;
            templateId: string | null;
            routePolyline: import("@prisma/client/runtime/library").JsonValue | null;
            estimatedDistanceKm: number | null;
            estimatedDurationMin: number | null;
            estimatedArrivalTime: string | null;
            availableSeats: number;
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
        rideId: string;
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
    approve(requestId: string, userId: string): Promise<{
        status: string;
    }>;
    reject(requestId: string, userId: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        rideId: string;
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
    confirm(requestId: string, userId: string): Promise<{
        status: string;
    }>;
    cancel(requestId: string, userId: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        rideId: string;
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
    private getRequestForGiver;
}
