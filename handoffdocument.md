# TechieRide 2.0 — Handoff Document
> Auto-updated after every significant change in this session.
> **Last updated:** 2026-06-01 (latest: `8d1647f`)

---

## Project
- **Repo:** `snrdigitalmarketingindia-web/techieride-webapp-v2`
- **Local:** `/Users/apple/Documents/TechieRide/techieride-webapp-v2`
- **Stack:** NestJS API (Render) + Next.js 14 (Vercel) + Neon PostgreSQL + Upstash Redis

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
| priya@infosys.com | Ride Giver | APPROVED, vehicle TS09AB5678 rcVerified=true |
| raju@raju.com | Ride Giver | APPROVED, vehicle TS07RJ1234 rcVerified=true |
| arjun@tcs.com | Ride Seeker | APPROVED |
| raghu@raghu.com | Ride Seeker | |
| ravi@wipro.com | Both | APPROVED |

---

## Infrastructure
- **Neon DB:** `postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Redis:** Upstash `rediss://default:...@charmed-viper-110569.upstash.io:6379`
- **Render env vars:** `FRONTEND_URL`, `REDIS_URL` (bare rediss:// URL only)
- **Vercel env vars:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

---

## Session History — What Was Done

### Sessions 1 & 2 — Core Build
- [x] Vercel + Render deployed and live
- [x] CORS, Redis URL, vercel.json, Suspense wrappers all fixed
- [x] Seed data against Neon DB
- [x] Business rules: one active ride per giver, one active request per seeker (API + UI)
- [x] `GET /ride-requests/mine` — seeker endpoint
- [x] Seeker requests page with Confirm Seat button
- [x] All 4 original test suites written and green (37 + 30 + 30+ + 44 tests)
- [x] GitHub Actions CI pipeline with Playwright E2E (50 tests)

### Session 3 — QA Director Audit, Security Fixes & Full Test Coverage

#### API Bug Fixes (all production issues, now resolved)
| Bug | Fix | File |
|---|---|---|
| Unverified giver could publish rides | `verificationStatus !== APPROVED` → 403 | `rides.service.ts publish()` |
| Unverified RC vehicle usable on rides | `vehicle.rcVerified !== true` → 403 | `rides.service.ts publish()` |
| Vehicle delete mid-active-ride | Check PUBLISHED/ONGOING before soft-delete → 409 | `vehicles.service.ts remove()` |
| Duplicate plate → unhandled 500 | Catch Prisma P2002 → 409 ConflictException | `vehicles.service.ts create()` |
| BOTH user could request own ride | Check `rideGiver.userId === userId` → 403 | `ride-requests.service.ts create()` |
| resendVerification leaked email existence | Always return 200 (no enumeration) | `auth.service.ts` |
| FCM token not updatable via PATCH /users/me | Added `fcmToken` to UpdateProfileDto | `update-profile.dto.ts` |
| Admin had no way to verify vehicle RC | Added `PATCH /admin/vehicles/:id/verify` + `/reject` + `GET /admin/vehicles` | `admin.controller/service` |
| No admin UI to approve vehicle RC | New `/admin/vehicles` page with approve/reject queue | `apps/web/src/app/admin/vehicles/page.tsx` |
| Seeded givers (Raju, Venky) had no verified vehicle | Added seeded vehicles with `rcVerified=true` | `prisma/seed.ts` |
| Givers couldn't upload RC URL | Added `PATCH /vehicles/:id/rc` route | `vehicles.controller.ts` |
| Ride cancel didn't notify passengers | Notify HOLD/CONFIRMED participants on cancel | `rides.service.ts cancel()` |
| Re-request after cancel → 409 | Allow re-request after CANCELLED/REJECTED via upsert | `ride-requests.service.ts create()` |
| Race condition: 2 concurrent approvals succeed | Atomic `updateMany WHERE availableSeats > 0` | `ride-requests.service.ts approve()` |
| `passwordHash` leaked in GET /users/me | Strip sensitive fields before returning | `users.service.ts getProfile()` |
| ci-autofix.yml SyntaxError | Merge two script steps into one (no cross-step interpolation) | `.github/workflows/ci-autofix.yml` |

#### New Test Suites Added
| Suite | Script | Tests | Status |
|---|---|---|---|
| Production coverage (13 sections) | `test:api:coverage` | 69 | ✅ All green |
| Final gap-closing (14 sections) | `test:api:final` | 57 | ✅ All green |

#### Test Infrastructure
- [x] `tests/helpers.ts` — shared `freshGiver()` runs full verified flow: register → submit docs → admin approve → add vehicle → admin verify RC
- [x] All 6 API test suites updated to use verified givers
- [x] 17 assertion bugs fixed in coverage suite (field names, params, missing imports)
- [x] Extended suite fixed: re-request cancel-cleanup + security test guard

#### Strategy Documents (repo root)
- [x] `TEST_AUTOMATION_STRATEGY.md` — every finding mapped to test type, CI stage, priority action
- [x] `PLAYWRIGHT_TEST_PLAN.md` — 50+ UI scenarios across 8 spec files

#### CI Pipeline
- [x] `ci-autofix.yml` — on failure: auto-creates GitHub Issue with parsed ❌ lines; on success: closes it
- [x] `test:api:coverage` and `test:api:final` added to CI pipeline
- [x] `test:all` runs all 6 suites in sequence

---

## ✅ Current CI Status — ALL GREEN

| Suite | Script | Tests | Status |
|---|---|---|---|
| Base lifecycle | `test:api` | 37 | ✅ Green |
| Extended (reject/cancel/race/SOS) | `test:api:extended` | 30 | ✅ Green |
| Negative / boundary | `test:api:negative` | 33 | ✅ Green |
| Business rules | `test:api:rules` | 44 | ✅ Green |
| Production coverage (13 sections) | `test:api:coverage` | 69 | ✅ Green |
| Final gap-closing (14 sections) | `test:api:final` | 57 | ✅ Green |
| Playwright E2E | `test:ui` | 50 | ✅ Green |

**Total: 320 automated checks — all passing**

**Last commit:** `235b1b7`

---

## CI Auto-Fix Watchdog
`.github/workflows/ci-autofix.yml` fires after every CI run:
- **On failure** → auto-creates GitHub Issue labeled `ci-failure` with parsed failure lines
- **On success** → auto-closes any open `ci-failure` issues

**Limitation:** Cannot auto-fetch logs from dev machine without `gh` CLI.
Install once: `brew install gh && gh auth login`

---

## Pending / Next Steps (Priority Order)

1. **Re-seed the live DB** — `npm run db:seed` against Neon to give Raju/Venky their verified vehicles
2. **Install `gh` CLI** — `brew install gh && gh auth login` — enables auto CI log fetching without pasting logs
2. **Add `RESEND_API_KEY`** to Render env for real email delivery (currently dev mode — emails logged to console only)
3. **End-to-end test on live app** with real users — full ride lifecycle smoke test
4. **Write 35 missing Playwright tests** — P0 first: `permission-leaks.spec.ts`, `verification-bypass.spec.ts` (see `PLAYWRIGHT_TEST_PLAN.md`)
5. **Write unit tests** — 0 unit tests currently. Start with `gamification.service.ts` ecoLevel thresholds and `roles.guard.ts` (see `TEST_AUTOMATION_STRATEGY.md` Stage 2)
6. **Upcoming features:** real-time GPS tracking UI, notifications bell, admin verification workflow UI

---

## Business Rules (API Enforced)
| Rule | Enforced In | Behaviour |
|---|---|---|
| One active ride per giver | `rides.service.ts → publish()` | Checks PUBLISHED/ONGOING → 400 |
| Giver must be APPROVED to publish | `rides.service.ts → publish()` | verificationStatus check → 403 |
| Vehicle RC must be verified to publish | `rides.service.ts → publish()` | rcVerified check → 403 |
| One active request per seeker | `ride-requests.service.ts → create()` | PENDING/HOLD/CONFIRMED → 409 |
| BOTH user cannot request own ride | `ride-requests.service.ts → create()` | rideGiver.userId === userId → 403 |
| Cannot delete vehicle in active ride | `vehicles.service.ts → remove()` | PUBLISHED/ONGOING check → 409 |
| Duplicate plate number | `vehicles.service.ts → create()` | Prisma P2002 → 409 |
| Cannot cancel COMPLETED/CANCELLED ride | `rides.service.ts → cancel()` | → 400 |
| Re-request after REJECTED/CANCELLED | `ride-requests.service.ts → create()` | Allowed via upsert — resets to PENDING |
| Concurrent seat approval | `ride-requests.service.ts → approve()` | Atomic `updateMany WHERE availableSeats > 0` → only one succeeds |
| Ride cancel notifies passengers | `rides.service.ts → cancel()` | HOLD/CONFIRMED seekers get RIDE_CANCELLED notification |
| Publish after COMPLETED/CANCELLED | `rides.service.ts → publish()` | Allowed — terminal state |

---

## Key API Field Names (gotcha-prone — confirmed from source)

| Endpoint | ❌ Wrong | ✅ Correct |
|---|---|---|
| `GET /gamification/summary` | `ecoPoints` | `totalPoints` |
| `GET /gamification/summary` | `co2Saved`, `co2SavedGrams` | `co2SavedKg` (string, e.g. `"0.00"`) |
| `GET /rides/search` | `originName`, `destinationName` | `originLat`, `originLng`, `destinationLat`, `destinationLng`, `date` (all required) |
| `POST /users/me/emergency-contacts` | `relation` | `relationship` |
| `PATCH /users/me` | — | accepts: `fullName`, `profilePhoto`, `gender`, `companyName`, `fcmToken` |
| Leaderboard `period` param | `all` | `alltime` or `monthly` |
| `POST /auth/webhook/bounce` (unknown payload) | expect 400 | returns 200 (silent no-op by design) |

---

## Gotchas / Notes
- **RideStatus enum:** `DRAFT` → `PUBLISHED` → `ONGOING` → `COMPLETED`/`CANCELLED`. No `STARTED`.
- **Email domain whitelist:** `wipro.com`, `tcs.com`, `infosys.com` etc. `testco.com` NOT allowed.
- **`freshGiver()` in `tests/helpers.ts`** — runs full 5-step verified flow. Use for any test that calls `publish()`.
- **`register()` in `tests/helpers.ts`** — raw registration, no verification. Use only for testing NOT_SUBMITTED status.
- **Upsert on re-request:** When a seeker re-requests after CANCELLED/REJECTED, the upsert resets the record to PENDING. This is correct API behavior but means the seeker has an active request again — tests must account for this (cancel it if the seeker needs to be free for another ride).
- **Dist must be rebuilt** after every API source change: `cd apps/api && npm run build` then `git add apps/api/dist/`.
- **Vercel project** is `techieride-webapp-v2-web` (the `-api` accidental project was deleted).
- **`GET /users/me`** strips sensitive fields: `passwordHash`, `emailVerificationToken`, `emailVerificationExpiry`, `passwordResetToken`, `passwordResetExpiry`.

---

## Re-seed Database
```bash
cd /Users/apple/Documents/TechieRide/techieride-webapp-v2
DATABASE_URL="postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  apps/api/node_modules/.bin/ts-node --project apps/api/tsconfig.json prisma/seed.ts
```
