# Security & Safety — TechieRide WebApp v2.0_Beta

> **Version:** 2.0_Beta | **Last Updated:** May 2026

---

## 1. Employee Verification System *(Updated in v2.0_Beta)*

### Purpose
Ensure every user is a real, currently employed IT professional. This is the foundation of platform trust.

### Two-Layer Verification

**Layer 1 — Email Domain Whitelist (Automatic, at registration)**
```
User registers with office email (e.g., arjun@tcs.com)
  → API checks domain against 70+ approved IT company domains
    (tcs.com, infosys.com, wipro.com, accenture.com, cognizant.com, ...)
  → gmail/yahoo/personal domains → REJECTED immediately with clear message
  → Approved domain → account created, verification email sent
  → User must click email link to activate (emailStatus: PENDING → VERIFIED)
  → Bounced email → emailStatus: BOUNCED, account deactivated
```

**Layer 2 — Document Verification (Manual, by Admin)**
```
1. User uploads Company ID card photo
   → Stored in MinIO bucket (private)
   → verificationStatus: PENDING

2. Admin reviews document
   → Checks: name matches profile, company matches email domain, ID not expired
   → Decision: APPROVED or REJECTED (with reason)

3. On APPROVED:
   → verificationStatus = APPROVED
   → Push notification + email sent
   → Full platform access unlocked

4. On REJECTED:
   → Reason displayed to user
   → User can re-upload corrected documents
   → Re-submission triggers new admin review
```

> **Note (v2.0_Beta):** Employee ID field removed from registration — users prove
> employment by uploading their Company ID card during document verification.

### Anti-Abuse Measures
- Maximum 3 re-submission attempts per 7 days
- Domain whitelist is hardcoded in server config — not user-modifiable
- Bounced emails auto-deactivate the account via Resend webhook

### Anti-Abuse Measures
- Maximum 3 re-submission attempts per 7 days
- Flagged for manual review if same Employee ID is used by multiple accounts
- Accounts with suspicious re-submissions are soft-banned pending admin review

---

## 2. Driving License Verification

### Required For
Ride Givers only — they must hold a valid driving license to publish rides.

### Flow

```
1. Giver uploads front + back of DL
2. Admin reviews:
   - Name matches profile
   - License not expired
   - License class includes LMV (Light Motor Vehicle)
3. On approval: ride_givers.license_verified = true
4. Giver can now publish rides
```

### Notes
- DL documents are stored encrypted at rest in MinIO
- Pre-signed URLs with 15-min expiry used for admin document view
- DL number is never stored in plaintext; only the verification status is persisted

---

## 3. Vehicle RC Verification

### Required For
Ride Givers — each vehicle must have a verified RC before it can be used in a ride.

### Flow

```
1. Giver adds vehicle (make, model, color, plate, seats)
2. Uploads RC document
3. Admin reviews:
   - Plate number matches RC
   - Vehicle is not commercial (no yellow plate)
   - RC not expired
4. On approval: vehicles.rc_verified = true
5. Vehicle can now be selected when publishing rides
```

### Plate Number Handling
- Stored as plain text for search/display purposes
- Partial masking applied in public ride listings (e.g., MH12 ** 1234) until a Seeker books
- Full plate number revealed to confirmed Seekers only

---

## 4. SOS System

### Overview
The SOS system provides a last line of defense for riders in distress. It is designed to be: **one tap, immediate, unstoppable.**

### SOS Trigger

```
1. User taps SOS button (available in active ride screen)
2. System immediately:
   a. Creates SOS event record with: userId, rideId, lat, lng, timestamp
   b. Sends push notification to all user's emergency contacts
   c. Sends email to all emergency contacts (includes map link)
   d. Sends SMS via gateway to all emergency contacts
   e. Creates admin alert — appears on SOS dashboard instantly
   f. Broadcasts via WebSocket to admin room: sos:alert
3. User sees confirmation: "Your emergency contacts have been notified"
4. SOS event remains ACTIVE until admin marks RESOLVED
```

