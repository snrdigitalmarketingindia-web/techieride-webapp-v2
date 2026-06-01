# ROLE SWITCHING WORKFLOW
> TechieRide Identity Architecture — v1.0

---

## 1. Design Principles

1. **Additive only at API level** — adding a role never removes existing capabilities.
2. **Removal triggers safety check** — downgrading role checks for active rides first.
3. **Single verification pipeline** — role upgrade reuses the existing verification queue.
4. **Transparent to user** — user always knows their current state and what's next.
5. **No double-billing of documents** — if user already submitted DL for GIVER, it doesn't need resubmission on BOTH.

---

## 2. Scenario Matrix

### 2.1 RIDE_SEEKER → RIDE_GIVER

| Step | Action | System |
|---|---|---|
| 1 | User clicks "Become a Ride Giver" in profile | Show upgrade modal |
| 2 | System checks: has valid Company ID doc? | If yes, skip to step 4 |
| 3 | Upload Company ID | If not already uploaded |
| 4 | Upload Driving License | Mandatory for giver |
| 5 | Upload RC (Vehicle Registration) | Mandatory for giver |
| 6 | Add vehicle details | Make, model, plate, seats |
| 7 | Submit for admin review | verificationStatus → PENDING, role stays SEEKER |
| 8 | Admin approves | role → GIVER, TRID issued (if not already), giver features unlocked |
| 9 | Welcome notification | "You're now a Ride Giver! 🚗" |

**Edge cases:**
- User already has Company ID from seeker verification → skip that step
- Vehicle plate already registered by another user → 409 Conflict
- Admin rejects DL → user notified, can re-upload, stays SEEKER

---

### 2.2 RIDE_GIVER → RIDE_SEEKER

> This is a role downgrade — user loses giver capabilities.

| Step | Action | System |
|---|---|---|
| 1 | User clicks "Switch to Seeker Only" | Warn: you'll lose giver features |
| 2 | System checks: active published/ongoing rides? | If yes → 409, must complete first |
| 3 | System checks: vehicles will be deactivated | Show confirmation |
| 4 | User confirms | role → SEEKER, vehicles marked inactive |
| 5 | Giver dashboard hidden | Seeker UI only |

**No new verification required.** Role downgrade is immediate after safety check.

**Edge cases:**
- Pending giver verification in queue → cancel the queue entry
- Has completed rides history → retained for records
- Re-upgrade later → must resubmit documents (could have expired)

---

### 2.3 RIDE_SEEKER → BOTH

Same as SEEKER → GIVER except the existing seeker role is preserved, not replaced.

| Change | Value |
|---|---|
| Before | role = RIDE_SEEKER |
| After approval | role = BOTH |
| During review | role = RIDE_SEEKER (seeker features continue) |

---

### 2.4 RIDE_GIVER → BOTH

| Step | Action | System |
|---|---|---|
| 1 | User clicks "Add Seeker Capabilities" | |
| 2 | System checks: has valid Company ID? | Likely yes (already verified) |
| 3 | No additional docs required for seeker | Seeker only needs Company ID |
| 4 | Admin auto-approves OR instant activation | Since documents already verified |
| 5 | role → BOTH | Seeker UI features unlocked immediately |

**Recommended:** GIVER → BOTH should be auto-approved since all required seeker docs are already on file.

---

### 2.5 BOTH → SEEKER

Same as GIVER → SEEKER. Giver features removed, seeker retained.

---

### 2.6 BOTH → GIVER

Removes seeker capability while retaining giver.

| Step | Action |
|---|---|
| 1 | Check: active pending/confirmed ride requests as seeker? |
| 2 | If yes → 409, must complete or cancel requests first |
| 3 | Confirm → role = GIVER |

---

## 3. Role Change State Machine

```
                    ┌─────────────────────┐
                    │     RIDE_SEEKER      │
                    └──────────┬──────────┘
                               │ Request giver upgrade
                               ▼
                    ┌─────────────────────┐
                    │  UPGRADE_PENDING    │  ← admin reviews
                    │  (still SEEKER)     │
                    └──────────┬──────────┘
                     ✅ Approve │  ❌ Reject
              ┌────────────────┤
              ▼                ▼
    ┌──────────────┐   ┌──────────────┐
    │  RIDE_GIVER  │   │  RIDE_SEEKER │ (re-upload required)
    └──────┬───────┘   └──────────────┘
           │ Add seeker
           ▼ (auto-approve)
    ┌──────────────┐
    │     BOTH     │
    └──────┬───────┘
           │ Remove giver
           ▼
    ┌──────────────┐
    │  RIDE_SEEKER │
    └──────────────┘
```

---

## 4. Role Change API Design (Recommended)

```
POST   /users/me/role-upgrade        { targetRole: 'RIDE_GIVER' | 'BOTH' }
POST   /users/me/role-downgrade      { targetRole: 'RIDE_SEEKER' | 'RIDE_GIVER' }
GET    /users/me/role-history        → [{role, changedAt, changedBy, reason}]
```

---

## 5. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-RS-01 | Role upgrade from SEEKER → GIVER requires DL + RC before submission |
| AC-RS-02 | During upgrade review, user retains current role capabilities |
| AC-RS-03 | Downgrade blocked if user has active rides |
| AC-RS-04 | GIVER → BOTH is auto-approved (no new documents needed) |
| AC-RS-05 | Role change events are stored in audit log with timestamps |
| AC-RS-06 | Admin sees pending role upgrade requests in verification queue |
| AC-RS-07 | TRID never changes on any role change |

## 6. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-RS-01 | Seeker requests giver upgrade, submits only Company ID | 400 — DL and RC required |
| TC-RS-02 | Giver downgrade with active PUBLISHED ride | 409 — complete or cancel ride first |
| TC-RS-03 | Giver → BOTH, no new doc upload | 200 — auto-approved |
| TC-RS-04 | Both → Seeker with PENDING seeker request | 409 — cancel request first |
| TC-RS-05 | Role upgrade rejected → user is still SEEKER | Role unchanged |
| TC-RS-06 | GET /users/me/role-history after 3 changes | Returns 3 entries in order |
