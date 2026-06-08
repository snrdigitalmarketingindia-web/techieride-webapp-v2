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
exports.RatingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const ratings_service_1 = require("./ratings.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
class SubmitRatingDto {
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubmitRatingDto.prototype, "rideId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubmitRatingDto.prototype, "rateeId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], SubmitRatingDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SubmitRatingDto.prototype, "comment", void 0);
let RatingsController = class RatingsController {
    constructor(ratingsService) {
        this.ratingsService = ratingsService;
    }
    submit(userId, dto) {
        return this.ratingsService.submitRating(userId, dto);
    }
    getRideRatings(rideId) {
        return this.ratingsService.getRideRatings(rideId);
    }
    getUserStats(userId) {
        return this.ratingsService.getUserRatingStats(userId);
    }
};
exports.RatingsController = RatingsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SubmitRatingDto]),
    __metadata("design:returntype", void 0)
], RatingsController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)('ride/:rideId'),
    __param(0, (0, common_1.Param)('rideId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RatingsController.prototype, "getRideRatings", null);
__decorate([
    (0, common_1.Get)('stats/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RatingsController.prototype, "getUserStats", null);
exports.RatingsController = RatingsController = __decorate([
    (0, swagger_1.ApiTags)('Ratings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('ratings'),
    __metadata("design:paramtypes", [ratings_service_1.RatingsService])
], RatingsController);
//# sourceMappingURL=ratings.controller.js.map