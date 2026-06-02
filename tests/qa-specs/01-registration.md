# TechieRide QA Spec — 01: Registration

**Module:** User Registration  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Registration is the entry point for all TechieRide users. The platform restricts access to employees of verified IT companies in Hyderabad by enforcing corporate email domain validation at signup. An account remains locked in `EMAIL_VERIFICATION_PENDING` state until the user completes email OTP verification. A unique TechieRide ID (TRID) is assigned only after employee verification is approved by admin — not at registration.

---

## Scope

- Corporate email domain whitelist enforcement
- Duplicate account prevention
- Phone number collection and uniqueness
- Password complexity rules
- Account lifecycle: EMAIL_VERIFICATION_PENDING → EMAIL_VERIFIED
- OTP delivery and expiry
- Exception path (manual domain approval)
- TRID assignment timing
- Gmail / personal email rejection

---

## Seed Accounts (for test execution)

| Role | Email | Password |
|------|-------|----------|
| New registrant | test.register@techcorp.in | TechieRide@2024 |
| Duplicate check | existing.user@infosys.com | TechieRide@2024 |
| Admin | admin@techieride.com | TechieRide@2024 |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| REG-001 | Successful registration with whitelisted corporate email | Domain `techcorp.in` is in whitelist; no existing account | 1. Navigate to /register 2. Enter firstName, lastName, email=test.new@techcorp.in, phone=9876543210, password=TechieRide@2024 3. Submit | Account created with status=EMAIL_VERIFICATION_PENDING; verification email sent; user redirected to "check your email" screen | Gateway to platform — must work reliably | P0 |
| REG-002 | Registration with Gmail rejected | — | Enter email=testuser@gmail.com, fill rest of form, submit | Error: "Personal email addresses are not allowed. Please use your corporate email." Form not submitted | Prevents non-IT employees from joining | P0 |
| REG-003 | Registration with Yahoo mail rejected | — | Enter email=testuser@yahoo.com, submit | Same rejection as REG-002 | P0 |
| REG-004 | Registration with Hotmail rejected | — | Enter email=testuser@hotmail.com, submit | Same rejection as REG-002 | P0 |
| REG-005 | Registration with unknown domain rejected | Domain `unknown-startup.io` not in whitelist | Enter email=user@unknown-startup.io, submit | Error: "Your company domain is not yet registered. Contact support@techieride.com to onboard your company." | Prevents unauthorized company employees | P0 |
| REG-006 | Duplicate email blocked | Account with email=existing.user@infosys.com already exists | Enter same email, new phone, same/different password, submit | Error: "An account with this email already exists. Please login." No duplicate record created | Data integrity; prevents ghost accounts | P0 |
| REG-007 | Duplicate phone number blocked | Account with phone=9876500000 already exists | Enter new email, phone=9876500000, submit | Error: "This phone number is already registered." No duplicate record created | Prevents account sharing / impersonation | P0 |
| REG-008 | Password below minimum length | — | Enter password=Abc@12 (6 chars), submit | Error: "Password must be at least 8 characters." | Security baseline | P0 |
| REG-009 | Password without uppercase blocked | — | Enter password=techieride@2024, submit | Error: "Password must contain at least one uppercase letter." | P0 |
| REG-010 | Password without special character blocked | — | Enter password=TechieRide2024, submit | Error: "Password must contain at least one special character." | P0 |
| REG-011 | Password without number blocked | — | Enter password=TechieRide@, submit | Error: "Password must contain at least one number." | P0 |
| REG-012 | Valid strong password accepted | — | Enter password=TechieRide@2024, submit | Registration proceeds normally | P0 |
| REG-013 | Phone number: non-10-digit rejected | — | Enter phone=987654321 (9 digits), submit | Error: "Please enter a valid 10-digit Indian mobile number." | P1 |
| REG-014 | Phone number: letters rejected | — | Enter phone=98765ABCDE, submit | Error: "Phone number must contain digits only." | P1 |
| REG-015 | Phone number: international format accepted or rejected | — | Enter phone=+919876543210, submit | System either strips +91 and accepts, or shows clear error — behavior must be documented and consistent | P1 |
| REG-016 | First name empty blocked | — | Leave firstName blank, submit | Error: "First name is required." | P1 |
| REG-017 | Last name empty blocked | — | Leave lastName blank, submit | Error: "Last name is required." | P1 |
| REG-018 | Email OTP verification — valid OTP | Account in EMAIL_VERIFICATION_PENDING | Click link in email or enter OTP within 15 min | Account status changes to EMAIL_VERIFIED; user can now log in | Core verification step | P0 |
| REG-019 | Email OTP verification — expired OTP | OTP older than 15 minutes (or configured expiry) | Enter expired OTP | Error: "This verification link has expired. Please request a new one." Account remains EMAIL_VERIFICATION_PENDING | P0 |
| REG-020 | Email OTP verification — wrong OTP | — | Enter incorrect OTP | Error: "Invalid verification code." | P0 |
| REG-021 | Resend OTP within cooldown blocked | OTP sent < 2 minutes ago | Click "Resend OTP" immediately | Error: "Please wait before requesting another code." (with countdown) | Prevents OTP spam | P1 |
| REG-022 | Resend OTP after cooldown succeeds | OTP sent > 2 minutes ago | Click "Resend OTP" | New OTP sent; old OTP invalidated | P1 |
| REG-023 | Login before email verification blocked | Account in EMAIL_VERIFICATION_PENDING | Attempt login with correct credentials | Error: "Please verify your email before logging in. Check your inbox." | P0 |
| REG-024 | TRID not assigned at registration | New account just registered | Check user profile after registration | No TRID visible; TRID is null/absent at this stage | TRID only after admin employee verification | P0 |
| REG-025 | TRID assigned after employee verification | Account EMAIL_VERIFIED; admin approves employee ID | Admin approves verification; check user profile | TRID (format: TR-XXXXXX) now visible on profile; status = EMPLOYEE_VERIFIED | P0 |
| REG-026 | Exception domain approval path | Company domain not yet whitelisted; user submits exception request | 1. On domain-rejected screen, click "Request domain approval" 2. Fill company name, HR contact 3. Submit | Exception request logged; admin notified; user receives email "We'll review your request in 2 business days" | Enables new company onboarding | P1 |
| REG-027 | SQL injection in name fields | — | Enter firstName=Robert'); DROP TABLE users;--, submit | Input sanitized; account either rejected with validation error or created with literal string; no DB damage | Security | P0 |
| REG-028 | XSS in name fields | — | Enter firstName=<script>alert(1)</script>, submit | Input escaped on display; no script executes | Security | P0 |
| REG-029 | Email case-insensitivity | Account exists with User@Infosys.com | Register with user@infosys.com (lowercase) | Detected as duplicate — emails are case-insensitive | Data integrity | P1 |
| REG-030 | Password confirm mismatch | — | Enter password=TechieRide@2024, confirmPassword=TechieRide@2025, submit | Error: "Passwords do not match." | P0 |

---

## Missing Business Rules / Risks

1. **TRID format not documented.** Is it TR-000001 (sequential), TR-RAND6 (random 6 chars), or UUID-based? Sequential IDs expose user count to competitors.
2. **Domain whitelist management UI missing.** Admins likely manage the whitelist via DB directly. A UI is needed for self-serve company onboarding.
3. **OTP expiry time not standardized.** Platform should define and document whether expiry is 15 min, 30 min, or 24 h.
4. **No rate limiting on /register endpoint.** Bots could bulk-register with synthetic corporate emails.
5. **No CAPTCHA.** Registration form is susceptible to automated abuse.
6. **Exception domain path SLA undefined.** "2 business days" is an assumption — no SLA is specified in PRD.
7. **No account deletion / right-to-erasure workflow.** DPDP Act (India) compliance requires this.
8. **Phone OTP (2FA) not present.** Registration only verifies email; phone is collected but not verified.
9. **Re-registration after account deletion not specified.** Can the same email be re-used?
10. **Partial registration recovery.** If user closes the browser mid-form, is the partially submitted data retained?
