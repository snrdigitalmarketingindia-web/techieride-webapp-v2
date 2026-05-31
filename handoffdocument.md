# TechieRide 2.0 — Handoff Document
> Auto-updated after every significant change in this session.
> **Last updated:** 2026-06-01 (latest: `b29b84c`)

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
| priya@infosys.com | Ride Giver |
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

### Features
- [x] `GET /ride-requests/mine` — new endpoint for seeker's own requests
- [x] Seeker requests page shows PENDING/HOLD/CONFIRMED with Confirm Seat button
- [x] Auto-select ride in Incoming (Giver) tab when only one ride exists
- [x] **Business Rule (API+UI):** One active ride per giver — publish blocked while PUBLISHED/ONGOING
- [x] **Business Rule (API):** One active request per seeker — blocked while PENDING/HOLD/CONFIRMED
- [x] Ride creation form blocks publish + shows warning when active ride exists

### Test Fixes
- [x] Test emails changed to allowed domains (`wipro.com`, `tcs.com`)
- [x] `RideStatus.STARTED` → `RideStatus.ONGOING` bug fixed (was causing 500 on publish)
- [x] `e2e-api.ts` — uses fresh `wipro.com`/`tcs.com` giver+seeker accounts per run
- [x] `e2e-api-extended.ts` — refactored: separate giver+seeker per flow (A/B/C isolation)
- [x] New test suite `e2e-api-business-rules.ts` — 8 sections, ~40 tests
- [x] New Playwright spec `tests/e2e/requests.spec.ts` — 8 tests for request flow

---

## Current CI Status
| Suite | Tests | Status |
|---|---|---|
| `test:api` | 37 | ✅ All passing |
| `test:api:extended` | 30 | ✅ All passing |
| `test:api:negative` | 30+ | ✅ All passing |
| `test:api:rules` | 44 | ✅ All passing |
| Playwright E2E | 50 | ✅ All passing |

**All test suites green as of `b29b84c`**

**Last commit:** `b29b84c` — Update handoffdocument

---

## Pending / Next Steps
1. Remove debug log from `apps/api/src/config/redis.module.ts` line 19 (`[Redis] REDIS_URL raw value`)
2. Add `RESEND_API_KEY` to Render env for real email delivery (currently dev mode — emails logged to console)
3. Test full ride lifecycle on live app end-to-end with real users
4. Upcoming features: real-time GPS tracking UI, notifications bell, admin verification workflow UI

---

## Business Rules (API Enforced)
| Rule | File | Notes |
|---|---|---|
| One active ride per giver | `rides.service.ts → publish()` | Checks PUBLISHED/ONGOING |
| One active request per seeker | `ride-requests.service.ts → create()` | Checks PENDING/HOLD/CONFIRMED |
| Re-request after REJECTED | Allowed | Terminal state |
| Re-request after CANCELLED | Allowed | Terminal state |
| Publish after COMPLETED/CANCELLED | Allowed | Terminal state |
| Cancel a COMPLETED or CANCELLED ride | `rides.service.ts → cancel()` | Returns 400 — added this session |

---

## Gotchas / Notes
- **RideStatus enum values:** `DRAFT`, `PUBLISHED`, `ONGOING`, `COMPLETED`, `CANCELLED` — NO `STARTED`
- **Email domain whitelist:** Use `wipro.com`, `tcs.com`, `infosys.com` etc. `testco.com` NOT allowed
- **`registerAndLogin` in `e2e-api.ts`:** takes `(email, fullName, role)` → returns `string` token
- **`registerAndLogin` in `e2e-api-negative.ts`:** takes `(email, role)` → returns `{token, userId}`
- **Dist must be rebuilt** after API source changes: `cd apps/api && npm run build` then commit `dist/`
- **Vercel project** is `techieride-webapp-v2-web` (the `-api` one was deleted accidentally)

---

## Re-seed Database
```bash
cd /Users/apple/Documents/TechieRide/techieride-webapp-v2
DATABASE_URL="postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  apps/api/node_modules/.bin/ts-node --project apps/api/tsconfig.json prisma/seed.ts
```
