# ACCOUNT STATUS MODEL
> TechieRide Identity Architecture — v1.0

---

## 1. Recommended Account States

The current implementation uses only `verificationStatus` (PENDING / APPROVED / REJECTED) and `emailStatus` (VERIFIED / PENDING). This is insufficient. A proper account status model is required.

### Proposed `accountStatus` Field

| Status | Description | Access Level |
|---|---|---|
| `DRAFT` | Registered, email not sent yet (e.g. API registration without UI) | None |
| `EMAIL_PENDING` | Registered, verification email sent, not clicked | Profile + Verify only |
| `PROFILE_INCOMPLETE` | Email verified, missing required profile fields | Profile only |
| `DOCS_PENDING` | Profile complete, documents not yet submitted | Profile + Docs |
| `UNDER_REVIEW` | Documents submitted, awaiting admin | Profile + Docs (read-only) |
| `ACTIVE` | Fully verified and approved | Full access per role |
| `UPGRADE_PENDING` | Role upgrade requested, under review | Current role access only |
| `COMPANY_CHANGE` | Company email change in progress | Read-only access |
| `SUSPENDED` | Admin suspended — policy violation | Profile + Logout only |
| `REJECTED` | Documents rejected | Profile + re-upload |
| `DEACTIVATED` | User requested account closure | Login denied |
| `BANNED` | Permanent ban — severe violation | Login denied |

---

## 2. Status Transition Map

```
DRAFT ──────────────────────────────────────► EMAIL_PENDING
                                                    │
                              ┌─────────────────────┘
                              ▼
                       PROFILE_INCOMPLETE
                              │
                              ▼
                         DOCS_PENDING ──► UNDER_REVIEW
                                               │
                                    ┌──────────┤
                                    ▼          ▼
                                 ACTIVE    REJECTED
                                    │          │
                    ┌───────────────┤    re-upload → UNDER_REVIEW
                    │               │
                    ▼               ▼
             UPGRADE_PENDING  COMPANY_CHANGE
                    │               │
                    ▼               ▼
                 ACTIVE          ACTIVE
                    │
          ┌─────────┤──────────┐
          ▼         ▼          ▼
      SUSPENDED  DEACTIVATED  BANNED
```

---

## 3. Current vs Proposed Status Mapping

| Current | Maps to New | Gap |
|---|---|---|
| emailStatus=PENDING | EMAIL_PENDING | ✅ captured |
| emailStatus=VERIFIED + verificationStatus=PENDING | DOCS_PENDING or UNDER_REVIEW | ⚠️ ambiguous |
| verificationStatus=APPROVED | ACTIVE | ✅ captured |
| verificationStatus=REJECTED | REJECTED | ✅ captured |
| isActive=false | SUSPENDED or DEACTIVATED | ⚠️ not distinguished |
| — | DRAFT | ❌ missing |
| — | PROFILE_INCOMPLETE | ❌ missing |
| — | UPGRADE_PENDING | ❌ missing |
| — | COMPANY_CHANGE | ❌ missing |
| — | BANNED | ❌ missing |

---

## 4. Access Control by Account Status

| Route Type | ACTIVE | UNDER_REVIEW | REJECTED | SUSPENDED | DEACTIVATED/BANNED |
|---|---|---|---|---|---|
| Login | ✅ | ✅ | ✅ | ✅ | ❌ |
| Profile | ✅ | ✅ | ✅ | ✅ | ❌ |
| Document upload | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ride search | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ride booking | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ride publishing | ✅ (GIVER) | ❌ | ❌ | ❌ | ❌ |

---

## 5. Suspension Model

| Suspension Type | Initiated By | Duration | Impact |
|---|---|---|---|
| No-show violation | System (3 strikes) | 7 days | Cannot book rides |
| Late cancel violation | System (5 strikes) | 48 hours | Cannot book rides |
| Policy violation | Admin | Indefinite | Full platform block |
| Permanent ban | Admin | Permanent | Login denied |

### No-Show Strike System
- 1st no-show: -10 ECO points, warning notification
- 2nd no-show (within 30 days): -10 ECO points, 48h suspension
- 3rd no-show (within 30 days): 7-day suspension
- Reset after 30 days with no violations

---

## 6. Deactivation Flow

User-initiated:
1. Request account deactivation from profile
2. Confirm all active rides are completed
3. 30-day cooling period (can reactivate)
4. After 30 days: data anonymised, account marked DEACTIVATED

Admin-initiated:
1. Admin marks account DEACTIVATED with reason
2. User notified via email
3. Login blocked immediately

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-AS-01 | SUSPENDED user cannot book or publish rides |
| AC-AS-02 | DEACTIVATED user cannot log in |
| AC-AS-03 | BANNED user login attempt returns 403 with clear message |
| AC-AS-04 | 3rd no-show within 30 days triggers automatic 7-day suspension |
| AC-AS-05 | Admin can see current accountStatus for every user |
| AC-AS-06 | Suspension reason is stored and visible to admin |
| AC-AS-07 | User notified of suspension with reason and duration |

## 8. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-AS-01 | Login with DEACTIVATED account | 401 — account deactivated |
| TC-AS-02 | Book ride with SUSPENDED account | 403 — account suspended |
| TC-AS-03 | 3rd no-show in 30 days | accountStatus → SUSPENDED for 7 days |
| TC-AS-04 | Suspended user tries to publish ride | 403 |
| TC-AS-05 | Admin lifts suspension | accountStatus → ACTIVE |
| TC-AS-06 | Reactivate deactivated account within 30-day window | 200 — reactivated |
