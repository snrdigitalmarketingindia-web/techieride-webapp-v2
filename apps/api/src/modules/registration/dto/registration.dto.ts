import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum, IsUrl, IsBoolean } from 'class-validator';
import { Gender } from '@prisma/client';

export class StartRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  personalEmail: string;
}

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  homeLocation?: string;

  @IsString()
  @IsOptional()
  officeLocation?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}

export class SubmitOfficeEmailDto {
  @IsEmail()
  @IsNotEmpty()
  officeEmail: string;
}

export class SubmitExceptionDto {
  @IsString()
  @MinLength(20)
  reason: string;
}

export class UploadDocsDto {
  @IsUrl()
  @IsNotEmpty()
  employeeIdUrl: string;

  @IsUrl()
  @IsNotEmpty()
  govtIdUrl: string;

  @IsBoolean()
  selfDeclarationAccepted: boolean;

  @IsUrl()
  @IsOptional()
  profilePhotoUrl?: string;
}

export class UpdateEmailDto {
  @IsString()
  @IsNotEmpty()
  pendingId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResendDto {
  @IsString()
  @IsNotEmpty()
  pendingId: string;
}
