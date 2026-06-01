import { IsNumber, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRequestDto {
  @IsUUID()
  rideId: string;

  // Boarding point — required. Seeker must specify where to be picked up.
  @IsString()
  @IsNotEmpty({ message: 'Please specify your boarding point' })
  pickupName: string;

  // Coordinates — optional, populated via browser geolocation
  @IsNumber() @IsOptional() pickupLat?: number;
  @IsNumber() @IsOptional() pickupLng?: number;

  // Drop point — optional, defaults to ride destination
  @IsString() @IsOptional() dropName?: string;
  @IsNumber() @IsOptional() dropLat?: number;
  @IsNumber() @IsOptional() dropLng?: number;
}
