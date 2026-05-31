# TechieRide 2.0 — Handoff Document
> Auto-updated after every significant change in this session.
> **Last updated:** 2026-06-01 (latest: `bd9af99`)

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
| Email | Role |
|---|---|
| admin@techieride.in | Admin |
| csr@csr.com | Admin |
| priya@infosys.com | Ride Giver (APPROVED, rcVerified) |
| raju@raju.com | Ride Giver |
| arjun@tcs.com | Ride Seeker |
| raghu@raghu.com | Ride Seeker |
| ravi@wipro.com | Both |

---

## Infrastructure
- **Neon DB:** `postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Redis:** Upstash `rediss://default:...@charmed-viper-110569.upstash.io:6379`
- **Render env vars:** `FRONTEND_URL`, `REDIS_URL` (bare rediss:// URL only)
- **Vercel env vars:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

---

## What Was Done (Completed)

### Infra & Deployment
- [x] Vercel frontend deployed — `techieride-webapp-v2-web.vercel.app`
- [x] CORS fixed — `FRONTEND_URL` on Render includes both Vercel URLs
- [x] Redis `REDIS_URL` fixed (was `redis-cli --tls -u rediss://...`)
- [x] Seed data run against Neon DB
- [x] `vercel.json` — removed secret refs, fixed output dir to `.next`
- [x] `useSearchParams` wrapped in Suspense on verify-email + reset-password pages
- [x] `GeoJSON.LineString` type replaced with inline type in shared package
- [x] Node.js upgraded to 24 in GitHub Actions
- [x] Postgres health check fixed (`pg_isready -U techieride`)
- [x] Redis debug logs removed from `redis.module.ts`

### Features
- [x] `GET /ride-requests/mine` — seeker's own requests endpoint
- [x] Seeker requests page shows PENDING/HOLD/CONFIRMED with Confirm Seat button
- [x] Auto-select ride in Incoming (Giver) tab when only one ride exists
- [x] **Business Rule (API+UI):** One active ride per giver — publish blocked while PUBLISHED/ONGOING
- [x] **Business Rule (API):** One active request per seeker — blocked while PENDING/HOLD/CONFIRMED
- [x] Ride creation form blocks publish + shows warning when active ride exists

### Session 3 — QA Director Audit & Fixes

#### P0 Critical API Bug Fixes
- [x] `rides.service.ts publish()`: blocks if `verificationStatus !== APPROVED` → 403
- [x] `rides.service.ts publish()`: blocks if `vehicle.rcVerified !== true` → 403
- [x] `vehicles.service.ts remove()`: blocks deletion if vehicle in active PUBLISHED/ONGOING ride → 409
- [x] `vehicles.service.ts create()`: catches Prisma P2002 (duplicate plate) → 409 instead of 500
- [x] `ride-requests.service.ts create()`: BOTH-role users blocked from requesting their own ride → 403
- [x] `admin.controller/service`: added `PATCH /admin/vehicles/:id/verify` and `/reject` endpoints
- [x] `auth.service.ts resendVerification()`: always returns 200 — no email enumeration
- [x] `update-profile.dto.ts`: added `fcmToken` field — users can now update push token via PATCH /users/me

#### Test Infrastructure
- [x] `tests/helpers.ts` — shared helper: `freshGiver()` runs full verification flow (register → submit docs → admin approve → add vehicle → admin verify RC). All suites use this.
- [x] All 6 API test suites updated to use verified givers — no more publish() failures in tests
- [x] `e2e-api.ts` — fresh giver now verified before publish tests
- [x] `e2e-api-extended.ts` — `createGiver()` now includes RC verification step
- [x] `e2e-api-negative.ts` — `freshVerifiedGiver()` helper added; giverB/C/D all fully verified
- [x] `e2e-api-business-rules.ts` — `setupFreshPair()` includes full verification flow
- [x] `e2e-api-coverage.ts` — 17 test failures fixed (see Gotchas section)
- [x] `e2e-api-final.ts` — 14 sections, ~45 tests; imports from shared helpers

#### Strategy Documents (in repo root)
- [x] `TEST_AUTOMATION_STRATEGY.md` — every finding mapped to test type + CI stage + priority
- [x] `PLAYWRIGHT_TEST_PLAN.md` — 50+ UI scenarios across 8 spec files, prioritised by permission leaks

#### CI Pipeline
- [x] `ci-autofix.yml` — on failure: auto-creates GitHub Issue with parsed ❌ lines; on success: closes open issues
- [x] `PATCH /admin/vehicles/:id/verify` wired into CI test setup for all fresh givers

---

## Current CI Status
| Suite | Script | Tests | Status |
|---|---|---|---|
| Base lifecycle | `test:api` | 37 | ✅ Passing |
| Extended (reject/cancel/race/SOS) | `test:api:extended` | 30 | ✅ Passing |
| Negative / boundary | `test:api:negative` | 33 | ✅ Passing |
| Business rules | `test:api:rules` | 44 | ✅ Passing |
| Production coverage (13 sections) | `test:api:coverage` | 69 | 🔄 Pending `bd9af99` |
| Final gap-closing (14 sections) | `test:api:final` | ~45 | 🔄 Pending `bd9af99` |
| Playwright E2E | `test:ui` | 50 | ✅ Passing |

**Total API tests: ~258+ across 6 suites**

**Last commit:** `bd9af99` — Fix final 2 coverage failures — BOTH own-ride guard + duplicate plate 500

---

## CI Auto-Fix Watchdog
`.github/workflows/ci-autofix.yml` — fires automatically after every CI run:
- **On failure:** Parses logs, extracts failing test names, creates a GitHub Issue labeled `ci-failure`
- **On success:** Automatically closes any open `ci-failure` issues
- **Limitation:** Requires `gh` CLI on dev machine to fetch logs manually. Install: `brew install gh && gh auth login`

---

## Pending / Next Steps
1. Verify CI on `bd9af99` — coverage suite should now be 69/69
2. Install `gh` CLI locally (`brew install gh && gh auth login`) so CI failures can be auto-fetched without pasting logs
3. Add `RESEND_API_KEY` to Render env for real email delivery (currently dev mode — emails logged to console)
4. Test full ride lifecycle on live app end-to-end with real users
5. Write 35 missing Playwright tests (see `PLAYWRIGHT_TEST_PLAN.md` — `permission-leaks.spec.ts`, `verification-bypass.spec.ts` are P0)
6. Write unit tests for business rule logic — currently 0 unit tests (see `TEST_AUTOMATION_STRATEGY.md` Stage 2)
7. Upcoming features: real-time GPS tracking UI, notifications bell, admin verification workflow UI

---

## Business Rules (API Enforced)
| Rule | File | Notes |
|---|---|---|
| One active ride per giver | `rides.service.ts → publish()` | Checks PUBLISHED/ONGOING |
| One active request per seeker | `ride-requests.service.ts → create()` | Checks PENDING/HOLD/CONFIRMED |
| Giver verificationStatus must be APPROVED to publish | `rides.service.ts → publish()` | → 403 if PENDING/REJECTED |
| Vehicle rcVerified must be true to publish | `rides.service.ts → publish()` | → 403 if false |
| Cannot delete vehicle used in active ride | `vehicles.service.ts → remove()` | → 409 |
| Re-request after REJECTED | Allowed | Terminal state |
| Re-request after CANCELLED | Allowed | Terminal state |
| Publish after COMPLETED/CANCELLED | Allowed | Terminal state |
| Cancel a COMPLETED or CANCELLED ride | `rides.service.ts → cancel()` | → 400 |
| BOTH user requesting their own ride | `ride-requests.service.ts → create()` | Checks rideGiver.userId === userId → 403 |

---

## Key API Shapes (confirmed from source)

### Gamification Summary (`GET /gamification/summary`)
```json
{ "totalPoints": 0, "ecoLevel": "SEED", "co2SavedKg": "0.00", "pointsHistory": [] }
```
⚠️ Field is `totalPoints` NOT `ecoPoints` — tests must use `totalPoints`

### Search Rides (`GET /rides/search`)
Required params: `originLat`, `originLng`, `destinationLat`, `destinationLng`, `date` (YYYY-MM-DD)
Optional: `page`, `limit`
⚠️ Does NOT accept `originName`/`destinationName` — those are stored fields, not search params

### Emergency Contact (`POST /users/me/emergency-contacts`)
```json
{ "name": "string", "phone": "string", "relationship": "string" }
```
⚠️ Field is `relationship` NOT `relation`

### Update Profile (`PATCH /users/me`)
Accepts: `fullName`, `profilePhoto`, `gender`, `companyName`, `fcmToken`

---

## Gotchas / Notes
- **RideStatus enum:** `DRAFT`, `PUBLISHED`, `ONGOING`, `COMPLETED`, `CANCELLED` — NO `STARTED`
- **Email domain whitelist:** `wipro.com`, `tcs.com`, `infosys.com` etc. `testco.com` NOT allowed
- **freshGiver() in helpers.ts** runs full verification: register → submit docs → admin approve → add vehicle → admin verify RC. Takes ~3-4 API calls. Use it for any test that needs to publish a ride.
- **register() in helpers.ts** is raw — no verification. Use for testing NOT_SUBMITTED verification status.
- **Dist must be rebuilt** after any API source change: `cd apps/api && npm run build` then `git add apps/api/dist/`
- **Vercel project** is `techieride-webapp-v2-web` (the `-api` one was deleted accidentally)
- **Admin vehicle endpoints:** `PATCH /admin/vehicles/:id/verify` and `/reject` — new in this session, needed by all test helpers that create fresh givers

---

## Re-seed Database
```bash
cd /Users/apple/Documents/TechieRide/techieride-webapp-v2
DATABASE_URL="postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  apps/api/node_modules/.bin/ts-node --project apps/api/tsconfig.json prisma/seed.ts
```
