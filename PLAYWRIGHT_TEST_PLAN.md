# TechieRide 2.0 — Playwright Test Plan
**Senior QA Director | Complete UI Automation Scenarios**
**Last updated:** 2026-06-01

All scenarios below are mandatory CI/CD quality gates. Any PR that breaks these tests must automatically fail deployment.

Priority order:
1. Permission leaks (direct URL access by wrong role)
2. API authorization bypasses
3. Vehicle verification bypasses
4. Ride publishing restrictions
5. Admin access controls
6. Happy-path workflows

---

## Test Infrastructure

```typescript
// tests/e2e/helpers.ts
BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
API_URL  = process.env.NEXT_PUBLIC_API_URL   ?? 'http://localhost:3001/api/v1'

// Seed accounts (password: TechieRide@2024)
GIVER  = 'priya@infosys.com'
GIVER2 = 'raju@raju.com'
SEEKER = 'arjun@tcs.com'
ADMIN  = 'admin@techieride.in'
BOTH   = 'ravi@wipro.com'
```

Browser matrix:
- **CI:** Chromium only (speed)
- **Nightly regression:** Chromium + Firefox + Mobile Chrome + Mobile Safari

---

## Spec File 1: `auth.spec.ts` — Authentication Flows

### AUTH-01: Login happy path
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN user visits /login
WHEN they enter valid credentials (arjun@tcs.com / TechieRide@2024)
THEN they are redirected to /dashboard
AND their name is visible in the nav
AND localStorage/cookie contains auth token
```

### AUTH-02: Login with wrong password
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN user visits /login
WHEN they enter correct email but wrong password
THEN error message "Invalid email or password" appears
AND they remain on /login
AND no token is stored
```

### AUTH-03: Login with personal email (gmail)
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN user visits /login
WHEN they enter a @gmail.com email address
THEN error message mentions company email required
AND they remain on /login
```

### AUTH-04: Logout clears session
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN user is logged in
WHEN they click Logout
THEN they are redirected to /login or /
AND localStorage/cookie token is cleared
AND navigating to /dashboard redirects back to /login
```

### AUTH-05: Unauthenticated → redirect to login
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN a user is not logged in
WHEN they navigate directly to /dashboard
THEN they are redirected to /login
```

### AUTH-06: Forgot password UI flow
**Priority:** P1 | **Status:** ✅ exists (partial)

```
GIVEN user visits /forgot-password
WHEN they enter a valid company email
THEN success message appears (no indication of whether email exists)
AND the same message appears for an unknown email (no enumeration)
```

### AUTH-07: Email verification flow
**Priority:** P1 | **Status:** ✅ exists

```
GIVEN user clicks a valid verify-email link (/verify-email?token=...)
THEN "Email verified" success page is shown
AND user can then log in
```

### AUTH-08: Invalid verify-email token
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN user visits /verify-email?token=invalid-fake-token
THEN error message "Invalid or expired link" is shown
AND no crash or 500 error occurs
```

### AUTH-09: Session persists on page refresh
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN user is logged in
WHEN they refresh the page
THEN they remain logged in
AND dashboard data reloads correctly
```

---

## Spec File 2: `permission-leaks.spec.ts` — Direct URL Access & Role Guards
**HIGHEST PRIORITY — these tests prevent the most dangerous production incidents**

### PERM-01: Seeker cannot access Offer Ride page
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_SEEKER (arjun@tcs.com)
WHEN they navigate directly to /rides/create
THEN they are redirected to /dashboard or /rides
AND no ride creation form is visible
AND no 500 error occurs
```

### PERM-02: Seeker cannot access Incoming Requests page
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_SEEKER
WHEN they navigate directly to /rides/incoming
THEN they are redirected OR see "Access denied"
AND they cannot see any giver's incoming requests
```

### PERM-03: Seeker cannot access Giver Dashboard tab
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_SEEKER
WHEN they navigate directly to /dashboard?tab=giver
THEN giver-specific tabs are not rendered
AND seeker sees seeker-appropriate content only
```

