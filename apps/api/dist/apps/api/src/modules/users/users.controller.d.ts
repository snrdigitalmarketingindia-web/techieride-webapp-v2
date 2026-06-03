import { UsersService } from './users.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddEmergencyContactDto } from './dto/emergency-contact.dto';
export declare class UsersController {
    private usersService;
    private trustScoreService;
    constructor(usersService: UsersService, trustScoreService: TrustScoreService);
    getMyProfile(userId: string): Promise<{
        rideGiver: {
            averageRating: number;
            totalRidesGiven: number;
        } | null;
        rideSeeker: {
            totalRidesTaken: number;
            averageRating: number;
        } | null;
        email: string;
        fullName: string;
        companyName: string | null;
        employeeId: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        phone: string | null;
        countryCode: string;
        personalEmail: string | null;
        homeLocation: string | null;
        officeLocation: string | null;
        bloodGroup: string | null;
        id: string;
        personalEmailVerified: boolean;
        profilePhoto: string | null;
        isPhoneVerified: boolean;
        trid: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        emailStatus: import(".prisma/client").$Enums.EmailStatus;
        pendingEmail: string | null;
        pendingEmailToken: string | null;
        pendingEmailExpiry: Date | null;
        isActive: boolean;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        verificationMethod: string | null;
        fcmToken: string | null;
        ecoPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
        trustScore: number;
        trustBand: import(".prisma/client").$Enums.TrustBand;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        email: string;
        fullName: string;
        companyName: string | null;
        employeeId: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        phone: string | null;
        countryCode: string;
        personalEmail: string | null;
        homeLocation: string | null;
        officeLocation: string | null;
        bloodGroup: string | null;
        id: string;
        personalEmailVerified: boolean;
        passwordHash: string;
        profilePhoto: string | null;
        isPhoneVerified: boolean;
        trid: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        emailStatus: import(".prisma/client").$Enums.EmailStatus;
        emailVerificationToken: string | null;
        emailVerificationExpiry: Date | null;
        passwordResetToken: string | null;
        passwordResetExpiry: Date | null;
        pendingEmail: string | null;
        pendingEmailToken: string | null;
        pendingEmailExpiry: Date | null;
        isActive: boolean;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        verificationMethod: string | null;
        fcmToken: string | null;
        ecoPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
        trustScore: number;
        trustBand: import(".prisma/client").$Enums.TrustBand;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getPublicProfile(id: string): Promise<{
        rideGiver: {
            averageRating: number;
            totalRidesGiven: number;
        } | null;
        rideSeeker: {
            totalRidesTaken: number;
            averageRating: number;
        } | null;
        fullName: string;
        companyName: string | null;
        id: string;
        profilePhoto: string | null;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
        trustScore: number;
        trustBand: import(".prisma/client").$Enums.TrustBand;
    }>;
    getEmergencyContacts(userId: string): Promise<{
        name: string;
        phone: string;
        id: string;
        userId: string;
        relationship: string;
    }[]>;
    addEmergencyContact(userId: string, dto: AddEmergencyContactDto): Promise<{
        name: string;
        phone: string;
        id: string;
        userId: string;
        relationship: string;
    }>;
    removeEmergencyContact(userId: string, contactId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    requestEmailChange(userId: string, newEmail: string): Promise<{
        message: string;
    }>;
    confirmEmailChange(token: string): Promise<{
        message: string;
    }>;
    requestPersonalEmailChange(userId: string, newEmail: string): Promise<{
        message: string;
    }>;
    confirmPersonalEmailChange(token: string): Promise<{
        message: string;
    }>;
    getMyTrustScore(userId: string): Promise<{
        trustScore: number;
        trustBand: import(".prisma/client").$Enums.TrustBand;
    } | null>;
    getMyTrustHistory(userId: string): Promise<{
        reason: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        delta: number;
        eventType: string;
        referenceId: string | null;
        scoreAfter: number;
        adminId: string | null;
    }[]>;
}
