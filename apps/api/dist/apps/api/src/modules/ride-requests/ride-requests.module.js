"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const ride_requests_controller_1 = require("./ride-requests.controller");
const ride_requests_service_1 = require("./ride-requests.service");
const notifications_module_1 = require("../notifications/notifications.module");
let RideRequestsModule = class RideRequestsModule {
};
exports.RideRequestsModule = RideRequestsModule;
exports.RideRequestsModule = RideRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [ride_requests_controller_1.RideRequestsController],
        providers: [ride_requests_service_1.RideRequestsService],
        exports: [ride_requests_service_1.RideRequestsService],
    })
], RideRequestsModule);
//# sourceMappingURL=ride-requests.module.js.map