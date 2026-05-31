"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveTrackingModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const live_tracking_gateway_1 = require("./live-tracking.gateway");
const live_tracking_service_1 = require("./live-tracking.service");
const live_tracking_controller_1 = require("./live-tracking.controller");
let LiveTrackingModule = class LiveTrackingModule {
};
exports.LiveTrackingModule = LiveTrackingModule;
exports.LiveTrackingModule = LiveTrackingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_ACCESS_SECRET'),
                }),
            }),
        ],
        controllers: [live_tracking_controller_1.LiveTrackingController],
        providers: [live_tracking_gateway_1.LiveTrackingGateway, live_tracking_service_1.LiveTrackingService],
        exports: [live_tracking_service_1.LiveTrackingService],
    })
], LiveTrackingModule);
//# sourceMappingURL=live-tracking.module.js.map