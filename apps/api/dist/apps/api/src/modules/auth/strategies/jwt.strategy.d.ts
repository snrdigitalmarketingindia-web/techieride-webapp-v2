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
}
export {};
