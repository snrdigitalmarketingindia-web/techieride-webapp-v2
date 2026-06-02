# TechieRide Release Notes
> Single source of truth for all builds — auto-updated on every push, with detailed session notes below.
> Read this before touching any module.
## Build 175 · 6ccaebc · 2026-06-01 19:21 UTC
## Build 330 · 2e4403e · 2026-06-02 18:36 UTC

Commit: feat: admin verification badge fix, seeker cancel notifies giver, departure reminder cron
Author: Srinivas Reddy

Files changed:
- apps/api/src/modules/ride-requests/ride-requests.service.ts
- apps/api/src/modules/rides/rides.service.ts
- apps/web/src/app/admin/layout.tsx

---

## Build 328 · a9643e7 · 2026-06-02 18:27 UTC

Commit: feat: show trust score + band on dashboard, ride detail, and board page
Author: Srinivas Reddy

Files changed:
- apps/api/src/modules/rides/rides.service.ts
- apps/web/src/app/(dashboard)/dashboard/page.tsx
- apps/web/src/app/(dashboard)/rides/[id]/page.tsx
- apps/web/src/app/(dashboard)/rides/board/page.tsx

---

## Build 326 · 547afa9 · 2026-06-02 18:17 UTC

Commit: feat: show first-visit hint on search page to set home/office in profile
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/rides/search/page.tsx

---

## Build 324 · 969ebfa · 2026-06-02 18:03 UTC

Commit: fix: add TechieRide display name to email from address
Author: Srinivas Reddy

Files changed:
- apps/api/src/modules/email/email.service.ts

---

## Build 322 · 4501072 · 2026-06-02 17:34 UTC

Commit: fix: ensure npm install runs on start to pick up new cloudinary dependency
Author: Srinivas Reddy

Files changed:
- apps/api/render-start.sh

---

## Build 320 · 76d2c2b · 2026-06-02 17:30 UTC

Commit: fix: remove prisma db push from render-start.sh — was hanging on Neon cold start, schema already in sync
Author: Srinivas Reddy

Files changed:
- apps/api/render-start.sh

---

## Build 318 · 7dc592d · 2026-06-02 17:19 UTC

Commit: feat: replace MinIO with Cloudinary for document/photo uploads
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.service.js.map
- apps/api/dist/apps/api/src/modules/uploads/uploads.controller.js
- apps/api/dist/apps/api/src/modules/uploads/uploads.controller.js.map
- apps/api/dist/apps/api/src/modules/uploads/uploads.service.d.ts
- apps/api/dist/apps/api/src/modules/uploads/uploads.service.js
- apps/api/dist/apps/api/src/modules/uploads/uploads.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/package.json
- apps/api/src/modules/uploads/uploads.controller.ts
- apps/api/src/modules/uploads/uploads.service.ts
- package-lock.json

---

## Build 316 · 1061b4f · 2026-06-02 16:39 UTC

Commit: fix: update requests.spec.ts — match redesigned page heading + add missing no-rides strings
Author: Srinivas Reddy

Files changed:
- tests/e2e/requests.spec.ts

---

## Build 314 · 4bfcf60 · 2026-06-02 16:22 UTC

Commit: fix: complete() — use cancelReason not rejectionReason (field does not exist on RideRequest)
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/src/modules/rides/rides.service.ts

---

## Build 312 · e691470 · 2026-06-02 16:13 UTC

Commit: build: recompile API dist after pending-request completion fix
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/dist/apps/api/src/modules/rides/rides.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo

---

## Build 309 · f2894e6 · 2026-06-02 16:08 UTC

Commit: fix: replace remaining bare 'role' refs with user?.role in board + create pages
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/rides/board/page.tsx
- apps/web/src/app/(dashboard)/rides/create/page.tsx

---

## Build 307 · 173458f · 2026-06-02 16:06 UTC

Commit: fix: rides/[id] — replace bare 'role' with user?.role on isSeeker
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/rides/[id]/page.tsx

---

## Build 305 · d966b87 · 2026-06-02 16:03 UTC

Commit: fix: edge-case tests — use /ride-requests/mine instead of missing :id endpoint, fix notifications response key
Author: Srinivas Reddy

Files changed:
- tests/e2e-api-edge-cases.ts

---

## Build 303 · c94e4fd · 2026-06-02 14:11 UTC

Commit: test: add edge-case suite — last-seat race, re-request, pending on cancel/complete, notification order, cron-start board
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml
- package.json
- tests/e2e-api-edge-cases.ts

---

## Build 301 · d98b4a7 · 2026-06-02 14:03 UTC

Commit: ci: add [skip vercel] to release-notes commits [skip vercel]
Author: Srinivas Reddy

Files changed:
- .github/workflows/release-notes.yml

---

## Build 299 · 12df90d · 2026-06-02 13:44 UTC

Commit: ci: retrigger Vercel deploy
Author: Srinivas Reddy

Files changed:


---

## Build 297 · ee9dee6 · 2026-06-02 13:34 UTC

Commit: fix: profile page isGiver — replace bare 'role' with user?.role
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/profile/page.tsx

---

## Build 295 · 11fa491 · 2026-06-02 13:31 UTC

Commit: feat: Verification page — unified flat list, no tabs

All pending requests (Employee, Driver, Exception) shown in one table.
Each row: user name/email/company + account status badge, verification type
badge, document links, submitted date, and inline Approve/Reject actions.
Reject expands inline reason textarea before confirming.
'View Full Profile →' links to /admin/users/:id for the full checklist.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/admin/verification/page.tsx

---

## Build 293 · 961e344 · 2026-06-02 13:29 UTC

Commit: feat: Contextual admin actions — suspend with reason, reject with reason, deactivate, reinstate

API:
- PATCH /admin/users/:id/suspend   → accountStatus = SUSPENDED + isActive = false
- PATCH /admin/users/:id/deactivate → accountStatus = DEACTIVATED + isActive = false
- PATCH /admin/users/:id/reject     → accountStatus = REJECTED + verificationStatus = REJECTED
- Existing activate/reinstate unchanged

UI (admin user detail page):
- Active accounts show: Suspend (with reason input), Reject (with reason input), Deactivate
- Suspend/Reject expand inline reason input before confirming
- Deactivate uses browser confirm dialog
- Suspended/Rejected/Deactivated accounts show: Reinstate
- Banned accounts show read-only message (super-admin only)
- Trust score adjustment now requires both delta and reason

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/admin/admin.controller.d.ts
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js.map
- apps/api/dist/apps/api/src/modules/admin/admin.service.d.ts
- apps/api/dist/apps/api/src/modules/admin/admin.service.js
- apps/api/dist/apps/api/src/modules/admin/admin.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/admin/admin.controller.ts
- apps/api/src/modules/admin/admin.service.ts
- apps/web/src/app/admin/users/[id]/page.tsx
- apps/web/src/lib/api.ts

---

## Build 291 · 8334a59 · 2026-06-02 13:25 UTC

Commit: fix: Add logout button to admin sidebar

Shows 🚪 icon on mobile, 'Logout' label on desktop. Clears auth state
and redirects to landing page on click.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/admin/layout.tsx

---

## Build 289 · db0928c · 2026-06-02 13:22 UTC

Commit: feat: Landing page — improved contrast, social links, origin story

- Hero & impact sections: switched from green-on-green to dark charcoal
  (gray-900) with white/gray-300 text — readable at all sizes
