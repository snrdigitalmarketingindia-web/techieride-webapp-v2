import { Module } from '@nestjs/common';
import { CommuteTemplatesController } from './commute-templates.controller';
import { CommuteTemplatesService } from './commute-templates.service';

@Module({
  controllers: [CommuteTemplatesController],
  providers: [CommuteTemplatesService],
  exports: [CommuteTemplatesService],
})
export class CommuteTemplatesModule {}
