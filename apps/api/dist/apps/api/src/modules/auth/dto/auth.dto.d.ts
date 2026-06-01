import { Gender } from '@techieride/shared';
export declare enum RegisterableRole {
    RIDE_GIVER = "RIDE_GIVER",
    RIDE_SEEKER = "RIDE_SEEKER",
    BOTH = "BOTH"
}
export declare class RegisterDto {
    email: string;
    password: string;
    fullName: string;
    gender: Gender;
    companyName: string;
    employeeId?: string;
    phone: string;
    personalEmail?: string;
    role: RegisterableRole;
    homeLocation: string;
    officeLocation: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    bloodGroup?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export declare class VerifyEmailDto {
    token: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
