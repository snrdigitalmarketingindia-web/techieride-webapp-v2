import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { VerificationModule } from '../verification/verification.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RidesModule } from '../rides/rides.module';
import { EmailModule } from '../email/email.module';
import { RegistrationModule } from '../registration/registration.module';

@Module({
  imports: [VerificationModule, TrustScoreModule, AuditLogModule, RidesModule, EmailModule, RegistrationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
