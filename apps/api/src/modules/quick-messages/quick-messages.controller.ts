import { Controller, Post, Param, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { QuickMessagesService, QUICK_MESSAGES } from './quick-messages.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class SendQuickMessageDto {
  @IsString() messageKey: string;
  @IsOptional() @IsString() customText?: string;
}

@ApiTags('Quick Messages')
@ApiBearerAuth()
@Controller('rides/:rideId/quick-message')
export class QuickMessagesController {
  constructor(private service: QuickMessagesService) {}

  @Get('options')
  getOptions() {
    return Object.entries(QUICK_MESSAGES).map(([key, val]) => ({
      key,
      text: val.text,
      role: val.role,
    }));
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  send(
    @CurrentUser('id') userId: string,
    @Param('rideId') rideId: string,
    @Body() dto: SendQuickMessageDto,
  ) {
    return this.service.send(userId, rideId, dto.messageKey, dto.customText);
  }
}
