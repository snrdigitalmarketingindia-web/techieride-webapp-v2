# TechieRide Changelog

Version format: **Major.Minor.Patch.Build**
- **Major** — breaking changes, architectural milestones
- **Minor** — new features, new pages, new API modules
- **Patch** — bug fixes, test additions, config/infra changes
- **Build** — git commit count (auto-increments on every commit)

---

## [2.0.4.104] — 2026-06-01
### Added
- `permission-leaks.spec.ts` — 24 Playwright tests (PERM-01 to PERM-10): seeker/giver role guards, admin access redirects, unauthenticated route protection, token isolation, BOTH role UI
- `verification-bypass.spec.ts` — 6 Playwright tests (VB-01 to VB-04): seeker 403 on ride create, unverified identity/RC blocks, approved giver regression
- `tests/e2e/helpers.ts` — added `giver2` (raju@raju.com) and `both` (ravi@wipro.com) to ACCOUNTS map
- `playwright.config.ts` — `PLAYWRIGHT_BASE_URL` env var support (run against live or local)

### Fixed
- `gh` CLI authenticated — CI log fetching now works from dev machine

### Infrastructure
- Total automated checks: **350** (349 passing, 1 expected skip)
- CI job name updated to reflect new Playwright test count (~80)

---

## [2.0.3.95] — 2026-06-01
### Added
- Admin vehicle RC verification queue (`/admin/vehicles`) — Approve/Reject per vehicle
- `PATCH /admin/vehicles/:id/verify` and `PATCH /admin/vehicles/:id/reject` API endpoints
- `PATCH /vehicles/:id/rc` — givers can upload RC document URL
- `tests/e2e-api-coverage.ts` — 69-test production coverage suite (13 sections)
- `tests/e2e-api-final.ts` — 57-test gap-closing suite (14 sections)
- `tests/helpers.ts` — shared `freshGiver()` for full verified giver flow
- `TEST_AUTOMATION_STRATEGY.md` — findings mapped to test types and CI stages
- `PLAYWRIGHT_TEST_PLAN.md` — 50+ UI scenarios across 8 spec files
- `.github/workflows/ci-autofix.yml` — auto-creates/closes GitHub Issues on CI failure/success

### Fixed
- Unverified giver could publish rides → `verificationStatus !== APPROVED` → 403
- Unverified RC vehicle usable on rides → `vehicle.rcVerified !== true` → 403
- Vehicle delete mid-active-ride → 409 ConflictException
- Duplicate plate number → Prisma P2002 caught → 409
- BOTH user could request own ride → 403
- `resendVerification` leaked email existence → always returns 200
- `passwordHash` leaked in `GET /users/me` → stripped from response
- Race condition on concurrent seat approval → atomic `updateMany WHERE availableSeats > 0`
- Re-request after CANCELLED/REJECTED → allowed via upsert (was 409)
- Ride cancel didn't notify passengers → HOLD/CONFIRMED seekers notified
- Seeded givers (Raju, Venky) had no vehicles → added with `rcVerified=true`
- `ci-autofix.yml` SyntaxError → merged script steps

### Infrastructure
- Total automated checks: **320** (all passing)

---

## [2.0.2.65] — 2026-06-01
### Added
- `GET /ride-requests/mine` — seeker's own requests endpoint
- Seeker requests page (`/requests`) — shows PENDING/HOLD/CONFIRMED with Confirm Seat button
- Auto-select ride in Incoming tab when only one ride exists
- Business rule: one active ride per giver (API + UI)
- Business rule: one active request per seeker (API)
- Base lifecycle test suite (37 tests)
- Extended test suite — rejection/cancel/race/SOS (30 tests)
- Negative/boundary test suite (30+ tests)
- Business rules test suite (44 tests)
- Playwright E2E baseline (50 tests)
- GitHub Actions CI pipeline

### Fixed
- `GeoJSON.LineString` type fix in shared package
- `vercel.json` secret refs removed, output dir fixed
- `useSearchParams` wrapped in Suspense on verify-email and reset-password pages
- Redis debug logs removed from `redis.module.ts` (was leaking `REDIS_URL` to stdout)
- CORS fixed — `FRONTEND_URL` set on Render with both Vercel URLs
- `REDIS_URL` fixed (was `redis-cli --tls -u rediss://...`, corrected to bare URL)
- `RideStatus.STARTED` → `RideStatus.ONGOING` (no STARTED variant exists)

### Infrastructure
- Vercel frontend deployed: https://techieride-webapp-v2-web.vercel.app
- Render API deployed: https://techieride-webapp-v2.onrender.com
- Neon DB seeded with test accounts

---

## [2.0.1.1] — 2026-05-01
### Added
- Initial project scaffold — NestJS API + Next.js 14 + Neon PostgreSQL + Upstash Redis
- Authentication (JWT, email verification, password reset)
- Ride lifecycle (DRAFT → PUBLISHED → ONGOING → COMPLETED/CANCELLED)
- Ride request lifecycle (PENDING → HOLD → CONFIRMED/REJECTED)
- Gamification — ECO points, levels, leaderboard
- GPS tracking module
- Emergency contacts
- Admin panel (verification queue, user management, rides overview)
- Shared types package (`@techieride/shared`)
- Prisma ORM with PostgreSQL

---

## Version History Summary

| Version | Build | Date | Highlights |
|---|---|---|---|
| 2.0.4 | 104 | 2026-06-01 | Playwright P0 security tests (30 new), gh CLI auth |
| 2.0.3 | 95 | 2026-06-01 | QA audit fixes (15 bugs), 6 test suites (320 checks) |
| 2.0.2 | 65 | 2026-06-01 | Business rules, 4 test suites, CI pipeline |
| 2.0.1 | 1 | 2026-05-01 | Initial build — full stack scaffold |
