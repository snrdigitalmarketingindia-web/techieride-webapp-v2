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
    role: RegisterableRole;
    phone?: string;
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
