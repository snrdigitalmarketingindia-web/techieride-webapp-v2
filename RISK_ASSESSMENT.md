# TechieRide — QA Risk Assessment

**Version:** 1.0  **Date:** 2026-06-02  **Owner:** QA Lead

---

## Risk Matrix

| Likelihood | Impact | Rating |
|---|---|---|
| High + High | Critical | 🔴 P0 — Block launch |
| High + Medium | High | 🟠 P1 — Fix before launch |
| Medium + High | High | 🟠 P1 — Fix before launch |
| Low + Any | Low-Medium | 🟡 P2/P3 — Post-launch OK |

---

## Identified Risks

### 🔴 Critical (P0) — Block Launch

| ID | Risk | Likelihood | Impact | Mitigation | Test Coverage |
|---|---|---|---|---|---|
| R-01 | **Non-corporate users bypass domain whitelist** | Medium | Critical | `allowed-domains.ts` validation; gmail.com must be removed before launch | ✅ `SEC-AUTH-04` |
| R-02 | **JWT alg:none / algorithm confusion attack** | Low | Critical | Passport.js strict algorithm enforcement; tested in security suite | ✅ `SEC-JWT-03` |
| R-03 | **Unverified giver publishes ride** | Low | Critical | `accountStatus === DRIVER_VERIFIED` gate + `rcVerified` check | ✅ `VB-04`, `VB-03` |
| R-04 | **Admin role obtained via JWT tampering** | Low | Critical | Server-side role verification on every request | ✅ `SEC-JWT-05` |
| R-05 | **Seeker sees another seeker's phone number** | Low | Critical | USER_CONTACT_SELECT only included on confirmed ride relationships | ✅ `SEC-CALL-01` |
| R-06 | **Password hash exposed in API response** | Low | Critical | GIVER/SEEKER_USER_SELECT excludes password; tested in security suite | ✅ `SEC-AUTH-03`, `SEC-DATA-01` |

---

### 🟠 High (P1) — Fix Before Launch

| ID | Risk | Likelihood | Impact | Mitigation | Test Coverage |
|---|---|---|---|---|---|
| R-07 | **Email provider not configured for production** | High | High | `EMAIL_FROM=onboarding@resend.dev` is temp; verify techieride.in in Resend | ⚠️ Mocked in CI |
| R-08 | **Document uploads fail in production** (MinIO → cloud) | High | High | MinIO works locally; migrate to Cloudflare R2 or Supabase before launch | 🔲 Manual |
| R-09 | **Ride over-booking** (seat count race condition) | Medium | High | DB-level seat validation; request approval increments atomically | ✅ `RR-06` |
| R-10 | **Double ECO points award** (ride completed twice) | Low | High | Idempotency check in gamification service | ✅ `GAM-05` |
| R-11 | **TRID_START set to wrong value** | High | High | TRID_START = 2000 (placeholder); confirm real highest member number | 🔲 Manual config |
| R-12 | **SQL injection via Prisma** | Low | High | Prisma uses parameterised queries by default; tested with injection probes | ✅ `SEC-SQL-*` |
| R-13 | **Sensitive data in error messages** (Prisma stack traces) | Medium | High | Custom exception filters needed; tested in security suite | ✅ `SEC-DATA-03` |
| R-14 | **WebSocket connection drops during active ride** | Medium | High | No reconnection handling tested; live tracking unreliable | ❌ Not automated |

---

### 🟡 Medium (P2) — Monitor Post-Launch

| ID | Risk | Likelihood | Impact | Mitigation | Test Coverage |
|---|---|---|---|---|---|
| R-15 | **Ride search performance degrades at scale** | Medium | Medium | k6 load test; add DB indexes on departureDate, originLat, originLng | ✅ k6-load.js |
| R-16 | **Mobile browser date picker IST vs UTC mismatch** | High | Medium | Fixed: using `en-CA` locale with `Asia/Kolkata` timezone | ✅ Fixed in code |
| R-17 | **Phone numbers without country code stored** | Low | Medium | countryCode defaults to `+91`; validated at registration | ✅ DB schema |
| R-18 | **Notification bell unread count stale** | High | Medium | Frontend doesn't poll; badge shows old count after actions | ⚠️ Needs wiring |
| R-19 | **Admin approval race condition** (two admins approve same request) | Low | Medium | `@@unique([userId, verificationType])` prevents duplicate records | ✅ DB constraint |
| R-20 | **Session token persists after logout** | Low | Medium | Client-side localStorage cleared; server-side token blacklist not implemented | 🟡 Acceptable risk |
| R-21 | **Seeder accounts still present in production** | High | Medium | Remove `snrdigitalmarketingindia@gmail.com` from Neon before launch | 🔲 Pre-launch task |
| R-22 | **Large file uploads bypass size limit** | Low | Medium | Server-side body size limit configured in NestJS | ✅ `SEC-FILE-01` |

---

### 🟢 Low (P3) — Acceptable

| ID | Risk | Likelihood | Impact | Notes |
|---|---|---|---|---|
| R-23 | SOS feature not tested | Low | Low | Feature exists in backend; no automated test yet |
| R-24 | Leaderboard tie-breaking undefined | Low | Low | Cosmetic ordering issue |
| R-25 | Women-only ride not implemented | Low | Low | Flag in schema; UI not built |
| R-26 | Profile photo upload not E2E tested | Low | Low | Minio mock in CI |
| R-27 | No accessibility (a11y) tests | Medium | Low | axe-core not integrated |
| R-28 | Only Chromium tested in Playwright | Medium | Low | No Firefox/Safari/Edge coverage |
| R-29 | Commute templates pagination not tested | Low | Low | Only basic CRUD covered |

---

## Pre-Launch Mandatory Checks

| # | Check | Owner | Status |
|---|---|---|---|
| 1 | Remove gmail.com from `allowed-domains.ts` | Dev | ❌ Pending |
| 2 | Delete gmail test account from Neon | DevOps | ❌ Pending |
| 3 | Verify techieride.in domain in Resend | DevOps | ❌ Pending |
| 4 | Update `EMAIL_FROM` env var in Render | DevOps | ❌ Pending |
| 5 | Confirm real TRID_START value | Product | ❌ Pending |
| 6 | Migrate MinIO → Cloudflare R2 or Supabase | Dev | ❌ Pending |
| 7 | Run k6 smoke test against production URL | QA | ❌ Pending |
| 8 | Verify all seed test accounts removed | QA | ❌ Pending |
| 9 | Confirm Neon `pendingEmail*` columns exist | DevOps | ✅ Done |
| 10 | All 348 automated tests green | QA | ✅ Done |