### PERM-04: Giver cannot access Book a Ride page
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_GIVER (priya@infosys.com)
WHEN they navigate directly to /rides/search
THEN they either see the page without booking buttons
OR are redirected with "You need a seeker account"
```

### PERM-05: Non-admin cannot access Admin Panel
**Priority:** P0 | **Status:** ✅ exists (admin.spec.ts)

```
GIVEN user is logged in as RIDE_SEEKER or RIDE_GIVER
WHEN they navigate directly to /admin
THEN they are redirected to /dashboard
AND no admin data is visible
```

### PERM-06: Non-admin cannot access Admin Users page
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_GIVER
WHEN they navigate directly to /admin/users
THEN they are redirected OR see "Unauthorized"
AND no user list data is visible or requested via API
```

### PERM-07: Non-admin cannot access Admin Verification queue
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_SEEKER
WHEN they navigate directly to /admin/verification
THEN they are redirected
AND no verification data is visible
```

### PERM-08: Unauthenticated user cannot access any protected page
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN user is NOT logged in
FOR EACH route in [/dashboard, /rides/create, /admin, /rides/search, /requests]
WHEN they navigate directly to the route
THEN they are redirected to /login
```

### PERM-09: Token from user A cannot access user B's data
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN userA is logged in
WHEN the app makes API call to /users/userB_id/private-data
THEN the request returns 403 (verified via network interception)
AND no private data from userB appears on screen
```

### PERM-10: BOTH role sees appropriate UI for both roles
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN user is logged in as BOTH (ravi@wipro.com)
THEN the dashboard shows both Giver and Seeker sections
AND "Offer Ride" button is visible
AND "Find a Ride" button is visible
```

---

## Spec File 3: `giver.spec.ts` — Ride Giver Workflows

### GIVER-01: Giver can create and publish a ride
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN giver is logged in
AND giver has a registered vehicle
WHEN they fill out the ride creation form
AND submit
THEN ride appears in "My Rides" with DRAFT status
WHEN they click "Publish"
THEN ride status changes to PUBLISHED
AND ride appears in search results
```

### GIVER-02: Giver cannot publish second ride while first is active
**Priority:** P0 | **Status:** ✅ exists (partial)

```
GIVEN giver has a PUBLISHED ride
WHEN they try to publish another ride
THEN an error message "You already have an active ride" is shown
AND the second ride remains as DRAFT
```

### GIVER-03: Giver cannot publish ride with unverified RC (CRITICAL)
**Priority:** P0 | **Status:** ❌ MISSING — CRITICAL BUG IN API

```
GIVEN giver's vehicle has rcVerified = false
WHEN giver attempts to publish a ride using that vehicle
THEN they see an error "Vehicle RC not verified"
AND the ride remains DRAFT
NOTE: This test will FAIL today — API bug must be fixed first (see P0 in strategy)
```

### GIVER-04: Giver cannot publish if verification is PENDING
**Priority:** P0 | **Status:** ❌ MISSING — CRITICAL BUG IN API

```
GIVEN a giver whose verificationStatus = PENDING (never submitted docs)
WHEN they attempt to publish a ride
THEN they see an error "Complete identity verification first"
AND the ride remains DRAFT
NOTE: This test will FAIL today — API bug must be fixed first
```

### GIVER-05: Giver cannot publish if verification is REJECTED
**Priority:** P0 | **Status:** ❌ MISSING — CRITICAL BUG IN API

```
GIVEN a giver whose verificationStatus = REJECTED
WHEN they attempt to publish a ride
THEN they see an error message about verification
AND are prompted to resubmit documents
NOTE: This test will FAIL today — API bug must be fixed first
```

### GIVER-06: Giver can approve a seeker request
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN giver has a PUBLISHED ride
AND a seeker has submitted a request
WHEN giver clicks "Approve" on the incoming request
THEN request status shows HOLD
AND giver sees "Waiting for seeker to confirm" message
```

### GIVER-07: Giver can reject a seeker request
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN giver has an incoming PENDING request
WHEN giver clicks "Reject"
THEN request disappears from incoming list
AND available seats remain unchanged
```

### GIVER-08: Giver can start and complete a ride
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN giver has a PUBLISHED ride with at least one CONFIRMED participant
WHEN giver clicks "Start Ride"
THEN ride status changes to ONGOING
WHEN giver clicks "Complete Ride"
THEN ride status changes to COMPLETED
AND eco points are visible on the giver's profile
```

