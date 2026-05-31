import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LiveTrackingService } from './live-tracking.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Live Tracking')
@ApiBearerAuth()
@Controller('tracking')
export class LiveTrackingController {
  constructor(private service: LiveTrackingService) {}

  @Get(':rideId/position')
  async getPosition(@Param('rideId') rideId: string, @CurrentUser('id') userId: string) {
    const canAccess = await this.service.canAccessRide(userId, rideId);
    if (!canAccess) return { message: 'Unauthorized' };
    const position = await this.service.getLastLocation(rideId);
    if (!position) return { message: 'No active tracking for this ride' };
    return position;
  }
}
