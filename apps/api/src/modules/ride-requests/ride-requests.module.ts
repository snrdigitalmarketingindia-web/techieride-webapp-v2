import { Module } from '@nestjs/common';
import { RideRequestsController } from './ride-requests.controller';
import { RideRequestsService } from './ride-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SavedLocationsModule } from '../saved-locations/saved-locations.module';

@Module({
  imports: [NotificationsModule, SavedLocationsModule],
  controllers: [RideRequestsController],
  providers: [RideRequestsService],
  exports: [RideRequestsService],
})
export class RideRequestsModule {}
