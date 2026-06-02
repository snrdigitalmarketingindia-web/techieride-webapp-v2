import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';

@Module({
  imports: [NotificationsModule, TrustScoreModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
