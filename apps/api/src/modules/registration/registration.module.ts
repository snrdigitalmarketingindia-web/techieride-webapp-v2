import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { EmailModule } from '../email/email.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [EmailModule, UploadsModule],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class RegistrationModule {}
