# TechieRide 2.0 — Test Automation Strategy
**Senior QA Director Review | Production-Ready Zero-Bug Checklist**
**Last updated:** 2026-06-01 | Commit: `42c204f`

---

## Executive Summary

This document maps every bug, gap, business rule, permission rule, security finding, and workflow identified during the full audit to a specific test type, automation level, and CI pipeline stage. Nothing ships to production unless every gate below is green.

**Current coverage baseline:** 246+ API tests | 50 Playwright tests | 0 unit tests | 0 security scans | 0 contract tests

**Target after this strategy:** 350+ automated checks across 7 pipeline stages with hard failure gates.

---

## ⚠️ Critical Findings Identified During Audit

These are BUGS IN THE CURRENT CODE that must be fixed before the strategy below becomes meaningful:

| # | Finding | Severity | Location | Status |
|---|---|---|---|---|
| 1 | `publish()` does NOT check `verificationStatus === APPROVED` | **CRITICAL** | `rides.service.ts` | ❌ Unverified givers CAN publish |
| 2 | `publish()` does NOT check `vehicle.rcVerified === true` | **CRITICAL** | `rides.service.ts` | ❌ Unverified RC CAN be used |
| 3 | `publish()` does NOT check `rideGiver.licenseVerified === true` | **HIGH** | `rides.service.ts` | ❌ Unverified license CAN publish |
| 4 | `vehicle.remove()` does soft-delete (isActive=false) but does NOT check for active rides first | **HIGH** | `vehicles.service.ts` | ❌ Can deactivate vehicle mid-ride |
| 5 | `RideRequest.@@unique([rideId, seekerId])` DB constraint exists but error handling is generic | **MEDIUM** | `ride-requests.service.ts` | ⚠️ DB error if logic check missed |
| 6 | No rate limiting on `/auth/login` or `/auth/forgot-password` | **HIGH** | `auth.controller.ts` | ❌ Brute-force possible |
| 7 | `POST /sos` has no deduplication — same user can spam SOS | **MEDIUM** | `sos.service.ts` | ⚠️ Noise in admin dashboard |

---

## Complete Finding → Test Mapping

### SECTION A — Authentication & Session Security

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Login with valid credentials → 200 + both tokens | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| Login with wrong password → 401 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Login response never exposes `passwordHash` | Integration + Security | Automated | Stage 3+5 | `e2e-api-final.ts` ✅ |
| Refresh token generates new access token | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Expired/invalid bearer → 401 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Invalid refresh token → 401 | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| Suspended user refresh → 401 | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| Suspended user API call → 401 | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| Forgot password always 200 (no email enumeration) | Security | Automated | Stage 5 | `e2e-api-coverage.ts` ✅ |
| Reset password invalid token → 400/404 | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Resend verification unknown email → 200 (no enumeration) | Security | Automated | Stage 5 | `e2e-api-coverage.ts` ✅ |
| Duplicate email register → 409 | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| Personal email (gmail) register → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Missing fullName register → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Phone < 10 digits → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Admin cannot be created via register | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| **Rate limiting on /auth/login** | **Security** | **Automated** | **Stage 5** | ❌ **MISSING — must add** |
| **Rate limiting on /auth/forgot-password** | **Security** | **Automated** | **Stage 5** | ❌ **MISSING — must add** |
| CORS blocks unknown origin | Security | Automated | Stage 5 | `e2e-api-coverage.ts` ✅ |
| Email bounce webhook valid payload → 200 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Email bounce webhook missing email → 400 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Login UI happy path | E2E (UI) | Automated | Stage 6 | Playwright ✅ |
| Logout clears session | E2E (UI) | Automated | Stage 6 | Playwright ✅ |
| Forgot password UI flow | E2E (UI) | Automated | Stage 6 | Playwright ✅ |

---

