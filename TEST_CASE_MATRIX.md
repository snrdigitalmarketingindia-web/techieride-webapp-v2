# TechieRide — Test Case Matrix

**Legend:** ✅ Automated  ⚠️ Partial  ❌ Missing  🔲 Manual only

---

## 1. User Registration

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| REG-01 | Corporate email accepted (tcs.com, wipro.com, infosys.com) | 201 Created | ✅ `e2e-api.ts` |
| REG-02 | Personal email (gmail, yahoo) rejected | 400/422 | ✅ `e2e-api-security.ts` |
| REG-03 | Unwhitelisted domain rejected | 400/422 | ✅ `e2e-api-security.ts` |
| REG-04 | Duplicate email blocked | 409 | ✅ `e2e-api-negative.ts` |
| REG-05 | Missing required field (phone) → 400 | 400 | ✅ `e2e-api-negative.ts` |
| REG-06 | Weak password rejected | 400 | ⚠️ Partial |
| REG-07 | Phone number stored correctly | phone in DB | ✅ `e2e-api.ts` |
| REG-08 | Account starts as EMAIL_VERIFICATION_PENDING | status check | ✅ `e2e-api.ts` |
| REG-09 | Welcome email triggered | email service | ⚠️ Mocked in CI |
| REG-10 | User cannot login before email verification | 403 | ✅ `e2e-api-business-rules.ts` |

## 2. Email Verification

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| EV-01 | Valid token → DOCUMENT_VERIFICATION_PENDING | status change | ✅ `e2e-api.ts` |
| EV-02 | Expired token rejected | 400/410 | ⚠️ Partial |
| EV-03 | Invalid token rejected | 400 | ✅ `e2e-api-negative.ts` |
| EV-04 | Token reuse blocked | 400 | ⚠️ Partial |
| EV-05 | Exception verification path works | EXCEPTION_VERIFICATION_REQUESTED | ✅ `e2e-api.ts` |
| EV-06 | Resend verification email | 200 | 🔲 Manual |

## 3. Ride Giver Verification

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| GV-01 | Employee ID upload accepted | 201 | ✅ `e2e-api.ts` |
| GV-02 | Driver license upload accepted | 201 | ✅ `e2e-api.ts` |
| GV-03 | RC (vehicle registration) upload accepted | 201 | ✅ `e2e-api.ts` |
| GV-04 | Admin approves employee → EMPLOYEE_VERIFIED + TRID | status + trid | ✅ `e2e-api.ts` |
| GV-05 | Admin approves driver → DRIVER_VERIFIED + role=BOTH | status + role | ✅ `e2e-api.ts` |
| GV-06 | Admin rejects → REJECTED status | 200 + status | ✅ `e2e-api-coverage.ts` |
| GV-07 | Unverified giver cannot publish ride | 403 | ✅ `verification-bypass.spec.ts` |
| GV-08 | RC not verified → publish blocked | 403 | ✅ `verification-bypass.spec.ts` |
| GV-09 | Driver with unverified RC gets specific error message | message check | ✅ `e2e-api-coverage.ts` |
| GV-10 | Admin cannot re-approve already approved user | 400 | ⚠️ Partial |
| GV-11 | TRID auto-assigned from TRID_START constant | trid format TR2xxx | ✅ `e2e-api.ts` |

## 4. Ride Creation

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| RC-01 | Valid ride created → DRAFT status | 201 + DRAFT | ✅ `e2e-api.ts` |
| RC-02 | Ride published → PUBLISHED status | 200 + PUBLISHED | ✅ `e2e-api.ts` |
| RC-03 | Seat count 1–4 accepted | 201 | ✅ `e2e-api.ts` |
| RC-04 | Seat count 0 rejected | 400 | ✅ `e2e-api-negative.ts` |
| RC-05 | Seat count > 4 rejected | 400 | ✅ `e2e-api-negative.ts` |
| RC-06 | Missing origin rejected | 400 | ✅ `e2e-api-negative.ts` |
| RC-07 | Missing destination rejected | 400 | ✅ `e2e-api-negative.ts` |
| RC-08 | Past date rejected | 400 | ✅ `e2e-api-negative.ts` |
| RC-09 | Giver with active ride cannot create second | 409 | ✅ `e2e-api-business-rules.ts` |
| RC-10 | Giver without vehicle cannot publish | 403/404 | ✅ `e2e-api-coverage.ts` |
| RC-11 | Commute template creates recurring ride | 201 | ✅ `e2e-api.ts` |
| RC-12 | Ride notes stored correctly | data check | ✅ `e2e-api.ts` |
| RC-13 | availableSeats = totalSeats on creation | calculated field | ✅ `e2e-api.ts` |
| RC-14 | Ride immutable after publish (cannot edit origin) | 400 | ✅ `e2e-api-coverage.ts` |
| RC-15 | Women-only ride flag | 201 + flag | ❌ Feature not yet built |

