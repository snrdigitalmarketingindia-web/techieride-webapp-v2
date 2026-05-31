"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rides_service_1 = require("./rides.service");
const create_ride_dto_1 = require("./dto/create-ride.dto");
const search_rides_dto_1 = require("./dto/search-rides.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let RidesController = class RidesController {
    constructor(ridesService) {
        this.ridesService = ridesService;
    }
    search(dto) {
        return this.ridesService.search(dto);
    }
    getGiven(userId, status) {
        return this.ridesService.getGivenRides(userId, status);
    }
    getTaken(userId) {
        return this.ridesService.getTakenRides(userId);
    }
    findOne(id) {
        return this.ridesService.findById(id);
    }
    create(userId, dto) {
        return this.ridesService.create(userId, dto);
    }
    publish(id, userId) {
        return this.ridesService.publish(id, userId);
    }
    start(id, userId) {
        return this.ridesService.start(id, userId);
    }
    complete(id, userId) {
        return this.ridesService.complete(id, userId);
    }
    cancel(id, userId, reason) {
        return this.ridesService.cancel(id, userId, reason);
    }
};
exports.RidesController = RidesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_rides_dto_1.SearchRidesDto]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('given'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "getGiven", null);
__decorate([
    (0, common_1.Get)('taken'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "getTaken", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_ride_dto_1.CreateRideDto]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "publish", null);
__decorate([
    (0, common_1.Patch)(':id/start'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "start", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "complete", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "cancel", null);
exports.RidesController = RidesController = __decorate([
    (0, swagger_1.ApiTags)('Rides'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('rides'),
    __metadata("design:paramtypes", [rides_service_1.RidesService])
], RidesController);
//# sourceMappingURL=rides.controller.js.map