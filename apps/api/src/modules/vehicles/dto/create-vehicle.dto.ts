import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString() make: string;
  @IsString() model: string;
  @IsInt() @IsOptional() year?: number;
  @IsString() @IsOptional() color?: string;
  @IsString() plateNumber: string;
  @IsInt() @Min(1) @Max(6) totalSeats: number;
  @IsString() @IsOptional() photoUrl?: string;
}
