import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchRidesDto {
  // Coordinates are optional: the maps-off client searches by location NAME
  // (originQuery/destinationQuery) instead. When coords are present the
  // geo radius engine applies; when only names are present, fuzzy
  // name-matching applies; with neither, all rides for the date are returned.
  @IsOptional() @IsNumber() @Type(() => Number) originLat: number = 0;
  @IsOptional() @IsNumber() @Type(() => Number) originLng: number = 0;
  @IsOptional() @IsNumber() @Type(() => Number) destinationLat: number = 0;
  @IsOptional() @IsNumber() @Type(() => Number) destinationLng: number = 0;

  /** Free-text location filters (maps-off mode) — fuzzy-matched against ride names */
  @IsOptional() @IsString() originQuery?: string;
  @IsOptional() @IsString() destinationQuery?: string;
  @IsDateString() date: string;
  @IsOptional() @IsString() userId?: string;   // injected server-side from auth token
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page: number = 1;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit: number = 20;

  /**
   * Search radius in metres. Seeker can adjust how wide a net to cast.
   * Default: 10 000 m (10 km) — riders walk/drive to a common meeting point.
   * Max: 50 000 m (50 km) — prevents absurd cross-city results.
   */
  @IsOptional() @IsInt() @Min(500) @Max(50_000) @Type(() => Number)
  radiusMeters: number = 10_000;
}
