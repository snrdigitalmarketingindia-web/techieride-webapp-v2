import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: {
        sub: string;
        role: string;
        email: string;
    }): Promise<{
        email: string;
        fullName: string;
        companyName: string | null;
        employeeId: string | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        phone: string | null;
        personalEmail: string | null;
        homeLocation: string | null;
        officeLocation: string | null;
        bloodGroup: string | null;
        id: string;
        passwordHash: string;
        profilePhoto: string | null;
        trid: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        emailStatus: import(".prisma/client").$Enums.EmailStatus;
        emailVerificationToken: string | null;
        emailVerificationExpiry: Date | null;
        passwordResetToken: string | null;
        passwordResetExpiry: Date | null;
        isActive: boolean;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        verificationMethod: string | null;
        fcmToken: string | null;
        ecoPoints: number;
        ecoLevel: import(".prisma/client").$Enums.EcoLevel;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
