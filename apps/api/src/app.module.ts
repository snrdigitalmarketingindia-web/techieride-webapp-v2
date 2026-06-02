import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { EmailVerifiedGuard } from './common/guards/email-verified.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './config/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RidesModule } from './modules/rides/rides.module';
import { RideRequestsModule } from './modules/ride-requests/ride-requests.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { CommuteTemplatesModule } from './modules/commute-templates/commute-templates.module';
import { VerificationModule } from './modules/verification/verification.module';
import { LiveTrackingModule } from './modules/live-tracking/live-tracking.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SosModule } from './modules/sos/sos.module';
import { CallsModule } from './modules/calls/calls.module';
import { QuickMessagesModule } from './modules/quick-messages/quick-messages.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { TrustScoreModule } from './modules/trust-score/trust-score.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RidesModule,
    RideRequestsModule,
    VehiclesModule,
    CommuteTemplatesModule,
    VerificationModule,
    LiveTrackingModule,
    NotificationsModule,
    AdminModule,
    GamificationModule,
    UploadsModule,
    SosModule,
    CallsModule,
    QuickMessagesModule,
    RatingsModule,
    ComplaintsModule,
    TrustScoreModule,
    AuditLogModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: EmailVerifiedGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
