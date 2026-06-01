# TechieRide 2.0 — Handoff Document
> Auto-updated after every significant change in this session.
> **Last updated:** 2026-06-01 (latest: `cc86988`) — **v2.1.0.117**

---

## Project
- **Repo:** `snrdigitalmarketingindia-web/techieride-webapp-v2`
- **Local:** `/Users/apple/Documents/TechieRide/techieride-webapp-v2`
- **Stack:** NestJS API (Render) + Next.js 14 (Vercel) + Neon PostgreSQL + Upstash Redis
- **Version:** `2.1.0.115` (Major.Minor.Patch.Build)

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

> ⚠️ New signup now requires: `homeLocation`, `officeLocation`, `emergencyContactName`, `emergencyContactPhone`. Re-seed if tests fail on registration.

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

### Sessions 1 & 2 — Core Build
- [x] Vercel + Render deployed and live
- [x] Business rules: one active ride per giver, one active request per seeker
- [x] All 4 original test suites (37 + 30 + 30+ + 44 tests)
- [x] GitHub Actions CI pipeline with Playwright E2E (50 tests)

### Session 3 — QA Audit, Security Fixes & Full Test Coverage
- [x] 15 API bugs fixed (unverified publish, RC check, race condition, etc.)
- [x] 6 test suites, 320 automated checks — all green
- [x] `ci-autofix.yml` — auto-creates/closes GitHub Issues on CI failure

### Session 4 — Playwright P0 Security Tests + Email Delivery
- [x] `permission-leaks.spec.ts` (24 tests) + `verification-bypass.spec.ts` (6 tests)
- [x] `PLAYWRIGHT_BASE_URL` env var support in `playwright.config.ts`
- [x] Resend email delivery live — verified end-to-end (register → email → verify → login)
- [x] `gh` CLI authenticated
- [x] `gmail.com` whitelisted temporarily for testing (marked TEST ONLY)

### Session 5 — v2.1.0 Architecture Release

#### Schema Changes
| Field | Model | Notes |
|---|---|---|
| `trid` | User | `TR2000+` — assigned on admin approval |
| `personalEmail` | User | App notifications (any domain) |
| `bloodGroup` | User | Optional — A+/A-/B+/etc. |
| `homeLocation` | User | Text, max 15 words |
| `officeLocation` | User | Text, max 15 words |
| `boardingStatus` | RideParticipant | WAITING/BOARDED/DEBOARDED/NO_SHOW |

#### TRID System
- Format: `TR2000`, `TR2001`... (sequential, 4-digit after TR)
- **Macro:** `TRID_START = 2000` in `packages/shared/src/constants.ts` — change to continue from your existing DB
- Auto-assigned on admin approval of verification
- Welcome email sent with TRID (to personalEmail if set, else official)
- Shown as branded member card on profile page

#### Signup (4 steps)
1. Account — full name, office email, password, gender
2. Work & Contact — company, phone, personal email (optional), blood group (optional)
3. Location & Emergency — home location, office location, emergency contact name + phone
4. Role — Ride Giver / Seeker / Both

#### Document Rules (enforced at API)
| Document | Giver | Seeker |
|---|---|---|
| Company ID | ✅ Mandatory | ✅ Mandatory |
| Driving License | ✅ Mandatory | Optional |
| RC | ✅ Mandatory | Optional |

#### Dual Email Routing
| Type | Sent to |
|---|---|
| Verification, password reset, OTP | `email` (official) |
| Ride notifications, TRID welcome | `personalEmail` if set, else `email` |

#### Ride Lifecycle Changes
- **15-min hold timer removed** — seeker can confirm at any time
- **Ride start:** giver manual OR all seekers board → auto-start
- **Board:** `PATCH /rides/:id/board` — seeker marks themselves boarded
- **Deboard:** `PATCH /rides/:id/deboard` — seeker marks themselves deboarded
- **Complete:** giver only — blocked until ALL participants DEBOARDED or NO_SHOW
- **No-show:** `PATCH /rides/:id/no-show/:seekerId` — giver marks absent seeker
  - Restores seat, deducts 10 ECO points, sends email + in-app notification
- **Edit ride:** `PATCH /rides/:id/edit` — only PUBLISHED, >30 min before, no active seekers
- **Cancel ride:** must be >1 hour before departure, emails all HOLD/CONFIRMED seekers

#### Seeker Boarding Point
- `pickupName` now **required** when requesting a ride
- Modal on "Request Seat" with two input modes:
  - Text: type boarding point manually
  - Map: tap on OpenStreetMap → drop pin → drag to adjust → "Use this location"
  - Nominatim reverse geocodes pin to readable address
  - Coordinates stored alongside text

#### Incoming Requests (Giver)
- Dropdown removed — auto-loads single active ride (business rule: one active at a time)
- Shows ride info banner instead of selector

---

## 🔴 Current CI Status — FAILING (v2.1.0 breakage, fix in progress)

| Suite | Tests | Status |
|---|---|---|
| Base lifecycle | 37 | ❌ Failing |
| Extended | 30 | ❌ Failing |
| Negative/boundary | 33 | ❌ Failing |
| Business rules | 44 | ❌ Failing |
| Production coverage | 69 | ❌ Failing |
| Final gap-closing | 57 | ❌ Failing |
| Playwright E2E | ~80 | ⚠️ Unknown |

**Root cause:** `complete()` now requires ALL participants to be DEBOARDED or NO_SHOW before completing.
The test lifecycle runs: publish → request → approve → confirm → start → **complete** — but never boards/deboards the seeker first.
All tests that call `complete()` fail with: `"Cannot complete ride — 1 passenger(s) have not deboarded yet"`.

