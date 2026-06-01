import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddEmergencyContactDto } from './dto/emergency-contact.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getMyProfile(userId: string): Promise<{
        rideGiver: {
            totalRidesGiven: number;
            averageRating: number;
        } | null;
        rideSeeker: {
            averageRating: number;
            totalRidesTaken: number;
        } | null;
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
        profilePhoto: string | null;
        trid: string | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        emailStatus: import(".prisma/client").$Enums.EmailStatus;
        isActive: boolean;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        fcmToken: string | null;
        ecoPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
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
    getPublicProfile(id: string): Promise<{
        rideGiver: {
            totalRidesGiven: number;
            averageRating: number;
        } | null;
        rideSeeker: {
            averageRating: number;
            totalRidesTaken: number;
        } | null;
        fullName: string;
        companyName: string | null;
        id: string;
        profilePhoto: string | null;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
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
}
