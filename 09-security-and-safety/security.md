# Security & Safety — Techie Ride WebApp V2

---

## 1. Employee Verification System

### Purpose
Ensure every user is a real, currently employed IT professional. This is the foundation of platform trust.

### Verification Flow

```
1. User registers with work email
   → System validates: email domain must match known IT companies
     (list maintained in admin config; e.g., @tcs.com, @infosys.com, @wipro.com, etc.)
   → Unknown domain: flagged for manual admin review

2. User uploads Employee ID photo
   → Stored in MinIO bucket (private)
   → Status: PENDING

3. Admin reviews document
   → Checks: name matches profile, company matches email domain, ID not expired
   → Decision: APPROVED or REJECTED (with reason)

4. On APPROVED:
   → user.verification_status = APPROVED
   → Push notification + email sent
   → Full platform access unlocked

5. On REJECTED:
   → Reason displayed to user
   → User can re-upload corrected documents
   → Re-submission triggers new admin review
```

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

## 6. Authentication Security

### JWT Design
- Access token: 15-minute expiry, signed with RS256
- Refresh token: 7-day expiry, stored as httpOnly cookie
- Token blacklist via Redis on logout / suspicious activity

### OTP Security
- 6-digit OTP, 5-minute expiry
- Max 3 failed attempts before phone is locked for 30 minutes
- OTP stored as bcrypt hash in Redis (not plaintext)

### Rate Limiting
- `/auth/login`: max 5 requests per minute per IP
- `/auth/verify-otp`: max 3 attempts per OTP session
- All API endpoints: 100 req/min per user (Redis-backed)

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