### GIVER-09: Giver can cancel a published ride
**Priority:** P1 | **Status:** ✅ exists

```
GIVEN giver has a PUBLISHED ride
WHEN giver clicks "Cancel Ride" and provides a reason
THEN ride status changes to CANCELLED
AND confirmed participants receive cancellation notification
```

### GIVER-10: Giver can add and manage vehicles
**Priority:** P1 | **Status:** ✅ exists

```
GIVEN giver is logged in
WHEN they navigate to /vehicles and click "Add Vehicle"
AND fill in make, model, plate, seats
THEN vehicle appears in their vehicle list
AND can be selected when creating a ride
```

### GIVER-11: Giver sees warning if vehicle RC is not verified
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN giver has a vehicle with rcVerified = false
WHEN they view the vehicle in their list
THEN a warning badge "RC Pending Verification" is visible
AND they are informed they cannot publish rides with this vehicle
```

### GIVER-12: Giver can manage commute templates
**Priority:** P2 | **Status:** ❌ MISSING (API tested, UI not tested)

```
GIVEN giver is on /templates
WHEN they create a commute template (origin, destination, days, time)
THEN template appears in list with isActive = true
WHEN they toggle it
THEN isActive flips
WHEN they delete it
THEN it disappears from list
```

---

## Spec File 4: `seeker.spec.ts` — Ride Seeker Workflows

### SEEKER-01: Seeker can search for and book a ride
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN seeker is logged in
WHEN they search for rides with origin + destination + date
THEN matching PUBLISHED rides appear in results
WHEN they click "Request Seat" on a ride
THEN request is submitted with status PENDING
AND they see "Request sent — waiting for giver approval"
```

### SEEKER-02: Seeker can confirm a seat after approval
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN seeker has a HOLD request
WHEN they navigate to /requests
THEN they see "Confirm Seat" button with hold expiry timer
WHEN they click "Confirm Seat"
THEN request status changes to CONFIRMED
AND seat count on the ride decrements
```

### SEEKER-03: Seeker can cancel a PENDING request
**Priority:** P1 | **Status:** ✅ exists (requests.spec.ts)

```
GIVEN seeker has a PENDING request
WHEN they click "Cancel Request" on /requests
THEN request is removed from their list
AND available seats on the ride are unchanged
```

### SEEKER-04: Seeker cannot add a vehicle
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_SEEKER
WHEN they navigate directly to /vehicles/add
THEN they are redirected
OR the "Add Vehicle" option is completely absent from the UI
AND any API call to POST /vehicles returns 403 (verify via network intercept)
```

### SEEKER-05: Seeker cannot offer a ride
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_SEEKER
WHEN they inspect the navigation
THEN "Offer Ride" link is not present
WHEN they navigate directly to /rides/create
THEN they are redirected or see "Access denied"
```

### SEEKER-06: Seeker cannot access driver/giver routes via API
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN user is logged in as RIDE_SEEKER
THEN browser network requests to:
  POST /api/v1/rides        → API returns 403
  POST /api/v1/vehicles     → API returns 403
  PATCH /api/v1/rides/*/approve → API returns 403
VERIFIED via Playwright network interception
```

### SEEKER-07: Seeker sees completed rides history
**Priority:** P1 | **Status:** ❌ MISSING (UI test)

```
GIVEN seeker has at least one COMPLETED ride participation
WHEN they navigate to /rides/history or /rides/taken
THEN completed rides appear in the list
WITH correct giver name, date, route
```

### SEEKER-08: Seeker sees eco points after completing a ride
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN seeker just had a ride complete
WHEN they view their profile or dashboard
THEN their eco points have increased
AND the ecoLevel badge is updated if threshold crossed
```

### SEEKER-09: Seeker receives and sees notifications
**Priority:** P1 | **Status:** ✅ exists (partial)

```
GIVEN seeker has a PENDING request
WHEN the giver approves the request
THEN the notification bell shows a new unread count
WHEN seeker clicks the bell
THEN they see "Seat approved — confirm within 15 minutes"
```

### SEEKER-10: Seeker cannot request the same ride twice
**Priority:** P0 | **Status:** ❌ MISSING (UI test)

```
GIVEN seeker has already requested ride X
WHEN they view ride X in search results
THEN "Request Seat" button is disabled or replaced with "Requested"
AND pressing the button (if somehow accessible) shows an error message
```

---

## Spec File 5: `admin.spec.ts` — Admin Workflows

### ADMIN-01: Admin can log in and see admin dashboard
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN admin logs in with admin@techieride.in
WHEN they are redirected to dashboard
THEN Admin Panel link is visible in navigation
WHEN they click Admin Panel
THEN they see user list, verification queue, SOS, analytics
```