### SECTION B — Role-Based Access Control (RBAC)

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Seeker cannot create a ride → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Seeker cannot add a vehicle → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Seeker cannot approve ride request → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Seeker cannot start a ride → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Seeker cannot complete a ride → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Giver cannot request a ride seat → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Non-admin cannot access /admin routes → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Non-admin cannot suspend user → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| BOTH role can add vehicle (giver capability) | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| BOTH role can create/publish ride | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| BOTH role can search for rides (seeker capability) | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| BOTH role cannot request own ride → 403/400 | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Seeker cannot access Offer Ride page | E2E (UI) | Automated | Stage 6 | ❌ MISSING |
| Giver cannot access Book Ride page | E2E (UI) | Automated | Stage 6 | ❌ MISSING |
| **Direct URL access by wrong role → redirect/403** | **E2E (UI)** | **Automated** | **Stage 6** | ❌ **MISSING** |
| Unauthenticated → 401 on all protected endpoints | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |

---

### SECTION C — Ride Lifecycle & State Machine

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| DRAFT → PUBLISHED (publish) | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| PUBLISHED → ONGOING (start) | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| ONGOING → COMPLETED (complete) | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| PUBLISHED → CANCELLED (cancel) | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| ONGOING → CANCELLED | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| Cannot publish DRAFT with active PUBLISHED ride | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| Can publish after COMPLETED ride | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| Can publish after CANCELLED ride | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| Cannot start a DRAFT ride → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Cannot complete a PUBLISHED ride → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Cannot cancel a COMPLETED ride → 400 | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| Cannot re-publish an already PUBLISHED ride → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| **Unverified giver cannot publish ride → 403** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING — CRITICAL BUG** |
| **Giver with rejected verification cannot publish** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING — CRITICAL BUG** |
| **Unverified RC vehicle cannot be used on published ride** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING — CRITICAL BUG** |
| Create ride with 0 seats → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Create ride with negative seats → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Create ride with missing vehicleId → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Ride with past departure date → reject or warn | Integration | Automated | Stage 3 | ❌ MISSING |
| Ride notes field with very long text (>1000 chars) | Integration | Automated | Stage 3 | ❌ MISSING |
| Giver completes ride → participants notified | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| Giver cancels ride → confirmed participants notified | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Ride create → publish → book → complete UI flow | E2E (UI) | Automated | Stage 6 | `giver.spec.ts` ✅ |

---

### SECTION D — Seat & Request Management

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| availableSeats decremented when HOLD created | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| availableSeats restored when HOLD request cancelled | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| availableSeats restored when CONFIRMED request cancelled | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| availableSeats restored when giver rejects | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| availableSeats never exceeds totalSeats | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Cannot book seat when availableSeats = 0 → 400 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Giver cannot approve 2nd request when ride fully CONFIRMED | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Only one active request per seeker | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| Seeker can re-request after REJECTED | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| Seeker can re-request after CANCELLED | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Seeker cannot request same ride twice → 409 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Seeker can cancel PENDING request | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Seeker can cancel HOLD request (seat released) | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Hold expires in ~15 min (holdExpiresAt correct) | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Race: concurrent approval of last seat → exactly one succeeds | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Race: 3 seekers for 2 seats — correct final count | Integration | Automated | Stage 3 | `e2e-api-business-rules.ts` ✅ |
| Cannot cancel a request you do not own → 403 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| **DB unique constraint: one request per ride per seeker** | **DB Constraint** | **Automated** | **Stage 3** | ✅ Prisma @@unique |
| Seeker request UI flow (search → book → confirm) | E2E (UI) | Automated | Stage 6 | `seeker.spec.ts` ✅ |

---

### SECTION E — Vehicle Verification

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Giver can add a vehicle | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| Duplicate plate number → 409 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Giver can list own vehicles | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Giver can delete vehicle with no active ride | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| **Cannot delete vehicle in active ride → 400/409** | **Integration** | **Automated** | **Stage 3** | ⚠️ Soft-delete currently bypasses this |
| Seeker cannot add vehicle → 403 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| Seeker cannot delete a giver's vehicle → 403/404 | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Vehicle has required fields (id, make, model, plate, seats) | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| **Admin can approve/reject vehicle RC** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING — endpoint exists?** |
| **RC-rejected vehicle cannot be used for new ride** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING — CRITICAL BUG** |
| **DB unique constraint: plateNumber** | **DB Constraint** | **Automated** | **Stage 3** | ✅ Prisma @unique |