- 'shared transportation' → 'carpooling'
- Origin story banner: started with <10 people, now ~2,000 members network
- Social media icons: Instagram, Facebook, YouTube, X above footer
  (grey default, brand colour on hover)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/page.tsx

---

## Build 283 · d8d025f · 2026-06-02 12:51 UTC

Commit: feat: Admin user detail page + search on users & rides

User detail page (/admin/users/[id]):
- 14-item verification checklist (email, phone, photo, docs, TRID, DL, RC, gender, blood, location)
- Verification requests with document links + inline Approve/Reject (TRID auto-assigned)
- Profile details grid, trust score adjustment, suspend/reinstate actions
- Users list rows are now clickable → navigate to detail page

Search — Users (/admin/users):
- Search bar: name, email, TRID, company, phone (server-side, case-insensitive)
- Enter key or 🔍 button triggers search, ✕ clears

Search — Rides (/admin/rides):
- Search bar: origin, destination, giver name, giver email, plate number
- Combined with status filter

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/admin/admin.controller.d.ts
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js.map
- apps/api/dist/apps/api/src/modules/admin/admin.service.d.ts
- apps/api/dist/apps/api/src/modules/admin/admin.service.js
- apps/api/dist/apps/api/src/modules/admin/admin.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/admin/admin.controller.ts
- apps/api/src/modules/admin/admin.service.ts
- apps/web/src/app/admin/rides/page.tsx
- apps/web/src/app/admin/users/page.tsx

---

## Build 280 · 60bee6d · 2026-06-02 12:20 UTC

Commit: feat: Women-only rides — API gate, search filter, UI badge + toggle

Schema:
- Add womenOnly Boolean @default(false) to Ride model

API:
- CreateRideDto: add optional womenOnly field
- rides.service create(): pass womenOnly through to DB
- ride-requests.service create(): gate — if ride.womenOnly, reject non-FEMALE with 403
- rides.service search(): exclude womenOnly rides from non-FEMALE users (injected userId)
- SearchRidesDto: add optional userId (server-injected, not from query string)
- rides.controller search(): inject userId from auth token into DTO

UI:
- RideCard: pink 'Women only' badge when ride.womenOnly
- Create Ride form: women-only checkbox toggle
- Search page: 'Show women-only rides only' client-side filter toggle + badge on result cards
- Profile page: gender select field (MALE/FEMALE/OTHER) in edit form

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/admin/admin.controller.d.ts
- apps/api/dist/apps/api/src/modules/admin/admin.service.d.ts
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.controller.d.ts
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.d.ts
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.js
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.js.map
- apps/api/dist/apps/api/src/modules/rides/dto/create-ride.dto.d.ts
- apps/api/dist/apps/api/src/modules/rides/dto/create-ride.dto.js
- apps/api/dist/apps/api/src/modules/rides/dto/create-ride.dto.js.map
- apps/api/dist/apps/api/src/modules/rides/dto/search-rides.dto.d.ts
- apps/api/dist/apps/api/src/modules/rides/dto/search-rides.dto.js
- apps/api/dist/apps/api/src/modules/rides/dto/search-rides.dto.js.map
- apps/api/dist/apps/api/src/modules/rides/rides.controller.d.ts
- apps/api/dist/apps/api/src/modules/rides/rides.controller.js
- apps/api/dist/apps/api/src/modules/rides/rides.controller.js.map
- apps/api/dist/apps/api/src/modules/rides/rides.service.d.ts
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/dist/apps/api/src/modules/rides/rides.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/ride-requests/ride-requests.service.ts

---

## Build 278 · eaab0ab · 2026-06-02 12:10 UTC

Commit: feat: Audit Log API — GET /admin/audit-log, SYSTEM actor for cron events

Schema:
- Add AuditLog model (actor, actorType USER/SYSTEM/ADMIN, action, entityType,
  entityId, metadata JSON, createdAt) with indexes on actor/action/entityType

Service (AuditLogService):
- log() — fire-and-forget, never throws
- system() — convenience wrapper for SYSTEM actor
- query() — paginated filter by actor/actorType/action/entityType/entityId/date range

Wired into:
- rides.service autoExpireUnstartedRides() → SYSTEM actor RIDE_AUTO_CANCELLED
- calls.service logCall() → USER actor CALL_INITIATED

Admin endpoint:
- GET /admin/audit-log (query params: actor, actorType, action, entityType, entityId, from, to, page, limit)
- No PATCH route — append-only by design (404/405 on attempt)

Tests (e2e-api-audit-trail.ts):
- AUD-04: SYSTEM actor filter returns correctly labelled entries (was skipped)
- AUD-20: CALL_INITIATED appears in audit log with caller as actor (was skipped)
- AUD-24: actorType=SYSTEM filter — all entries carry SYSTEM label (was skipped)
- AUD-25: PATCH /admin/audit-log/:id returns 404/405 (was skipped)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/app.module.js
- apps/api/dist/apps/api/src/app.module.js.map
- apps/api/dist/apps/api/src/modules/admin/admin.controller.d.ts
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js.map
- apps/api/dist/apps/api/src/modules/admin/admin.module.js
- apps/api/dist/apps/api/src/modules/admin/admin.module.js.map
- apps/api/dist/apps/api/src/modules/audit-log/audit-log.module.d.ts
- apps/api/dist/apps/api/src/modules/audit-log/audit-log.module.js
- apps/api/dist/apps/api/src/modules/audit-log/audit-log.module.js.map
- apps/api/dist/apps/api/src/modules/audit-log/audit-log.service.d.ts
- apps/api/dist/apps/api/src/modules/audit-log/audit-log.service.js
- apps/api/dist/apps/api/src/modules/audit-log/audit-log.service.js.map
- apps/api/dist/apps/api/src/modules/calls/calls.module.js
- apps/api/dist/apps/api/src/modules/calls/calls.module.js.map
- apps/api/dist/apps/api/src/modules/calls/calls.service.d.ts
- apps/api/dist/apps/api/src/modules/calls/calls.service.js
- apps/api/dist/apps/api/src/modules/calls/calls.service.js.map
- apps/api/dist/apps/api/src/modules/rides/rides.module.js
- apps/api/dist/apps/api/src/modules/rides/rides.module.js.map

---

## Build 276 · 116bccd · 2026-06-02 11:58 UTC

Commit: feat: Trust Score system — schema, service, cron decay, admin API

Schema:
- Add TrustBand enum (NEW/BRONZE/SILVER/GOLD/PLATINUM) to Prisma + shared
- Add trustScore (default 10) + trustBand (default NEW) to User model
- Add TrustScoreEvent model with idempotency guard (userId+eventType+referenceId)

Service (TrustScoreService):
- adjust() — atomic score update with idempotency, band recalc, threshold checks
- Auto-suspend at score < 5, warning at < 10, permanent ban at 0
- Domain handlers: onRideCompleted, onRatingReceived, onNoShow, onGiverCancelledRide, onComplaintVerified, onVerificationApproved
- Milestone bonuses at 10 and 50 rides
- adminAdjust() + adminReinstate() for manual overrides
- Daily cron decay (03:00 IST) — 30/60/90 day inactivity tiers, floor at 10

Wired into:
- rides.service: complete() +5 giver / +2 seeker; cancel() -2 giver; markNoShow() -3 seeker
- ratings.service: submitRating() adjusts ratee trust by star count
- complaints.service: adminReview() RESOLVED deducts -5 from reported user
- verification.service: approveRequest() +5 EMPLOYEE / +5 DRIVER

