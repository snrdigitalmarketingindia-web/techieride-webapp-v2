import { IsString, Length, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
