import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateTemplateDto {
  @IsUUID() vehicleId: string;
  @IsString() originName: string;
  @IsNumber() originLat: number;
  @IsNumber() originLng: number;
  @IsString() destinationName: string;
  @IsNumber() destinationLat: number;
  @IsNumber() destinationLng: number;
  @IsArray() @ArrayNotEmpty() departureDays: number[];
  @IsString() departureTime: string;
  @IsInt() @Min(1) @Max(7) totalSeats: number;
}
