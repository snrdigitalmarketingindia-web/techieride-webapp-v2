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
exports.QuickMessagesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const quick_messages_service_1 = require("./quick-messages.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
class SendQuickMessageDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendQuickMessageDto.prototype, "messageKey", void 0);
let QuickMessagesController = class QuickMessagesController {
    constructor(service) {
        this.service = service;
    }
    getOptions() {
        return Object.entries(quick_messages_service_1.QUICK_MESSAGES).map(([key, val]) => ({
            key,
            text: val.text,
            role: val.role,
        }));
    }
    send(userId, rideId, dto) {
        return this.service.send(userId, rideId, dto.messageKey);
    }
};
exports.QuickMessagesController = QuickMessagesController;
__decorate([
    (0, common_1.Get)('options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QuickMessagesController.prototype, "getOptions", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('rideId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, SendQuickMessageDto]),
    __metadata("design:returntype", void 0)
], QuickMessagesController.prototype, "send", null);
exports.QuickMessagesController = QuickMessagesController = __decorate([
    (0, swagger_1.ApiTags)('Quick Messages'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('rides/:rideId/quick-message'),
    __metadata("design:paramtypes", [quick_messages_service_1.QuickMessagesService])
], QuickMessagesController);
//# sourceMappingURL=quick-messages.controller.js.map