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
const BLOCKED_STATUSES = ['DEACTIVATED', 'BANNED'];
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
        const allowUnverified = this.reflector.getAllAndOverride(allow_unverified_decorator_1.ALLOW_UNVERIFIED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const { user } = context.switchToHttp().getRequest();
        if (!user)
            return true;
        if (BLOCKED_STATUSES.includes(user.accountStatus)) {
            throw new common_1.UnauthorizedException('Your account has been deactivated. Contact support.');
        }
        if (allowUnverified)
            return true;
        if (user.emailStatus !== 'VERIFIED') {
            throw new common_1.ForbiddenException('Please verify your email address to access this feature.');
        }
        return true;
    }
};
exports.EmailVerifiedGuard = EmailVerifiedGuard;
exports.EmailVerifiedGuard = EmailVerifiedGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], EmailVerifiedGuard);
//# sourceMappingURL=email-verified.guard.js.map