---

### SECTION F — User Verification Workflow

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Giver can submit verification docs | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Submitted verification appears in admin pending queue | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Admin can approve verification | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Admin can reject verification with reason | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Rejected giver can resubmit | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Verification approval triggers notification to user | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Seeker cannot access admin verification routes → 403 | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| **PENDING verification giver cannot publish ride** | **Integration + E2E** | **Automated** | **Stage 3+6** | ❌ **MISSING — CRITICAL BUG** |
| **REJECTED verification giver cannot publish ride** | **Integration + E2E** | **Automated** | **Stage 3+6** | ❌ **MISSING — CRITICAL BUG** |
| Admin approval workflow UI | E2E (UI) | Automated | Stage 6 | `admin.spec.ts` partial ✅ |

---

### SECTION G — Admin Operations

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Admin can list all users | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| Admin can filter users by role | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Admin can filter users by verificationStatus | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Admin list respects page/limit | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Admin can suspend a user | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| Admin can activate a suspended user | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| Suspended user → all API calls → 401 | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| Admin can list all rides (with status filter) | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Admin analytics (default + date range) | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Admin analytics returns correct metric keys | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Non-admin cannot access analytics → 403 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Admin can view active SOS | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Admin can resolve SOS with notes | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| **Admin cannot be created via public register** | **Integration** | **Automated** | **Stage 3** | ✅ `e2e-api-negative.ts` |
| Admin user investigation UI | E2E (UI) | Automated | Stage 6 | `admin.spec.ts` ✅ |

---

### SECTION H — Gamification & Eco System

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Fresh user starts with 0 eco points | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Giver earns points after ride completion | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Seeker earns points after ride completion | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Summary has ecoPoints, ecoLevel, co2Saved | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Leaderboard is publicly accessible | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Leaderboard respects limit param | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Leaderboard entries have rank + points + name | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Leaderboard monthly period works | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Unauthenticated cannot get summary → 401 | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| **ecoLevel upgrades when threshold crossed** | **Unit + Integration** | **Automated** | **Stage 2+3** | ❌ **MISSING — no unit tests** |
| **Points are never double-awarded for same ride** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING** |
| Eco impact displayed on UI | E2E (UI) | Automated | Stage 6 | ❌ MISSING |

---

### SECTION I — Notifications

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Giver notified when seeker requests | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Seeker notified when giver approves | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| All participants notified when ride starts | Integration | Automated | Stage 3 | `e2e-api.ts` ✅ |
| Confirmed participants notified when ride cancelled | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Verification result notifies user | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| SOS triggers admin notification | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| Notification has id, title, isRead, createdAt | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| unreadOnly=true returns only unread | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| mark-all-read clears unread count | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Unauthenticated cannot read notifications → 401 | Integration | Automated | Stage 3 | `e2e-api-negative.ts` ✅ |
| **HOLD_EXPIRING notification sent ~13 min after approval** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING — needs scheduler test** |
| Notification bell updates in UI | E2E (UI) | Automated | Stage 6 | ❌ MISSING |

---

### SECTION J — SOS Emergency System

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| User can trigger SOS without rideId | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| User can trigger SOS with rideId | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| SOS response includes sosId + message | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Admin can view active SOS list | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Admin can resolve SOS | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Unauthenticated SOS trigger → 401 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| SOS notifies all admins | Integration | Automated | Stage 3 | `e2e-api-extended.ts` ✅ |
| SOS notifies user's emergency contacts | Integration | Automated | Stage 3 | ❌ MISSING (requires SMS mock) |
| **SOS deduplication — cooldown between triggers** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING** |

---