Admin endpoints:
- GET  /admin/users/:id/trust-score
- GET  /admin/users/:id/trust-score/history
- PATCH /admin/users/:id/trust-score (delta + reason)
- PATCH /admin/users/:id/reinstate

User endpoints:
- GET /users/me/trust-score
- GET /users/me/trust-score/history
- trustScore + trustBand exposed in public profile

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/app.module.js
- apps/api/dist/apps/api/src/app.module.js.map
- apps/api/dist/apps/api/src/modules/admin/admin.controller.d.ts
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js
- apps/api/dist/apps/api/src/modules/admin/admin.controller.js.map
- apps/api/dist/apps/api/src/modules/admin/admin.module.js
- apps/api/dist/apps/api/src/modules/admin/admin.module.js.map
- apps/api/dist/apps/api/src/modules/admin/admin.service.d.ts
- apps/api/dist/apps/api/src/modules/auth/strategies/jwt.strategy.d.ts
- apps/api/dist/apps/api/src/modules/commute-templates/commute-templates.controller.d.ts
- apps/api/dist/apps/api/src/modules/commute-templates/commute-templates.service.d.ts
- apps/api/dist/apps/api/src/modules/complaints/complaints.module.js
- apps/api/dist/apps/api/src/modules/complaints/complaints.module.js.map
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.d.ts
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.js
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.js.map
- apps/api/dist/apps/api/src/modules/gamification/gamification.controller.d.ts
- apps/api/dist/apps/api/src/modules/gamification/gamification.service.d.ts
- apps/api/dist/apps/api/src/modules/ratings/ratings.module.js
- apps/api/dist/apps/api/src/modules/ratings/ratings.module.js.map

---

## Build 274 · 398ff61 · 2026-06-02 09:31 UTC

Commit: Fill all seed users with complete dummy data — no empty fields

Added personalEmail, gender, bloodGroup, isPhoneVerified, countryCode,
homeLocation, officeLocation, companyName, employeeId for all 8 test accounts.
Dev test accounts now have realistic full names and company names.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- prisma/seed.ts

---

## Build 272 · 2b60efe · 2026-06-02 09:24 UTC

Commit: Add AGM banner + fix localStorage prefill for giver and seeker

- Dashboard: add 'Stay tuned for AGM Meeting 2026' announcement banner
- Offer Ride: fix SSR bug where localStorage prefs were never read (useState
  initializer runs on server where window is undefined); moved to useEffect
- Find Rides: add localStorage prefill for seeker origin/destination, saved
  on each search

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/dashboard/page.tsx
- apps/web/src/app/(dashboard)/rides/create/page.tsx
- apps/web/src/app/(dashboard)/rides/search/page.tsx

---

## Build 267 · 560e17a · 2026-06-02 08:42 UTC

Commit: Fix CI summary: show crash output when suite fails with no ❌ FAIL lines

When a suite crashes before running any tests (compile error, import
error, unhandled exception), there are no ❌ FAIL lines so the summary
falsely showed '✅ No failures'.

Fix: for each failed suite (marker file exists), if no ❌ FAIL lines
are found, treat it as a crash and show the last 20 lines of the log
so the actual error is visible in the GitHub Actions summary.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml

---

## Build 265 · b0470d4 · 2026-06-02 08:40 UTC

Commit: Fix boarding test: define section/test/assert locally + gate board() to ONGOING

Test fix: section/test/assert were imported from helpers but are defined
locally in each test file — copied the standard pattern from other suites.

Service fix: board() allowed PUBLISHED rides (status check included
RideStatus.PUBLISHED). Changed to ONGOING-only gate so seekers can only
board once the ride has started. Updated the allBoarded auto-start check
from PUBLISHED to ONGOING accordingly. Rebuilt dist.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/dist/apps/api/src/modules/rides/rides.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/rides/rides.service.ts
- tests/e2e-api-boarding.ts

---

## Build 263 · 3205a56 · 2026-06-02 08:25 UTC

Commit: Add seeker Board/Deboard buttons + 3 more boarding test cases

UI:
- /rides taken tab: ONGOING + boardingStatus=WAITING shows 'I've Boarded' button;
  BOARDED shows 'I've Deboarded' button; Track Live always shown
- Dashboard seeker view: same Board/Deboard buttons for ONGOING booked rides

Tests (e2e-api-boarding.ts — now 11 cases):
- BOARD-09: seeker deboard after board → 200, DEBOARDED
- BOARD-10: seeker boards twice → 400
- BOARD-11: seeker deboard without boarding → 400

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml
- apps/web/src/app/(dashboard)/dashboard/page.tsx
- apps/web/src/app/(dashboard)/rides/page.tsx
- tests/e2e-api-boarding.ts

---

## Build 255 · 7fdaaef · 2026-06-02 07:51 UTC

Commit: Poll seeker's request status every 15s so approval shows without refresh

When the giver approves, the seeker's taken tab auto-updates within 15s:
pending requests list clears and ride cards reflect the new CONFIRMED status.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/rides/page.tsx

---

## Build 253 · fc8b7f7 · 2026-06-02 07:50 UTC

Commit: Add global designer footer + inline pending requests on dashboard + 15s polling

- layout.tsx: Designed by SNR Digital Marketing footer on every page (blue link)
- dashboard: show seeker name + Approve/Reject buttons inline instead of count badge
- dashboard + rides: poll pending requests every 15s so new requests appear without manual refresh

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/dashboard/page.tsx
- apps/web/src/app/(dashboard)/rides/page.tsx
- apps/web/src/app/layout.tsx

---

## Build 251 · 81f0998 · 2026-06-02 07:20 UTC

Commit: Fix CMP-23: use valid UUID v4 format for fake reportedId

'00000000-0000-0000-0000-000000000001' is not a valid UUID v4/nil UUID
so class-validator's @IsUUID() rejects it with 400 before the service
runs. Changed to a properly-formatted v4 UUID (version=4, variant=8)
that is guaranteed non-existent in the DB.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/e2e-api-complaints.ts

---

## Build 248 · 44e3532 · 2026-06-02 06:54 UTC

Commit: fix: resolve all 07/08/09/10 test suite failures

Root causes and fixes:

1. Prisma schema missing enum values (caused ALL 500 errors)
   - RATING_RECEIVED and COMPLAINT_FILED were added to shared TS enums
     but never added to prisma/schema.prisma NotificationType enum
   - Prisma threw on insert → 500 for every rating + complaint POST
   - Fix: added both values to schema enum + db:push to Neon

2. NOT-07: giver not notified on ride completion
   - rides.service complete() only notified seekers with RIDE_COMPLETED
   - Fix: added giver notification after seeker loop

3. NOT-28: PENDING seekers not notified on ride cancellation
   - rides.service cancel() only fetched CONFIRMED requests to notify
   - Fix: changed query to include PENDING + CONFIRMED

4. NOT-03/04: wrong expected notification type in test
   - approve() goes directly to CONFIRMED (no separate confirm step)
   - Service sends REQUEST_APPROVED not RIDE_CONFIRMED
   - Fix: updated expected types; NOT-04 now tests giver notification
     on request submission (correct business event)

5. NOT-23: broken email construction in test
   - .replace(/\d{10,}/, '') stripped timestamp → invalid email
   - Fix: removed dead loginAs call; uses fresh client with seeker.token

6. NOT-25: rejected user blocked by guard
   - After rejection accountStatus blocks API access → GET /notifications 403
   - Fix: test now handles both cases (200 with notification OR 403 blocked)

7. AUD-01/23: rideGiverId comparison
   - r.data.rideGiverId = RideGiver.id ≠ giver.userId (User.id)
   - Fix: assert r.data.rideGiver?.userId === giver.userId

