# TechieRide 2.0 — Handoff Document

**Last updated:** 2026-06-02 — End of Session 9  
**Next session:** TRWebApp_v2_Session_10  
**Version:** `2.1.0.210+`

---

## Project
- **Repo:** `snrdigitalmarketingindia-web/techieride-webapp-v2`
- **Local:** `/Users/apple/Documents/TechieRide/techieride-webapp-v2`
- **Stack:** NestJS API (Render) + Next.js 14 (Vercel) + Neon PostgreSQL + Upstash Redis

## Live URLs
| Service | URL |
|---|---|
| Frontend | https://techieride-webapp-v2-web.vercel.app |
| API | https://techieride-webapp-v2.onrender.com |
| CI/CD | https://github.com/snrdigitalmarketingindia-web/techieride-webapp-v2/actions |

---

## Test Accounts (password: `TechieRide@2024`)

| Email | Role | Status | Phone | Notes |
|---|---|---|---|---|
| admin@techieride.in | ADMIN | EMPLOYEE_VERIFIED | 9000000000 | |
| priya@infosys.com | RIDE_GIVER | DRIVER_VERIFIED | 9000000001 | rcVerified ✅ |
| raju@raju.com | RIDE_GIVER | DRIVER_VERIFIED | 9000000002 | |
| arjun@tcs.com | RIDE_SEEKER | EMPLOYEE_VERIFIED | 9876543210 | |
| raghu@raghu.com | RIDE_SEEKER | EMPLOYEE_VERIFIED | 9000000003 | |
| ravi@wipro.com | BOTH | DRIVER_VERIFIED | 9111111111 | rcVerified ✅ |
| venky@venky.com | BOTH | DRIVER_VERIFIED | 9000000004 | |
| csr@csr.com | ADMIN | EMPLOYEE_VERIFIED | 9000000005 | |

> **DB State:** Wiped clean at start of Session 9. No rides/requests/notifications in Neon. Fresh for testing.

---

## Infrastructure

- **Neon DB:** `postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Redis:** Upstash `rediss://default:...@charmed-viper-110569.upstash.io:6379`
- **Email:** Resend — `EMAIL_FROM=onboarding@resend.dev` _(temp — needs `techieride.in` verified)_
- **TRID_START:** `2000` in `packages/shared/src/constants.ts` _(confirm real value before launch)_

---

## CI Status — Session 9 End ✅ ALL GREEN

| Suite | Tests | Status |
|---|---|---|
| API Tests | 215 | ✅ |
| API Security Tests | 46 | ✅ NEW |
| Playwright Functional | 78 | ✅ |
| Playwright Security | 20 | ✅ NEW |
| Quality Gate | — | ✅ |

**Pipeline:** Lint removed (ESLint not installed) → API Tests → Security Tests + Playwright (parallel) → Quality Gate

---

## Session 9 — Completed Work

### Bug Fixes
| Bug | Fix |
|---|---|
| Rides blank on navigation | Auth store doesn't persist `user` — added `if (!user) return` guard + role-correction `useEffect` on My Rides & Dashboard |
| Wrong rides shown for role | Tab defaulted to 'given' before role hydrated — now waits for user, sets correct tab |
| Date defaults showing yesterday | IST timezone fix: `toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })` on create ride + search pages |
| Playwright `--ignore` flag | Not a valid CLI flag — merged into single `npx playwright test` command |
| CI YAML anchor error | GitHub Actions doesn't support YAML anchors — removed `x-services:` block |
| Security test wrong endpoints | Fixed: `/auth/me`→`/users/me`, `/admin/verification`→`/admin/verification/pending`, approve→review |

### New Features
| Feature | Details |
|---|---|
| Show/Hide History | My Rides hides COMPLETED/CANCELLED by default; toggle reveals. Never deletes from DB. Admin unaffected. |
| PENDING auto-expiry | Cron every hour — rejects PENDING requests older than **4h**; notifies seeker |
| Departure timeout | Cron every 30 min — cancels PUBLISHED rides **1h+** past departure; notifies giver + seekers |
| Dashboard pending badge | Shows "📥 N pending requests → Manage" on dashboard ride cards for givers |
| Favicon | TechieRide logo in browser tab (`/logo.png`) |
| Phone numbers | All test accounts set in Neon with `isPhoneVerified=true` |

### QA Framework (New)
| Deliverable | Location |
|---|---|
| API security tests (46) | `tests/e2e-api-security.ts` |
| Playwright security spec (20) | `tests/e2e/security.spec.ts` |
| k6 performance scripts | `tests/performance/` (smoke / load / stress) |
| Business functional specs (530+ TCs) | `tests/business-functional/` (18 files) |
| QA strategy docs | `QA_TEST_STRATEGY.md`, `TEST_CASE_MATRIX.md`, `RISK_ASSESSMENT.md`, `RELEASE_CHECKLIST.md` |

---

## Session 10 — Start Here

### 🟠 Feature Work (Medium)

**1. Women-Only Rides**
- `womenOnly` flag exists on rides but not enforced
- Need `gender` field in User schema (Prisma migration)
- Search: filter out women-only rides for male users
- API: reject booking from non-female seekers (`POST /ride-requests`)
- UI: women-only badge on ride card, filter toggle on Find Ride

**2. Complaint System**
- No in-platform way to report bad actors
- Schema: `Complaint` model (reporterId, reportedId, rideId, reason, status, createdAt)
- API: `POST /complaints`, `GET /admin/complaints`, `PATCH /admin/complaints/:id/resolve`
- UI: "Report" button on ride card / after ride completion
- Admin: complaint review queue

