# COMPANY CHANGE WORKFLOW
> TechieRide Identity Architecture — v1.0

---

## 1. Business Context

IT professionals in Hyderabad frequently change employers — Infosys → TCS → Wipro etc. When they do, their company email changes. This is a critical identity event because:

1. The official email is the user's **platform identity** (login credential).
2. The old email may be deactivated by the old employer.
3. The user must re-prove they belong to an approved IT company.
4. All existing ride history and TRID must be preserved.

---

## 2. Company Change Workflow

```
Step 1: User initiates company change
    Profile → "Change Company Email" → enter new email
    System: validate domain against whitelist → 403 if not allowed

Step 2: Verification sent to NEW email
    System: send verification link to new email
    User: emailStatus_new = PENDING
    User: old email still active (login still works on old email)

Step 3: User verifies new email
    User: clicks link in new email inbox
    System: swap email → email = new email, emailStatus = VERIFIED

Step 4: Update company info
    System: prompt user to update:
      - Company Name
      - Employee ID
    User: updates profile

Step 5: Document re-verification triggered
    System: set verificationStatus = PENDING
    System: mark old Company ID document as expired/replaced
    User: must re-upload Company ID for new employer

Step 6: Admin re-reviews
    Admin: sees company change event in queue (flagged as "Company Change")
    Admin: approves or rejects

Step 7: Access restored or denied
    If approved: verificationStatus = APPROVED, full access continues
    If rejected: user notified, can re-upload
```

---

## 3. Access During Company Change

| Phase | Access Level |
|---|---|
| After new email verified, before doc re-submission | Read-only (no new rides) |
| After doc re-submission, before admin review | Read-only |
| After admin approval | Full access |
| If rejected | Profile + document re-upload only |

---

## 4. TRID Handling

- TRID is **not revoked** during company change.
- TRID was assigned based on identity verification, not company affiliation.
- After approval of new company docs, TRID remains the same.

---

## 5. Ride History Handling

- All past rides (given and taken) are retained.
- Rating and ECO points are preserved.
- Active/upcoming rides are paused (read-only) during the re-verification period.

---

## 6. Audit Log Events

| Event | Logged Fields |
|---|---|
| Company change initiated | userId, oldEmail, newEmail, timestamp |
| New email verified | userId, newEmail, verifiedAt |
| Old email deactivated | userId, oldEmail, deactivatedAt |
| Company doc submitted | userId, docType, submittedAt |
| Admin review | userId, decision, reviewedBy, reviewedAt |

---

## 7. Edge Cases

| Scenario | Handling |
|---|---|
| New email domain not in whitelist | 403 — domain not allowed |
| New email belongs to existing user | 409 — email already registered |
| User abandons after verification email sent | Old email still works; pending change cancelled after 7 days |
| Admin rejects new company ID | User notified; can re-upload with correct documents |
| Old email already deactivated by employer | User cannot receive verification on old email — reset flow via admin ticket |
| User changes company email during active ride | Ride completes normally; access gating applies to new actions only |
| User changes to a non-IT domain | 403 — domain not in whitelist |

---

## 8. API Design (Recommended)

```
POST   /users/me/change-email         { newEmail: 'user@newcompany.com' }
POST   /users/me/verify-new-email     { token: '...' }
GET    /users/me/email-change-status  → { status, newEmail, expiresAt }
DELETE /users/me/cancel-email-change  → cancel pending change
```

---

## 9. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-CC-01 | Company email change requires verification of new email before old is deactivated |
| AC-CC-02 | Changing to non-whitelisted domain returns 403 |
| AC-CC-03 | Ride access suspended during re-verification (no new ride actions) |
| AC-CC-04 | TRID unchanged after company change and re-approval |
| AC-CC-05 | All company change events appear in admin audit trail |
| AC-CC-06 | Email change attempt to existing account's email returns 409 |
| AC-CC-07 | Pending email change auto-cancelled after 7 days of no action |

## 10. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-CC-01 | Change to non-whitelisted domain | 403 |
| TC-CC-02 | Change to email already used by another account | 409 |
| TC-CC-03 | Old email still logs in while change is pending | 200 — old email still valid |
| TC-CC-04 | Click verification link for new email | New email activated, old deactivated |
| TC-CC-05 | Try to book ride during re-verification period | 403 — verification pending |
| TC-CC-06 | Admin approves company change → TRID unchanged | TRID same as before |
| TC-CC-07 | Cancel pending company change | Old email remains primary |
