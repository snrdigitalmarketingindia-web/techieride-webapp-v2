import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';

@Module({
  imports: [NotificationsModule, TrustScoreModule],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
