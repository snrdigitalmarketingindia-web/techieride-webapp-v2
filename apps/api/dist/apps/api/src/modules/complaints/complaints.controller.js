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
exports.ComplaintsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const complaints_service_1 = require("./complaints.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const shared_1 = require("@techieride/shared");
class FileComplaintDto {
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FileComplaintDto.prototype, "reportedId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FileComplaintDto.prototype, "rideId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(shared_1.ComplaintReason),
    __metadata("design:type", String)
], FileComplaintDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], FileComplaintDto.prototype, "description", void 0);
class UpdateComplaintDto {
}
__decorate([
    (0, class_validator_1.IsEnum)(shared_1.ComplaintStatus),
    __metadata("design:type", String)
], UpdateComplaintDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateComplaintDto.prototype, "adminNotes", void 0);
let ComplaintsController = class ComplaintsController {
    constructor(complaintsService) {
        this.complaintsService = complaintsService;
    }
    file(userId, dto) {
        return this.complaintsService.fileComplaint(userId, dto);
    }
    getMy(userId) {
        return this.complaintsService.getMyComplaints(userId);
    }
    adminGetAll(status, reportedId) {
        return this.complaintsService.adminGetAll({ status, reportedId });
    }
    adminUpdate(id, adminId, dto) {
        return this.complaintsService.adminUpdateStatus(id, adminId, dto);
    }
};
exports.ComplaintsController = ComplaintsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, FileComplaintDto]),
    __metadata("design:returntype", void 0)
], ComplaintsController.prototype, "file", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ComplaintsController.prototype, "getMy", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, roles_decorator_1.Roles)(shared_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('reportedId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ComplaintsController.prototype, "adminGetAll", null);
__decorate([
    (0, common_1.Patch)('admin/:id'),
    (0, roles_decorator_1.Roles)(shared_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateComplaintDto]),
    __metadata("design:returntype", void 0)
], ComplaintsController.prototype, "adminUpdate", null);
exports.ComplaintsController = ComplaintsController = __decorate([
    (0, swagger_1.ApiTags)('Complaints'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('complaints'),
    __metadata("design:paramtypes", [complaints_service_1.ComplaintsService])
], ComplaintsController);
//# sourceMappingURL=complaints.controller.js.map