## 5. Ride Requests

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| RR-01 | Seeker requests a published ride | 201 PENDING | ✅ `e2e-api.ts` |
| RR-02 | Duplicate request blocked | 409 | ✅ `e2e-api-business-rules.ts` |
| RR-03 | Full ride (0 seats) blocks new request | 409 | ✅ `e2e-api-business-rules.ts` |
| RR-04 | Giver approves request → CONFIRMED | 200 + status | ✅ `e2e-api.ts` |
| RR-05 | Giver rejects request → REJECTED | 200 + status | ✅ `e2e-api-coverage.ts` |
| RR-06 | availableSeats decrements on approval | seat count | ✅ `e2e-api.ts` |
| RR-07 | Seeker cannot approve own request | 403 | ✅ `e2e-api-security.ts` |
| RR-08 | Seeker cannot request their own ride (if BOTH role) | 400 | ⚠️ Partial |
| RR-09 | Cancelled request frees up seat | seat count | ✅ `e2e-api-coverage.ts` |
| RR-10 | Notification sent to giver on new request | notification | ✅ `e2e-api.ts` |
| RR-11 | Notification sent to seeker on approval | notification | ✅ `e2e-api.ts` |
| RR-12 | Request for ONGOING ride blocked | 400/409 | ✅ `e2e-api-business-rules.ts` |

## 6. Ride Lifecycle

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| RL-01 | DRAFT → PUBLISHED (publish action) | 200 | ✅ `e2e-api.ts` |
| RL-02 | PUBLISHED → ONGOING (start action) | 200 | ✅ `e2e-api.ts` |
| RL-03 | ONGOING → COMPLETED (complete action) | 200 | ✅ `e2e-api.ts` |
| RL-04 | PUBLISHED → CANCELLED (cancel action) | 200 | ✅ `e2e-api-coverage.ts` |
| RL-05 | Cannot go COMPLETED → PUBLISHED (backward) | 400 | ✅ `e2e-api-business-rules.ts` |
| RL-06 | Cannot cancel COMPLETED ride | 400 | ✅ `e2e-api-business-rules.ts` |
| RL-07 | Boarding: WAITING → BOARDED | 200 | ✅ `e2e-api.ts` |
| RL-08 | Boarding: WAITING → NO_SHOW | 200 | ✅ `e2e-api.ts` |
| RL-09 | Deboarding: BOARDED → DEBOARDED | 200 | ✅ `e2e-api.ts` |
| RL-10 | ECO points awarded on completion | points > 0 | ✅ `e2e-api.ts` |
| RL-11 | CO2 saved calculated correctly | co2SavedKg > 0 | ✅ `e2e-api.ts` |
| RL-12 | Ride completion notification sent | notification | ✅ `e2e-api.ts` |
| RL-13 | Cancelled ride notifies all participants | notification | ✅ `e2e-api-coverage.ts` |

## 7. Phone Call Feature

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| PC-01 | Phone visible to authenticated seeker on booked ride | phone in response | ✅ `e2e-api.ts` |
| PC-02 | Phone NOT visible in unauthenticated search results | no phone field | ✅ `e2e-api-security.ts` |
| PC-03 | Call button renders for passenger with phone | tel: link | ✅ `security.spec.ts` |
| PC-04 | Call button hidden for NO_SHOW passenger | no button | ✅ `RideCard.tsx` logic |
| PC-05 | tel: link format correct (+91XXXXXXXXXX) | regex check | ✅ `security.spec.ts` |
| PC-06 | Call log POST requires auth | 401 | ✅ `e2e-api-security.ts` |
| PC-07 | Call log stored in DB (fire-and-forget) | 201 | ✅ `e2e-api-security.ts` |
| PC-08 | Call button absent for accounts without phone | no button | DB-level |
| PC-09 | Cross-user phone access blocked | 403 | ✅ `e2e-api-security.ts` |

