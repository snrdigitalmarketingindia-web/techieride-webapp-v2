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
    getMyRequests(userId: string): Promise<({
        ride: {
            rideGiver: {
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
                drivingLicenseUrl: string | null;
                licenseVerified: boolean;
                totalRidesGiven: number;
                averageRating: number;
                preferredGender: string;
                isAvailable: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
            status: import(".prisma/client").$Enums.RideStatus;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
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
    approve(requestId: string, userId: string): Promise<{
        status: string;
    }>;
    reject(requestId: string, userId: string, reason?: string): Promise<{
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
    confirm(requestId: string, userId: string): Promise<{
        status: string;
    }>;
    cancel(requestId: string, userId: string, reason?: string): Promise<{
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
    private getRequestForGiver;
}
