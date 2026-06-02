import { Module } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [TrustScoreService, PrismaService],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
