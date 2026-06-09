import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_UNVERIFIED_KEY } from '../decorators/allow-unverified.decorator';
import { ALLOW_DOCS_PENDING_KEY } from '../decorators/allow-docs-pending.decorator';

// These statuses completely block platform access — rejected at JWT layer too
const LOGIN_BLOCKED = ['DEACTIVATED', 'BANNED', 'DRAFT'];

// These statuses block everything except @AllowUnverified routes (profile, verify-email)
const EMAIL_GATE = ['EMAIL_VERIFICATION_PENDING', 'PERSONAL_EMAIL_PENDING', 'EXCEPTION_VERIFICATION_REQUESTED'];

// These statuses allow profile + document upload but not ride features
const DOCS_GATE = ['DOCUMENT_VERIFICATION_PENDING', 'REJECTED'];

// These statuses get full seeker + giver access (role guard handles giver-only routes)
const FULL_ACCESS = ['EMPLOYEE_VERIFIED', 'DRIVER_VERIFICATION_PENDING', 'DRIVER_VERIFIED'];

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // JWT guard will have already rejected

    const status: string = user.accountStatus;

    if (LOGIN_BLOCKED.includes(status)) {
      throw new UnauthorizedException('Your account is not accessible. Contact support.');
    }

    if (status === 'SUSPENDED') {
      throw new ForbiddenException('Your account is suspended. Contact support.');
    }

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowUnverified) return true;

    if (EMAIL_GATE.includes(status)) {
      throw new ForbiddenException('Please verify your email address to access this feature.');
    }

    const allowDocsPending = this.reflector.getAllAndOverride<boolean>(ALLOW_DOCS_PENDING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowDocsPending) return true;

    if (DOCS_GATE.includes(status)) {
      throw new ForbiddenException('Please complete your identity verification to access this feature.');
    }

    if (FULL_ACCESS.includes(status)) return true;

    // Unknown status — deny by default
    throw new ForbiddenException('Account verification required.');
  }
}
