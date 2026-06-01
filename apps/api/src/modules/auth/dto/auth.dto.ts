import {
  IsEmail, IsString, MinLength, MaxLength,
  IsEnum, IsOptional, Matches, IsNotEmpty,
} from 'class-validator';
import { Gender } from '@techieride/shared';

// Only these roles can self-register — ADMIN must be created by another admin
export enum RegisterableRole {
  RIDE_GIVER  = 'RIDE_GIVER',
  RIDE_SEEKER = 'RIDE_SEEKER',
  BOTH        = 'BOTH',
}

export class RegisterDto {
  // ── Auth ────────────────────────────────────────────────────────────────
  @IsEmail()
  email: string; // official/company email — verification & auth only

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64)
  password: string;

  // ── Profile ──────────────────────────────────────────────────────────────
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  phone: string;

  @IsOptional()
  @IsEmail()
  personalEmail?: string; // personal email — app notifications (any domain)

  @IsEnum(RegisterableRole, {
    message: 'Role must be RIDE_GIVER, RIDE_SEEKER, or BOTH. ADMIN cannot be self-registered.',
  })
  role: RegisterableRole;

  // ── Location ─────────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeLocation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  officeLocation: string;

  // ── Emergency Contact ────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid emergency contact number' })
  emergencyContactPhone: string;

  // ── Optional ─────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  bloodGroup?: string; // A+/A-/B+/B-/O+/O-/AB+/AB-
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