**Fix needed (Session 6 Priority #1):**
Add board + deboard calls to the test lifecycle before `complete()`:
```typescript
// After start:
await seeker.client.patch(`/rides/${rideId}/board`);   // seeker boards
await seeker.client.patch(`/rides/${rideId}/deboard`); // seeker deboards
// Then complete() will succeed
```
This must be added to: `helpers.ts completeFullRide()`, `e2e-api.ts`, `e2e-api-extended.ts`, `e2e-api-coverage.ts`, `e2e-api-final.ts`

**Already fixed in commit `cc86988`:**
- ✅ `register()` — new required fields added (`homeLocation`, `officeLocation`, `emergencyContactName`, `emergencyContactPhone`)
- ✅ `POST /ride-requests` — `pickupName` added to all test calls
- ✅ `BASE` URL reads from `API_BASE_URL` env var in all test files
- ✅ `prisma/seed.ts` — new location fields added

---

## Pending / Next Steps (Priority Order)

### 🔴 Urgent — Fix CI (do first)
1. **Add board/deboard to test lifecycle** — all test suites call `complete()` without boarding the seeker first. Fix `helpers.ts completeFullRide()` and every test that runs a full ride lifecycle:
   ```typescript
   await seeker.client.patch(`/rides/${rideId}/board`);
   await seeker.client.patch(`/rides/${rideId}/deboard`);
   // then complete()
   ```
   Affects: `helpers.ts`, `e2e-api.ts`, `e2e-api-extended.ts`, `e2e-api-coverage.ts`, `e2e-api-final.ts`

### ✅ Already done (session 5)
- ~~Update API test helpers~~ ✅ `register()` + `POST /ride-requests` fixed in `cc86988`
- ~~Update seed script~~ ✅ `prisma/seed.ts` patched with new fields
- ~~`BASE` URL hardcoded~~ ✅ All test files now read `API_BASE_URL` env var

### 🟡 Before production launch
2. **Set TRID_START** — change `TRID_START = 2000` in `packages/shared/src/constants.ts` to your current highest member number
3. **Verify `techieride.in` domain** in Resend → switch `EMAIL_FROM` to `noreply@techieride.in`
4. **Remove `gmail.com`** from `apps/api/src/config/allowed-domains.ts`

### 🟢 Features
5. **Frontend boarding UI** — giver's ONGOING ride view:
   - Participant list showing each seeker's boardingStatus (WAITING/BOARDED/DEBOARDED/NO_SHOW)
   - "Mark No Show" button per WAITING seeker
   - "Complete Ride" button greyed out until all resolved
6. **Write unit tests** — 0 unit tests exist. Start with `gamification.service.ts` + `roles.guard.ts`
7. **Notifications bell** — bell icon in nav with unread count + drawer
8. **GPS tracking UI** — real-time map view during active ride
9. **RC upload UI** — upload page for givers + RC status indicator in vehicle list

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
| Ride edit: >30 min, no active seekers | `rides.service.ts → edit()` | 400 |
| Complete: all DEBOARDED or NO_SHOW | `rides.service.ts → complete()` | 400 |
| No-show: ride ONGOING, seeker WAITING | `rides.service.ts → markNoShow()` | -10 ECO pts + email |
| Giver mandatory docs: DL + RC + CompanyID | `verification.service.ts → submitDocuments()` | 400 |
| Seeker mandatory docs: CompanyID only | `verification.service.ts → submitDocuments()` | 400 |
| Pickup name required on seat request | `create-request.dto.ts` | 400 |

---

## Key API Endpoints (New in v2.1.0)
| Method | Endpoint | Who | Notes |
|---|---|---|---|
| `PATCH` | `/rides/:id/board` | Seeker | Mark self as boarded; auto-starts when all boarded |
| `PATCH` | `/rides/:id/deboard` | Seeker | Mark self as deboarded |
| `PATCH` | `/rides/:id/no-show/:seekerId` | Giver | Mark absent seeker; -10 ECO pts |
| `PATCH` | `/rides/:id/edit` | Giver | Edit PUBLISHED ride (>30 min, no seekers) |
| `PATCH` | `/rides/:id/start` | Giver OR confirmed Seeker | Manual start override |

---

## Key Gotchas / Notes
- **TRID_START macro** — `packages/shared/src/constants.ts` — change before assigning TRIDs to real members
- **`pickupName` is now required** in `POST /ride-requests` — all test helpers need updating
- **BoardingStatus enum:** `WAITING → BOARDED → DEBOARDED` or `WAITING → NO_SHOW`
- **Complete ride** blocked if any participant is still `WAITING` or `BOARDED` — giver must mark no-show or wait for deboard
- **Dual email:** `sendNotification()` on EmailService picks `personalEmail` over `email` — use this for all non-auth emails
- **localStorage key** is `accessToken` (direct) — NOT inside a nested Zustand object
- **Ride actions** are `PATCH` not `POST` — `/publish`, `/cancel`, `/start`, `/complete`, `/board`, `/deboard`
- **Vehicles endpoint** is `GET /vehicles/my` not `/vehicles/mine`
- **Dist must be rebuilt** after every API source change: `cd apps/api && npm run build` then `git add apps/api/dist/`
- **gmail.com** is whitelisted for testing — REMOVE before production launch

---

## Version History
| Version | Build | Date | Highlights |
|---|---|---|---|
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

> ⚠️ Seed script needs updating to include new required fields (`homeLocation`, `officeLocation`, `emergencyContactName`, `emergencyContactPhone`) — otherwise re-seed will fail.

---

## Change TRID Start Number
```ts
// packages/shared/src/constants.ts
export const TRID_START = 2000; // ← set to your current highest TRID number
```
Then rebuild: `npm run build --workspace=apps/api && git add apps/api/dist/ && git commit`