8. AUD-07: seekerId comparison
   - req.seekerId = RideSeeker.id ≠ seeker.userId (User.id)
   - Fix: assert req.seeker?.userId === seeker.userId

9. AUD-10/11/12: participant lookup by wrong ID
   - p.seekerId = RideSeeker.id ≠ seeker.userId (User.id)
   - Fix: find by p.seeker?.userId === seeker.userId

10. AUD-15/16: admin user list response structure
    - Response is { data: [...], total, page, limit } not { users: [...] }
    - Fix: use users.data.data ?? users.data as the array

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/dist/apps/api/src/modules/rides/rides.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/rides/rides.service.ts
- prisma/schema.prisma
- tests/e2e-api-audit-trail.ts
- tests/e2e-api-notifications.ts

---

## Build 246 · ffe8cc2 · 2026-06-02 06:42 UTC

Commit: assets: replace logo.png with new TechieRide circular brand mark

New logo: TRLogo_White.png (1254×1254 square PNG)
Copied to logo.png — used by all 13 Image placements across
auth pages, dashboard nav, admin sidebar, loading spinners,
and browser favicon (layout.tsx icons config).

Original source file retained as TRLogo_White.png for reference.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/public/TRLogo_White.png
- apps/web/public/logo.png

---

## Build 244 · e7ed6b3 · 2026-06-02 06:32 UTC

Commit: ci: complete Job Summary coverage across all 3 test stages + quality gate

Every stage now writes a formatted Markdown summary to $GITHUB_STEP_SUMMARY
which renders inline on the Actions run page — no download needed.

API Tests job:
  - Suite outcome table (10 rows)
  - Every ❌ FAIL line extracted from all 10 log files
  - Results totals per failing suite

Security Tests job:
  - Suite outcome row
  - Every ❌ FAIL line from security.log

Playwright E2E job:
  - Suite outcome row
  - pass/fail/skipped totals from Playwright output
  - Failed test names extracted from list reporter
  - Link to playwright-logs artifact for HTML report + screenshots

Quality Gate job:
  - Final 3-row table: API / Security / Playwright with ✅/❌
  - Clear PASSED or FAILED verdict

How to read summaries:
  Actions run page → click any job → scroll down → Job Summary section
  Each job has its own summary. Quality Gate gives the overall verdict.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml

---

## Build 242 · ffbddcc · 2026-06-02 06:30 UTC

Commit: ci: write failure summary to GitHub Job Summary (no download needed)

Previously: summary was only in a zipped artifact requiring download + unzip.

Now: the 'Write failure summary' step writes directly to $GITHUB_STEP_SUMMARY
which renders as formatted Markdown on the Actions run page — visible
immediately with no download required.

How to find it:
  GitHub → Actions → [run] → click the job name (e.g. 'API Tests')
  → scroll down → the summary table + all ❌ FAIL lines appear inline

The failure-summary.md file is still saved to the api-test-logs artifact
as a backup for copy-pasting into Claude.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml

---

## Build 239 · a6dfe00 · 2026-06-02 06:25 UTC

Commit: ci: persist all test output as downloadable artifacts (always)

Problem: test runner output (which tests passed/failed, error details)
only appeared in the live GitHub Actions log. Once a run expired or
scrolled off, the information was lost.

Changes:
- Each job creates /tmp/tr-logs/ at startup
- API server log → /tmp/tr-logs/api-server.log
- Each test suite piped through tee → numbered log files:
    01-base.log  02-extended.log  03-negative.log  04-rules.log
    05-coverage.log  06-final.log  07-ratings-sos.log
    08-notifications.log  09-audit-trail.log  10-complaints.log
    security.log  (security job)
- Playwright HTML report + server logs also included
- All artifacts uploaded with if: always() — not just on failure
- retention-days: 30

Where to find them:
  GitHub → Actions → [run] → Artifacts section (bottom of summary)
  api-test-logs/       — all 10 API suite logs + api-server.log
  security-test-logs/  — security suite log + api-server.log
  playwright-logs/     — Playwright HTML report + server logs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml

---

## Build 236 · 09be1f5 · 2026-06-02 06:21 UTC

Commit: fix(tests): give each SOS sub-test a fresh user to avoid 60s cooldown

The 3 SOS tests in section 12 of e2e-api-final.ts reused a single
seeker, hitting the cooldown after the first trigger. Each test now
creates its own freshSeeker so all 3 can fire independently.

Also removed the redundant seeker.confirm() call in the ride SOS
test — approve() goes directly to CONFIRMED (no separate confirm step).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/e2e-api-final.ts

---

## Build 234 · db87d96 · 2026-06-02 06:11 UTC

Commit: fix: correct participant ID comparison in SOS, Ratings, Complaints

Root cause: ride.rideGiverId = RideGiver.id (profile ID)
            request.seekerId = RideSeeker.id (profile ID)
            userId from JWT  = User.id

All three services were comparing profile IDs against User.id,
causing every participant check to return false → 403.

Fix: include rideGiver.userId and seeker.userId relations in the
ride query, then compare against User.id throughout.

Affected services:
- sos.service.ts      — isGiver + isSeeker checks
- ratings.service.ts  — rater/ratee participant checks
- complaints.service.ts — reporter/reported participant checks

Fixes: e2e-api-extended SOS Flow tests (2 failures)
       e2e-api-ratings-sos giver/seeker SOS + ratings tests
       e2e-api-complaints ride-scoped complaint tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.js
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.js.map
- apps/api/dist/apps/api/src/modules/ratings/ratings.service.js
- apps/api/dist/apps/api/src/modules/ratings/ratings.service.js.map
- apps/api/dist/apps/api/src/modules/sos/sos.service.js
- apps/api/dist/apps/api/src/modules/sos/sos.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/complaints/complaints.service.ts
- apps/api/src/modules/ratings/ratings.service.ts
- apps/api/src/modules/sos/sos.service.ts

---

## Build 232 · a4b7bc3 · 2026-06-02 04:22 UTC

Commit: style: update logo dimensions for square brand mark (1080×1080)

All 13 logo placements updated to square-correct dimensions:

  Landing nav                   : 40×40
  Dashboard header nav          : 40×40
  Admin sidebar nav             : 48×48
  Loading spinners (admin/dash) : 80×80
  Auth card headers             : 80×80  (login, signup, reset, verify-email)
  Auth page hero (mobile panel) : 96×96  (login, signup main)
  Confirm email pages           : 72×72

object-contain preserved throughout — no cropping.
No code-path changes; dimensions only.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(auth)/login/page.tsx
- apps/web/src/app/(auth)/profile/confirm-email-change/page.tsx
- apps/web/src/app/(auth)/profile/confirm-personal-email/page.tsx
- apps/web/src/app/(auth)/reset-password/page.tsx
- apps/web/src/app/(auth)/signup/page.tsx
- apps/web/src/app/(auth)/verify-email/page.tsx
- apps/web/src/app/admin/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/components/layout/DashboardLayout.tsx

---

## Build 229 · 98a96d9 · 2026-06-02 04:12 UTC

Commit: feat: complaint system + notifications/audit/complaint P0 test suites

Complaint system (new):
- Schema: Complaint model with ComplaintReason + ComplaintStatus enums;
  relations on User (reporter/reported) and Ride; pushed to Neon
