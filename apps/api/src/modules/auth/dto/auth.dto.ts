import {
  IsEmail, IsString, MinLength, MaxLength,
  IsEnum, IsOptional, Matches,
} from 'class-validator';
import { Gender } from '@techieride/shared';

export class RegisterDto {
  // ── Required ─────────────────────────────────────────────────────────────
  @IsEmail()
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
  companyName: string;

  // ── Optional at registration — collected later via profile ────────────────
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  phone?: string;

  @IsOptional()
  @IsEmail()
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
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64)
  newPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ExceptionVerificationDto {
  @IsEmail()
  personalEmail: string;

  @IsString()
  companyIdCardUrl: string;

  @IsString()
  employeeId: string;

  @IsString()
  @MinLength(20, { message: 'Please provide a detailed reason (at least 20 characters)' })
  reason: string;
}
