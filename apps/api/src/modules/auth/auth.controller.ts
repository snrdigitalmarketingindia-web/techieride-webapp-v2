import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  RegisterDto, LoginDto, ForgotPasswordDto,
  ResetPasswordDto, VerifyEmailDto, RefreshTokenDto,
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
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
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
    // Verify webhook secret in production
    const webhookSecret = this.config.get('RESEND_WEBHOOK_SECRET');
    if (webhookSecret && signature !== webhookSecret) {
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
