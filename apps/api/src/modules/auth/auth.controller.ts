import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { AllowUnverified } from '../../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RegisterDto, LoginDto, ForgotPasswordDto,
  ChangePasswordDto, VerifyEmailDto, RefreshTokenDto, ExceptionVerificationDto,
} from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Get('check-domain')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Check if an email domain is valid (blocklist + MX record)' })
  checkDomain(@Query('email') email: string) {
    return this.authService.checkDomain(email);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new IT employee account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address via token link' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  @Public()
  @Post('forgot-password/preview')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview masked personal email for password reset' })
  forgotPasswordPreview(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPasswordPreview(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (temp or regular). Clears mustChangePassword flag.' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  // ── Exception verification (can't verify company email) ───────────────
  @AllowUnverified()
  @Post('exception-verification')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request manual verification when company email cannot be verified' })
  requestExceptionVerification(
    @CurrentUser('id') userId: string,
    @Body() dto: ExceptionVerificationDto,
  ) {
    return this.authService.requestExceptionVerification(userId, dto);
  }

  // ── Personal email — submit (Path A: after office email verified) ─────
  @AllowUnverified()
  @Post('personal-email')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add personal email and send verification link' })
  submitPersonalEmail(
    @CurrentUser('id') userId: string,
    @Body('personalEmail') personalEmail: string,
  ) {
    return this.authService.submitPersonalEmail(userId, personalEmail);
  }

  // ── Personal email — verify via token link ────────────────────────────
  @Public()
  @Get('verify-personal-email')
  @ApiOperation({ summary: 'Verify personal email via token link' })
  verifyPersonalEmail(@Query('token') token: string) {
    return this.authService.verifyPersonalEmail(token);
  }

  // ── Personal email — resend verification ─────────────────────────────
  @AllowUnverified()
  @Post('resend-personal-verification')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend personal email verification link' })
  resendPersonalEmailVerification(@CurrentUser('id') userId: string) {
    return this.authService.resendPersonalEmailVerification(userId);
  }

  // ── Resend bounce webhook ──────────────────────────────────────────────
  @Public()
  @Post('webhook/bounce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend bounce webhook — marks email as bounced' })
  async handleBounce(
    @Body() body: any,
    @Headers('svix-signature') signature: string,
  ) {
    // Reject if secret not configured — never allow unauthenticated webhook calls
    const webhookSecret = this.config.get('RESEND_WEBHOOK_SECRET');
    if (!webhookSecret || signature !== webhookSecret) {
      return { ok: false };
    }

    // Resend sends type: 'email.bounced' with data.to array
    if (body?.type === 'email.bounced' && body?.data?.to) {
      const emails: string[] = Array.isArray(body.data.to) ? body.data.to : [body.data.to];
      for (const email of emails) {
        await this.authService.handleEmailBounce(email);
      }
    }
    return { ok: true };
  }
}
