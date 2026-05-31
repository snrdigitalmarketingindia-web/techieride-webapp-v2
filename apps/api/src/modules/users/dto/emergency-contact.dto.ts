import { IsString, Matches } from 'class-validator';

export class AddEmergencyContactDto {
  @IsString() name: string;
  @IsString() @Matches(/^[6-9]\d{9}$/) phone: string;
  @IsString() relationship: string;
}
