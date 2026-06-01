import { PrismaService } from '../../prisma/prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    listUsers(filters: {
        verificationStatus?: string;
        role?: string;
        page: number;
        limit: number;
    }): Promise<{
        data: {
            email: string;
            fullName: string;
            companyName: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            phone: string | null;
            id: string;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            isActive: boolean;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    suspendUser(userId: string): Promise<{
        email: string;
        fullName: string;
        gender: import(".prisma/client").$Enums.Gender | null;
        companyName: string | null;
        employeeId: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string | null;
        id: string;
        personalEmail: string | null;
        passwordHash: string;
        profilePhoto: string | null;
        bloodGroup: string | null;
        homeLocation: string | null;
        officeLocation: string | null;
        trid: string | null;
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
    }>;
    activateUser(userId: string): Promise<{
        email: string;
        fullName: string;
        gender: import(".prisma/client").$Enums.Gender | null;
        companyName: string | null;
        employeeId: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string | null;
        id: string;
        personalEmail: string | null;
        passwordHash: string;
        profilePhoto: string | null;
        bloodGroup: string | null;
        homeLocation: string | null;
        officeLocation: string | null;
        trid: string | null;
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
    }>;
    getAnalytics(from: Date, to: Date): Promise<{
        totalUsers: number;
        verifiedUsers: number;
        totalRides: number;
        completedRides: number;
        cancelledRides: number;
        sosEvents: number;
        totalCo2SavedKg: string;
    }>;
    listActiveSos(): Promise<({
        user: {
            fullName: string;
            phone: string | null;
        };
        ride: {
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
        } | null;
    } & {
        id: string;
        userId: string;
        rideId: string | null;
        status: import(".prisma/client").$Enums.SosStatus;
        lat: number;
        lng: number;
        resolvedBy: string | null;
        resolutionNotes: string | null;
        triggeredAt: Date;
        resolvedAt: Date | null;
    })[]>;
    resolveSos(sosId: string, adminId: string, notes: string): Promise<{
        id: string;
        userId: string;
        rideId: string | null;
        status: import(".prisma/client").$Enums.SosStatus;
        lat: number;
        lng: number;
        resolvedBy: string | null;
        resolutionNotes: string | null;
        triggeredAt: Date;
        resolvedAt: Date | null;
    }>;
    listVehicles(onlyPending?: boolean): Promise<({
        rideGiver: {
            user: {
                email: string;
                fullName: string;
                phone: string | null;
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
        isActive: boolean;
        createdAt: Date;
        totalSeats: number;
        rideGiverId: string;
        make: string;
        model: string;
        year: number | null;
        color: string | null;
        plateNumber: string;
        rcUrl: string | null;
        rcVerified: boolean;
    })[]>;
    verifyVehicle(vehicleId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        totalSeats: number;
        rideGiverId: string;
        make: string;
        model: string;
        year: number | null;
        color: string | null;
        plateNumber: string;
        rcUrl: string | null;
        rcVerified: boolean;
    }>;
    rejectVehicle(vehicleId: string, reason?: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        totalSeats: number;
        rideGiverId: string;
        make: string;
        model: string;
        year: number | null;
        color: string | null;
        plateNumber: string;
        rcUrl: string | null;
        rcVerified: boolean;
    }>;
    listAllRides(status?: string, page?: number, limit?: number): Promise<{
        data: ({
            rideGiver: {
                user: {
                    fullName: string;
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
            vehicle: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                totalSeats: number;
                rideGiverId: string;
                make: string;
                model: string;
                year: number | null;
                color: string | null;
                plateNumber: string;
                rcUrl: string | null;
                rcVerified: boolean;
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
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
}
