# TechieRide 2.0 — Handoff Document
> Auto-updated after every significant change in this session.
> **Last updated:** 2026-06-01 (latest: `ef233f5`) — **v2.1.0.122**

---

## Project
- **Repo:** `snrdigitalmarketingindia-web/techieride-webapp-v2`
- **Local:** `/Users/apple/Documents/TechieRide/techieride-webapp-v2`
- **Stack:** NestJS API (Render) + Next.js 14 (Vercel) + Neon PostgreSQL + Upstash Redis
- **Version:** `2.1.0.122` (Major.Minor.Patch.Build)
- **Identity Specs:** `docs/identity/` — 9 production-grade design documents

---

## Live URLs
| Service | URL |
|---|---|
| Frontend | https://techieride-webapp-v2-web.vercel.app |
| API | https://techieride-webapp-v2.onrender.com |
| API Docs | https://techieride-webapp-v2.onrender.com/api/docs |
| CI/CD | https://github.com/snrdigitalmarketingindia-web/techieride-webapp-v2/actions |

---

## Test Accounts (`TechieRide@2024`)
| Email | Role | Notes |
|---|---|---|
| admin@techieride.in | Admin | |
| csr@csr.com | Admin | |
| priya@infosys.com | Ride Giver | APPROVED · vehicle TS09AB5678 rcVerified ✅ |
| raju@raju.com | Ride Giver | APPROVED · vehicle TS07RJ1234 |
| arjun@tcs.com | Ride Seeker | APPROVED |
| raghu@raghu.com | Ride Seeker | |
| ravi@wipro.com | Both | APPROVED · vehicle TS07VK5678 rcVerified ✅ |

---

## Infrastructure
- **Neon DB:** `postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Redis:** Upstash `rediss://default:...@charmed-viper-110569.upstash.io:6379`
- **Render env vars:** `RESEND_API_KEY`, `APP_URL`, `EMAIL_FROM`, `NODE_ENV=production`, `FRONTEND_URL`, `REDIS_URL`
- **Vercel env vars:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- **Email:** Resend configured — `EMAIL_FROM=onboarding@resend.dev` (temp until `techieride.in` domain verified)
- **gh CLI:** Installed v2.93.0, authenticated as `snrdigitalmarketingindia-web`

---

## Session History — What Was Done

### Sessions 1–5 — Core Build through v2.1.0 Architecture
See version history table below for summary.

### Session 6 — CI Fix + Frontend Features

#### CI Root Causes Fixed
| Bug | Fix |
|---|---|
| All suites failing — complete() blocked | board+deboard added to test lifecycle helpers |
| TRID generates as TR0NaN | `TRID_START` missing from `packages/shared/src/constants.js` (stale build) |
| board/deboard 500 errors | `SEEKER_BOARDED/DEBOARDED/NO_SHOW` + `BoardingStatus` missing from `enums.js` |
| holdExpiresAt assertion failures | Hold timer removed in v2.1.0 — stale test assertions removed |
| Negative test runner crash | `registerAndLogin()` missing required fields |

> ⚠️ **Critical gotcha:** `packages/shared/src/*.js` and `*.d.ts` are hand-compiled. Any new TS enum values or constants MUST also be added to the `.js`/`.d.ts` files manually.

#### Frontend Delivered
- **Boarding UI** (`/rides/[id]`): participant boardingStatus badges, No Show button, locked Complete Ride until all resolved
- **Requests page redesigned**: no tabs — role-aware, requests as inline sub-tree under each ride for givers
- **My Rides tabs**: role-aware — pure seekers/givers see no tab; BOTH sees switcher
- **Ride Seat count badge** on request page ride headers
- **Commute Board** (`/rides/board`): date range presets, fill rate bars, route pattern analytics, `GET /rides/community` endpoint
- **Role-gated UI**: seekers cannot see Offer Ride, Add Vehicle, /rides/create redirects them
- **Request button**: pre-disabled if seeker already has active request; inline errors instead of alert()
- **Version string**: wired to `package.json` via `NEXT_PUBLIC_APP_VERSION` — no more hardcoded v2.0_Beta

---

## 🔴 Identity Architecture — Implementation Backlog
> Full specs in `docs/identity/` — 9 documents, 1357 lines

### Priority 1 — Critical (Security & Access Control)

