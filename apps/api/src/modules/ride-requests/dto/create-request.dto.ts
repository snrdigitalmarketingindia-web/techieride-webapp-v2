import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRequestDto {
  @IsUUID() rideId: string;
  @IsNumber() @IsOptional() pickupLat?: number;
  @IsNumber() @IsOptional() pickupLng?: number;
  @IsString() @IsOptional() pickupName?: string;
  @IsNumber() @IsOptional() dropLat?: number;
  @IsNumber() @IsOptional() dropLng?: number;
  @IsString() @IsOptional() dropName?: string;
}
