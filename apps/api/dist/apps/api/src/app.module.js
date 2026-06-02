"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const email_verified_guard_1 = require("./common/guards/email-verified.guard");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./config/redis.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const rides_module_1 = require("./modules/rides/rides.module");
const ride_requests_module_1 = require("./modules/ride-requests/ride-requests.module");
const vehicles_module_1 = require("./modules/vehicles/vehicles.module");
const commute_templates_module_1 = require("./modules/commute-templates/commute-templates.module");
const verification_module_1 = require("./modules/verification/verification.module");
const live_tracking_module_1 = require("./modules/live-tracking/live-tracking.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const admin_module_1 = require("./modules/admin/admin.module");
const gamification_module_1 = require("./modules/gamification/gamification.module");
const uploads_module_1 = require("./modules/uploads/uploads.module");
const sos_module_1 = require("./modules/sos/sos.module");
const calls_module_1 = require("./modules/calls/calls.module");
const ratings_module_1 = require("./modules/ratings/ratings.module");
const complaints_module_1 = require("./modules/complaints/complaints.module");
const trust_score_module_1 = require("./modules/trust-score/trust-score.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            rides_module_1.RidesModule,
            ride_requests_module_1.RideRequestsModule,
            vehicles_module_1.VehiclesModule,
            commute_templates_module_1.CommuteTemplatesModule,
            verification_module_1.VerificationModule,
            live_tracking_module_1.LiveTrackingModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            gamification_module_1.GamificationModule,
            uploads_module_1.UploadsModule,
            sos_module_1.SosModule,
            calls_module_1.CallsModule,
            ratings_module_1.RatingsModule,
            complaints_module_1.ComplaintsModule,
            trust_score_module_1.TrustScoreModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: email_verified_guard_1.EmailVerifiedGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.AllExceptionsFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map