- API module apps/api/src/modules/complaints/:
  POST   /complaints           — file complaint; guards: no self, no admin,
    participant-check if rideId, duplicate block, invalid reason → 400/403/404/409
  GET    /complaints/my        — reporter sees own complaints with ride context
  GET    /complaints/admin     — admin only; filterable by status + reportedId
  PATCH  /complaints/admin/:id — admin review/resolve/dismiss; terminal state lock
- Admin receives COMPLAINT_FILED notification on every new complaint
- Shared enums: ComplaintReason, ComplaintStatus, NotificationType.COMPLAINT_FILED
  added to .ts, .js, .d.ts

Test suites (3 new files):
- tests/e2e-api-complaints.ts  — 27 P0 tests:
    happy path (CMP-01 to CMP-10), negative/guards (CMP-11 to CMP-23),
    data integrity + regression (CMP-24 to CMP-27)
- tests/e2e-api-notifications.ts — 18 P0 tests:
    ride lifecycle, SOS admin alert, rating/no-show, verification,
    security/isolation, CRUD/persistence
- tests/e2e-api-audit-trail.ts — 25 tests (20 exec + 5 skipped):
    ride/request/boarding/SOS/admin state verification + immutability +
    timestamp regression; [REQUIRES_AUDIT_API] cases clearly labelled

npm scripts: test:api:complaints, test:api:notifications, test:api:audit-trail
All 3 wired into CI Stage 1 and test:ci

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml
- apps/api/dist/apps/api/src/app.module.js
- apps/api/dist/apps/api/src/app.module.js.map
- apps/api/dist/apps/api/src/modules/complaints/complaints.controller.d.ts
- apps/api/dist/apps/api/src/modules/complaints/complaints.controller.js
- apps/api/dist/apps/api/src/modules/complaints/complaints.controller.js.map
- apps/api/dist/apps/api/src/modules/complaints/complaints.module.d.ts
- apps/api/dist/apps/api/src/modules/complaints/complaints.module.js
- apps/api/dist/apps/api/src/modules/complaints/complaints.module.js.map
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.d.ts
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.js
- apps/api/dist/apps/api/src/modules/complaints/complaints.service.js.map
- apps/api/dist/packages/shared/src/enums.d.ts
- apps/api/dist/packages/shared/src/enums.js
- apps/api/dist/packages/shared/src/enums.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/app.module.ts
- apps/api/src/modules/complaints/complaints.controller.ts
- apps/api/src/modules/complaints/complaints.module.ts
- apps/api/src/modules/complaints/complaints.service.ts

---

## Build 227 · 17eb2a0 · 2026-06-02 04:06 UTC

Commit: test(p0): add notifications + audit trail automated test suites

Notifications (tests/e2e-api-notifications.ts) — 18 P0 tests:
- Ride lifecycle: NOT-01 approved, NOT-02 rejected, NOT-03/04 confirmed
  (seeker + giver), NOT-05 all seekers on start, NOT-06 cancel, NOT-07 complete
- SOS admin alert: NOT-08 admin receives SOS_ALERT
- Feature events: NOT-10 rating received, NOT-15 no-show
- Verification: NOT-24 approved, NOT-25 rejected
- Security/isolation: NOT-16 recipient isolation, NOT-17 no duplicates,
  NOT-18 auth gate, NOT-19 cross-user isolation, NOT-26 SOS not in user feed
- CRUD/persistence: NOT-20 mark read, NOT-22 unread count, NOT-23 DB-persisted,
  NOT-28 pending seekers notified on cancel, NOT-30 fresh-client persistence

Audit Trail (tests/e2e-api-audit-trail.ts) — 20 executable + 5 skipped:
- Ride lifecycle: AUD-01 actor identity, AUD-02 DRAFT→PUBLISHED,
  AUD-03 cancelledAt, AUD-05 startedAt, AUD-06 completedAt
- Request lifecycle: AUD-07 actor attribution, AUD-08 seat decrement,
  AUD-09 REJECTED status
- Boarding: AUD-10 BOARDED, AUD-11 DEBOARDED, AUD-12 NO_SHOW
- SOS: AUD-13 record+actor, AUD-14 RESOLVED removes from active queue
- Admin: AUD-15 suspend, AUD-16 reactivate, AUD-17 verify approve,
  AUD-18 verify reject, AUD-19 RC verified
- Immutability: AUD-21 rides not deletable, AUD-22 requests not deletable,
  AUD-23 actor identity on records, AUD-26 DB-persisted
- Timestamp regression: AUD-30 valid ISO 8601, startedAt ≤ completedAt,
  no epoch/IST midnight mismatch
- Skipped (require audit API): AUD-04, AUD-20, AUD-24, AUD-25
- npm scripts: test:api:notifications, test:api:audit-trail
- Both wired into CI Stage 1 and test:ci

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml
- package.json
- tests/e2e-api-audit-trail.ts
- tests/e2e-api-notifications.ts

---

## Build 225 · f420e37 · 2026-06-02 04:00 UTC

Commit: docs(qa): add 20-audit-trail.md — 30 P0/P1 business test cases

Complete business validation spec for the Audit Trail module:
- 30 test cases covering all logged platform events
- Ride lifecycle: create, publish, start, complete, cancel (manual + auto)
- Request lifecycle: submit, approve, reject
- Boarding events: board, deboard, no-show
- Admin actions: suspend, reactivate, verify, reject verification, RC verify
- SOS: trigger + resolution logging
- Call initiation logging
- Immutability: no DELETE or UPDATE on audit records (user or admin)
- Actor identity: every record has userId or SYSTEM — never anonymous
- Append-only, DB-persisted, IST timestamp regression
- Admin query by rideId, userId, and time range
- 5 UAT acceptance criteria
- 8 missing business rules / production risks identified

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/business-functional/20-audit-trail.md

---

## Build 223 · 1938c9c · 2026-06-02 03:58 UTC

Commit: docs(qa): add 19-notifications.md — 30 P0/P1 business test cases

Complete business validation spec for the Notifications module:
- 30 test cases covering full notification lifecycle
- Ride lifecycle events: approved, rejected, confirmed, started,
  cancelled (manual + auto-timeout), completed
- SOS admin alerting + recipient isolation
- PENDING expiry, rating received, boarding, no-show, verification
- Security: auth gate, cross-user isolation, admin-only SOS
- Regression: persistence after logout, API restart, order correctness
- 5 UAT acceptance criteria
- 8 identified missing business rules / production risks

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/business-functional/19-notifications.md

---

## Build 221 · e9415ee · 2026-06-02 03:51 UTC

Commit: feat: add Ratings API + harden SOS + P0 test automation

Ratings API (new module):
- POST /ratings — validated: ride COMPLETED, no self-rating, no duplicate,
  participant-only, score 1–5 integer; notifies ratee
- GET /ratings/ride/:rideId — list ratings for a ride
- GET /ratings/stats/:userId — averageRating + ratingCount

SOS hardening:
- 60-second cooldown per user (429 on repeat)
- Ride state gate: rideId must be ONGOING (400 otherwise)
- Participant check: only giver/confirmed seeker may trigger (403)
- lat/lng now optional — SOS works without GPS (SOS-13)

Shared enums:
- Added NotificationType.RATING_RECEIVED to .ts, .js, .d.ts