### ADMIN-02: Admin can view and filter user list
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN admin is on /admin/users
THEN user list loads
WHEN admin filters by role = "RIDE_GIVER"
THEN only givers are shown
WHEN admin filters by verificationStatus = "PENDING"
THEN only unverified users are shown
```

### ADMIN-03: Admin can suspend and reactivate a user
**Priority:** P0 | **Status:** ✅ exists

```
GIVEN admin selects a user
WHEN admin clicks "Suspend"
THEN user status changes to suspended
AND confirmation message appears
WHEN admin clicks "Activate"
THEN user status returns to active
```

### ADMIN-04: Admin can approve a verification request
**Priority:** P0 | **Status:** ✅ exists (partial)

```
GIVEN a giver has submitted verification documents
WHEN admin navigates to /admin/verification
THEN the submission appears in the pending queue
WHEN admin clicks "Approve"
THEN verification status changes to APPROVED
AND giver receives an in-app notification
```

### ADMIN-05: Admin can reject a verification request with reason
**Priority:** P0 | **Status:** ❌ MISSING (UI test)

```
GIVEN a giver has submitted verification documents
WHEN admin clicks "Reject" and enters rejection reason
THEN verification status changes to REJECTED
AND rejection reason is stored
AND giver receives notification with the reason
```

### ADMIN-06: Admin can view and resolve active SOS alerts
**Priority:** P0 | **Status:** ✅ exists (partial)

```
GIVEN an SOS has been triggered
WHEN admin navigates to /admin/sos
THEN the SOS alert appears with user location
WHEN admin clicks "Resolve" and enters resolution notes
THEN SOS is marked RESOLVED
AND disappears from active list
```

### ADMIN-07: Admin can view platform analytics
**Priority:** P1 | **Status:** ✅ exists (partial)

```
GIVEN admin navigates to /admin/analytics
THEN stats load including total rides, active users, eco impact
WHEN admin changes the date range
THEN stats update to reflect that period
```

### ADMIN-08: Admin can view all rides across all givers
**Priority:** P1 | **Status:** ❌ MISSING (UI test)

```
GIVEN admin is on /admin/rides
THEN rides from ALL givers are listed (not just their own)
WHEN admin filters by status = "PUBLISHED"
THEN only PUBLISHED rides from all givers appear
```

### ADMIN-09: Admin investigation — view a specific user's rides
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN admin clicks on a specific user in the user list
WHEN they view user detail page
THEN they can see that user's ride history, requests, eco points
```

---

## Spec File 6: `mobile.spec.ts` — Mobile Viewport Tests

### MOB-01: Login page is usable on mobile (375px)
**Priority:** P1 | **Status:** ✅ exists

### MOB-02: Dashboard is responsive on mobile
**Priority:** P1 | **Status:** ✅ exists

### MOB-03: Ride search is usable on mobile
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN mobile viewport (375x667)
WHEN seeker navigates to ride search
THEN the search form is fully visible and usable
AND ride results cards are correctly sized
AND "Request Seat" button is large enough to tap (min 44px)
```

### MOB-04: Request confirmation is usable on mobile
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN mobile viewport
WHEN seeker has a HOLD request and opens /requests
THEN "Confirm Seat" button is visible without scrolling
AND hold expiry timer is readable
```

### MOB-05: Navigation menu works on mobile (hamburger)
**Priority:** P2 | **Status:** ✅ exists

---

## Spec File 7: `requests.spec.ts` — Seeker Request Flow

### REQ-01: Full request lifecycle from seeker perspective
**Priority:** P0 | **Status:** ✅ exists

### REQ-02: Hold timer counts down in UI
**Priority:** P1 | **Status:** ❌ MISSING