### SECTION K — Security & Data Protection

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| passwordHash never in any response | Security | Automated | Stage 5 | `e2e-api-final.ts` ✅ |
| emailVerificationToken never in response | Security | Automated | Stage 5 | `e2e-api-final.ts` ✅ |
| passwordResetToken never in response | Security | Automated | Stage 5 | `e2e-api-final.ts` ✅ |
| phone not in public profile | Security | Automated | Stage 5 | `e2e-api-coverage.ts` ✅ |
| email not in public profile | Security | Automated | Stage 5 | `e2e-api-coverage.ts` ✅ |
| Cannot access another user's private profile | Security | Automated | Stage 5 | `e2e-api-negative.ts` ✅ |
| CORS rejects unknown origin | Security | Automated | Stage 5 | `e2e-api-coverage.ts` ✅ |
| File upload: wrong type (e.g. .exe) → 400 | Security | Automated | Stage 5 | ❌ MISSING |
| File upload: oversized file (>5MB) → 400 | Security | Automated | Stage 5 | ❌ MISSING |
| **SQL injection via search params** | **Security** | **Automated** | **Stage 5** | ❌ **MISSING** |
| **XSS payload in notes/fullName field** | **Security** | **Automated** | **Stage 5** | ❌ **MISSING** |
| **npm audit — no critical CVEs** | **Dependency** | **Automated** | **Stage 1** | ❌ **MISSING** |
| **TypeScript strict mode** | **Static Analysis** | **Automated** | **Stage 1** | ❌ **MISSING** |
| **ESLint no security rule violations** | **Static Analysis** | **Automated** | **Stage 1** | ❌ **MISSING** |

---

### SECTION L — API Response Contract

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Ride object: all required fields present | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| User profile: all required fields, no sensitive | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Request object: id/status fields | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Vehicle object: all required fields | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Ride ID is valid UUID format | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Correct HTTP status codes on all operations | API Contract | Automated | Stage 4 | All suites ✅ |
| **OpenAPI spec matches actual API responses** | **API Contract** | **Automated** | **Stage 4** | ❌ **MISSING — needs Swagger validation** |
| **Request schema validation (DTO class-validator)** | **Unit** | **Automated** | **Stage 2** | ❌ **MISSING — no unit tests** |

---

### SECTION M — Templates

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Giver can create commute template | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Giver can list own templates | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Giver can toggle template active/inactive | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Giver can delete template | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Deleted template not in list | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Seeker cannot create template → 403 | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| **Ride created from template inherits correct fields** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING** |
| **auto-publish from template creates PUBLISHED ride** | **Integration** | **Automated** | **Stage 3** | ❌ **MISSING** |

---

### SECTION N — Emergency Contacts

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| User can add emergency contact | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| User can list emergency contacts | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Contact has name + phone fields | API Contract | Automated | Stage 4 | `e2e-api-coverage.ts` ✅ |
| User can remove emergency contact | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| Unauthenticated cannot access contacts → 401 | Integration | Automated | Stage 3 | `e2e-api-coverage.ts` ✅ |
| SOS notifies emergency contacts | Integration | Automated | Stage 3 | ❌ MISSING |

---

### SECTION O — Upload Service

| Finding | Test Type | Automation Level | CI Stage | Suite |
|---|---|---|---|---|
| Storage health check returns boolean available | API Contract | Automated | Stage 4 | `e2e-api-final.ts` ✅ |
| Upload without file → 400 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| Upload unauthenticated → 401 | Integration | Automated | Stage 3 | `e2e-api-final.ts` ✅ |
| **Upload wrong file type (.exe, .html) → 400** | **Security** | **Automated** | **Stage 5** | ❌ **MISSING** |
| **Upload file >5MB → 413** | **Security** | **Automated** | **Stage 5** | ❌ **MISSING** |

---

## CI/CD Pipeline Design — 7 Stages

### Stage 0 — Pre-flight (every push, < 30s)
```
checkout → install → cache hit check
```
**Fails if:** `npm ci` fails

---

### Stage 1 — Static Analysis (every push, target: < 2 min)

