import {
  IsEmail, IsString, MinLength, MaxLength,
  IsEnum, IsOptional, Matches,
} from 'class-validator';
import { UserRole, Gender } from '@techieride/shared';

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

  @IsString()
  employeeId: string;

  @IsEnum(UserRole)
  role: UserRole;

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