### Emergency Contacts
- Users can add up to 3 emergency contacts (name + phone + relationship)
- Contacts receive a pre-formatted message:
  > "[Name] has triggered an SOS on Techie Ride. Last known location: [map link]. Ride ID: [id]. Time: [timestamp]."

### SOS Cooldown
- No cooldown — SOS can always be triggered during an active ride
- False alarm resolution: user can cancel within 2 minutes to mark as "test/accident" — no penalty if done quickly; admin reviews if cancelled after 2 min

### Admin SOS Dashboard
- Dedicated alert section showing all active SOS events
- Each alert shows: user name, phone, ride details, live map position
- Admin can call the user directly (phone number visible)
- Resolution requires a written note

---

## 5. Live Tracking Security

### Access Control
- Only **confirmed participants** of a ride can access live GPS data
- API enforces: `ride_participants` must contain requesting userId
- Admin can access any ride tracking for safety oversight

### Data Minimization
- GPS data stored in Redis with 24-hour TTL — not retained longer
- Location history (PostgreSQL) also purged after 24 hours via a nightly cleanup job
- Giver's home address is never transmitted; tracking begins at ride start

### Tracking Link Sharing
- Seeker can generate a shareable tracking link for emergency contacts
- Link uses a signed token (JWT, 8-hour expiry, ride-scoped)
- No platform account required to view the shared link (public endpoint)
- Link expires automatically when ride ends + 1 hour

### WebSocket Security
- All WebSocket connections require valid JWT on handshake
- Participants are only joined to rooms for rides they are confirmed in
- Server-side room validation on every GPS broadcast

---

## 6. Authentication Security *(Updated in v2.0_Beta)*

### Auth Method
- **Email + Password** (replaces Phone OTP in v1)
- Password: bcrypt, 12 rounds
- Minimum 8 characters enforced at API and UI level

### JWT Design
- Access token: 15-minute expiry, HS256
- Refresh token: 7-day expiry
- `isActive` checked on every authenticated request via JWT strategy — suspended users blocked immediately (not just at token refresh)

### Email Verification Security
- Verification token: 32-byte cryptographic random hex
- Token expiry: 24 hours
- Token is single-use (cleared after verification)
- Password reset token: 32-byte hex, 1-hour expiry

### Domain Whitelist
- 70+ approved IT company domains — server-side config (`allowed-domains.ts`)
- Cannot be bypassed via API — checked in `AuthService.register()` before user creation
- Personal emails (gmail, yahoo, etc.) return 403 immediately

### Rate Limiting
- `/auth/login`: max 10 requests per minute per IP
- `/auth/forgot-password`: max 3 requests per minute per IP
- `/auth/resend-verification`: max 3 requests per minute per IP
- 401 interceptor in frontend skips retry for `/auth/*` endpoints — no silent swallowing of auth errors

---

## 7. Data Privacy

### Personal Data Handling

| Data | Retention | Visibility |
|------|-----------|------------|
| Phone number | Account lifetime | Masked in public profiles |
| Work email | Account lifetime | Never shown publicly |
| GPS location | 24 hours post-ride | Participants + admin only |
| Documents (DL, RC, ID) | Verification decision + 90 days | Admin only |
| Ride history | 1 year | User + admin |
| Ratings | Indefinite | Public (no name attached to individual review) |

### Data Deletion (Right to Erasure)
- Users can request account deletion from profile settings
- On deletion:
  - PII anonymized (name → "Deleted User", phone/email cleared)
  - Documents deleted from MinIO within 24 hours
  - Ride history retained in anonymized form for platform analytics
  - GPS history purged immediately

### Third-Party Data Sharing
- No user data shared with third parties for advertising
- FCM receives only: FCM device token + notification payload (no PII)
- OSM/OSRM queries use lat/lng only — no user identity attached

---

## 8. Incident Response

| Incident Type | Detection | Response |
|--------------|-----------|---------|
| SOS event | User tap | Immediate notification + admin alert |
| Unverified document fraud | Admin review | Account ban + report |
| Suspicious GPS spoofing | Velocity check (>200 km/h) | Flag ride, notify admin |
| Multiple accounts (same phone) | DB unique constraint | Registration blocked |
| Abusive behaviour report | User report button | Admin review within 24h |
