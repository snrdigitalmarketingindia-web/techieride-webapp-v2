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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerifiedGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
const allow_unverified_decorator_1 = require("../decorators/allow-unverified.decorator");
const allow_docs_pending_decorator_1 = require("../decorators/allow-docs-pending.decorator");
const LOGIN_BLOCKED = ['DEACTIVATED', 'BANNED', 'DRAFT'];
const EMAIL_GATE = ['EMAIL_VERIFICATION_PENDING', 'EXCEPTION_VERIFICATION_REQUESTED'];
const DOCS_GATE = ['DOCUMENT_VERIFICATION_PENDING', 'REJECTED'];
const FULL_ACCESS = ['EMPLOYEE_VERIFIED', 'DRIVER_VERIFICATION_PENDING', 'DRIVER_VERIFIED'];
let EmailVerifiedGuard = class EmailVerifiedGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const { user } = context.switchToHttp().getRequest();
        if (!user)
            return true;
        const status = user.accountStatus;
        if (LOGIN_BLOCKED.includes(status)) {
            throw new common_1.UnauthorizedException('Your account is not accessible. Contact support.');
        }
        if (status === 'SUSPENDED') {
            throw new common_1.ForbiddenException('Your account is suspended. Contact support.');
        }
        const allowUnverified = this.reflector.getAllAndOverride(allow_unverified_decorator_1.ALLOW_UNVERIFIED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (allowUnverified)
            return true;
        if (EMAIL_GATE.includes(status)) {
            throw new common_1.ForbiddenException('Please verify your email address to access this feature.');
        }
        const allowDocsPending = this.reflector.getAllAndOverride(allow_docs_pending_decorator_1.ALLOW_DOCS_PENDING_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (allowDocsPending)
            return true;
        if (DOCS_GATE.includes(status)) {
            throw new common_1.ForbiddenException('Please complete your identity verification to access this feature.');
        }
        if (FULL_ACCESS.includes(status))
            return true;
        throw new common_1.ForbiddenException('Account verification required.');
    }
};
exports.EmailVerifiedGuard = EmailVerifiedGuard;
exports.EmailVerifiedGuard = EmailVerifiedGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], EmailVerifiedGuard);
//# sourceMappingURL=email-verified.guard.js.map