#### 1.1 Email Verification Gate (CRITICAL)
**Spec:** `docs/identity/EMAIL_VERIFICATION_POLICY.md`
**Problem:** Users with `emailStatus=PENDING` can currently access ALL features including ride booking. This must be gated.
**Fix needed:**
- Add NestJS middleware/guard that checks `emailStatus` on every protected route
- Return 403 with redirect to `/verify-email` if not verified
- Allowed without verification: `/profile`, `/verify-email`, `/logout` only

**Files:**
- `apps/api/src/common/guards/` — add `EmailVerifiedGuard`
- `apps/api/src/modules/auth/` — apply guard globally, exclude allowed routes
- `apps/web/src/middleware.ts` or layout — show verification banner persistently

---

#### 1.2 Account Status Model (CRITICAL)
**Spec:** `docs/identity/ACCOUNT_STATUS_MODEL.md`
**Problem:** Only `verificationStatus` (3 values) and `emailStatus` (2 values) exist. Need 11-state `accountStatus` field.
**New states:** `DRAFT`, `EMAIL_PENDING`, `PROFILE_INCOMPLETE`, `DOCS_PENDING`, `UNDER_REVIEW`, `ACTIVE`, `UPGRADE_PENDING`, `COMPANY_CHANGE`, `SUSPENDED`, `REJECTED`, `DEACTIVATED`, `BANNED`

**Schema change needed:**
```prisma
model User {
  accountStatus AccountStatus @default(EMAIL_PENDING)
}

enum AccountStatus {
  DRAFT EMAIL_PENDING PROFILE_INCOMPLETE DOCS_PENDING UNDER_REVIEW
  ACTIVE UPGRADE_PENDING COMPANY_CHANGE SUSPENDED REJECTED DEACTIVATED BANNED
}
```

**Files:**
- `prisma/schema.prisma` — add `AccountStatus` enum + field
- `apps/api/src/modules/auth/auth.service.ts` — set on register
- `apps/api/src/modules/verification/verification.service.ts` — update on approval/rejection
- Seed: update all APPROVED users to `ACTIVE`

---

### Priority 2 — High (Role Switching)

#### 2.1 Role Upgrade Flow (SEEKER → GIVER → BOTH)
**Spec:** `docs/identity/ROLE_SWITCHING_WORKFLOW.md`
**New API endpoints:**
```
POST   /users/me/role-upgrade        { targetRole: 'RIDE_GIVER' | 'BOTH' }
POST   /users/me/role-downgrade      { targetRole: 'RIDE_SEEKER' | 'RIDE_GIVER' }
GET    /users/me/role-history
```
**Rules:**
- Upgrade requires missing docs (DL+RC for giver features)
- Downgrade blocked if active rides exist
- GIVER→BOTH is auto-approved (docs already on file)
- TRID never changes on role change
- During upgrade review, user retains current role capabilities

**Files:**
- `apps/api/src/modules/users/users.controller.ts` — new endpoints
- `apps/api/src/modules/users/users.service.ts` — upgrade/downgrade logic
- `apps/api/src/modules/verification/` — role upgrade enters same queue with flag
- `prisma/schema.prisma` — `RoleHistory` model
- `apps/web` — Role upgrade wizard UI (3-step: docs → vehicle → review)

---

#### 2.2 Company Email Change Workflow
**Spec:** `docs/identity/COMPANY_CHANGE_WORKFLOW.md`
**New API endpoints:**
```
POST   /users/me/change-email        { newEmail }
POST   /users/me/verify-new-email    { token }
GET    /users/me/email-change-status
DELETE /users/me/cancel-email-change
```
**Rules:**
- New email must be on whitelist
- Old email remains active during transition
- After new email verified → docs re-verification triggered
- Access read-only during re-verification
- TRID and history preserved

**Files:**
- `apps/api/src/modules/users/` — new email change endpoints
- `apps/api/src/modules/email/email.service.ts` — new email templates
- `prisma/schema.prisma` — `pendingEmail`, `pendingEmailToken`, `pendingEmailExpiresAt` fields on User
- `apps/web` — Company Change form UI

---

### Priority 3 — High (Profile & Documents)

