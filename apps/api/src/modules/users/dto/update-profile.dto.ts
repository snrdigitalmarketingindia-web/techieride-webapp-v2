import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Gender } from '@techieride/shared';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) fullName?: string;
  @IsOptional() @IsString() @MaxLength(500) profilePhoto?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) companyName?: string;
  @IsOptional() @IsString() @MaxLength(500) fcmToken?: string;
  @IsOptional() @IsString() @MaxLength(100) homeLocation?: string;
  @IsOptional() @IsString() @MaxLength(100) officeLocation?: string;
  @IsOptional() @IsEmail() @MaxLength(254) personalEmail?: string;
  @IsOptional() @IsIn(VALID_BLOOD_GROUPS, { message: 'Invalid blood group. Must be one of: A+, A-, B+, B-, O+, O-, AB+, AB-' }) bloodGroup?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone?: string;

  @IsOptional() @IsString() @MaxLength(10) countryCode?: string;
}
