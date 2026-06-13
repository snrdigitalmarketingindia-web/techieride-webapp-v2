import { Module } from '@nestjs/common';
import { SavedLocationsController } from './saved-locations.controller';
import { SavedLocationsService } from './saved-locations.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SavedLocationsController],
  providers: [SavedLocationsService],
  exports: [SavedLocationsService],
})
export class SavedLocationsModule {}
