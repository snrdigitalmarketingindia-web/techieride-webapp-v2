import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly appUrl: string;
  private readonly isDev: boolean;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('EMAIL_FROM', 'noreply@techieride.in');
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
    this.isDev = config.get<string>('NODE_ENV', 'development') === 'development';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service: Resend configured');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console (dev mode)');
    }
  }

  // ── Verification email ──────────────────────────────────────────────────
  async sendVerificationEmail(email: string, fullName: string, token: string) {
    const link = `${this.appUrl}/verify-email?token=${token}`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">Verify your email, ${fullName.split(' ')[0]}!</h2>
        <p style="color:#374151">Welcome to TechieRide — Hyderabad's verified IT carpooling network.</p>
        <p style="color:#374151">Click the button below to verify your office email and activate your account.</p>
        <a href="${link}"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          This link expires in 24 hours. If you didn't register, ignore this email.<br/>
          <em>for a better society...</em>
        </p>
      </div>`;

    await this.send(email, 'Verify your TechieRide account', html);
    this.logger.log(`Verification email → ${email} | link: ${link}`);
  }

  // ── Password reset email ────────────────────────────────────────────────
  async sendPasswordResetEmail(email: string, fullName: string, token: string) {
    const link = `${this.appUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">Reset your password</h2>
        <p style="color:#374151">Hi ${fullName.split(' ')[0]}, we received a request to reset your TechieRide password.</p>
        <a href="${link}"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
      </div>`;

    await this.send(email, 'Reset your TechieRide password', html);
    this.logger.log(`Password reset email → ${email}`);
  }

  // ── Welcome email after admin approval (includes TRID) ──────────────────
  async sendWelcomeApprovedEmail(email: string, fullName: string, trid: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">You're verified, ${fullName.split(' ')[0]}! 🎉</h2>
        <p style="color:#374151">Your TechieRide membership has been approved.</p>
        <div style="background:#f0fdfa;border:2px solid #0d9488;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
          <p style="color:#6b7280;font-size:12px;margin:0 0 6px">Your TechieRide Member ID</p>
          <p style="color:#0d9488;font-size:28px;font-weight:bold;margin:0;letter-spacing:2px">${trid}</p>
        </div>
        <p style="color:#374151">You can now publish rides, request seats, and be part of Hyderabad's verified IT carpool network.</p>
        <a href="${this.appUrl}/dashboard"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Go to Dashboard
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px"><em>for a better society...</em></p>
      </div>`;

    await this.send(email, `Welcome to TechieRide — Your ID is ${trid} 🌿`, html);
  }

  // ── Welcome email (after email verification) ─────────────────────────────
  async sendWelcomeEmail(email: string, fullName: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">You're in, ${fullName.split(' ')[0]}! 🎉</h2>
        <p style="color:#374151">Your email is verified. Welcome to TechieRide v2.0_Beta.</p>
        <p style="color:#374151">You can now log in, complete your profile, and start sharing rides with verified colleagues.</p>
        <a href="${this.appUrl}/login"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Go to TechieRide
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px"><em>for a better society...</em></p>
      </div>`;

    await this.send(email, 'Welcome to TechieRide! 🌿', html);
  }

  // ── Internal send ───────────────────────────────────────────────────────
  private async send(to: string, subject: string, html: string) {
    if (!this.resend || this.isDev) {
      // Dev mode: log instead of send
      this.logger.debug(`\n📧 EMAIL (dev)\nTo: ${to}\nSubject: ${subject}\n`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      // Don't throw — email failure should not block registration
    }
  }
}
