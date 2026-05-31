import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateRideDto {
  @IsUUID() vehicleId: string;
  @IsString() originName: string;
  @IsNumber() originLat: number;
  @IsNumber() originLng: number;
  @IsString() destinationName: string;
  @IsNumber() destinationLat: number;
  @IsNumber() destinationLng: number;
  @IsDateString() departureDate: string;
  @IsString() departureTime: string;
  @IsInt() @Min(1) @Max(7) totalSeats: number;
  @IsString() @IsOptional() notes?: string;
}
