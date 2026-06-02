# TechieRide QA Spec — 16: Admin Workflows

**Module:** Admin Dashboard & Management  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

The TechieRide admin role has elevated privileges to manage users, review verifications, monitor platform health, and intervene in rides. Admins access the platform via `/admin` which is a restricted route. Non-admin users redirected. All admin actions are audit-logged. Admins cannot approve their own account verifications.

---

## Admin Capabilities Overview

| Capability | Description |
|-----------|-------------|
| Verification Queue | Review and approve/reject employee + driver documents |
| User Management | View, suspend, unsuspend all users |
| Ride Management | View all rides across all statuses |
| KPI Dashboard | Platform-wide metrics |
| SOS Monitor | Real-time SOS alerts |
| Audit Log | Record of all admin actions |
| Company Domain Management | Add/remove approved email domains |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| ADM-001 | Admin approves employee verification | User submitted employee ID; admin logged in | Admin opens /admin/verification-queue → opens request → clicks "Approve" | User status → EMPLOYEE_VERIFIED; TRID assigned; user notified via email | Core verification workflow | P0 |
| ADM-002 | Admin approves driver verification (DL + RC both approved) | Both DL and RC uploaded | Admin approves DL → approves RC | User status → DRIVER_VERIFIED; role = BOTH; user can post rides | P0 |
| ADM-003 | Admin rejects with reason | Verification document unclear | Admin clicks "Reject" → enters reason → confirms | User status → VERIFICATION_REJECTED; rejection reason emailed to user | P0 |
| ADM-004 | Admin views all users | Admin logged in | Navigate to /admin/users | All registered users listed with: name, email, status, role, TRID, registration date | P0 |
| ADM-005 | Admin views all rides | Admin logged in | Navigate to /admin/rides | All rides shown (DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED) with filter options | P0 |
| ADM-006 | Admin views KPI dashboard | Admin logged in | Navigate to /admin/dashboard | Shows: total registered users, EMPLOYEE_VERIFIED count, DRIVER_VERIFIED count, total rides posted, total rides completed, active rides today, total CO2 saved | P1 |
| ADM-007 | Admin suspends a user | User has violations | Admin opens user profile → clicks "Suspend" → enters reason → confirms | User status → SUSPENDED; user's active rides hidden from search; user cannot log in; all sessions invalidated; user notified | P0 |
| ADM-008 | Suspended user login blocked | User status = SUSPENDED | Suspended user attempts login | Error: "Your account has been suspended. Contact support@techieride.com." | P0 |
| ADM-009 | Admin unsuspends a user | User status = SUSPENDED | Admin opens user profile → clicks "Unsuspend" → enters note → confirms | User status restored to previous state (EMPLOYEE_VERIFIED / DRIVER_VERIFIED); user can log in again; user notified | P0 |
| ADM-010 | Admin views verification queue sorted by submission date | Multiple pending verifications | /admin/verification-queue | Default sort: oldest submission first (FIFO fairness) | P1 |
| ADM-011 | Admin filters verification queue by type | Queue has both employee and driver verifications | Filter by "Employee Only" | Only employee verification requests shown | P1 |
| ADM-012 | Admin cannot approve own verification | Admin submits their own documents for verification | Admin views own request in queue | "Approve" button disabled or hidden with note: "You cannot approve your own verification." | Security / P0 |
| ADM-013 | Non-admin user redirected from /admin | Seeker or giver navigates to /admin | Direct URL access to /admin | Redirect to /home or /login with message "Access denied." | Security / P0 |
| ADM-014 | Non-admin API calls to /admin routes return 403 | Seeker calls GET /admin/users with valid auth token | API response | 403: "Admin access required." | Security / P0 |
| ADM-015 | Admin audit log created for every action | Admin approves verification | Check audit log | Log entry: {adminId, action: "APPROVE_VERIFICATION", targetUserId, timestamp, notes} | Compliance | P0 |
| ADM-016 | Admin audit log is append-only | Admin attempts to delete audit log entry | PATCH /admin/audit-logs/:id | 405 Method Not Allowed or 403: "Audit logs are immutable." | Compliance | P0 |
| ADM-017 | Admin views individual user's full details | Admin opens user profile | /admin/users/:id | Shows: full name, email, phone, gender, status, TRID, verification documents (linked), rides history, ratings, trust score, suspension history | P1 |
| ADM-018 | Admin views all active SOS events | SOS events exist | /admin/sos | All ACTIVE SOS events shown with map links; sorted by timestamp descending | Safety / P0 |
| ADM-019 | Admin can cancel a ride | Active ride needs intervention | Admin opens ride → "Cancel Ride" → reason required → confirm | Ride → CANCELLED; all PENDING and CONFIRMED passengers notified; giver notified | P1 |
| ADM-020 | Admin cancel of ride with CONFIRMED bookings | Ride has confirmed passengers | Admin cancels | Each confirmed passenger notified; admin must enter cancellation reason | P1 |
| ADM-021 | Admin adds new approved email domain | IT company domain not yet whitelisted | Admin navigates to /admin/domains → "Add Domain" → enters domain → saves | Domain added to whitelist; registrations from this domain now allowed | P1 |
| ADM-022 | Admin removes an email domain | Company offboarded from TechieRide | Admin removes domain | New registrations from that domain rejected; existing users unaffected (or deactivated per policy) | P1 |
| ADM-023 | Admin views ride detail — giver and seeker info visible | Admin opens any ride | /admin/rides/:id | Shows giver, all passengers (with status), phone numbers, route, GPS history link | P1 |
| ADM-024 | Admin bulk export users list (CSV/Excel) | Admin views /admin/users | Click "Export CSV" | CSV downloaded with user data; PII handling per DPDP Act | P2 |
| ADM-025 | Two admins cannot approve same verification simultaneously | Two admins have same request open | Both click "Approve" simultaneously | One succeeds; other sees "Already processed." | Race condition / P1 |
| ADM-026 | Admin session timeout | Admin left dashboard open for > 30 min | Admin attempts an action | Re-authentication required; action not processed until re-login | Security | P1 |
| ADM-027 | Admin cannot see own trust score manipulation | Admin navigates to own profile | — | Admin cannot modify their own trust score or verification status through the admin interface | P0 |
| ADM-028 | Admin notification for new verification submission | User uploads documents | — | Admin receives in-app notification: "New verification submitted by [User]" | P2 |
| ADM-029 | Admin views complaints queue | Complaints submitted by users | /admin/complaints | All complaints listed with: complainant, accused, description, ride reference, status | P1 |
| ADM-030 | Admin responds to complaint | Complaint status = OPEN | Admin writes response → changes status to INVESTIGATING/RESOLVED | Status updated; complainant notified | P1 |

