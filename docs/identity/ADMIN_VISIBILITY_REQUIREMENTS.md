# ADMIN VISIBILITY REQUIREMENTS
> TechieRide Identity Architecture — v1.0

---

## 1. Current Admin Capabilities (Audit)

| Capability | Current | Required |
|---|---|---|
| User list with search/filter | ✅ Basic | ✅ |
| Verification queue | ✅ Basic | ✅ |
| Approve/reject verification | ✅ | ✅ |
| Suspend user | ✅ | ✅ |
| View platform analytics | ✅ Basic | ✅ |
| View individual document | ❌ Missing | ✅ |
| View role history | ❌ Missing | ✅ |
| View email history | ❌ Missing | ✅ |
| View company change history | ❌ Missing | ✅ |
| View document history | ❌ Missing | ✅ |
| View vehicle history | ❌ Missing | ✅ |
| Individual document approve/reject | ❌ Missing | ✅ |
| View audit log per user | ❌ Missing | ✅ |
| DL/RC expiry alerts | ❌ Missing | ✅ |
| Role upgrade queue | ❌ Missing | ✅ |
| No-show strike tracking | ❌ Missing | ✅ |
| Suspension history | ❌ Missing | ✅ |
| Export user data | ❌ Missing | ✅ |

---

## 2. Required Admin User Detail Page

### Tab 1: Identity
- TRID
- Full name, email, phone
- Account status (with badge)
- Role (with role history timeline)
- Email verification status + history
- Registration date
- Last login

### Tab 2: Verification
- Current verification status
- All documents (viewable inline)
- Document approval status per document
- Admin comments/rejection reason
- Version history (re-uploads)
- DL expiry date
- RC expiry date

### Tab 3: Company
- Current company name, email, employee ID
- Company change history with dates

### Tab 4: Vehicles
- All vehicles (active and inactive)
- RC status per vehicle
- RC expiry per vehicle
- Vehicle history

### Tab 5: Rides
- Total given / taken
- Active rides
- Completed rides
- Cancelled rides
- No-show history (as seeker and as giver)

### Tab 6: Violations & Suspensions
- No-show strikes (with dates and rides)
- Late cancel strikes
- Suspension history (reason, dates, lifted by)
- Complaints received

### Tab 7: Audit Log
- Timestamped log of all significant events
- Role changes, email changes, suspensions, logins from new device

---

## 3. Verification Queue Enhancements

Current queue shows: name, email, documents.

**Required additions:**
- Flag: `ROLE_UPGRADE` vs `NEW_USER` vs `COMPANY_CHANGE` vs `DOCUMENT_RENEWAL`
- Document-level approve/reject (not just whole submission)
- Queue filter: by type, by date, by status
- Bulk approve (for straightforward cases)
- SLA indicator: how long in queue (warn after 24h)

---

## 4. Analytics Dashboard (Enhanced)

| Metric | Current | Required |
|---|---|---|
| Total users | ✅ | ✅ |
| Active givers | ❌ | ✅ |
| Active seekers | ❌ | ✅ |
| Rides today | ❌ | ✅ |
| Verification queue depth | ❌ | ✅ |
| Average review time | ❌ | ✅ |
| Role upgrade requests this week | ❌ | ✅ |
| Company change requests this week | ❌ | ✅ |
| Expired DL/RC count | ❌ | ✅ |
| Suspended users count | ❌ | ✅ |
| No-show rate (platform-wide) | ❌ | ✅ |

---

## 5. Admin Audit Log Requirements

Every admin action must be logged:

| Event | Fields |
|---|---|
| User approved | adminId, userId, timestamp, documents reviewed |
| User rejected | adminId, userId, reason, timestamp |
| User suspended | adminId, userId, reason, duration, timestamp |
| Suspension lifted | adminId, userId, timestamp |
| Role upgrade approved | adminId, userId, fromRole, toRole, timestamp |
| Domain added | adminId, domain, timestamp |
| Domain removed | adminId, domain, timestamp |

---

## 6. Required API Endpoints (Missing)

```
GET  /admin/users/:id/role-history
GET  /admin/users/:id/email-history
GET  /admin/users/:id/document-history
GET  /admin/users/:id/audit-log
GET  /admin/users/:id/violations
PATCH /admin/verification/:id/review-document   { documentType, decision, reason }
GET  /admin/verification/expiring               ?daysAhead=30
GET  /admin/analytics/enhanced
POST /admin/users/:id/suspend                   { reason, durationDays }
POST /admin/users/:id/unsuspend
POST /admin/users/:id/ban                       { reason }
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-AV-01 | Admin can view full role history for any user |
| AC-AV-02 | Admin can view all documents submitted by a user, including old versions |
| AC-AV-03 | Admin can approve/reject individual documents independently |
| AC-AV-04 | Admin can see a list of givers whose DL/RC expires within 30 days |
| AC-AV-05 | Every admin action is logged with timestamp and adminId |
| AC-AV-06 | Admin can filter verification queue by type (new user, upgrade, company change) |
| AC-AV-07 | Verification queue shows SLA warning after 24 hours |

## 8. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-AV-01 | GET /admin/users/:id/role-history | Returns chronological list |
| TC-AV-02 | GET /admin/verification/expiring?daysAhead=30 | Returns givers with expiring docs |
| TC-AV-03 | Admin rejects DL only, approves Company ID | DL status: REJECTED, Company ID: APPROVED |
| TC-AV-04 | Admin suspends user | User cannot login to ride features |
| TC-AV-05 | GET /admin/users/:id/audit-log | Returns all events in chronological order |
