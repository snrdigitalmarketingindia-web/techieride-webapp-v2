import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Gender } from '@techieride/shared';

export class UpdateProfileDto {
  @IsString() @IsOptional() fullName?: string;
  @IsString() @IsOptional() profilePhoto?: string;
  @IsEnum(Gender) @IsOptional() gender?: Gender;
  @IsString() @IsOptional() companyName?: string;
  @IsString() @IsOptional() fcmToken?: string;
  @IsString() @IsOptional() homeLocation?: string;
  @IsString() @IsOptional() officeLocation?: string;
  @IsString() @IsOptional() personalEmail?: string;
  @IsString() @IsOptional() bloodGroup?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone?: string;

  @IsString() @IsOptional() countryCode?: string;
}