```
GIVEN seeker has a HOLD request
WHEN they view /requests
THEN a countdown timer shows time remaining until hold expires
AND the timer updates every minute
```

### REQ-03: Seeker is blocked from requesting second ride while active
**Priority:** P0 | **Status:** ❌ MISSING (UI test)

```
GIVEN seeker has a PENDING or CONFIRMED request on ride A
WHEN they search for rides and click "Request Seat" on ride B
THEN an error message "You already have an active request" appears
AND no second request is submitted (verified via network)
```

---

## Spec File 8: `verification-bypass.spec.ts` — Verification Restriction Tests
**These tests guard the most critical business rules. They MUST be mandatory gates.**

### VB-01: Unverified giver sees publish blocked (UI reflects API)
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN a fresh giver who has NOT submitted verification documents
WHEN they attempt to publish a ride
THEN the "Publish" button is either disabled or shows a tooltip
AND clicking publish shows "Verify your identity first"
AND API call returns 403 (intercepted via network)
NOTE: Requires API fix first (see P0 in strategy document)
```

### VB-02: Rejected giver cannot publish
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN a giver with verificationStatus = REJECTED
WHEN they attempt to publish a ride
THEN "Resubmit your verification documents" message appears
AND ride stays as DRAFT
NOTE: Requires API fix first
```

### VB-03: Unverified RC vehicle is visually flagged
**Priority:** P0 | **Status:** ❌ MISSING

```
GIVEN a giver selects a vehicle with rcVerified = false
WHEN they view the vehicle in ride creation form
THEN vehicle is shown with "RC Pending" badge
AND publish is blocked with "RC not verified" message
NOTE: Requires API fix first
```

### VB-04: Approved giver CAN publish normally
**Priority:** P0 | **Status:** ❌ MISSING (as gated check)

```
GIVEN a giver with verificationStatus = APPROVED and rcVerified = true vehicle
WHEN they publish a ride
THEN it succeeds with PUBLISHED status
(Regression test that fix didn't over-block legitimate givers)
```

---

## Regression Suite (mandatory before every release)

The following must run as a combined regression pack (`npx playwright test --grep @regression`):

| Tag | Tests Included |
|---|---|
| `@regression @auth` | AUTH-01 through AUTH-09 |
| `@regression @permissions` | PERM-01 through PERM-10 |
| `@regression @giver` | GIVER-01 through GIVER-12 |
| `@regression @seeker` | SEEKER-01 through SEEKER-10 |
| `@regression @admin` | ADMIN-01 through ADMIN-09 |
| `@regression @verification` | VB-01 through VB-04 |
| `@regression @mobile` | MOB-01 through MOB-05 |

All tests tagged `@regression` run in the nightly job and on every release tag push.

---

## CI Playwright Config Update Required

```typescript
// playwright.config.ts — updated config
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/report' }]],

  projects: [
    // CI: Chromium only
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Nightly only: full matrix
    ...(process.env.NIGHTLY ? [
      { name: 'firefox',       use: { ...devices['Desktop Firefox'] } },
      { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
      { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    ] : []),
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
```

---

## New Playwright Specs to Write (Backlog)

| File | Tests | Priority |
|---|---|---|
| `permission-leaks.spec.ts` | PERM-01 to PERM-10 | P0 |
| `verification-bypass.spec.ts` | VB-01 to VB-04 | P0 |
| `giver.spec.ts` (additions) | GIVER-03, GIVER-04, GIVER-05, GIVER-11, GIVER-12 | P0/P1 |
| `seeker.spec.ts` (additions) | SEEKER-04, SEEKER-05, SEEKER-06, SEEKER-07, SEEKER-08, SEEKER-10 | P0/P1 |
| `admin.spec.ts` (additions) | ADMIN-05, ADMIN-08, ADMIN-09 | P1 |
| `requests.spec.ts` (additions) | REQ-02, REQ-03 | P1 |
| `mobile.spec.ts` (additions) | MOB-03, MOB-04 | P1 |
| `auth.spec.ts` (additions) | AUTH-03, AUTH-08, AUTH-09 | P1 |

**Total new Playwright tests to write: ~35**
**Total target after additions: ~85 Playwright tests**
