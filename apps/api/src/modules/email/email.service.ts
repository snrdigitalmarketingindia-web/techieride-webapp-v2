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
    const fromEmail = config.get<string>('EMAIL_FROM', 'noreply@techieride.in');
    this.from = `TechieRide <${fromEmail}>`;
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
    this.isDev = config.get<string>('NODE_ENV', 'development') === 'development';

    if (apiKey) {
      // Domain is in us-east-1 (North Virginia). Resend requires the baseUrl
      // to match the region when a regional domain is used — without this the
      // API returns 403 even with a valid key and verified domain.
      this.resend = new Resend(apiKey, {
        baseUrl: 'https://api.us-east-1.resend.com',
      });
      this.logger.log('Email service: Resend configured (us-east-1)');
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

  // ── Email change verification ────────────────────────────────────────────
  async sendEmailChangeVerification(newEmail: string, fullName: string, token: string, isPersonal = false) {
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

  // ── Company ID approved — next step: seeker verification ─────────────────
  // Called after EMPLOYEE / EXCEPTION verification is approved.
  // TRID is NOT assigned yet at this stage.
  async sendCompanyIdApprovedEmail(email: string, fullName: string) {
    const link = `${this.appUrl}/become-seeker`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">Company ID verified, ${fullName.split(' ')[0]}! ✅</h2>
        <p style="color:#374151">Your company identity has been confirmed by the admin. One more step to go.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0">
          <p style="color:#9a3412;font-size:14px;font-weight:600;margin:0 0 6px">Next step — Ride Seeker verification:</p>
          <ol style="color:#9a3412;font-size:14px;margin:0;padding-left:18px">
            <li>Upload a government ID (Aadhaar / PAN / Passport)</li>
            <li>Accept the self-declaration</li>
            <li>Admin reviews — your TechieRide ID (TRID) is assigned on approval</li>
          </ol>
        </div>
        <a href="${link}"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Complete Seeker Verification
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Want to offer rides instead? You can apply for Ride Giver verification from your dashboard too.<br/>
          <em>for a better society...</em>
        </p>
      </div>`;

    await this.send(email, 'Company ID verified — complete your Ride Seeker verification 🌿', html);
  }

  // ── Welcome email (after office email verification — kept for legacy use) ──
  async sendWelcomeEmail(email: string, fullName: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">Office email verified, ${fullName.split(' ')[0]}! ✅</h2>
        <p style="color:#374151">Your office email has been verified. Log in to continue your onboarding.</p>
        <a href="${this.appUrl}/login"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Log In to TechieRide
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px"><em>for a better society...</em></p>
      </div>`;

    await this.send(email, 'Office email verified — TechieRide 🌿', html);
  }

  // ── Personal email verification ─────────────────────────────────────────
  async sendPersonalEmailVerification(personalEmail: string, fullName: string, token: string) {
    const link = `${this.appUrl}/verify-personal-email?token=${token}`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">Verify your personal email, ${fullName.split(' ')[0]}!</h2>
        <p style="color:#374151">Almost there — click the button below to verify this email address.</p>
        <p style="color:#374151">This is your contact email. Admin decisions and ride notifications will be sent here.</p>
        <a href="${link}"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Verify Personal Email
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          This link expires in 24 hours.<br/>
          You will still log in to TechieRide using your <strong>office email</strong>.<br/>
          <em>for a better society...</em>
        </p>
      </div>`;

    await this.send(personalEmail, 'Verify your personal email — TechieRide', html);
    this.logger.log(`Personal email verification → ${personalEmail} | link: ${link}`);
  }

  // ── Approval notification to personal email ──────────────────────────────
  async sendApprovalNotificationToPersonalEmail(personalEmail: string, officeEmail: string, fullName: string, trid: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="${this.appUrl}/logo.png" alt="TechieRide" style="height:48px;margin-bottom:24px"/>
        <h2 style="color:#0d9488">You're approved, ${fullName.split(' ')[0]}! 🎉</h2>
        <p style="color:#374151">Your TechieRide membership has been approved by the admin.</p>
        <div style="background:#f0fdfa;border:2px solid #0d9488;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
          <p style="color:#6b7280;font-size:12px;margin:0 0 6px">Your TechieRide Member ID</p>
          <p style="color:#0d9488;font-size:28px;font-weight:bold;margin:0;letter-spacing:2px">${trid}</p>
        </div>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0">
          <p style="color:#9a3412;font-size:14px;font-weight:600;margin:0 0 4px">How to log in:</p>
          <p style="color:#9a3412;font-size:14px;margin:0">Use your <strong>office email</strong> (<em>${officeEmail}</em>) and the password you set during registration.</p>
        </div>
        <a href="${this.appUrl}/login"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Log in to TechieRide
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px"><em>for a better society...</em></p>
      </div>`;

    await this.send(personalEmail, `Welcome to TechieRide — Your ID is ${trid} 🌿`, html);
    this.logger.log(`Approval notification (personal email) → ${personalEmail}`);
  }

  // ── Notification email (uses personalEmail if available) ────────────────
  // Call this for ride/request notifications, not for auth emails
  async sendNotification(
    officialEmail: string,
    personalEmail: string | null | undefined,
    subject: string,
    html: string,
  ) {
    const to = personalEmail || officialEmail;
    await this.send(to, subject, html);
  }

  // ── Contacts CSV email ──────────────────────────────────────────────────
  // Called after every admin approval — sends the full day's approved contacts
  // as a Google Contacts–compatible CSV to the contacts inbox.
  async sendContactsCsv(
    contacts: {
      trid: string;
      fullName: string;
      companyName?: string | null;
      email: string;
      personalEmail?: string | null;
      phone?: string | null;
      homeLocation?: string | null;
      emergencyName?: string | null;
      emergencyPhone?: string | null;
      role: string; // 'Ride Seeker' | 'Ride Giver'
    }[],
  ) {
    if (!contacts.length) return;

    const to = this.config.get<string>('CONTACTS_EMAIL', 'hydtechieride@gmail.com');

    // ── Build filename: {YYYYMMDD_HHMMSS}_TR001_TR002.csv (IST) ────────────
    const nowIST = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', hour12: false })
      .replace(/[,\s]/g, '_').replace(/:/g, '').replace(/__/, '_');
    const trids = contacts.map(c => c.trid).join('_');
    const filename = `${nowIST}_${trids}.csv`;

    // ── CSV header (Google Contacts import format) ──────────────────────────
    const CSV_HEADER = 'First Name,Middle Name,Last Name,Phonetic First Name,Phonetic Middle Name,Phonetic Last Name,Name Prefix,Name Suffix,Nickname,File As,Organization Name,Organization Title,Organization Department,Birthday,Notes,Photo,Labels,E-mail 1 - Label,E-mail 1 - Value,Phone 1 - Label,Phone 1 - Value';

    const rows = contacts.map(c => {
      // First Name: "TR2001 FirstName", Last Name: "LastName Area Company"
      const nameParts = c.fullName.trim().split(/\s+/);
      const firstName = `${c.trid} ${nameParts[0]}`;
      const lastName = [nameParts.slice(1).join(' '), c.homeLocation, c.companyName]
        .filter(Boolean).join(' ');

      const notes = [
        `Name: ${c.fullName}  ${c.companyName || ''}`,
        `Mobile No: ${(c.phone || '').replace(/^\+91/, '')}`,
        `Email ID: ${c.personalEmail || c.email}`,
        c.emergencyName ? `EmergencyContPerson: ${c.emergencyName}` : null,
        c.emergencyPhone ? `EmergencyContactNo: ${c.emergencyPhone}` : null,
        c.homeLocation ? `Address: ${c.homeLocation}` : null,
        `Rider/Seeker: ${c.role}`,
      ].filter(Boolean).join('\n');

      const emailVal = c.personalEmail || c.email;
      const phoneVal = (c.phone || '').replace(/^\+91/, '');

      // Wrap notes in double-quotes, escape internal quotes
      const escapedNotes = `"${notes.replace(/"/g, '""')}"`;

      return [
        firstName, '', lastName, '', '', '', '', '', '', '',
        c.companyName || '', '', '', '',
        escapedNotes,
        '', '* myContacts',
        '* ', emailVal,
        '', phoneVal,
      ].join(',');
    });

    const csvContent = [CSV_HEADER, ...rows].join('\n');

    // ── Email with attachment ───────────────────────────────────────────────
    const dateLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const subject = `📇 TechieRide New Contacts — ${dateLabel} (${contacts.length} approved)`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px">
        <h3 style="color:#0d9488">📇 New Approved Contacts — ${dateLabel}</h3>
        <p>${contacts.length} user(s) approved today. Import the attached CSV into Google Contacts.</p>
        <ul>${contacts.map(c => `<li><strong>${c.trid}</strong> — ${c.fullName} (${c.companyName || 'N/A'}) — ${c.role}</li>`).join('')}</ul>
        <p style="color:#9ca3af;font-size:12px">Go to <a href="https://contacts.google.com">contacts.google.com</a> → Import → select the CSV file.</p>
      </div>`;

    if (!this.resend || this.isDev) {
      this.logger.debug(`\n📧 CONTACTS CSV (dev)\nTo: ${to}\nFile: ${filename}\nRows: ${rows.length}\n${csvContent}`);
      return;
    }
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        attachments: [{ filename, content: Buffer.from(csvContent).toString('base64') }],
      });
      this.logger.log(`📇 Contacts CSV (${filename}) sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Failed to send contacts CSV: ${err.message}`);
    }
  }

  // ── Internal send ───────────────────────────────────────────────────────
  private async send(to: string, subject: string, html: string) {
    if (!this.resend || this.isDev) {
      // Dev mode: log instead of send
      this.logger.debug(`\n📧 EMAIL (dev)\nTo: ${to}\nSubject: ${subject}\n`);
      return;
    }
    try {
      const result = await this.resend.emails.send({ from: this.from, to, subject, html });
      // Resend SDK returns { data, error } — check for API-level errors too
      if ((result as any)?.error) {
        const apiErr = (result as any).error;
        this.logger.error(`Resend API error sending to ${to}: [${apiErr.name}] ${apiErr.message}`);
        throw new Error(`${apiErr.name}: ${apiErr.message}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      // Re-throw — callers that don't care should wrap in .catch()
    }
  }
}
