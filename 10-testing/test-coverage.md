# Test Coverage — TechieRide WebApp v2.0_Beta

> **Version:** 2.0_Beta | **Last Updated:** May 2026  
> **Total Tests:** 139 | **Pass Rate:** 100%  
> **CI:** GitHub Actions — runs on every push to `main`

---

## Test Suites Overview

| Suite | File | Tests | Type | Run Command |
|---|---|---|---|---|
| API Base | `tests/e2e-api.ts` | 37 | API E2E | `npm run test:api` |
| API Extended | `tests/e2e-api-extended.ts` | 30 | API E2E | `npm run test:api:extended` |
| API Negative | `tests/e2e-api-negative.ts` | 30 | Negative/Boundary | `npm run test:api:negative` |
| Playwright Desktop | `tests/e2e/*.spec.ts` | 28 | Browser UI | `npx playwright test` |
| Playwright Mobile | `tests/e2e/mobile.spec.ts` | 14 | Mobile/Responsive | `npx playwright test` |
| **Total** | | **139** | | `npm run test:all` |

> **Note:** All tests updated in v2.0_Beta for email+password auth (OTP references removed)

---

## 1. API Base Tests (37) — Happy Path

### Auth Agent (5 tests)
| Test | Validates |
|---|---|
| Admin can log in | Email+password login, JWT returned |
| Giver can log in | Seeded giver account accessible |
| Seeker can log in | Seeded seeker account accessible |
| Unauthenticated request returns 401 | JWT guard working |
| Wrong password returns 401 | Auth rejection |

### Admin Agent (7 tests)
| Test | Validates |
|---|---|
| Admin can fetch user list | Admin-only route accessible |
| Admin can view pending verifications | Verification queue |
| Admin submits verification docs for giver | Doc upload flow |
| Admin approves giver verification | Status transition |
| Admin submits + approves seeker verification | Full verification flow |
| Non-admin cannot access admin routes | 403 enforcement |
| Admin can get platform analytics | Analytics endpoint |

### Ride Giver Agent (10 tests)
| Test | Validates |
|---|---|
| Giver can fetch own profile | Profile endpoint |
| Giver can add a vehicle | Vehicle creation |
| Giver can list own vehicles | Vehicle listing |
| Giver can create a ride | Ride creation (DRAFT) |
| Giver can publish the ride | DRAFT → PUBLISHED transition |
| Published ride appears in search | Search/matching |
| Giver can see incoming requests | Request queue |
| Giver can approve a request → hold starts | PENDING → HOLD + Redis TTL |
| Seat count decremented after approval | Seat inventory |
| Giver can start the ride | PUBLISHED → ONGOING |

### Ride Seeker Agent (5 tests)
| Test | Validates |
|---|---|
| Seeker can fetch own profile | Profile endpoint |
| Seeker can get ride details | Ride detail endpoint |
| Seeker can request a seat | Request creation |
| Seeker cannot request same ride twice | 409 duplicate guard |
| Seeker can confirm the seat | HOLD → CONFIRMED |

### Gamification Agent (3 tests)
| Test | Validates |
|---|---|
| Seeker appears in ride participants | Participant creation |
| Giver earned ECO points after ride completion | Points awarded to giver |
| Seeker earned ECO points after ride completion | Points awarded to seeker |

### Notification Agent (3 tests)
| Test | Validates |
|---|---|
| Seeker received notifications | Notification delivery |
| Giver received notifications | Notification delivery |
| Seeker can mark all notifications as read | Mark-read endpoint |

### Ride Giver Agent (4 additional)
| Test | Validates |
|---|---|
| Giver can complete the ride | ONGOING → COMPLETED |
| Leaderboard is publicly accessible | Public endpoint |
| Giver can create a commute template | Template creation |
| Giver can list own templates | Template listing |

---

## 2. API Extended Tests (30) — Edge Cases

### Rejection Flow (4 tests)
- Seeker sends request → Giver rejects → seat restored → seeker can request again

### Cancellation Flow (3 tests)
- Seeker cancels confirmed booking → seat restored
- Giver cancels published ride → all seekers notified

### Race Condition — Last Seat (4 tests)
- Two seekers compete for 1 seat → only one gets it → second gets 400

### Security (5 tests)
- Seeker cannot approve requests (403)
- Seeker cannot start/complete rides (403)
- Admin cannot be created via register endpoint
- Admin can suspend/activate users
- Non-admin cannot access admin endpoints (403)

### Input Validation (5 tests)
- Personal email (gmail) rejected at registration → 403
- Missing fullName → 400
- 0 seats → 400
- Missing vehicleId → 400
- Same email twice → 409

### Token & Session (3 tests)
- Refresh token generates new access token
- Invalid refresh token → 401
- Expired/invalid bearer → 401

### SOS Flow (3 tests)
- Participant triggers SOS during active ride
- Admin sees active SOS alerts
- Admin resolves SOS with notes