#### 3.1 Profile Management Completion
**Spec:** `docs/identity/PROFILE_MANAGEMENT_SPEC.md`
**Missing:**
- Inline field editing (currently full form submit)
- Profile photo upload (MinIO)
- Mobile number change with OTP
- Ride preferences (music, AC, conversation, pet, luggage)
- Notification preferences (per-channel toggles)
- Emergency contact editable post-signup
- Profile completeness score (0–100%)

**Files:**
- `apps/web/src/app/(dashboard)/profile/page.tsx` — redesign to tabs + inline editing
- `apps/api/src/modules/users/users.service.ts` — add updatePreferences, updatePhoto
- `apps/api/src/modules/users/dto/` — new preference DTOs
- New profile tabs: Personal, Company, Vehicles, Documents, Preferences, Security

---

#### 3.2 Document Verification Enhancements
**Spec:** `docs/identity/DOCUMENT_VERIFICATION_RULES.md`
**Missing:**
- DL expiry date capture + validation (must be ≥6 months from submission)
- RC expiry date capture + validation (must be ≥3 months)
- Expiry alert system (30/15/7/0 days before expiry)
- Individual document approve/reject by admin
- Document re-upload after initial submission
- Document version history

**Schema changes:**
```prisma
model VerificationRequest {
  dlExpiryDate DateTime?
  rcExpiryDate DateTime?
  dlNumber     String?
  rcNumber     String?
}
model Vehicle {
  rcExpiryDate DateTime?
}
```

---

### Priority 4 — Medium (Admin & Audit)

#### 4.1 Admin Dashboard Enhancements
**Spec:** `docs/identity/ADMIN_VISIBILITY_REQUIREMENTS.md`
**Missing admin capabilities (11 items):**
- Per-user tabs: Identity, Verification, Company, Vehicles, Rides, Violations, Audit Log
- Role history view
- Email change history
- Document history (all versions)
- Individual document approve/reject
- Expiring DL/RC alert list (`GET /admin/verification/expiring?daysAhead=30`)
- Suspension management (suspend/unsuspend/ban)
- No-show strike tracking
- Verification queue filters (NEW_USER vs UPGRADE vs COMPANY_CHANGE)
- SLA indicator on verification queue (warn after 24h)
- Enhanced analytics dashboard

**New API endpoints:**
```
GET  /admin/users/:id/role-history
GET  /admin/users/:id/email-history
GET  /admin/users/:id/document-history
GET  /admin/users/:id/audit-log
GET  /admin/users/:id/violations
PATCH /admin/verification/:id/review-document  { documentType, decision, reason }
GET  /admin/verification/expiring              ?daysAhead=30
POST /admin/users/:id/suspend                  { reason, durationDays }
POST /admin/users/:id/unsuspend
POST /admin/users/:id/ban                      { reason }
```

---

#### 4.2 No-Show Strike System
**Spec:** `docs/identity/ACCOUNT_STATUS_MODEL.md`
**Rules:**
- 1st no-show: -10 ECO points, warning
- 2nd no-show (within 30 days): 48h suspension
- 3rd no-show (within 30 days): 7-day suspension
- Strike resets after 30 days clean
- 3 strikes of different types → permanent review

**Files:**
- `apps/api/src/modules/rides/rides.service.ts` — `markNoShow()` already exists, add strike logic
- `prisma/schema.prisma` — `NoShowStrike` model
- New scheduled job: auto-lift suspensions when duration expires

---

### Priority 5 — Medium (UX Screens)

**Spec:** `docs/identity/UI_UX_RECOMMENDATIONS.md`

| Screen | Route | Status |
|---|---|---|
| Role Upgrade Wizard | `/profile/upgrade` | ❌ Not built |
| Company Change Form | `/profile/company-change` | ❌ Not built |
| Document Renewal | `/profile/documents` | ❌ Not built |
| Notification Preferences | `/profile/notifications` | ❌ Not built |
| Ride Preferences | `/profile/preferences` | ❌ Not built |
| Account Deactivation | `/profile/deactivate` | ❌ Not built |
| Suspension Notice | `/suspended` | ❌ Not built |
| Verification Banner | All pages | ⚠️ Partial |
| Profile Tabs | `/profile` | ❌ Redesign needed |

---

## Pending / Carry-Forward (Non-Identity)

