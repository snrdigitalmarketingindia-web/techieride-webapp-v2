import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength,
} from 'class-validator';
import { Gender, UserRole } from '@techieride/shared';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export class RegisterDto {
  // ── Auth ──────────────────────────────────────────────────────────────────
  @IsEmail()
  email: string; // official/company email — verification, password reset, OTP

  @IsString()
  @IsNotEmpty()
  password: string;

  // ── Profile ───────────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone: string;

  @IsEmail()
  @IsOptional()
  personalEmail?: string; // personal email — app notifications (any domain allowed)

  @IsEnum([UserRole.RIDE_GIVER, UserRole.RIDE_SEEKER])
  role: UserRole;

  // ── Location (text, max 15 words) ─────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeLocation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  officeLocation: string;

  // ── Emergency Contact ─────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit emergency contact number' })
  emergencyContactPhone: string;

  // ── Optional ──────────────────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  bloodGroup?: string; // A+/A-/B+/B-/O+/O-/AB+/AB-
}
