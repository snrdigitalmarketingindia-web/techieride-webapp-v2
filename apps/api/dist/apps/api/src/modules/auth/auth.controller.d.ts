import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto, ExceptionVerificationDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private authService;
    private config;
    constructor(authService: AuthService, config: ConfigService);
    register(dto: RegisterDto): Promise<{
        message: string;
        email: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    requestExceptionVerification(userId: string, dto: ExceptionVerificationDto): Promise<{
        message: string;
    }>;
    handleBounce(body: any, signature: string): Promise<{
        ok: boolean;
    }>;
}
