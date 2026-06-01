# TechieRide Developer Notes
> Detailed change log per build — what changed, why, and what to watch out for.
> Updated every session. Read this before touching any module.

---

## v2.1.0 — Build 122 · 2026-06-01 · Session 6

### CI fixes — stale compiled shared package (critical)
`packages/shared/src/*.js` and `*.d.ts` are **hand-maintained compiled outputs**. The TypeScript source (`*.ts`) is the truth, but Node.js loads the `.js` at runtime. Session 5 added new constants and enums to the `.ts` files but never rebuilt the `.js`, causing silent `undefined` at runtime.

**What broke and how:**

| File | Missing export | Runtime symptom |
|---|---|---|
| `constants.js` | `TRID_START` | `2000 + undefined = NaN` → every TRID = `TR0NaN` → unique constraint crash on second approval |
| `enums.js` | `NotificationType.SEEKER_BOARDED` | board endpoint → `notification.create()` → `Argument 'type' is missing` → 500 |
| `enums.js` | `NotificationType.SEEKER_DEBOARDED` | deboard endpoint → same 500 |
| `enums.js` | `NotificationType.SEEKER_NO_SHOW` | no-show endpoint → same 500 |
| `enums.js` | `BoardingStatus` enum entirely | Any code importing `BoardingStatus` gets `undefined` |

**Fix:** Manually added missing exports to `constants.js`, `constants.d.ts`, `enums.js`, `enums.d.ts`.

> ⚠️ **Rule going forward:** Any time you add a constant or enum value to `packages/shared/src/*.ts`, you MUST also add it to the corresponding `.js` and `.d.ts` in the same commit. The build script (`"build": "echo 'shared already compiled'"`) is a stub — it does nothing. Until a real tsc build is wired up, this is manual.

---

### CI fixes — test lifecycle (board/deboard)
The `complete()` API now requires ALL participants to be `DEBOARDED` or `NO_SHOW` before completing. Test suites called `complete()` after `start()` without boarding/deboarding the seeker first.

**Files changed:**
- `tests/helpers.ts` — `completeFullRide()`: added `seeker.board → seeker.deboard` before `giver.complete`
- `tests/e2e-api.ts` — PHASE 7: added "Seeker can board" + "Seeker can deboard" tests before "Giver can complete"
- `tests/e2e-api-final.ts` — inline gamification lifecycle: added board + deboard calls

**Not changed (intentional):** negative/state-machine tests that call `complete()` on DRAFT or PUBLISHED rides — those tests expect 400 for different reasons and have no confirmed seekers.

---

### CI fixes — stale test assertion
The hold timer (15-min HOLD expiry) was removed in v2.1.0. The `approve` endpoint no longer returns `holdExpiresAt`. The e2e-api.ts test was still asserting `!!r.data.holdExpiresAt`.

**Fix:** Removed the `holdExpiresAt` assertion from "Giver can approve the request" test in `e2e-api.ts`.

---

### CI fixes — syntax errors in test files
When v2.1.0 required fields (`homeLocation`, `officeLocation`, `emergencyContactName`, `emergencyContactPhone`) were inserted into register calls, the preceding `phone:` line was left without a trailing comma, and `emergencyContactPhone` got a double `,,`.

**Files fixed:** `e2e-api-extended.ts` (4 places), `e2e-api-negative.ts` (2 places), `e2e-api-coverage.ts` (1 place).

---

### Feature — Frontend boarding UI
**File:** `apps/web/src/app/(dashboard)/rides/[id]/page.tsx`

**Giver — ONGOING state:**
- Participant list now shows `boardingStatus` badge per seeker (WAITING / BOARDED / DEBOARDED / NO_SHOW)
- "No Show" button appears per WAITING seeker; calls `PATCH /rides/:id/no-show/:seekerId`
- "Complete Ride" button is disabled (locked) until every participant is DEBOARDED or NO_SHOW
- Hover title explains why it's locked

**Seeker — ONGOING state:**
- `WAITING` → "🚗 I've Boarded" button; calls `PATCH /rides/:id/board`
- `BOARDED` → "✅ I've Arrived" button; calls `PATCH /rides/:id/deboard`
- `DEBOARDED` / `NO_SHOW` → read-only status chip

**API client additions** (`apps/web/src/lib/api.ts`):
```ts
ridesApi.board(id)              // PATCH /rides/:id/board
ridesApi.deboard(id)            // PATCH /rides/:id/deboard
ridesApi.markNoShow(rideId, seekerUserId)  // PATCH /rides/:id/no-show/:seekerId
```

---

## v2.1.0 — Build 115 · 2026-06-01 · Session 5

