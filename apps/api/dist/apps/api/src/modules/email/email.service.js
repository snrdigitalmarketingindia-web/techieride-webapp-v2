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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const resend_1 = require("resend");
let EmailService = EmailService_1 = class EmailService {
    constructor(config) {
        this.config = config;
        this.resend = null;
        this.logger = new common_1.Logger(EmailService_1.name);
        const apiKey = config.get('RESEND_API_KEY');
        const fromEmail = config.get('EMAIL_FROM', 'noreply@techieride.in');
        this.from = `TechieRide <${fromEmail}>`;
        this.appUrl = config.get('APP_URL', 'http://localhost:3000');
        this.isDev = config.get('NODE_ENV', 'development') === 'development';
        if (apiKey) {
            this.resend = new resend_1.Resend(apiKey);
            this.logger.log('Email service: Resend configured');
        }
        else {
            this.logger.warn('RESEND_API_KEY not set — emails will be logged to console (dev mode)');
        }
    }
    async sendVerificationEmail(email, fullName, token) {
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
    async sendPasswordResetEmail(email, fullName, token) {
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
    async sendEmailChangeVerification(newEmail, fullName, token, isPersonal = false) {
        const route = isPersonal ? '/profile/confirm-personal-email' : '/profile/confirm-email-change';
        const link = `${this.appUrl}${route}?token=${token}`;
        const subject = isPersonal ? 'Confirm your personal email — TechieRide' : 'Confirm your new office email — TechieRide';
        const heading = isPersonal ? 'Confirm your personal email' : 'Confirm your new office email';
        const body = isPersonal
            ? 'Click below to confirm this address as your personal notification email.'
            : 'Click below to confirm this address as your new TechieRide login email. Your current email remains active until confirmed.';
        const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">${heading}, ${fullName.split(' ')[0]}!</h2>
        <p style="color:#374151">${body}</p>
        <a href="${link}"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Confirm Email
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          This link expires in 24 hours. If you didn't request this, ignore this email.
        </p>
      </div>`;
        await this.send(newEmail, subject, html);
        this.logger.log(`Email change verification → ${newEmail} | link: ${link}`);
    }
    async sendWelcomeApprovedEmail(email, fullName, trid) {
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
    async sendWelcomeEmail(email, fullName) {
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
    async sendNotification(officialEmail, personalEmail, subject, html) {
        const to = personalEmail || officialEmail;
        await this.send(to, subject, html);
    }
    async send(to, subject, html) {
        if (!this.resend || this.isDev) {
            this.logger.debug(`\n📧 EMAIL (dev)\nTo: ${to}\nSubject: ${subject}\n`);
            return;
        }
        try {
            await this.resend.emails.send({ from: this.from, to, subject, html });
        }
        catch (err) {
            this.logger.error(`Failed to send email to ${to}: ${err.message}`);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map