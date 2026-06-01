# TechieRide 2.0 — Handoff Document
> Auto-updated after every significant change in this session.
> **Last updated:** 2026-06-01 (latest: `6022d79`) — **v2.1.0.122**

---

## Project
- **Repo:** `snrdigitalmarketingindia-web/techieride-webapp-v2`
- **Local:** `/Users/apple/Documents/TechieRide/techieride-webapp-v2`
- **Stack:** NestJS API (Render) + Next.js 14 (Vercel) + Neon PostgreSQL + Upstash Redis
- **Version:** `2.1.0.122` (Major.Minor.Patch.Build)

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

### Session 6 — CI Fix + Frontend Boarding UI

#### CI Root Causes Fixed
| Bug | Root Cause | Fix |
|---|---|---|
| All suites failing — complete() blocked | `board + deboard` missing before `complete()` in test lifecycle | Added to `helpers.ts`, `e2e-api.ts`, `e2e-api-final.ts` |
| TRID generates as `TR0NaN` → unique constraint crash | `TRID_START` missing from `packages/shared/src/constants.js` (stale build) | Added `exports.TRID_START = 2000` |
| board/deboard endpoints 500 | `SEEKER_BOARDED`, `SEEKER_DEBOARDED`, `SEEKER_NO_SHOW` missing from `enums.js` (stale build) | Added 3 NotificationType values |
| `BoardingStatus` enum undefined at runtime | `BoardingStatus` enum entirely absent from `enums.js` (stale build) | Added full enum to JS + d.ts |
| Stale test assertion | `holdExpiresAt` checked in test but hold timer removed in v2.1.0 | Removed assertion |

> ⚠️ **Key gotcha for future sessions:** `packages/shared/src/*.js` and `*.d.ts` are the COMPILED outputs used at runtime. Any new constants or enum values added to `.ts` files MUST also be manually added to the corresponding `.js` and `.d.ts` files until a proper build step is set up.

#### Frontend Boarding UI (delivered)
- **Giver ONGOING view** (`/rides/[id]`):
  - Participant list with boardingStatus badges (WAITING / BOARDED / DEBOARDED / NO_SHOW)
  - "No Show" button per WAITING seeker
  - "Complete Ride" button disabled (🔒) until all participants are DEBOARDED or NO_SHOW
- **Seeker ONGOING view:**
  - "🚗 I've Boarded" button when WAITING
  - "✅ I've Arrived" (deboard) button when BOARDED
  - Read-only status chip when DEBOARDED or NO_SHOW
- Added `board`, `deboard`, `markNoShow` to `ridesApi` in `apps/web/src/lib/api.ts`

#### Business Rule Confirmed (no change needed)
- Seeker cannot request a full ride (0 seats): enforced at `ride-requests.service.ts:34` → 400
- Frontend already shows disabled "No seats available" button at `rides/[id]/page.tsx:252`
- Test coverage at `e2e-api-negative.ts:274`

---

## 🟡 Current CI Status — Fix in progress (session 6)

> Last push: `6022d79` — CI running

| Suite | Tests | Status |
|---|---|---|
| Base lifecycle | 37 | 🔄 Running |
| Extended | 30 | 🔄 Running |
| Negative/boundary | 33 | 🔄 Running |
| Business rules | 44 | 🔄 Running |
| Production coverage | 69 | 🔄 Running |
| Final gap-closing | 57 | 🔄 Running |
| Playwright E2E | ~80 | ⚠️ Unknown |

---

## Pending / Next Steps (Priority Order)

### 🟢 Features
1. **Write unit tests** — 0 unit tests exist. Start with `gamification.service.ts` + `roles.guard.ts`
2. **Notifications bell** — bell icon in nav with unread count + drawer
3. **GPS tracking UI** — real-time map view during active ride
4. **RC upload UI** — upload page for givers + RC status indicator in vehicle list

### 🟡 Before production launch
5. **Set TRID_START** — change `TRID_START = 2000` in `packages/shared/src/constants.ts` AND `constants.js` to your current highest member number
6. **Verify `techieride.in` domain** in Resend → switch `EMAIL_FROM` to `noreply@techieride.in`
7. **Remove `gmail.com`** from `apps/api/src/config/allowed-domains.ts`

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
| No seats available | `ride-requests.service.ts → create()` | availableSeats ≤ 0 → 400 |
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
- **COMPILED PACKAGE FILES** — `packages/shared/src/*.js` and `*.d.ts` are runtime. Any new TS enum values or constants MUST be manually added to the `.js` and `.d.ts` until a proper build pipeline is added. This caused `TRID_START=NaN` and `SEEKER_BOARDED=undefined` bugs in session 6.
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
| 2.1.0 | 122 | 2026-06-01 | Session 6: CI fixed (stale compiled package, TRID NaN, enum gaps), boarding UI |
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
export const TRID_START = 2000; // ← set to your current highest TRID number
```
Also update `packages/shared/src/constants.js`:
```js
exports.TRID_START = 2000; // ← keep in sync with constants.ts
```
Then rebuild: `npm run build --workspace=apps/api && git add apps/api/dist/ && git commit`