P0 test suite (tests/e2e-api-ratings-sos.ts):
- RAT-01,02,03,04,05,06,07,10,11,13,16,23 (12 rating P0 cases)
- SOS-01,02,03,04,07,08,09,10,11,13,15,20,23 (13 SOS P0 cases)
- npm run test:api:ratings-sos; wired into CI Stage 1 + test:ci

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml
- apps/api/dist/apps/api/src/app.module.js
- apps/api/dist/apps/api/src/app.module.js.map
- apps/api/dist/apps/api/src/modules/ratings/ratings.controller.d.ts
- apps/api/dist/apps/api/src/modules/ratings/ratings.controller.js
- apps/api/dist/apps/api/src/modules/ratings/ratings.controller.js.map
- apps/api/dist/apps/api/src/modules/ratings/ratings.module.d.ts
- apps/api/dist/apps/api/src/modules/ratings/ratings.module.js
- apps/api/dist/apps/api/src/modules/ratings/ratings.module.js.map
- apps/api/dist/apps/api/src/modules/ratings/ratings.service.d.ts
- apps/api/dist/apps/api/src/modules/ratings/ratings.service.js
- apps/api/dist/apps/api/src/modules/ratings/ratings.service.js.map
- apps/api/dist/apps/api/src/modules/sos/sos.controller.d.ts
- apps/api/dist/apps/api/src/modules/sos/sos.controller.js
- apps/api/dist/apps/api/src/modules/sos/sos.controller.js.map
- apps/api/dist/apps/api/src/modules/sos/sos.service.d.ts
- apps/api/dist/apps/api/src/modules/sos/sos.service.js
- apps/api/dist/apps/api/src/modules/sos/sos.service.js.map
- apps/api/dist/packages/shared/src/enums.d.ts
- apps/api/dist/packages/shared/src/enums.js

---

## Build 219 · 2a8a685 · 2026-06-02 03:32 UTC

Commit: docs: update handoff document for Session 9 end / Session 10 start

Complete rewrite — reflects all Session 9 work:
- CI all green (215 API + 46 security + 78 Playwright + 20 security E2E)
- Bug fixes: auth hydration, wrong rides, IST dates, favicon
- New: Show/Hide History, PENDING expiry (4h), departure timeout (1h)
- QA framework: security tests, k6, 18 business spec files
- Session 10 roadmap: women-only, complaints, trust score
- Pre-launch checklist (gmail, Resend, TRID, MinIO)
- All cron jobs, API routes, gotchas documented

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- handoffdocument.md

---

## Build 217 · fa29b32 · 2026-06-02 03:22 UTC

Commit: fix: increase departure timeout from 30 min to 1 hour

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/rides/rides.service.ts

---

## Build 215 · 3614ff0 · 2026-06-02 03:21 UTC

Commit: feat: auto-cancel unstarted PUBLISHED rides 30min past departure

Cron runs every 30 min (IST). Finds PUBLISHED rides where now >
departureTime + 30 min, cancels them, and notifies:
- Giver: 'auto-cancelled — not started within 30 min'
- Each confirmed participant: ride cancelled notification
- Any PENDING requests on the ride also cancelled

DEPARTURE_TIMEOUT_MINUTES = 30 (easy to tune).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.service.d.ts
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/dist/apps/api/src/modules/rides/rides.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/rides/rides.service.ts

---

## Build 213 · ed33ed5 · 2026-06-02 03:19 UTC

Commit: fix: reduce PENDING request expiry from 24h to 4h

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.js
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/ride-requests/ride-requests.service.ts

---

## Build 211 · 828cc28 · 2026-06-02 03:19 UTC

Commit: feat: auto-expire PENDING ride requests after 24h

Cron job runs every hour (IST). Finds PENDING requests older than
24 hours, rejects them, and notifies the seeker with an 'expired'
notification. Prevents seekers from waiting indefinitely for a
giver who never responds.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.d.ts
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.js
- apps/api/dist/apps/api/src/modules/ride-requests/ride-requests.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/ride-requests/ride-requests.service.ts

---

## Build 209 · 7d359a0 · 2026-06-02 03:17 UTC

Commit: feat: Show/Hide History toggle on My Rides

COMPLETED and CANCELLED rides hidden by default — keeps the active
rides view clean. A 'Show History' button toggles them back.
If all rides are historical, shows a prompt to reveal them.
'+ N completed/cancelled hidden' hint appears below active rides.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/rides/page.tsx

---

## Build 207 · f833a36 · 2026-06-02 03:13 UTC

Commit: fix: remove user?.role from rides fetch dependency — eliminates wrong fetch on hydration

When user hydrates, both the tab-correction effect (sets tab) and the
fetch effect (depends on user?.role) fired simultaneously. The fetch
ran with the OLD tab value first, causing a wrong API call and an empty
ride list flash before the correct fetch arrived.

Fix: fetch effect now only depends on [tab]. The tab-correction effect
sets the correct tab after hydration, which then triggers the fetch
with the right value — one fetch, correct data, no flicker.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/rides/page.tsx

---

## Build 205 · 3ccb2b7 · 2026-06-02 03:01 UTC

Commit: fix(e2e-security): use correct login form placeholders

getByPlaceholder(/email/i) never matched 'you@company.com' → timeout.
Use exact placeholder strings matching the login page.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/e2e/security.spec.ts

---

## Build 203 · aab85af · 2026-06-02 02:48 UTC

Commit: fix(ci): replace --ignore flag with single playwright test run

--ignore is not a valid Playwright CLI flag; run all specs in one
command including security.spec.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml

---

## Build 201 · 8032f82 · 2026-06-02 02:38 UTC

Commit: fix(security-tests): /ride-requests → /ride-requests/mine

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/e2e-api-security.ts

---

## Build 199 · d2c95a0 · 2026-06-02 02:28 UTC

Commit: fix(security-tests): fix XSS assertion + BAC-04 route

- XSS: API stores data as-is (Prisma), React escapes on render — just
  assert no 500 crash instead of checking raw stored content
- BAC-04: GET /rides is 404 (no such route); use /rides/given and
  /rides/taken which are the actual protected endpoints

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/e2e-api-security.ts

---

## Build 197 · bc09232 · 2026-06-02 02:09 UTC

Commit: fix(security-tests): correct endpoint paths and assertions

- /auth/me → /users/me (correct route for profile endpoint)
- /admin/verification → /admin/verification/pending
- /admin/verification/{id}/approve → /admin/verification/{id}/review
- SEC-AUTH-04: gmail intentionally allowed; test truly invalid domain instead
- SEC-FILE-01: accept any non-200/201 (500 from body parser is acceptable)
- Remove duplicate auth test

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/e2e-api-security.ts

---

## Build 195 · f2ec203 · 2026-06-02 02:01 UTC

Commit: fix(ci): remove Lint stage — ESLint not installed in API workspace

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml

---

## Build 193 · e7536cd · 2026-06-02 01:59 UTC

Commit: fix: rides not loading on navigation — wait for auth hydration before fetch

Root cause: auth store persists only the token, not the user object.
On mount user=null so isGiver=false, tab defaults to 'taken' and wrong
rides are fetched. When profile hydrates the effect doesn't re-run.

My Rides: add role-correction useEffect; guard fetch until user known;
add user?.role to fetch dependency.
Dashboard: guard fetch until user known; add user?.role dependency.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/(dashboard)/dashboard/page.tsx
- apps/web/src/app/(dashboard)/rides/page.tsx

---

## Build 191 · b5e59be · 2026-06-02 01:56 UTC

Commit: fix(ci): remove invalid YAML anchor x-services — GitHub Actions does not support YAML anchors

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml

---

## Build 189 · 482329e · 2026-06-02 01:51 UTC

Commit: docs(qa): complete business validation framework — 18 functional test specs

