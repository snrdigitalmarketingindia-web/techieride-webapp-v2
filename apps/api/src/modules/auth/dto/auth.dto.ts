import {
  IsEmail, IsString, MinLength, MaxLength,
  IsEnum, IsOptional, Matches,
} from 'class-validator';
import { Gender } from '@techieride/shared';

// Only these roles can self-register — ADMIN must be created by another admin
export enum RegisterableRole {
  RIDE_GIVER  = 'RIDE_GIVER',
  RIDE_SEEKER = 'RIDE_SEEKER',
  BOTH        = 'BOTH',
}

export class RegisterDto {
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

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsEnum(RegisterableRole, {
    message: 'Role must be RIDE_GIVER, RIDE_SEEKER, or BOTH. ADMIN cannot be self-registered.',
  })
  role: RegisterableRole;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  phone?: string;
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
