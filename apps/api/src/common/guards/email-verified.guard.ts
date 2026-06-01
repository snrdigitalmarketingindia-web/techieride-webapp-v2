import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_UNVERIFIED_KEY } from '../decorators/allow-unverified.decorator';

const BLOCKED_STATUSES = ['DEACTIVATED', 'BANNED'];

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // JWT guard will have already rejected

    if (BLOCKED_STATUSES.includes(user.accountStatus)) {
      throw new UnauthorizedException('Your account has been deactivated. Contact support.');
    }

    if (allowUnverified) return true;

    if (user.emailStatus !== 'VERIFIED') {
      throw new ForbiddenException('Please verify your email address to access this feature.');
    }

    return true;
  }
}