### Architecture — TRID membership system
- New field `trid String? @unique` on `User` model
- Format: `TR2000`, `TR2001`, ... — sequential, assigned on admin verification approval
- Start number controlled by `TRID_START` constant in `packages/shared/src/constants.ts` **and** `constants.js`
- Welcome email sent to `personalEmail` (if set) or `email` on approval
- Shown as branded member card on profile page (`/profile`)

**Where it's generated:** `verification.service.ts → review()` — uses `prisma.user.count({ where: { trid: { not: null } } })` as the sequence. Not atomic — avoid concurrent approvals.

---

### Architecture — Boarding lifecycle
New `boardingStatus` field on `RideParticipant` (enum: `WAITING / BOARDED / DEBOARDED / NO_SHOW`).

**State machine:**
```
WAITING → board() → BOARDED → deboard() → DEBOARDED
WAITING → markNoShow() → NO_SHOW
```

**Auto-start:** when ALL confirmed participants have boarded, the ride auto-starts (no manual giver action needed).

**Complete gate:** `complete()` is blocked if any participant is still `WAITING` or `BOARDED`. Giver must use "No Show" for non-boarders.

**No-show side effects:** restores 1 available seat, deducts 10 ECO points from seeker, sends in-app notification + email.

---

### Architecture — Dual email routing
```
Auth emails (verify, reset, OTP)  → user.email (official/company)
Ride notifications, TRID welcome  → user.personalEmail ?? user.email
```
`EmailService.sendNotification()` handles the routing. Use it for all non-auth emails.

---

### Schema additions (migration: `db push`)
| Field | Model | Type | Notes |
|---|---|---|---|
| `trid` | User | `String? @unique` | TR2000+ |
| `personalEmail` | User | `String?` | Any domain — notifications only |
| `bloodGroup` | User | `String?` | Optional |
| `homeLocation` | User | `String` | Required at signup |
| `officeLocation` | User | `String` | Required at signup |
| `emergencyContactName` | User | `String` | Required at signup |
| `emergencyContactPhone` | User | `String` | Required at signup |
| `boardingStatus` | RideParticipant | Enum | WAITING default |
| `boardedAt` | RideParticipant | `DateTime?` | Set on board() |
| `deboaredAt` | RideParticipant | `DateTime?` | Typo in schema — keep for now to avoid migration |

> ⚠️ `deboaredAt` is a typo (should be `deboaredAt` → `deboaredAt`). Do not fix without a proper migration — `db push --accept-data-loss` will lose data.

---

### Signup — 4-step flow
1. Account (email, password, name, gender)
2. Work & Contact (company, phone, personalEmail?, bloodGroup?)
3. Location & Emergency (homeLocation, officeLocation, emergencyContact*)
4. Role (RIDE_GIVER / RIDE_SEEKER / BOTH)

All new fields are validated at `POST /auth/register`. Old test helpers needed updating — all fixed in commit `cc86988`.

---

### Removed — 15-min hold timer
`SEAT_HOLD_TTL_SECONDS` constant kept for reference but hold logic removed from `ride-requests.service.ts`. `approve()` no longer sets `holdExpiresAt`. Seekers can confirm at any time after approval.

If you see any Redis `hold:*` keys, they're harmless leftovers.

---

### New endpoints
| Method | Path | Guard | Description |
|---|---|---|---|
| `PATCH` | `/rides/:id/board` | Seeker (confirmed) | Mark self BOARDED |
| `PATCH` | `/rides/:id/deboard` | Seeker (BOARDED) | Mark self DEBOARDED |
| `PATCH` | `/rides/:id/no-show/:seekerId` | Giver (ride owner) | Mark seeker NO_SHOW |
| `PATCH` | `/rides/:id/edit` | Giver (ride owner) | Edit PUBLISHED ride |

---

## v2.0.4 — Build 112 · 2026-06-01 · Session 4

### Playwright E2E — P0 security tests
- `tests/e2e/permission-leaks.spec.ts` — 24 tests covering role boundary leaks (seeker acting as giver, etc.)
- `tests/e2e/verification-bypass.spec.ts` — 6 tests covering document upload bypass attempts
- `playwright.config.ts` — reads `PLAYWRIGHT_BASE_URL` env var; falls back to `http://localhost:3000`

### Email delivery — Resend
- `RESEND_API_KEY` set on Render
- `EMAIL_FROM=onboarding@resend.dev` (temporary — domain not yet verified)
- End-to-end verified: register → verification email → click link → verified → login
- `gmail.com` added to `allowed-domains.ts` for testing — **REMOVE before production**

### Auth — `gh` CLI
- Authenticated as `snrdigitalmarketingindia-web` on CI runner
- Used for CI auto-fix workflow (`ci-autofix.yml`) — creates/closes GitHub Issues on failure

