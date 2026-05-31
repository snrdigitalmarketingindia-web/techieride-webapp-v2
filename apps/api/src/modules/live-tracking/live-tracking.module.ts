import { Module } from '@nestjs/common';
import { LiveTrackingGateway } from './live-tracking.gateway';
import { LiveTrackingService } from './live-tracking.service';
import { LiveTrackingController } from './live-tracking.controller';

@Module({
  controllers: [LiveTrackingController],
  providers: [LiveTrackingGateway, LiveTrackingService],
  exports: [LiveTrackingService],
})
export class LiveTrackingModule {}
