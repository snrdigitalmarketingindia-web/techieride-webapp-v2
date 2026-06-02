# 02 — Verification (Employee + Ride Giver)

**Platform:** TechieRide v2 · **Module:** Two-Track Verification  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

TechieRide operates a two-track verification system:

- **Track 1 — Employee Verification:** Company ID upload → Admin approval → `EMPLOYEE_VERIFIED` + TRID assigned. All users (seekers and future givers) must pass this track.
- **Track 2 — Driver Verification:** DL + RC upload → Admin approval → `DRIVER_VERIFIED` + role becomes `BOTH`. Only employees who want to offer rides need this track.

A user with `EMPLOYEE_VERIFIED` can search and book rides. To *give* rides, they must also complete Track 2. The RC (Registration Certificate) must also be admin-verified separately for the vehicle before the giver can publish rides.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| VER-01 | Employee ID upload accepted | DOCUMENT_VERIFICATION_PENDING status | POST /uploads/document with employee ID image | 201 Created; document stored; verification request created | Core employee onboarding | P0 |
| VER-02 | Admin approves employee verification | Employee doc submitted | Admin PATCH /admin/verification/{id}/approve (type: EMPLOYEE) | Status → EMPLOYEE_VERIFIED; TRID assigned (TR2XXX); notification sent | Platform access unlock | P0 |
| VER-03 | TRID assigned in correct format | Employee approved | Check trid field in DB | trid = "TR" + number ≥ TRID_START | Member identity | P0 |
| VER-04 | TRID_START respected — first TRID ≥ configured value | Fresh DB with TRID_START=2000 | Approve first employee | trid = "TR2000" or higher | Member number integrity | P0 |
| VER-05 | Admin rejects employee verification | Employee doc submitted | Admin PATCH /admin/verification/{id}/reject | Status → REJECTED; rejection notification sent to user | Rejection workflow | P0 |
| VER-06 | Rejected user can re-submit documents | Status = REJECTED | Upload new document, admin approves | Status → EMPLOYEE_VERIFIED; new TRID assigned | Recovery path | P1 |
| VER-07 | EMPLOYEE_VERIFIED user can search rides | Status = EMPLOYEE_VERIFIED | GET /rides/search | 200 OK; results returned | Core seeker flow | P0 |
| VER-08 | EMPLOYEE_VERIFIED user cannot publish rides | Status = EMPLOYEE_VERIFIED | POST /rides → publish | 403 Forbidden; must complete driver verification | Role gate | P0 |
| VER-09 | Driver verification — DL upload accepted | EMPLOYEE_VERIFIED | POST /uploads/document with DL image (type: DRIVING_LICENSE) | 201 Created; DL stored | Giver onboarding | P0 |
| VER-10 | Driver verification — RC upload accepted | EMPLOYEE_VERIFIED | POST /uploads/document with RC image (type: VEHICLE_RC) | 201 Created; RC stored | Giver onboarding | P0 |
| VER-11 | Admin approves driver verification → DRIVER_VERIFIED + role=BOTH | DL + RC submitted | Admin approves driver track | Status → DRIVER_VERIFIED; role → BOTH; notification sent | Ride giver unlock | P0 |
| VER-12 | Admin must approve RC separately for vehicle | Vehicle added, RC uploaded | Admin PATCH /admin/vehicles/{id}/approve-rc | vehicle.rcVerified = true | Publish gate | P0 |
| VER-13 | Giver with unverified RC cannot publish | DRIVER_VERIFIED but rcVerified=false | PATCH /rides/{id}/publish | 403 Forbidden; "RC not verified" message | Safety gate | P0 |
| VER-14 | Giver with verified RC can publish | DRIVER_VERIFIED + rcVerified=true | PATCH /rides/{id}/publish | 200 OK; ride → PUBLISHED | Core giver flow | P0 |
| VER-15 | Driver verification requires prior employee verification | No employee verification done | Submit driver docs directly | 400/403; must complete employee track first | Workflow sequence | P0 |
| VER-16 | Verification request is unique per type per user | Employee doc already submitted | Submit employee doc again | 409 or update existing request | Deduplication | P1 |
| VER-17 | Admin cannot approve their own verification | Admin account with pending docs | Admin approves own request | 403 Forbidden | Admin integrity | P0 |
| VER-18 | Non-admin cannot access verification approval endpoint | Regular user | PATCH /admin/verification/{id}/approve | 403 Forbidden | Security | P0 |
| VER-19 | EXCEPTION_VERIFICATION_REQUESTED blocks admin queue from normal verification | Exception submitted | Admin sees exception in separate queue | Exception in its own queue; not mixed with doc-pending | Queue clarity | P1 |
| VER-20 | Admin approves exception → same result as email verification | Exception approved | Check status | Status → EMPLOYEE_VERIFIED; TRID assigned | Alternate path parity | P1 |
| VER-21 | Re-verification after suspension | User suspended then reinstated | Admin unsuspends; user resubmits docs if expired | Docs re-reviewable; not auto-approved | Operational integrity | P1 |
| VER-22 | Verification status visible in profile | Any verification status | GET /auth/me | accountStatus field accurate | User visibility | P1 |
| VER-23 | Driver verification rejection sends reason | Admin rejects driver docs | Admin rejects with reason text | User receives rejection notification with reason | User experience | P1 |
| VER-24 | Verification queue paginated for admin | 20+ pending verifications | Admin GET /admin/verification?page=2 | Paginated results; correct count | Admin scalability | P2 |
| VER-25 | Boundary — file size limit for document upload | Large file (>5MB) | Upload 11MB image | 400 or 413; file too large | Storage abuse prevention | P1 |
| VER-26 | Boundary — unsupported file type rejected | None | Upload .exe or .pdf (if PDF not allowed) | 400; invalid file type | Security | P1 |
| VER-27 | Employee with DRIVER_VERIFIED can still search as seeker | Status = DRIVER_VERIFIED | GET /rides/search | 200 OK; BOTH role can search | BOTH role parity | P1 |
| VER-28 | Regression — verification status survives logout/login | EMPLOYEE_VERIFIED | Login again | Status still EMPLOYEE_VERIFIED | Session persistence | P0 |
| VER-29 | Verification notification email contains correct info | Admin approves | Check email content | Email contains TRID, next steps | Onboarding communication | P2 |
| VER-30 | Concurrent admin approvals — same verification request | Two admins approve same request simultaneously | Both attempt approval | Only one succeeds; second gets 409 | Race condition safety | P1 |

---

## UAT Acceptance Criteria

- [ ] A new employee can upload company ID and receive TRID within 1 business day of admin approval
- [ ] A Ride Giver cannot publish any ride until both DL, RC, and vehicle RC are admin-verified
- [ ] Rejected applicants receive a clear rejection reason and can re-submit
- [ ] Admin verification queue shows pending requests sorted by submission date
- [ ] Exception verification path is accessible and completes to EMPLOYEE_VERIFIED

---

## Missing Business Rules / Risks

1. **No document expiry tracking** — DL and RC have real-world expiry dates; platform does not enforce re-verification on expiry
2. **No photo quality validation** — blurry or fake document images are accepted without OCR/liveness check
3. **No duplicate DL number detection** — two users could submit the same DL number
4. **Verification SLA not defined** — admin may leave requests pending indefinitely; no escalation
5. **No background check integration** — platform relies solely on document uploads; no CIBIL/police check
6. **Driver verification does not check DL category** — LMV (Light Motor Vehicle) requirement not validated
7. **No RC expiry check** — expired RC (vehicle permit) accepted; could have legal implications
8. **Employee who leaves company retains DRIVER_VERIFIED** — no re-verification trigger on employment change
