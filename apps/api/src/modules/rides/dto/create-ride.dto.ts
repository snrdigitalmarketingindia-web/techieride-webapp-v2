import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

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
  @IsInt() @Min(1) @Max(6) totalSeats: number; // excludes driver — max 6 passengers (giver + 6 = 7-seater)
  @IsString() @IsOptional() notes?: string;
  @IsBoolean() @IsOptional() womenOnly?: boolean;
}