**3. Trust Score**
- Algorithm fully designed in `tests/business-functional/18-trust-score.md`
- 0–100 scale, 5 bands: NEW/BRONZE/SILVER/GOLD/PLATINUM
- Positive events: completed rides, high ratings, milestones
- Negative events: no-shows, complaints, cancellations
- Suspension threshold: score < 5
- Decay job: 30/60/90 day inactivity deductions

### 🔴 Pre-Launch (Parked — do when ready)
| Task | File / Action |
|---|---|
| Remove gmail.com | `apps/api/src/config/allowed-domains.ts` + delete from Neon |
| Verify techieride.in in Resend | Update `EMAIL_FROM` env on Render |
| Set real TRID_START | `packages/shared/src/constants.ts` + `constants.js` |
| MinIO → Cloudflare R2 | Document uploads fail in production without cloud storage |

---

## Cron Jobs (Running on Render)

| Job | Schedule | Behaviour |
|---|---|---|
| PENDING request expiry | Every hour `0 * * * *` | Rejects PENDING requests > 4h old; notifies seeker |
| Departure timeout | Every 30 min `*/30 * * * *` | Cancels PUBLISHED rides 1h+ past departure; notifies all parties |
| Template auto-publish | `30 0 * * 1-5` IST | Publishes commute template rides Mon–Fri |

---

## Key Gotchas

### ⚠️ CRITICAL — Shared Package Compiled Files
`packages/shared/src/*.js` and `*.d.ts` are **hand-maintained compiled outputs**.  
Any new enum values or constants added to `.ts` **MUST also be added to `.js` and `.d.ts`** in the same commit.

### Auth Store Hydration Pattern
`persist` only saves `accessToken`, `refreshToken`, `isAuthenticated` — **NOT `user`**.  
Any component that reads `user?.role` must:
```typescript
const { user } = useAuthStore();
// Guard all effects:
useEffect(() => {
  if (!user) return; // wait for hydration
  // ... fetch data
}, [user?.role]); // or [tab] if tab-correction effect handles role
```

### API Route Conventions
- Ride lifecycle actions: `PATCH /rides/:id/{publish|cancel|start|complete|board|deboard|no-show/:participantId}`
- My vehicles: `GET /vehicles/my`
- My rides given: `GET /rides/given`
- My rides taken: `GET /rides/taken`
- Admin verification: `GET /admin/verification/pending`, `PATCH /admin/verification/:id/review`
- Profile: `GET /users/me` (NOT `/auth/me`)

### Neon DDL
Always use `psql` directly — never `prisma db execute` (hits wrong pooler).

### Boarding State Machine
```
WAITING → BOARDED → DEBOARDED
WAITING → NO_SHOW
```
Complete ride blocked if any participant is WAITING or BOARDED.

### Verification Two-Track System
- Track 1 (Employee): Upload company ID → Admin approve → `EMPLOYEE_VERIFIED` + TRID assigned
- Track 2 (Driver): Upload DL + RC → Admin approve → `DRIVER_VERIFIED` + role=BOTH
- Vehicle RC must ALSO be approved separately (`vehicle.rcVerified=true`) before giver can publish

---

## Business Rules (API Enforced)

| Rule | Endpoint | Response |
|---|---|---|
| One active ride per giver | `PATCH /rides/:id/publish` | 409 if PUBLISHED/ONGOING exists |
| Giver must be DRIVER_VERIFIED | `PATCH /rides/:id/publish` | 403 |
| Vehicle RC must be verified | `PATCH /rides/:id/publish` | 403 |
| One active request per seeker | `POST /ride-requests` | 409 |
| BOTH cannot request own ride | `POST /ride-requests` | 403 |
| Full ride (0 seats) | `POST /ride-requests` | 400 |
| Cancel ride ≥1h before departure | `PATCH /rides/:id/cancel` | 400 if within 1h |
| Complete: all deboarded/no-show | `PATCH /rides/:id/complete` | 400 if any WAITING/BOARDED |
| PENDING auto-expire | Cron | Auto-rejects after 4h |
| Departure timeout | Cron | Auto-cancels 1h after departure |

---

## Useful Commands

### Re-seed Database
```bash
cd /Users/apple/Documents/TechieRide/techieride-webapp-v2
DATABASE_URL="postgresql://neondb_owner:npg_NwfcX04UrRDj@ep-sparkling-wildflower-aqz7rykf.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  apps/api/node_modules/.bin/ts-node --project apps/api/tsconfig.json prisma/seed.ts
```

### Build API (required after source changes)
```bash
npm run build --workspace=apps/api
# Commit apps/api/dist/ after build
```

### Clear All Rides (Fresh Testing)
```sql
DELETE FROM call_logs;
DELETE FROM ride_ratings;
DELETE FROM ride_participants;
DELETE FROM ride_requests;
DELETE FROM notifications;
DELETE FROM rides;
```

### Verify Neon pendingEmail Columns
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='users' AND column_name LIKE 'pending%';
-- Must return 3 rows
```

### Run Security Tests
```bash
npm run test:api:security
npx playwright test tests/e2e/security.spec.ts
```

### Run Performance Tests (k6 required)
```bash
npm run test:perf:smoke   # 1 VU, 1 min — quick API check
npm run test:perf:load    # 0→100 VUs — normal load
npm run test:perf:stress  # 0→1000 VUs — breaking point
```
