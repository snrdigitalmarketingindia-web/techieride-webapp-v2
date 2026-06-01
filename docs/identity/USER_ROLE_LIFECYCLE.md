# USER ROLE LIFECYCLE
> TechieRide Identity Architecture — v1.0
> Authors: Product Architecture Team

---

## 1. Role Model Recommendation

### Current State
Three roles exist: `RIDE_SEEKER`, `RIDE_GIVER`, `BOTH`, `ADMIN`.

### Recommendation: Option C — Unified Dual Role (BOTH as the Target State)

**Rationale:**
- BlaBlaCar, Uber, Ola all allow users to be both providers and consumers.
- IT employees commute in both directions — today a seeker, tomorrow a giver.
- Locking users to one role creates friction and reduces network density.
- Every new giver was a seeker first; blocking the upgrade path kills growth.

**Recommended Role Architecture:**

| Role | Description | Verification Required |
|---|---|---|
| `RIDE_SEEKER` | Can search, book and take rides | Company email + Company ID |
| `RIDE_GIVER` | Can publish and conduct rides | All seeker docs + DL + RC + Vehicle |
| `BOTH` | Full platform access | All of the above |
| `ADMIN` | Platform operator | Internal only — cannot self-register |

**Design Principle:** Roles should be **additive**, not exclusive. A user who adds giver capabilities should never lose seeker capabilities.

---

## 2. Role Lifecycle States

```
UNREGISTERED
    │
    ▼
EMAIL_PENDING        ← registered but email not verified
    │
    ▼
PROFILE_INCOMPLETE   ← email verified, missing required fields
    │
    ▼
VERIFICATION_PENDING ← documents submitted, awaiting admin review
    │
    ├──► REJECTED     ← documents rejected; can re-submit
    │
    ▼
ACTIVE_SEEKER        ← verified, seeker role active
    │
    ├──► UPGRADE_PENDING  ← requested giver upgrade, docs submitted
    │         │
    │         ▼
    ├──► ACTIVE_GIVER   (if registered directly as giver)
    │
    ▼
ACTIVE_BOTH          ← both roles active
    │
    ├──► ROLE_DOWNGRADE_PENDING  ← requested role reduction
    │
    ├──► SUSPENDED    ← admin action; all ride access blocked
    │
    └──► DEACTIVATED  ← user requested account deletion
```

---

## 3. Role Permissions Matrix

| Action | SEEKER | GIVER | BOTH | ADMIN |
|---|---|---|---|---|
| Search rides | ✅ | ❌ | ✅ | ✅ |
| Book a seat | ✅ | ❌ | ✅ | ❌ |
| Publish a ride | ❌ | ✅ | ✅ | ❌ |
| Start/complete ride | ❌ | ✅ | ✅ | ❌ |
| Add vehicle | ❌ | ✅ | ✅ | ❌ |
| View commute board | ✅ | ✅ | ✅ | ✅ |
| Receive ECO points | ✅ | ✅ | ✅ | ❌ |
| Appear in leaderboard | ✅ | ✅ | ✅ | ❌ |

---

## 4. Role Assignment Rules

1. **Self-registration** allows SEEKER, GIVER, or BOTH — ADMIN is blocked.
2. **BOTH is the recommended default** presented to new users.
3. Role changes require a new verification cycle for any new capability being added.
4. Role downgrades (removing capabilities) require no new documents but must be admin-confirmed if the user has active rides.
5. TRID is assigned once on first approval and never changes regardless of role updates.

---

## 5. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-RL-01 | User cannot self-assign ADMIN role |
| AC-RL-02 | Role upgrade from SEEKER → GIVER requires DL + RC + Vehicle before approval |
| AC-RL-03 | TRID does not change when role is upgraded or downgraded |
| AC-RL-04 | Active rides must be completed or cancelled before role downgrade takes effect |
| AC-RL-05 | Email verification must be completed before any role-specific feature is accessible |
| AC-RL-06 | Admin can view full role history with timestamps |

## 6. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-RL-01 | Register with role=ADMIN | 400 Bad Request |
| TC-RL-02 | Seeker submits giver upgrade with only DL (no RC) | 400 — RC required |
| TC-RL-03 | Giver completes role upgrade → TRID unchanged | TRID same as before |
| TC-RL-04 | Downgrade BOTH → SEEKER with active published ride | 409 — complete ride first |
| TC-RL-05 | Access /rides/create as RIDE_SEEKER | Redirect to /dashboard |
| TC-RL-06 | Access /rides/search with EMAIL_PENDING status | Redirect to /verify-email |
