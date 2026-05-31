import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private config;
    private resend;
    private readonly logger;
    private readonly from;
    private readonly appUrl;
    private readonly isDev;
    constructor(config: ConfigService);
    sendVerificationEmail(email: string, fullName: string, token: string): Promise<void>;
    sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<void>;
    sendWelcomeEmail(email: string, fullName: string): Promise<void>;
    private send;
}
