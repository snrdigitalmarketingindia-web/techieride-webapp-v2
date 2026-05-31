import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('unreadOnly') unreadOnly = false,
  ) {
    return this.service.findAll(userId, +page, +limit, !!unreadOnly);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.markRead(id, userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.service.markAllRead(userId);
  }
}