---

## Missing Business Rules / Risks

1. **Role-based admin permissions not defined.** Is there one flat "admin" role, or sub-roles (SuperAdmin, VerificationAdmin, SupportAdmin, ReadOnly)? A flat admin role creates security risks.
2. **Admin password policy not specified.** Admin accounts should require stronger passwords, 2FA mandatory, and IP allowlisting.
3. **Admin account creation process not defined.** How does the first admin account get created? Seeded via SQL? Manual DB update? This is a bootstrap security concern.
4. **No four-eyes principle for high-impact actions.** Suspension of a user, deletion of data, and domain removal should require approval from a second admin.
5. **Admin bulk actions (suspend multiple users) not mentioned.** During a security incident, bulk suspension must be fast.
6. **No admin activity dashboard.** Admins can't see "what has Admin X done in the last 7 days?" — individual admin activity tracking is needed.
7. **Platform-level notifications (broadcast to all users) not in scope.** Admins need the ability to send platform announcements (e.g., maintenance window, policy update).
8. **Data retention / GDPR/DPDP deletion workflow missing.** Admin needs a "Delete User Data" workflow for right-to-erasure requests.
9. **Admin can see phone numbers of all users.** This is correct for support purposes but needs access control logging — admin views of phone numbers should be logged.
10. **KPI dashboard real-time vs daily snapshot.** Should the dashboard be real-time or show yesterday's stats? This affects infrastructure decisions.
