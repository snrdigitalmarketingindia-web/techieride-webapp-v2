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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const verification_service_1 = require("../verification/verification.service");
const trust_score_service_1 = require("../trust-score/trust-score.service");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const shared_1 = require("@techieride/shared");
let AdminController = class AdminController {
    constructor(adminService, verificationService, trustScoreService, auditLogService) {
        this.adminService = adminService;
        this.verificationService = verificationService;
        this.trustScoreService = trustScoreService;
        this.auditLogService = auditLogService;
    }
    listUsers(accountStatus, role, search, page = 1, limit = 20) {
        return this.adminService.listUsers({ accountStatus, role, search, page: +page, limit: +limit });
    }
    getUserDetail(id) {
        return this.adminService.getUserDetail(id);
    }
    suspendUser(id) {
        return this.adminService.suspendUser(id);
    }
    activateUser(id) {
        return this.adminService.activateUser(id);
    }
    getEmailPendingQueue() {
        return this.adminService.getUsersByAccountStatus('EMAIL_VERIFICATION_PENDING');
    }
    getExceptionQueue() {
        return this.verificationService.getQueue('EXCEPTION');
    }
    getDocumentQueue() {
        return this.verificationService.getQueue('EMPLOYEE');
    }
    getDriverQueue() {
        return this.verificationService.getQueue('DRIVER');
    }
    getAllPendingVerifications() {
        return this.verificationService.getPendingQueue();
    }
    reviewVerification(id, adminId, body) {
        return this.verificationService.review(id, adminId, body.decision, body.rejectionReason);
    }
    listVehicles(pending) {
        return this.adminService.listVehicles(pending === 'true');
    }
    verifyVehicle(id) {
        return this.adminService.verifyVehicle(id);
    }
    rejectVehicle(id, reason) {
        return this.adminService.rejectVehicle(id, reason);
    }
    listRides(status, search, page = 1, limit = 20) {
        return this.adminService.listAllRides({ status, search, page: +page, limit: +limit });
    }
    getAnalytics(from, to) {
        return this.adminService.getAnalytics(from ? new Date(from) : new Date(Date.now() - 30 * 86400000), to ? new Date(to) : new Date());
    }
    listActiveSos() {
        return this.adminService.listActiveSos();
    }
    resolveSos(id, adminId, notes) {
        return this.adminService.resolveSos(id, adminId, notes);
    }
    getAuditLog(actor, actorType, action, entityType, entityId, from, to, page = 1, limit = 50) {
        return this.auditLogService.query({
            actor, actorType, action, entityType, entityId,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            page: +page,
            limit: +limit,
        });
    }
    getTrustScore(id) {
        return this.trustScoreService.getScore(id);
    }
    getTrustHistory(id) {
        return this.trustScoreService.getHistory(id);
    }
    adjustTrustScore(id, adminId, delta, reason) {
        return this.trustScoreService.adminAdjust(id, delta, reason, adminId);
    }
    reinstateUser(id, adminId) {
        return this.trustScoreService.adminReinstate(id, adminId);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('accountStatus')),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserDetail", null);
__decorate([
    (0, common_1.Patch)('users/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "activateUser", null);
__decorate([
    (0, common_1.Get)('queues/email-pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getEmailPendingQueue", null);
__decorate([
    (0, common_1.Get)('queues/exception-requests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getExceptionQueue", null);
__decorate([
    (0, common_1.Get)('queues/document-pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDocumentQueue", null);
__decorate([
    (0, common_1.Get)('queues/driver-pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDriverQueue", null);
__decorate([
    (0, common_1.Get)('verification/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllPendingVerifications", null);
__decorate([
    (0, common_1.Patch)('verification/:id/review'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reviewVerification", null);
__decorate([
    (0, common_1.Get)('vehicles'),
    __param(0, (0, common_1.Query)('pending')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listVehicles", null);
__decorate([
    (0, common_1.Patch)('vehicles/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "verifyVehicle", null);
__decorate([
    (0, common_1.Patch)('vehicles/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectVehicle", null);
__decorate([
    (0, common_1.Get)('rides'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listRides", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('sos/active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listActiveSos", null);
__decorate([
    (0, common_1.Patch)('sos/:id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)('notes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "resolveSos", null);
__decorate([
    (0, common_1.Get)('audit-log'),
    __param(0, (0, common_1.Query)('actor')),
    __param(1, (0, common_1.Query)('actorType')),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('entityType')),
    __param(4, (0, common_1.Query)('entityId')),
    __param(5, (0, common_1.Query)('from')),
    __param(6, (0, common_1.Query)('to')),
    __param(7, (0, common_1.Query)('page')),
    __param(8, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Get)('users/:id/trust-score'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getTrustScore", null);
__decorate([
    (0, common_1.Get)('users/:id/trust-score/history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getTrustHistory", null);
__decorate([
    (0, common_1.Patch)('users/:id/trust-score'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)('delta')),
    __param(3, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "adjustTrustScore", null);
__decorate([
    (0, common_1.Patch)('users/:id/reinstate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reinstateUser", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(shared_1.UserRole.ADMIN),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        verification_service_1.VerificationService,
        trust_score_service_1.TrustScoreService,
        audit_log_service_1.AuditLogService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map