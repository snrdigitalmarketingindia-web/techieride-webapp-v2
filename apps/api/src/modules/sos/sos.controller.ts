import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SosService } from './sos.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsNumber, IsOptional, IsUUID } from 'class-validator';

class TriggerSosDto {
  @IsUUID() @IsOptional() rideId?: string;
  @IsNumber() @IsOptional() lat?: number;
  @IsNumber() @IsOptional() lng?: number;
}

@ApiTags('SOS')
@ApiBearerAuth()
@Controller('sos')
export class SosController {
  constructor(private sosService: SosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  trigger(
    @CurrentUser('id') userId: string,
    @Body() dto: TriggerSosDto,
  ) {
    return this.sosService.trigger(userId, dto.rideId, dto.lat, dto.lng);
  }
}
