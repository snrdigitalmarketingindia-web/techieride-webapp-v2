# TechieRide — Release Readiness Checklist

**Version:** 2.1  **Date:** 2026-06-02

Work through this checklist top to bottom before every production release.
All ❌ items must be resolved. No exceptions for 🔴 Critical items.

---

## 🔴 Critical — Must Pass (Block release if any fail)

### Security
- [ ] `gmail.com` removed from `apps/api/src/config/allowed-domains.ts`
- [ ] `snrdigitalmarketingindia@gmail.com` deleted from Neon production DB
- [ ] All test accounts (`admin_test_*`, `fresh_giver_*`, `fresh_seeker_*`) purged from Neon
- [ ] JWT secrets are production-grade random strings (≥ 32 chars), not CI defaults
- [ ] `DATABASE_URL` points to production Neon, not staging/local
- [ ] No `.env` files committed to git (`git grep -r "npg_"` returns empty)

### Tests
- [ ] All 215 API tests green (`npm run test:all`)
- [ ] All security API tests green (`npm run test:api:security`)
- [ ] All 78+ Playwright E2E tests green (`npm run test:ui`)
- [ ] CI pipeline passes all 4 stages (Lint → API → Security → E2E)
- [ ] k6 smoke test passes against production URL (`npm run test:perf:smoke`)

### Data
- [ ] Neon schema has `pendingEmail`, `pendingEmailToken`, `pendingEmailExpiry` columns
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name='users' AND column_name LIKE 'pending%';
  -- Must return 3 rows
  ```
- [ ] All seed test accounts have phone numbers set (not null)
- [ ] `verification_requests` table has no duplicates (run `render-start.sh` dedup check)

---

## 🟠 High — Required Before Launch

### Infrastructure
- [ ] MinIO replaced with cloud storage (Cloudflare R2 or Supabase)
  - `MINIO_ENDPOINT` → R2 endpoint
  - `MINIO_USE_SSL=true`
  - Bucket permissions verified
- [ ] `techieride.in` domain verified in Resend dashboard
- [ ] `EMAIL_FROM` env var updated to `noreply@techieride.in` (or equivalent)
- [ ] Render production env vars reviewed — no test/dev values remain
- [ ] Vercel production env vars reviewed — `NEXT_PUBLIC_API_URL` points to production API

### Configuration
- [ ] `TRID_START` confirmed to real highest existing member number
  - Update `packages/shared/src/constants.ts` + `constants.js` + `constants.d.ts`
- [ ] Build version stamp is correct (`v2.1.0.XXX`, not SHA or stale number)

### Monitoring
- [ ] Render health check URL working: `GET /api/v1` returns 200
- [ ] Vercel deployment successful: app loads at `techieride-webapp-v2-web.vercel.app`
- [ ] GA4 tracking firing correctly (check Realtime in Google Analytics)

---

## 🟡 Medium — Should Complete Before Launch

### Features
- [ ] Notifications bell wired: unread count badge shows on header
- [ ] Call buttons render for all seeded accounts (phone ≠ null in DB)
- [ ] Profile email change flow tested end-to-end with real email
- [ ] Dashboard pending request badge shows correctly for giver

### UX
- [ ] Default date shows today's date in IST on Create Ride page
- [ ] Default date shows today's date in IST on Find Ride page
- [ ] Offer Ride button grayed when giver has active ride
- [ ] `+ Offer Ride` button absent for pure seekers
- [ ] Version badge in header shows correct build number

### Admin
- [ ] Admin can approve/reject employee verification
- [ ] Admin can approve/reject driver verification + RC
- [ ] Admin KPI dashboard loads without errors
- [ ] Admin can view rides list

---

## 🟢 Post-Launch (Acceptable to defer)

- [ ] SOS feature end-to-end tested
- [ ] WebSocket tracking tested under concurrent users
- [ ] k6 load test run against production (100 VUs)
- [ ] Playwright tests run in Firefox and Safari
- [ ] Accessibility (a11y) scan with axe-core
- [ ] Women-only ride feature implemented
- [ ] Payment (UPI details) flow verified
- [ ] Ratings & reviews flow end-to-end tested

---

## Go / No-Go Decision

| Gate | Owner | Status | Sign-off |
|---|---|---|---|
| All 🔴 Critical items resolved | QA Lead | ❌ | — |
| All 🟠 High items resolved | Tech Lead | ❌ | — |
| CI pipeline green on `main` | DevOps | ❌ | — |
| k6 smoke on production passes | QA | ❌ | — |
| Product sign-off | Product Owner | ❌ | — |

**Final Go decision:** All rows must show ✅ before deployment.

---

## Rollback Plan

If a P0 issue is found post-deploy:

1. Revert Vercel to previous deployment (Vercel dashboard → Deployments → Promote previous)
2. Revert Render to previous deploy (Render dashboard → Manual Deploy → previous commit)
3. If DB migration caused issue: restore Neon point-in-time backup
4. Notify users via status page / admin communication
5. Root-cause analysis within 24 hours

---

## Release Sign-off Log

| Version | Date | Released By | CI Run | Notes |
|---|---|---|---|---|
| 2.1.0 | TBD | — | — | First production release |
