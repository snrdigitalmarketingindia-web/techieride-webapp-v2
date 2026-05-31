import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Gender, UserRole } from '@techieride/shared';

export class RegisterDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone: string;

  @IsEmail()
  email: string;

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

  @IsEnum([UserRole.RIDE_GIVER, UserRole.RIDE_SEEKER, UserRole.BOTH])
  role: UserRole;
}
