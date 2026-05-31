import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '@techieride/shared';

export class UpdateProfileDto {
  @IsString() @IsOptional() fullName?: string;
  @IsString() @IsOptional() profilePhoto?: string;
  @IsEnum(Gender) @IsOptional() gender?: Gender;
  @IsString() @IsOptional() companyName?: string;
  @IsString() @IsOptional() fcmToken?: string;
}