| Task | Note |
|---|---|
| Rides sorted descending | Sort by departureDate DESC in `getGivenRides()` and `getTakenRides()` |
| Unit tests | 0 unit tests exist — start with `gamification.service.ts` + `roles.guard.ts` |
| Notifications bell | Bell icon in nav with unread count + drawer |
| GPS tracking UI | Real-time map view during active ride |
| RC upload UI | Upload page for givers + RC status indicator |
| Verify techieride.in domain | Switch `EMAIL_FROM` to `noreply@techieride.in` in Resend |
| Remove gmail.com | Remove from `allowed-domains.ts` before production launch |
| Set TRID_START | Update in both `constants.ts` AND `constants.js` |

---

## Business Rules (API Enforced) — Full List
| Rule | File | Behaviour |
|---|---|---|
| One active ride per giver | `rides.service.ts → publish()` | PUBLISHED/ONGOING → 400 |
| Giver must be APPROVED | `rides.service.ts → publish()` | verificationStatus → 403 |
| Vehicle RC must be verified | `rides.service.ts → publish()` | rcVerified → 403 |
| One active request per seeker | `ride-requests.service.ts → create()` | PENDING/HOLD/CONFIRMED → 409 |
| BOTH cannot request own ride | `ride-requests.service.ts → create()` | 403 |
| Cannot delete vehicle in active ride | `vehicles.service.ts → remove()` | 409 |
| Duplicate plate | `vehicles.service.ts → create()` | Prisma P2002 → 409 |
| Ride cancel > 1 hour before (non-admin) | `rides.service.ts → cancel()` | 400 |
| Complete: all DEBOARDED or NO_SHOW | `rides.service.ts → complete()` | 400 |
| No seats available | `ride-requests.service.ts → create()` | availableSeats ≤ 0 → 400 |
| No-show: ride ONGOING, seeker WAITING | `rides.service.ts → markNoShow()` | -10 ECO pts + email |
| Giver mandatory docs: DL + RC + CompanyID | `verification.service.ts` | 400 |
| Seeker mandatory docs: CompanyID only | `verification.service.ts` | 400 |
| Pickup name required on seat request | `create-request.dto.ts` | 400 |

---

## Key Gotchas / Notes
- **COMPILED PACKAGE FILES** — `packages/shared/src/*.js` and `*.d.ts` are runtime. Any new TS enum values or constants MUST also be added to the `.js` and `.d.ts` files manually.
- **TRID_START macro** — change in BOTH `constants.ts` AND `constants.js` before production
- **`pickupName` is now required** in `POST /ride-requests`
- **BoardingStatus enum:** `WAITING → BOARDED → DEBOARDED` or `WAITING → NO_SHOW`
- **Complete ride** blocked if any participant is still `WAITING` or `BOARDED`
- **Dual email:** `sendNotification()` on EmailService picks `personalEmail` over `email`
- **localStorage key** is `accessToken` (direct)
- **Ride actions** are `PATCH` not `POST`
- **Vehicles endpoint** is `GET /vehicles/my` not `/vehicles/mine`
- **gmail.com** is whitelisted for testing — REMOVE before production launch

---

## Version History
| Version | Build | Date | Highlights |
|---|---|---|---|
| 2.1.0 | 122 | 2026-06-01 | Session 6: CI fixed, boarding UI, commute board, role-gated UI, identity specs |
| 2.1.0 | 115 | 2026-06-01 | Full architecture: TRID, boarding lifecycle, dual email, no-show, map picker |
| 2.0.4 | 112 | 2026-06-01 | Playwright P0 tests, email delivery, gh CLI, version tracking |
| 2.0.3 | 95 | 2026-06-01 | QA audit, 15 bug fixes, 320 automated checks |
| 2.0.2 | 65 | 2026-06-01 | Business rules, 4 test suites, CI pipeline |
| 2.0.1 | 1 | 2026-05-01 | Initial full-stack scaffold |

---

## Re-seed Database
```bash
cd /Users/apple/Documents/TechieRide/techieride-webapp-v2
DATABASE_URL="postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  apps/api/node_modules/.bin/ts-node --project apps/api/tsconfig.json prisma/seed.ts
```

## Change TRID Start Number
```ts
// packages/shared/src/constants.ts
export const TRID_START = 2000;
```
Also update `packages/shared/src/constants.js`:
```js
exports.TRID_START = 2000;
```
