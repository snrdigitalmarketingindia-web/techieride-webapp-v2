# 16 — Admin Workflows

**Platform:** TechieRide v2 · **Module:** Admin Dashboard & Management  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Admins are the trust gatekeepers of TechieRide. They approve verifications, monitor rides, manage users, handle SOS escalations, and enforce platform policies. Admin actions must be audited. Non-admins must be blocked from all admin endpoints. A single-admin setup is a known operational risk.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| ADM-01 | Admin login redirects to /admin | Admin credentials | Login as admin | Redirects to /admin dashboard | Core admin access | P0 |
| ADM-02 | Non-admin redirected from /admin | Regular user | Navigate to /admin | Redirect to /login or /dashboard | Security | P0 |
| ADM-03 | Admin sees KPI dashboard | Admin logged in | View /admin | User count, ride count, pending verifications visible | Operations overview | P1 |
| ADM-04 | Admin views users list | Admin logged in | GET /admin/users | Paginated user list with status | User management | P1 |
| ADM-05 | Admin views verification queue — employee pending | Users with uploaded docs | GET /admin/verification?type=employee | Queue shows pending employee verifications | Core admin flow | P0 |
| ADM-06 | Admin views verification queue — driver pending | Givers with DL/RC uploaded | GET /admin/verification?type=driver | Driver verification queue visible | Core admin flow | P0 |
| ADM-07 | Admin views exception verification queue | Exception requests submitted | GET /admin/verification?type=exception | Exception queue shown separately | Exception workflow | P1 |
| ADM-08 | Admin approves employee verification | User in queue | Admin PATCH approve employee | Status → EMPLOYEE_VERIFIED; TRID assigned; user notified | Core approval | P0 |
| ADM-09 | Admin approves driver verification | Giver in queue | Admin PATCH approve driver | Status → DRIVER_VERIFIED; role → BOTH; user notified | Core approval | P0 |
| ADM-10 | Admin approves vehicle RC | Vehicle in queue | Admin PATCH approve RC | vehicle.rcVerified = true; giver can now publish | RC approval | P0 |
| ADM-11 | Admin rejects verification with reason | User in queue | Admin PATCH reject with reason text | Status → REJECTED; user notified with reason | Rejection workflow | P0 |
| ADM-12 | Admin cannot approve own verification | Admin has pending docs | Admin approves own request | 403 Forbidden | Admin integrity | P0 |
| ADM-13 | Admin views all rides | Admin logged in | GET /admin/rides | All rides all statuses visible | Ride monitoring | P1 |
| ADM-14 | Admin views ride detail | Admin logged in | GET /admin/rides/{id} | Full ride + participants + status | Incident monitoring | P1 |
| ADM-15 | Admin suspends user | User causing issues | Admin POST /admin/users/{id}/suspend | User status → SUSPENDED; user cannot login | Policy enforcement | P0 |
| ADM-16 | Suspended user cannot login | User SUSPENDED | POST /auth/login | 401; "Account suspended" message | Enforcement | P0 |
| ADM-17 | Admin unsuspends user | User SUSPENDED | Admin POST /admin/users/{id}/unsuspend | Status restored; user can login again | Reinstatement | P1 |
| ADM-18 | Admin views SOS alerts | SOS triggered | Admin dashboard | Active SOS with location + context visible | Safety monitoring | P0 |
| ADM-19 | Admin acknowledges SOS | SOS active | Admin marks SOS resolved | SOS status = RESOLVED | Incident closure | P1 |
| ADM-20 | Admin can cancel a confirmed booking (exception override) | CONFIRMED request | Admin PATCH cancel booking | Booking cancelled; seat restored; both parties notified | Admin exception power | P1 |
| ADM-21 | Admin audit log — all admin actions logged | Any admin action | Check audit log | Action, admin userId, target userId, timestamp recorded | Accountability | P0 |
| ADM-22 | Admin cannot delete a ride (soft operations only) | COMPLETED ride | Admin DELETE /rides/{id} | 403 or 404; admins cannot hard delete | Data integrity | P1 |
| ADM-23 | Admin views rides management page | Admin | GET /admin/rides | Page loads with all ride statuses | Admin UX | P1 |
| ADM-24 | Two admins concurrent approval — no collision | Two admins approve same verification | Race condition | Only one succeeds; second gets 409 | Concurrency | P1 |
| ADM-25 | Admin search — find user by email | Admin | GET /admin/users?email=arjun@tcs.com | User found | Admin efficiency | P2 |
| ADM-26 | Admin views vehicle list with RC status | Admin | GET /admin/vehicles | Vehicles with rcVerified field visible | Vehicle monitoring | P1 |
| ADM-27 | Admin filters verification by status | Admin | GET /admin/verification?status=PENDING | Only pending shown | Queue management | P2 |
| ADM-28 | Admin receives email on new SOS | SOS triggered | Check admin email | Email with SOS context received | Fallback notification | P1 |
| ADM-29 | Admin TRID management — view all TRIDs | Admin | GET /admin/users | TRID field visible per user | Member tracking | P2 |
| ADM-30 | Regression — admin actions survive logout | Admin approves; logs out; logs back in | Check approved user | Status still EMPLOYEE_VERIFIED | State persistence | P0 |

---

## UAT Acceptance Criteria

- [ ] Admin can approve/reject a verification request in under 30 seconds
- [ ] Admin dashboard shows all pending queues on first page load
- [ ] Suspended user receives immediate account suspension notification
- [ ] All admin actions are logged with timestamp, admin ID, and action type
- [ ] Non-admin users see no trace of /admin routes in UI

---

## Missing Business Rules / Risks

1. **Single-admin SPOF** — if the admin is unavailable, all verifications halt; no escalation chain
2. **No admin role levels** — all admins have equal power; no super-admin / read-only-admin distinction
3. **No admin activity report** — how many verifications processed per day? No reporting
4. **No verification SLA enforcement** — system does not alert when a request has been pending >24h
5. **Admin ban is irreversible without DB intervention** — no self-service unban; needs admin UI
6. **No bulk approval** — admin must approve verifications one by one; inefficient for high volume
7. **Admin can see all user phone numbers** — potential privacy issue; admin call access policy undefined
8. **No multi-factor auth for admin** — admin account secured only by password; high-value target