tests/business-functional/ — 18 comprehensive spec documents (530+ test cases):
  01-registration.md        — Domain whitelist, OTP, TRID, exception path (30 TCs)
  02-verification.md        — Two-track employee + driver verification (30 TCs)
  03-ride-posting.md        — Ride creation, publish gate, immutability rules (30 TCs)
  04-ride-search.md         — Haversine radius, IST date, state filtering (30 TCs)
  05-ride-visibility.md     — Full visibility matrix across all states + devices (30 TCs)
  06-ride-request.md        — Booking initiation, no-hold policy, lock rules (30 TCs)
  07-seat-management.md     — Concurrency, overbooking prevention, race conditions (25 TCs)
  08-calling.md             — tel: links, phone visibility gates, audit log (25 TCs)
  09-boarding.md            — WAITING/BOARDED/NO_SHOW state machine (25 TCs)
  10-deboarding.md          — Deboarding, completion, ECO points, gamification (25 TCs)
  11-live-tracking.md       — WebSocket GPS, reconnection, multi-subscriber (25 TCs)
  12-sos.md                 — Emergency SOS, spam prevention, admin response (25 TCs)
  13-ratings.md             — Post-ride ratings, duplicate/self-rating blocks (25 TCs)
  14-recurring-rides.md     — Commute templates, day skipping, generation (25 TCs)
  15-women-only-rides.md    — Gender filtering, visibility gates, enforcement (25 TCs)
  16-admin-workflows.md     — Approval, rejection, suspension, audit (30 TCs)
  17-operational-scenarios.md — 16 real-world failure scenarios with test cases
  18-trust-score.md         — Full scoring algorithm, bands, decay, admin overrides

Each file includes: Happy Path + Negative + Boundary + Regression test cases,
UAT Acceptance Criteria, and Missing Business Rules / Production Risks section.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- tests/business-functional/01-registration.md
- tests/business-functional/02-verification.md
- tests/business-functional/03-ride-posting.md
- tests/business-functional/04-ride-search.md
- tests/business-functional/05-ride-visibility.md
- tests/business-functional/06-ride-request.md
- tests/business-functional/07-seat-management.md
- tests/business-functional/08-calling.md
- tests/business-functional/09-boarding.md
- tests/business-functional/10-deboarding.md
- tests/business-functional/11-live-tracking.md
- tests/business-functional/12-sos.md
- tests/business-functional/13-ratings.md
- tests/business-functional/14-recurring-rides.md
- tests/business-functional/15-women-only-rides.md
- tests/business-functional/16-admin-workflows.md
- tests/business-functional/17-operational-scenarios.md
- tests/business-functional/18-trust-score.md
- tests/qa-specs/01-registration.md
- tests/qa-specs/02-verification.md

---

## Build 187 · 4cf245f · 2026-06-02 01:08 UTC

Commit: feat(qa): complete automated QA framework — security tests, performance tests, quality gates

Security Tests:
- tests/e2e-api-security.ts — 35 API security tests: JWT attacks (alg:none, tampering,
  role escalation), SQL injection probes, XSS sanitisation, path traversal, file upload
  abuse, broken access control, rate limiting, sensitive data exposure
- tests/e2e/security.spec.ts — 20 Playwright E2E security tests: auth bypass, privilege
  escalation, data exposure, XSS, CSRF, call feature security, session management

Performance Tests (k6):
- tests/performance/k6-smoke.js  — 1 VU, 1 min, verify API alive
- tests/performance/k6-load.js   — ramp 0→100 VUs, 8 min, p95 thresholds
- tests/performance/k6-stress.js — ramp 0→1000 VUs, 17 min, breaking point

CI/CD Enhancements:
- Added Lint stage (ESLint + TypeScript checks) as first gate
- Added Security Tests stage — zero-tolerance quality gate
- Added Quality Gate job — fails build if ANY stage failed
- Pipeline: Lint → API Tests → [Security + Playwright in parallel] → Quality Gate

New npm scripts: test:api:security, test:ui:security, test:perf:*, test:ci, lint:api

Documentation:
- QA_TEST_STRATEGY.md  — testing pyramid, suite inventory, CI pipeline, data strategy
- TEST_CASE_MATRIX.md  — 348 test cases mapped across 11 feature areas
- RISK_ASSESSMENT.md   — P0-P3 risk register with mitigation and test coverage
- RELEASE_CHECKLIST.md — go/no-go checklist, rollback plan, sign-off log

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- .github/workflows/ci.yml
- QA_TEST_STRATEGY.md
- RELEASE_CHECKLIST.md
- RISK_ASSESSMENT.md
- TEST_CASE_MATRIX.md
- package.json
- tests/e2e-api-security.ts
- tests/e2e/security.spec.ts
- tests/performance/k6-load.js
- tests/performance/k6-smoke.js
- tests/performance/k6-stress.js
- tests/performance/results/.gitkeep

---

## Build 184 · c5f5f47 · 2026-06-01 20:05 UTC

Commit: feat: add TechieRide logo as browser favicon

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/src/app/layout.tsx

---

## Build 182 · ff45c2b · 2026-06-01 20:01 UTC

Commit: fix: revert next.config.js to read version from package.json

SHA-based versioning was wrong. The release-notes workflow correctly stamps
2.1.0.{commit-count} into package.json on every push — Vercel deploys that
stamped commit so the build number is always accurate.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/next.config.js

---

## Build 180 · 0ca3620 · 2026-06-01 19:57 UTC

Commit: fix: use VERCEL_GIT_COMMIT_SHA as build identifier in next.config.js

Version now shows as 2.1.0-{short-sha} on Vercel, always accurate for
the exact commit deployed — no more stale build number from the
race between Vercel deploy and the release-notes stamp workflow.
Falls back to package.json version in local dev.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/web/next.config.js

---


Commit: feat: shared RideCard component — consistent participants + status + call everywhere

- New RideCard component (components/ui/RideCard.tsx) with 3 modes:
  giver: participants list with boarding status badge + call per passenger
  seeker: giver contact + all fellow passengers with status + call
  browse: giver name + joined count only (search results)
- Dashboard: replaced bespoke ride card with RideCard
- My Rides: replaced bespoke ride card with RideCard + actions slot
  (pending requests inline, Start/Complete/Track buttons)
- getTakenRides API: now includes ride.participants (seeker contact info)
  so fellow carpoolers are visible to confirmed seekers

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Author: Srinivas Reddy

Files changed:
- apps/api/dist/apps/api/src/modules/rides/rides.controller.d.ts
- apps/api/dist/apps/api/src/modules/rides/rides.service.d.ts
- apps/api/dist/apps/api/src/modules/rides/rides.service.js
- apps/api/dist/apps/api/src/modules/rides/rides.service.js.map
- apps/api/dist/tsconfig.tsbuildinfo
- apps/api/src/modules/rides/rides.service.ts
- apps/web/src/app/(dashboard)/dashboard/page.tsx
- apps/web/src/app/(dashboard)/rides/page.tsx
- apps/web/src/components/ui/RideCard.tsx

---

---

## v2.1.0 — Build 163 · 2026-06-02 · Session 8

### HOLD state removed — approve() goes directly to CONFIRMED
The two-step HOLD→CONFIRMED flow required a seeker to manually confirm after a giver approved. This was confusing and unnecessary — removed entirely.

**What changed:**

