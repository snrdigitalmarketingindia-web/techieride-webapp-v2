import {
  IsEmail, IsString, MinLength, MaxLength,
  IsEnum, IsOptional, Matches, IsIn,
} from 'class-validator';
import { Gender } from '@techieride/shared';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export class RegisterDto {
  // ── Required ─────────────────────────────────────────────────────────────
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName: string;

  // ── Optional at registration — collected later via profile ────────────────
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeId?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  personalEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  officeLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsIn(VALID_BLOOD_GROUPS, { message: 'Invalid blood group. Must be one of: A+, A-, B+, B-, O+, O-, AB+, AB-' })
  bloodGroup?: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(512)
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(64)
  newPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  @MaxLength(512)
  token: string;
}

export class RefreshTokenDto {
  @IsString()
  @MaxLength(1024)
  refreshToken: string;
}

export class ExceptionVerificationDto {
  @IsEmail()
  @MaxLength(254)
  personalEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeId?: string;

  @IsString()
  @MinLength(20, { message: 'Please provide a detailed reason (at least 20 characters)' })
  @MaxLength(1000)
  reason: string;
}
