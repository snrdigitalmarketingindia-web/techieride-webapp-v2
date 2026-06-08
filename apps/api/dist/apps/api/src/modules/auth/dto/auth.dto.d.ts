import { Gender } from '@techieride/shared';
export declare class RegisterDto {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    employeeId?: string;
    gender?: Gender;
    phone: string;
    countryCode?: string;
    personalEmail?: string;
    homeLocation?: string;
    officeLocation?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
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
export declare class ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}
export declare class VerifyEmailDto {
    token: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class ExceptionVerificationDto {
    personalEmail: string;
    companyIdCardUrl: string;
    employeeId: string;
    reason: string;
}
