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
exports.CommuteTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const commute_templates_service_1 = require("./commute-templates.service");
const create_template_dto_1 = require("./dto/create-template.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let CommuteTemplatesController = class CommuteTemplatesController {
    constructor(service) {
        this.service = service;
    }
    create(userId, dto) {
        return this.service.create(userId, dto);
    }
    findMine(userId) {
        return this.service.findMine(userId);
    }
    toggle(id, userId) {
        return this.service.toggle(id, userId);
    }
    remove(id, userId) {
        return this.service.remove(id, userId);
    }
};
exports.CommuteTemplatesController = CommuteTemplatesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_template_dto_1.CreateTemplateDto]),
    __metadata("design:returntype", void 0)
], CommuteTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommuteTemplatesController.prototype, "findMine", null);
__decorate([
    (0, common_1.Patch)(':id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CommuteTemplatesController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CommuteTemplatesController.prototype, "remove", null);
exports.CommuteTemplatesController = CommuteTemplatesController = __decorate([
    (0, swagger_1.ApiTags)('Commute Templates'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('templates'),
    __metadata("design:paramtypes", [commute_templates_service_1.CommuteTemplatesService])
], CommuteTemplatesController);
//# sourceMappingURL=commute-templates.controller.js.map