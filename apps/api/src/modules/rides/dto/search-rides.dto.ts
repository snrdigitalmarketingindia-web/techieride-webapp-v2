import { IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchRidesDto {
  @IsNumber() @Type(() => Number) originLat: number;
  @IsNumber() @Type(() => Number) originLng: number;
  @IsNumber() @Type(() => Number) destinationLat: number;
  @IsNumber() @Type(() => Number) destinationLng: number;
  @IsDateString() date: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page: number = 1;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit: number = 20;
}
