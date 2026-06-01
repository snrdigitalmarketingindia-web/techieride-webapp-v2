# EMAIL VERIFICATION POLICY
> TechieRide Identity Architecture — v1.0

---

## 1. Email Model

TechieRide maintains two distinct email addresses per user:

| Field | Purpose | Verification Required | Domain Restriction |
|---|---|---|---|
| `email` | Official company email — login and auth identity | ✅ Mandatory | Whitelist enforced |
| `personalEmail` | Notification delivery — optional | ❌ Not required | Any domain |

**Critical rule:** `email` (official company email) is the user's identity on the platform. It must always belong to an approved corporate domain and be verified before platform access is granted.

---

## 2. Verification Lifecycle

```
Registration
    │
    ▼
Verification email sent to company email
    │
    ├──► User clicks link within 24h → emailStatus: VERIFIED → access granted
    │
    ├──► Link expires (24h) → user must request resend
    │
    └──► User ignores → account remains EMAIL_PENDING → no platform access
```

---

## 3. Access Gate by Email Status

| Feature | EMAIL_PENDING | EMAIL_VERIFIED (docs pending) | APPROVED |
|---|---|---|---|
| Profile page | ✅ | ✅ | ✅ |
| Email verification page | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ |
| Document submission | ❌ | ✅ | ✅ |
| Ride search | ❌ | ❌ | ✅ |
| Ride booking | ❌ | ❌ | ✅ |
| Ride publishing | ❌ | ❌ | ✅ (GIVER) |
| Commute board | ❌ | ❌ | ✅ |
| Any dashboard feature | ❌ | ❌ | ✅ |

> **Current gap:** The platform currently allows login and dashboard access even with `emailStatus: PENDING`. This must be fixed — middleware must gate all routes except `/profile`, `/verify-email`, and `/logout`.

---

## 4. Allowed Domain Policy

### Current Implementation
Domains maintained in `apps/api/src/config/allowed-domains.ts`.

### Recommended Enhancement
Move domain list to database (`AllowedDomain` table) with:
- `domain` — e.g. `tcs.com`
- `companyName` — e.g. `Tata Consultancy Services`
- `isActive` — can be toggled without deployment
- `addedBy` — admin who added it
- `addedAt`

Admin UI to add/remove domains without code deployment.

### Current Domain List Coverage
✅ Major IT companies covered (TCS, Infosys, Wipro, HCL, etc.)
✅ Govt domains (gov.in, nic.in)
⚠️ gmail.com whitelisted (TEST ONLY — REMOVE before production)
❌ No domain expiry or audit trail

---

## 5. Verification Email Content (Required Fields)

```
Subject: Verify your TechieRide email — action required

Body:
- User first name
- Verification link (expires in 24 hours)
- Clear expiry timestamp
- Support contact
- Resend link
```

---

## 6. Resend Policy

| Condition | Policy |
|---|---|
| Max resends per day | 3 |
| Cooldown between resends | 60 seconds |
| Token expiry | 24 hours |
| Token invalidated on resend | Yes — old link invalid |

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-EV-01 | User with emailStatus=PENDING cannot access any feature except profile and verify-email pages |
| AC-EV-02 | Verification link expires after 24 hours |
| AC-EV-03 | Old verification link invalidated when resend is triggered |
| AC-EV-04 | Max 3 resend requests per day per account |
| AC-EV-05 | Registration with non-whitelisted domain returns 403 |
| AC-EV-06 | emailStatus=VERIFIED is set only after clicking valid unexpired link |
| AC-EV-07 | All ride-related routes return 403 with message "Please verify your email" for unverified users |

## 8. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-EV-01 | Register with gmail.com (when not whitelisted) | 403 |
| TC-EV-02 | Click expired verification link | 400 — link expired |
| TC-EV-03 | Access /rides/search with emailStatus=PENDING | 403 / redirect |
| TC-EV-04 | Request resend 4 times in one day | 429 — rate limited |
| TC-EV-05 | Click old link after resend | 400 — link already used |
| TC-EV-06 | Register, verify, change company email → feature access removed until new email verified | emailStatus reset to PENDING |
