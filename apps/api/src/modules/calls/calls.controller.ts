import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CallsService } from './calls.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class LogCallDto {
  @IsString() receiverId: string;
  @IsOptional() @IsString() rideId?: string;
}

@ApiTags('Calls')
@ApiBearerAuth()
@Controller('calls')
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post('log')
  @HttpCode(HttpStatus.OK)
  logCall(@CurrentUser('id') callerId: string, @Body() dto: LogCallDto) {
    // Non-blocking — respond immediately, log in background
    this.callsService.logCall(callerId, dto.receiverId, dto.rideId);
    return { ok: true };
  }
}