```yaml
- TypeScript: tsc --noEmit (strict mode)
- ESLint: eslint apps/api/src --max-warnings=0
- Security lint: eslint with eslint-plugin-security
- Dependency audit: npm audit --audit-level=high
- Circular dependency check: madge --circular
```

**Hard failure on:**
- Any TypeScript error
- Any ESLint error (warnings=0 policy)
- Any HIGH or CRITICAL npm audit finding
- Circular imports detected

**Why this stage is missing today:**
The project has no `tsconfig` strict flags, no ESLint config, and no dependency audit step. These must be added before Stage 1 can run.

---

### Stage 2 — Unit Tests (every push, target: < 3 min)

**Currently: ZERO unit tests exist. This entire stage must be built.**

Minimum coverage targets:
- Overall: **80%**
- Business rules (rides.service, ride-requests.service): **90%**
- Permission/guard logic (roles.guard, jwt-auth.guard): **95%**
- Gamification calculations: **90%**

Priority test targets (write these first):
```
gamification.service.ts         → ecoLevel threshold logic, point award formula
rides.service.ts                → publish() business rule checks
ride-requests.service.ts        → seat decrement/restore logic
auth.service.ts                 → token generation, password hashing
vehicles.service.ts             → active-ride guard before delete
```

```yaml
- npx jest --coverage --coverageThreshold='{"global":{"lines":80}}'
```

**Hard failure on:**
- Coverage below threshold
- Any test failure

---

### Stage 3 — Integration Tests / API Tests (every push, target: < 8 min)

All 6 existing API test suites run sequentially:

```yaml
- npm run test:api           # 37 tests — base lifecycle
- npm run test:api:extended  # 30 tests — rejection/cancel/race/SOS
- npm run test:api:negative  # 30+ tests — role/state/validation
- npm run test:api:rules     # 44 tests — business rules
- npm run test:api:coverage  # ~60 tests — gap coverage
- npm run test:api:final     # ~45 tests — final gaps
```

**Hard failure on:** Any single test failure across any suite.

Infrastructure required in CI (already present in ci.yml):
- PostgreSQL 15
- Redis 7
- Local API server on port 3001

---

### Stage 4 — API Contract Tests (every push, target: < 2 min)

Validates that the live API matches its OpenAPI/Swagger spec:

```yaml
- Generate OpenAPI spec from running server: curl http://localhost:3001/api/docs-json
- Validate with swagger-cli
- Run contract assertions (schema + status codes covered by existing final suite)
```

**New work required:** Add `swagger-cli validate` step and diff OpenAPI spec on PRs.

**Hard failure on:**
- OpenAPI spec fails validation
- Response schema contract violation

---

### Stage 5 — Security Tests (every push, target: < 3 min)

```yaml
- OWASP checks (via existing negative + coverage + final suites):
    ✅ Broken Access Control  — 30+ negative tests
    ✅ Missing Authentication  — all 401 tests
    ✅ Sensitive Data Exposure — passwordHash/token field checks
    ❌ Injection attacks       — MISSING: add SQLi/XSS tests
    ❌ File upload abuse       — MISSING: add wrong-type/oversized tests
    ❌ Rate limiting           — MISSING: add burst tests

- npm audit --audit-level=critical   # hard fail on critical CVEs
- Verify CORS header is never wildcard on mutation endpoints
- Verify all token fields stripped from responses
```

**Add to `e2e-api-security.ts` (new file needed):**
- SQLi payload in `originName`, `notes`, `fullName` → must return 200 (parameterized) or 400 (validation), never 500
- XSS payload `<script>alert(1)</script>` in notes → stored safely, returned escaped or sanitized
- Rate limit test: 20 login attempts in 5s → must see 429 after threshold
- File upload `.html` → 400; file upload 6MB → 413

---

### Stage 6 — E2E / Playwright Tests (PR to main only, target: < 5 min)

```yaml
- npx playwright test --reporter=list,html
```

