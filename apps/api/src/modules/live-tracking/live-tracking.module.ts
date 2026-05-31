import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LiveTrackingGateway } from './live-tracking.gateway';
import { LiveTrackingService } from './live-tracking.service';
import { LiveTrackingController } from './live-tracking.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [LiveTrackingController],
  providers: [LiveTrackingGateway, LiveTrackingService],
  exports: [LiveTrackingService],
})
export class LiveTrackingModule {}
