# 01 — Registration

**Platform:** TechieRide v2 · **Module:** User Registration  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Registration is the trust entry gate. Only employees of whitelisted IT companies (TCS, Wipro, Infosys, etc.) may register. Every account begins as `EMAIL_VERIFICATION_PENDING` and cannot access the platform until email is verified and employee documents approved. Phone is mandatory for the call feature. No wallet, no payment — identity is the currency of trust.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| REG-01 | Happy path — corporate email registers successfully | Whitelisted domain (tcs.com) | POST /auth/register with valid corporate email, name, phone, password | 201 Created; account status = EMAIL_VERIFICATION_PENDING; verification email sent | Core registration flow | P0 |
| REG-02 | Gmail rejected at registration | None | Register with gmail.com email | 400 Bad Request; message: "Personal email not allowed" | Prevents non-employees | P0 |
| REG-03 | Yahoo mail rejected | None | Register with yahoo.com email | 400 Bad Request | Prevents non-employees | P0 |
| REG-04 | hotmail.com rejected | None | Register with hotmail.com | 400 Bad Request | Prevents non-employees | P0 |
| REG-05 | Unwhitelisted corporate domain rejected | None | Register with unknowncorp.com | 400 Bad Request; message: "Company not supported" | Domain whitelist enforcement | P0 |
| REG-06 | Duplicate email blocked | Account with same email exists | Register with existing email | 409 Conflict; message: "Email already registered" | Prevents duplicate accounts | P0 |
| REG-07 | Phone number required | None | Register without phone field | 400 Bad Request; phone is required | Call feature dependency | P0 |
| REG-08 | Phone stored with correct country code | None | Register with phone "9876543210" | Phone stored; countryCode defaults to "+91" | Call button needs +91 prefix | P1 |
| REG-09 | Password minimum length enforced | None | Register with password "abc" | 400 Bad Request; password too short | Security baseline | P1 |
| REG-10 | Password strength — no spaces | None | Register with "pass word 1" | 400 or password stored (note: enforce strong password) | Security baseline | P1 |
| REG-11 | Full name required | None | Register without fullName | 400 Bad Request | Profile completeness | P1 |
| REG-12 | Company name required | None | Register without companyName | 400 Bad Request | IT company affiliation | P1 |
| REG-13 | Account status = EMAIL_VERIFICATION_PENDING on creation | Successful registration | GET /auth/me after register | accountStatus = EMAIL_VERIFICATION_PENDING | Access control baseline | P0 |
| REG-14 | New user cannot login before email verification | Just registered | POST /auth/login | 401 or limited access; cannot reach /dashboard | Trust gate | P0 |
| REG-15 | Role not settable at registration | None | POST /auth/register with role: "ADMIN" | Role ignored; account starts as RIDE_SEEKER | Security — role escalation prevention | P0 |
| REG-16 | Email verification link sent on registration | Registration successful | Check email delivery | Verification email received within 60 seconds | Onboarding funnel | P1 |
| REG-17 | Email verification completes → DOCUMENT_VERIFICATION_PENDING | Valid verification token | GET /auth/verify-email?token=xxx | Status → DOCUMENT_VERIFICATION_PENDING; verificationMethod = EMAIL_VERIFIED | Progression gate | P0 |
| REG-18 | Invalid/expired email verification token rejected | Token expired or tampered | GET /auth/verify-email?token=invalid | 400 Bad Request; status unchanged | Token security | P0 |
| REG-19 | Exception verification path — cannot access work email | Registered but no corporate email access | POST /auth/exception-verification with details | Status → EXCEPTION_VERIFICATION_REQUESTED; admin queue updated | Alternate onboarding | P1 |
| REG-20 | Admin approves exception → EMPLOYEE_VERIFIED | Exception request submitted | Admin approves via /admin/verification | Status → EMPLOYEE_VERIFIED; TRID assigned | Exception workflow | P1 |
| REG-21 | Admin rejects exception → REJECTED | Exception request submitted | Admin rejects | Status → REJECTED; user notified | Rejection workflow | P1 |
| REG-22 | Resend verification email works | EMAIL_VERIFICATION_PENDING status | POST /auth/resend-verification | New email sent; old token invalidated | Onboarding recovery | P2 |
| REG-23 | Phone number format validation | None | Register with phone "12345" (too short) | 400 Bad Request | Data quality | P2 |
| REG-24 | Phone number uniqueness | Phone already used by another account | Register with same phone | 409 or warning | Prevents account sharing | P2 |
| REG-25 | SQL injection in email field | None | Register with email `'; DROP TABLE users;--@tcs.com` | 400 Bad Request; no DB error | Security | P0 |
| REG-26 | XSS in fullName field | None | Register with name `<script>alert(1)</script>` | 201 (stored safely) or 400; name not executed in UI | Security | P0 |
| REG-27 | Empty body rejected | None | POST /auth/register with {} | 400 Bad Request with field errors | Input validation | P1 |
| REG-28 | TRID assigned on EMPLOYEE_VERIFIED approval | Registration + email verify + doc submit | Admin approves employee docs | trid field = "TR2XXX" format | Member identity | P0 |
| REG-29 | TRID unique across all users | Multiple approvals | Check TRID values in DB | Each TRID is unique; no collisions | Member identity | P0 |
| REG-30 | Regression — re-registering after rejection | Previous account REJECTED | Register with new email same company | 201 Created new account | User recovery | P2 |

---

## UAT Acceptance Criteria

- [ ] A TCS employee can complete registration in under 2 minutes
- [ ] Gmail/personal email shows a clear, user-friendly rejection message
- [ ] Verification email arrives within 60 seconds
- [ ] Account cannot access any platform feature before employee approval
- [ ] TRID format matches "TR" + incrementing number starting from TRID_START

---

## Missing Business Rules / Risks

1. **No password complexity enforcement** — current validation may only check length; no uppercase/special char requirement
2. **No rate limiting on registration endpoint** — bot registrations possible with valid corporate domains
3. **Phone uniqueness not enforced** — two accounts could share a phone, breaking call feature
4. **No CAPTCHA on registration** — automated registrations from corporate email domains possible
5. **Verification email token has no documented expiry** — expired tokens may still work
6. **No account deactivation on company email domain removal** — employee who leaves retains access
7. **Exception verification has no SLA** — admin may never approve, leaving user stranded
8. **No notification to user when TRID is assigned** — user unaware they are now EMPLOYEE_VERIFIED
