import { AdminService } from './admin.service';
import { VerificationService } from '../verification/verification.service';
export declare class AdminController {
    private adminService;
    private verificationService;
    constructor(adminService: AdminService, verificationService: VerificationService);
    listUsers(verificationStatus?: string, role?: string, page?: number, limit?: number): Promise<{
        data: {
            email: string;
            fullName: string;
            companyName: string | null;
            phone: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            id: string;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            isActive: boolean;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    suspendUser(id: string): Promise<{
        email: string;
        fullName: string;
        gender: import(".prisma/client").$Enums.Gender | null;
        companyName: string | null;
        employeeId: string | null;
        phone: string | null;
        personalEmail: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        homeLocation: string | null;
        officeLocation: string | null;
        bloodGroup: string | null;
        id: string;
        passwordHash: string;
        profilePhoto: string | null;
        trid: string | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        emailStatus: import(".prisma/client").$Enums.EmailStatus;
        emailVerificationToken: string | null;
        emailVerificationExpiry: Date | null;
        passwordResetToken: string | null;
        passwordResetExpiry: Date | null;
        isActive: boolean;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        fcmToken: string | null;
        ecoPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
        createdAt: Date;
        updatedAt: Date;
    }>;
    activateUser(id: string): Promise<{
        email: string;
        fullName: string;
        gender: import(".prisma/client").$Enums.Gender | null;
        companyName: string | null;
        employeeId: string | null;
        phone: string | null;
        personalEmail: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        homeLocation: string | null;
        officeLocation: string | null;
        bloodGroup: string | null;
        id: string;
        passwordHash: string;
        profilePhoto: string | null;
        trid: string | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        emailStatus: import(".prisma/client").$Enums.EmailStatus;
        emailVerificationToken: string | null;
        emailVerificationExpiry: Date | null;
        passwordResetToken: string | null;
        passwordResetExpiry: Date | null;
        isActive: boolean;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        fcmToken: string | null;
        ecoPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getPendingVerifications(): Promise<({
        user: {
            email: string;
            fullName: string;
            phone: string | null;
        };
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        drivingLicenseUrl: string | null;
        rcUrl: string | null;
        status: import(".prisma/client").$Enums.VerificationStatus;
        employeeIdUrl: string | null;
        rejectionReason: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        submittedAt: Date;
    })[]>;
    reviewVerification(id: string, adminId: string, body: {
        decision: 'APPROVED' | 'REJECTED';
        rejectionReason?: string;
    }): Promise<{
        status: "REJECTED" | "APPROVED";
        trid: string | undefined;
    }>;
    listVehicles(pending?: string): Promise<({
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
    verifyVehicle(id: string): Promise<{
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
    rejectVehicle(id: string, reason?: string): Promise<{
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
    listRides(status?: string, page?: number, limit?: number): Promise<{
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
    getAnalytics(from: string, to: string): Promise<{
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
    resolveSos(id: string, adminId: string, notes: string): Promise<{
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
}
