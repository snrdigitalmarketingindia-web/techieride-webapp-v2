import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { VerificationModule } from '../verification/verification.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [VerificationModule, TrustScoreModule, AuditLogModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
