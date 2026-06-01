import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, ResetPasswordDto, ExceptionVerificationDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    private email;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, email: EmailService);
    register(dto: RegisterDto): Promise<{
        message: string;
        email: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    requestExceptionVerification(userId: string, dto: ExceptionVerificationDto): Promise<{
        message: string;
    }>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    handleEmailBounce(email: string): Promise<void>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    private generateTokens;
}
