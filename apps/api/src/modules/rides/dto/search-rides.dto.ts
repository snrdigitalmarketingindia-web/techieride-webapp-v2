import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchRidesDto {
  @IsNumber() @Type(() => Number) originLat: number;
  @IsNumber() @Type(() => Number) originLng: number;
  @IsNumber() @Type(() => Number) destinationLat: number;
  @IsNumber() @Type(() => Number) destinationLng: number;
  @IsDateString() date: string;
  @IsOptional() @IsString() userId?: string;   // injected server-side from auth token
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page: number = 1;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit: number = 20;
}