### Cancellation Cascade (3 tests)
- Giver cannot book seat on own ride (403)
- Cannot book on CANCELLED ride (400)
- Giver cancels → seekers notified

---

## 3. API Negative Tests (30) — Boundary & Security

### Role Boundaries (7 tests)
- Seeker cannot create ride (403)
- Seeker cannot add vehicle (403)
- Giver cannot request seat (403)
- Seeker cannot approve request (403)
- Seeker cannot start/complete ride (403)
- Non-admin cannot suspend users (403)

### Invalid State Transitions (6 tests)
- Cannot start DRAFT ride (400)
- Cannot complete DRAFT ride (400)
- Cannot publish already-PUBLISHED ride (400)
- Cannot complete PUBLISHED ride (400)
- Cannot publish ONGOING ride (400)
- Cannot start ONGOING ride (400)

### Request State Boundaries (4 tests)
- Cannot confirm non-existent request (404)
- Cannot cancel HOLD with wrong seeker (403/404)
- Cannot book when 0 seats available (400)
- Cannot cancel already-CANCELLED request (400)

### Not Found (3 tests)
- Invalid ride UUID → 404
- Invalid publish → 404
- Invalid approve → 404

### Suspended User (4 tests)
- Unsuspended user can access profile (200)
- Suspended user blocked immediately on API call (401)
- Suspended user cannot refresh token (401)
- Re-activated user can refresh token again (200)

### Input Validation (6 tests)
- Missing rideId in request → 400
- 0 seats → 400
- Negative seats → 400
- Phone < 10 digits → 400
- Missing fullName → 400
- SOS without auth → 401

---

## 4. Playwright Desktop Tests (28) — Browser UI

### Auth (8 tests)
- Unauthenticated redirect to /login
- Login page renders email+password fields
- Empty fields shows error
- Wrong password returns 401 (network intercept)
- Seeker login → /dashboard
- Admin login → /admin
- Signup page renders
- Signup rejects personal email on blur

### Admin (6 tests)
- Admin login redirects to /admin
- Dashboard shows KPI cards
- Users list page loads
- Verification queue page loads
- Rides management page loads
- Non-admin cannot access /admin

### Ride Giver (7 tests)
- Lands on dashboard after login
- Dashboard shows ECO points
- Can navigate to offer a ride page
- Create ride form validates empty origin
- Can navigate to my rides list
- Profile page loads with giver name
- Notifications accessible

### Ride Seeker (7 tests)
- Lands on dashboard after login
- Can navigate to find a ride page
- Search form renders fields
- Can submit search (no error)
- Leaderboard page loads
- Requests page loads
- Profile page shows seeker name

---

## 5. Playwright Mobile Tests (14) — 390×844 iPhone 14 Viewport

### Layout (2 tests)
- Login page no horizontal overflow
- Signup page reachable, no overflow

### Navigation (7 tests)
- Bottom nav visible on mobile
- Desktop sidebar hidden on mobile (sm:hidden)
- Bottom nav Home link is active
- Bottom nav → Find Ride (navigates + heading visible)
- Bottom nav → Requests
- Bottom nav → Profile
- Bottom nav → My Rides

### Mobile Flows (5 tests)
- Seeker can search rides on mobile
- Giver can view offer ride form
- Admin dashboard usable (grid-cols-2 no overflow)
- Header is sticky while scrolling
- Bottom nav is sticky while scrolling

---

## 6. CI Pipeline

**File:** `.github/workflows/ci.yml`

```
On push/PR to main:

Job 1: API Tests (97 tests)
  ├── Spin up PostgreSQL + Redis services
  ├── Install Node 20 + npm ci
  ├── Generate Prisma client
  ├── Push DB schema
  ├── Seed database
  ├── Start API server
  ├── npm run test:api         (37 tests)
  ├── npm run test:api:extended (30 tests)
  ├── npm run test:api:negative (30 tests)
  └── Upload api-log artifact on failure

Job 2: Playwright E2E Tests (42 tests) — runs after Job 1 passes
  ├── Same DB/Redis setup
  ├── Install Playwright Chromium
  ├── Start API + Web servers
  ├── npx playwright test
  ├── Upload HTML report + screenshots on failure
  └── Upload server logs on failure
```

---

## 7. Test Credentials

All test accounts use password: **`TechieRide@2024`**

| Email | Role | Type |
|---|---|---|
| `admin@techieride.in` | ADMIN | Seeded |
| `priya@infosys.com` | RIDE_GIVER | Seeded, has vehicle |
| `arjun@tcs.com` | RIDE_SEEKER | Seeded, verified |
| `ravi@wipro.com` | BOTH | Seeded |
| `csr@csr.com` | ADMIN | Dev test only |
| `raghu@raghu.com` | RIDE_SEEKER | Dev test only |
| `raju@raju.com` | RIDE_GIVER | Dev test only |
| `venky@venky.com` | BOTH | Dev test only |

> Dev test accounts use non-IT domains and are seeded directly (bypass domain whitelist).
> They exist only in development/test environments.