Currently 50 tests. Target: **80+ tests** after new specs added (see PLAYWRIGHT_TEST_PLAN.md).

Tests run on Chromium only in CI; full browser matrix on nightly.

**Hard failure on:** Any Playwright test failure.

---

### Stage 7 — Regression Pack (nightly at 02:00 IST + every release tag)

Full regression: all 6 API suites + Playwright + security suite:

```yaml
- npm run test:all                  # all API suites
- npx playwright test               # all UI scenarios
- npm run test:api:security         # security suite (new)
- npm audit --audit-level=moderate  # stricter threshold for releases
```

**Hard failure on:** Any failure. Release is blocked until green.

---

## Production Release Gates

The application **must NOT deploy** if any of the following are true:

| Gate | Check | Enforced In |
|---|---|---|
| Critical security test fails | Auth bypass, permission leak, data exposure | Stage 5 |
| Any permission test fails | RBAC, role boundaries | Stage 3 |
| Any ride workflow test fails | State machine, lifecycle | Stage 3 |
| **Any verification bypass test fails** | Unverified giver publishes ride | **Stage 3 ← BUG TO FIX** |
| **Any vehicle RC bypass test fails** | Unverified RC used on ride | **Stage 3 ← BUG TO FIX** |
| Any admin workflow test fails | Suspend, verify, analytics | Stage 3 |
| TypeScript compile errors | Static analysis | Stage 1 |
| npm audit critical CVEs | Dependency check | Stage 1 |
| Unit test coverage drops | Business rule / permission coverage | Stage 2 |

---

## Immediate Action Plan (Priority Order)

### P0 — Fix before next deploy (CRITICAL bugs)
1. Add `verificationStatus === 'APPROVED'` check to `rides.service.ts publish()`
2. Add `vehicle.rcVerified === true` check to `rides.service.ts publish()`
3. Add `rideGiver.licenseVerified === true` check to `rides.service.ts publish()`
4. Add active-ride check to `vehicles.service.ts remove()` before soft-delete
5. Write integration tests for all four fixes
6. Add rate limiting middleware (NestJS Throttler) to `/auth/login` and `/auth/forgot-password`

### P1 — Add missing test coverage (HIGH)
1. Write `tests/e2e-api-security.ts` — SQLi, XSS, rate limiting, file upload abuse
2. Write unit tests for `gamification.service.ts` (ecoLevel thresholds)
3. Write unit tests for `rides.service.ts` business rule checks
4. Write unit tests for `roles.guard.ts` permission logic
5. Write Playwright tests: direct URL access by wrong role, notification bell, eco impact display

### P2 — CI pipeline hardening (MEDIUM)
1. Add `tsconfig` strict flags + `tsc --noEmit` to CI Stage 1
2. Add ESLint config + CI step
3. Add `npm audit --audit-level=high` to CI
4. Add OpenAPI spec validation step
5. Set up nightly regression run via GitHub Actions schedule cron

### P3 — Observability (LOW — post-launch)
1. Add `RESEND_API_KEY` to Render for real email delivery
2. Add SOS deduplication / cooldown
3. Add HOLD_EXPIRING notification test
4. Template auto-publish integration test

---

## Test Count Summary

| Suite | Type | Tests | Status |
|---|---|---|---|
| `e2e-api.ts` | Integration | 37 | ✅ |
| `e2e-api-extended.ts` | Integration | 30 | ✅ |
| `e2e-api-negative.ts` | Integration | 30+ | ✅ |
| `e2e-api-business-rules.ts` | Integration | 44 | ✅ |
| `e2e-api-coverage.ts` | Integration | ~60 | ✅ |
| `e2e-api-final.ts` | Integration + Contract | ~45 | ✅ |
| `e2e-api-security.ts` | Security | ~20 | ❌ To build |
| Jest unit tests | Unit | 0 | ❌ To build |
| Playwright E2E | UI E2E | 50 | ✅ |
| Playwright (new) | UI E2E | ~30 more | ❌ To build |
| **Total target** | | **~346+** | |