---

## v2.0.3 — Build 95 · 2026-06-01 · Session 3

### QA audit — 15 API bugs fixed
| Bug | File | Fix |
|---|---|---|
| Unverified giver could publish rides | `rides.service.ts` | Added `verificationStatus` guard |
| RC not checked on publish | `rides.service.ts` | Added `rcVerified` guard |
| Race condition — double seat booking | `ride-requests.service.ts` | Atomic conditional decrement with `updateMany` |
| Seeker could approve own request | `ride-requests.service.ts` | Role + ownership check |
| Admin could be self-registered | `auth.service.ts` | Blocked ADMIN role in register |
| Giver could delete vehicle in active ride | `vehicles.service.ts` | Added active ride check |
| Duplicate plate number → 500 | `vehicles.service.ts` | Caught P2002 → 409 |
| Cancel too close to departure | `rides.service.ts` | >1 hour rule enforced |
| Edit with active seekers | `rides.service.ts` | Added participant check |
| ... (15 total) | | |

### Test coverage
6 suites, 320 automated checks. All green at end of session 3.

### `ci-autofix.yml`
Workflow that triggers on CI failure → reads test output → opens a GitHub Issue with failure details. Closes the issue automatically when CI passes again.

---

## v2.0.2 — Build 65 · 2026-06-01 · Session 2

### Business rules (all API-enforced)
- One active ride per giver (PUBLISHED or ONGOING → 400 on new publish)
- One active request per seeker (PENDING/HOLD/CONFIRMED → 409)
- BOTH-role users cannot request their own ride

### Test suites
- `tests/e2e-api.ts` — 37 tests, full lifecycle
- `tests/e2e-api-extended.ts` — 30 tests, edge cases
- `tests/e2e-api-negative.ts` — 30 tests, error paths
- `tests/e2e-api-business-rules.ts` — 44 tests, rule enforcement

### CI pipeline
- `ci.yml` — PostgreSQL + Redis services, seed, start API, run all suites, Playwright
- Matrix: Node 24, Ubuntu latest
- Artifacts: `api-log` uploaded on failure

---

## v2.0.1 — Build 1 · 2026-05-01 · Session 1

### Initial scaffold
- NestJS API (monorepo `apps/api`) with Prisma + PostgreSQL
- Next.js 14 frontend (monorepo `apps/web`)
- Shared package `packages/shared` — enums, types, constants
- Deployed: API → Render, Frontend → Vercel, DB → Neon, Cache → Upstash Redis
- Auth: JWT access (15m) + refresh (7d), email verification via Resend
- Core modules: Auth, Users, Rides, RideRequests, Vehicles, Verification, Gamification, Notifications, Admin, SOS, LiveTracking

---

## Architecture — Quick Reference

### Module map
```
apps/api/src/modules/
├── auth/           JWT auth, register, login, email verify, password reset
├── users/          Profile, emergency contacts
├── rides/          Ride CRUD + lifecycle (publish/start/board/deboard/complete/cancel)
├── ride-requests/  Request lifecycle (create/approve/confirm/reject/cancel)
├── vehicles/       Vehicle CRUD, RC verification
├── verification/   Document submission + admin review + TRID assignment
├── gamification/   ECO points, levels, leaderboard
├── notifications/  In-app notification store
├── admin/          User management, analytics, verification queue
├── sos/            Emergency SOS broadcast
└── live-tracking/  GPS position via Redis (WebSocket)
```

### Key invariants
- `availableSeats` is decremented at **approve time** (not confirm), restored on cancel/reject/no-show
- `trid` is set at **approve time** by admin, never changes
- `boardingStatus` starts as `WAITING` when seeker is added to `RideParticipant`
- Redis hold keys (`hold:rideId:seekerId`) are legacy — hold timer removed in v2.1.0
- `packages/shared/src/*.js` must be kept in sync with `*.ts` manually until build is wired up

### Environment variables
| Var | Where | Notes |
|---|---|---|
| `DATABASE_URL` | API | Neon PostgreSQL |
| `REDIS_URL` | API | Upstash (full URL with password) |
| `JWT_ACCESS_SECRET` | API | Min 32 chars |
| `JWT_REFRESH_SECRET` | API | Min 32 chars |
| `RESEND_API_KEY` | API | Email sending |
| `EMAIL_FROM` | API | Sender address |
| `APP_URL` | API | Frontend URL (for email links) |
| `NEXT_PUBLIC_API_URL` | Web | `https://techieride-webapp-v2.onrender.com/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Web | `https://techieride-webapp-v2.onrender.com` |
