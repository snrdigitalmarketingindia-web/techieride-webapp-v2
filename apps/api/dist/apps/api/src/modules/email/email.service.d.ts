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
    sendEmailChangeVerification(newEmail: string, fullName: string, token: string, isPersonal?: boolean): Promise<void>;
    sendWelcomeApprovedEmail(email: string, fullName: string, trid: string): Promise<void>;
    sendWelcomeEmail(email: string, fullName: string): Promise<void>;
    sendNotification(officialEmail: string, personalEmail: string | null | undefined, subject: string, html: string): Promise<void>;
    sendContactsCsv(contacts: {
        trid: string;
        fullName: string;
        companyName?: string | null;
        email: string;
        personalEmail?: string | null;
        phone?: string | null;
        homeLocation?: string | null;
        emergencyName?: string | null;
        emergencyPhone?: string | null;
        role: string;
    }[]): Promise<void>;
    private send;
}
