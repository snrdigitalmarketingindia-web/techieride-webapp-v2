import { Controller, Post, Patch, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RideRequestsService } from './ride-requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Ride Requests')
@ApiBearerAuth()
@Controller('ride-requests')
export class RideRequestsController {
  constructor(private service: RideRequestsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRequestDto) {
    return this.service.create(userId, dto);
  }

  @Get('incoming')
  incoming(@Query('rideId') rideId: string, @CurrentUser('id') userId: string) {
    return this.service.getIncomingRequests(rideId, userId);
  }

  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.service.getMyRequests(userId);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.reject(id, userId, reason);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.confirm(id, userId);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.cancel(id, userId, reason);
  }
}