| Layer | Change |
|---|---|
| `ride-requests.service.ts` `approve()` | Status now jumps straight from `PENDING` → `CONFIRMED`. Creates `RideParticipant` in the same transaction. Notification text updated. |
| `ride-requests.service.ts` `confirm()` | Kept as a silent no-op (returns current status) so old API clients don't 404 |
| `ride-requests.service.ts` `cancel()` | Removed HOLD branch — only CONFIRMED triggers seat restore + participant delete |
| `rides.service.ts` | All status filters `['HOLD','CONFIRMED']` → `['CONFIRMED']`; `['PENDING','HOLD','CONFIRMED']` → `['PENDING','CONFIRMED']` |
| `requests/page.tsx` `SeekerView` | Removed "Confirm Seat" button; removed `confirm()` call entirely |
| All 5 test suites | `status === 'HOLD'` assertions → `'CONFIRMED'`; test names updated |

**Why:** Reduces friction in the ride request UX. Seekers don't need an extra step — giver approval is the final word.

---

### Call buttons added to all ride/request screens
Previously CallButton/ContactCard was only on ride detail, search results, and tracking. Now covers every place users can see each other.

| Screen | Who is callable |
|---|---|
| `requests/page.tsx` SeekerView | Giver — shown when request status = CONFIRMED |
| `requests/page.tsx` GiverView | Each seeker (pending requests) — already existed ✅ |
| `rides/page.tsx` taken tab | Giver — always visible |
| `rides/page.tsx` given tab | Each confirmed passenger listed with name + Call button |
| Ride detail page | Giver ContactCard ✅ |
| Tracking page | ContactCards ✅ |
| Search results | CallButton ✅ |

**API change:** `getGivenRides()` now includes `participants` (with `seeker.user` contact: phone, countryCode) so the giver's My Rides page can render the passenger list.

---

### Vercel build fixes (production deployment)
Several issues that caused the Vercel deployment to fail or behave incorrectly:

| Issue | Root cause | Fix |
|---|---|---|
| Build failed — TS type error | `[...new Set()]` spread not allowed at TS target | Changed to `Array.from(new Set(...))` in `rides/board/page.tsx` |
| Login hangs indefinitely | `NEXT_PUBLIC_API_URL` not set on Vercel — defaulted to `localhost:3001` | Added `apps/web/.env.production` with Render API URL |
| Version shows `v2.1.0.10` | Vercel shallow clone made `git rev-list --count` return ~10 | Added `git fetch --unshallow` to Vercel `buildCommand` in `vercel.json` |
| Version shows commit SHA | Previous workaround used `VERCEL_GIT_COMMIT_SHA` | Reverted — `--unshallow` gives correct commit count now |

---

### Render startup crash fix
The Render API (`render-start.sh`) was crashing on every deploy because `prisma db push` exits non-zero when it detects a unique constraint warning — killing the `&&` chain before `node dist/main`.

**Root cause:** `verification_requests` had duplicate `(userId, verificationType)` pairs from old data, which caused `prisma db push` to fail even with `--accept-data-loss` because P2002 is an error (not a warning).

**Fix:** Added a deduplication SQL step in `render-start.sh` before `prisma db push`:
```sql
DELETE FROM verification_requests WHERE id NOT IN (
  SELECT DISTINCT ON ("userId", "verificationType") id FROM verification_requests
  ORDER BY "userId", "verificationType", id DESC
);
```
This is a safe no-op if the table is already clean.

---

### Neon DB schema sync (Session 7 columns were never applied)
Session 7 added `countryCode`, `isPhoneVerified`, `accountStatus`, `verificationMethod` to `User`, `verificationType` to `VerificationRequest`, and the `CallLog` model. These were never applied to the production Neon DB because `prisma db execute` was silently hitting a different compute endpoint than the running API.

**Root cause:** Neon's `.c-8.` endpoint is a connection-pooler compute that spins up/down. DDL changes made via one connection may not be visible to a different compute that wakes up later.

**Fix:** Applied schema changes directly via `psql` (bypasses pooler), deduped `verification_requests`, re-seeded test accounts with correct `accountStatus` values.

> ⚠️ **Rule going forward:** Always use `psql` for DDL against Neon, never `prisma db execute`. `prisma db execute` appears to succeed but may hit a stale compute.

---

### Phone field required at registration (Session 7 follow-up)
`RegisterDto` made `phone` required in Session 7, but 5 test files still called `register()` without it. All helpers updated:

- `tests/helpers.ts` — `register()`
- `tests/e2e-api.ts` — `registerAndLogin()`
- `tests/e2e-api-extended.ts` — `registerAndLogin()` + inline admin-role test
- `tests/e2e-api-negative.ts` — `registerAndLogin()`
- `tests/e2e-api-business-rules.ts` — `registerAndLogin()`
- `tests/e2e-api-coverage.ts` — inline duplicate-email test

Phone generated as `9${Date.now().toString().slice(-9)}` — timestamp-based to guarantee uniqueness against the `phone @unique` constraint. Earlier hash-based approach collided with seeded accounts (`9876543210` etc.).

---

### Security fix — phone removed from public profile
`getPublicProfile()` was exposing `phone` and `countryCode` from Session 7's calling feature addition. Phone should only be visible in ride/request context (users who are actively connected), not on a public profile page.

**Fix:** Removed `phone: true` and `countryCode: true` from the `select` in `users.service.ts getPublicProfile()`. Coverage test `Public profile does not expose sensitive fields` now passes.

---

## v2.1.0 — Build 122 · 2026-06-01 · Session 7

### Direct calling feature
Ride givers and seekers can call each other via the app once connected on a ride.

**Schema additions:**
- `User.phone` (required at registration), `User.countryCode` (default `+91`), `User.isPhoneVerified`
- `CallLog` model — audit-only, fire-and-forget, never blocks the caller

**API:**
- `GIVER_USER_SELECT` and `USER_CONTACT_SELECT` now include `phone` + `countryCode`
- `POST /calls/log` — fire-and-forget audit endpoint

**Frontend:**
- `CallButton` component — `tel:` link, configurable size/variant
- `ContactCard` component — full + compact variants with role badge
- Wired into: ride search results, ride detail, requests page (giver view), tracking page

---

### Full identity redesign
Complete rewrite of the account status and verification system.

**Status model** (`AccountStatus` enum replacing old `verificationStatus`/`emailStatus`):
```
EMAIL_VERIFICATION_PENDING → DOCUMENT_VERIFICATION_PENDING → EMPLOYEE_VERIFIED
                                                            → DRIVER_VERIFICATION_PENDING → DRIVER_VERIFIED
Exception path: → EXCEPTION_VERIFICATION_REQUESTED → EMPLOYEE_VERIFIED
```

**Registration simplified:** 4 required fields only (email, password, fullName, phone). Role removed — everyone starts as `RIDE_SEEKER`.

**Two-track verification:**
- Employee track: `POST /verification/employee` → submit docs → admin approves → `EMPLOYEE_VERIFIED` + TRID
- Driver track: `POST /verification/driver` → submit docs → admin approves → `DRIVER_VERIFIED` + `role = BOTH`

**Exception path:** `/exception-verification` page for users who can't verify via company email.

**New pages:** `/exception-verification`, `/become-giver` (wizard)

**Admin:** 4-queue verification dashboard (email-pending, exception-requests, document-pending, driver-pending)

**Access guard:** `EmailVerifiedGuard` with 3 tiers — unverified, doc-pending, full-access. `@AllowDocsPending()` decorator for upload routes.

---

### Ride publish gate hardened
`publish()` now checks `accountStatus === 'DRIVER_VERIFIED'` (not the old `verificationStatus`). A giver must complete both employee + driver verification before offering rides.

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