## 8. Security

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| SEC-01 | JWT alg:none attack blocked | 401 | ✅ `e2e-api-security.ts` |
| SEC-02 | Tampered JWT payload rejected | 401 | ✅ `e2e-api-security.ts` |
| SEC-03 | Role escalation via JWT rejected | 403 | ✅ `e2e-api-security.ts` |
| SEC-04 | Refresh token ≠ access token | 401 | ✅ `e2e-api-security.ts` |
| SEC-05 | Password never returned in any response | no password field | ✅ `e2e-api-security.ts` |
| SEC-06 | Email enumeration prevented | 401 (not 404) | ✅ `e2e-api-security.ts` |
| SEC-07 | SQL injection in login email | 400/401 (not 500) | ✅ `e2e-api-security.ts` |
| SEC-08 | SQL injection in search params | not 500 | ✅ `e2e-api-security.ts` |
| SEC-09 | XSS in input fields sanitised | no execution | ✅ `security.spec.ts` |
| SEC-10 | Path traversal in URL params | 404/400 | ✅ `e2e-api-security.ts` |
| SEC-11 | Seeker cannot access /admin/* | 403 | ✅ `permission-leaks.spec.ts` |
| SEC-12 | Giver cannot approve their own RC | — | ✅ `verification-bypass.spec.ts` |
| SEC-13 | CORS no wildcard on API | acao ≠ * | ✅ `e2e-api-security.ts` |
| SEC-14 | Prisma errors not exposed in responses | no prisma text | ✅ `e2e-api-security.ts` |
| SEC-15 | Session cleared on logout | redirect /login | ✅ `security.spec.ts` |
| SEC-16 | Session not shared between browser contexts | separate context | ✅ `security.spec.ts` |
| SEC-17 | Oversized file upload rejected | 400/413 | ✅ `e2e-api-security.ts` |
| SEC-18 | Executable file upload rejected | not 200 | ✅ `e2e-api-security.ts` |
| SEC-19 | Rate limiting on login endpoint | 401/429 (not 200) | ✅ `e2e-api-security.ts` |
| SEC-20 | Broken access control — cross-user ride actions | 403/404 | ✅ `e2e-api-security.ts` |

## 9. Gamification

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| GAM-01 | ECO points increase after ride completion | points delta > 0 | ✅ `e2e-api.ts` |
| GAM-02 | CO2 saved calculated with haversine distance | co2 > 0 | ✅ `e2e-api.ts` |
| GAM-03 | Leaderboard returns sorted list | descending order | ✅ `e2e-api-coverage.ts` |
| GAM-04 | ECO level upgrades at thresholds | level change | ⚠️ Partial |
| GAM-05 | Double award prevention (completing same ride twice) | idempotent | ✅ `e2e-api-business-rules.ts` |
| GAM-06 | Summary includes totalRides + co2SavedKg | fields present | ✅ `e2e-api.ts` |

## 10. Admin Panel

| ID | Test Case | Expected | Coverage |
|---|---|---|---|
| ADM-01 | Admin can list all users | 200 + list | ✅ `admin.spec.ts` |
| ADM-02 | Admin can view verification queue | 200 + queue | ✅ `admin.spec.ts` |
| ADM-03 | Admin approves employee verification | status change | ✅ `e2e-api.ts` |
| ADM-04 | Admin approves driver verification | status change | ✅ `e2e-api.ts` |
| ADM-05 | Admin rejects verification | status change | ✅ `e2e-api-coverage.ts` |
| ADM-06 | Non-admin cannot access /admin/* | 403/redirect | ✅ `permission-leaks.spec.ts` |
| ADM-07 | Admin can view all rides | 200 + list | ✅ `admin.spec.ts` |
| ADM-08 | Admin KPI dashboard loads | cards visible | ✅ `admin.spec.ts` |
| ADM-09 | Admin approves vehicle RC | status change | ✅ `e2e-api.ts` |
| ADM-10 | Admin cannot be created via public API | 403 | ✅ `e2e-api-security.ts` |

## 11. Performance Thresholds

| Endpoint | p95 Target | Tool | Status |
|---|---|---|---|
| `POST /auth/login` | < 2 s | k6 | ✅ k6-load.js |
| `GET /rides/search` | < 2.5 s | k6 | ✅ k6-load.js |
| `GET /auth/me` | < 1 s | k6 | ✅ k6-load.js |
| `GET /ride-requests` | < 2 s | k6 | ✅ k6-load.js |
| `GET /gamification/summary` | < 1.5 s | k6 | ✅ k6-load.js |
| Overall p95 @ 100 VUs | < 3 s | k6 | ✅ k6-load.js |
| Overall p95 @ 1000 VUs | < 5 s | k6 | ✅ k6-stress.js |

---

*Total automated test cases: 215 API + 78 E2E functional + 20 E2E security + 35 API security = **348 automated tests***
