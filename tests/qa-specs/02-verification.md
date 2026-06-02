# TechieRide QA Spec — 02: Verification

**Module:** Identity & Driver Verification  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

TechieRide operates a two-track verification system. **Employee Verification** grants the `EMPLOYEE_VERIFIED` status (Seeker role). **Driver Verification** requires DL + RC upload and, upon admin approval, grants `DRIVER_VERIFIED` status with `role=BOTH` (Giver + Seeker). An unverified user cannot create rides or book seats. The admin manually reviews documents in the verification queue.

---

## Verification States

| State | Description |
|-------|-------------|
| EMAIL_VERIFICATION_PENDING | Just registered; email not confirmed |
| EMAIL_VERIFIED | Email confirmed; can upload documents |
| EMPLOYEE_VERIFIED | Admin approved employee ID; TRID assigned; can seek rides |
| DRIVER_VERIFIED | Admin approved DL + RC; can give rides; role = BOTH |
| VERIFICATION_REJECTED | Admin rejected; user must resubmit |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| VER-001 | Employee ID upload — valid image | Account is EMAIL_VERIFIED | 1. Navigate to /verify/employee 2. Upload employee ID card (JPG, < 5 MB) 3. Submit | Upload accepted; status transitions to EMPLOYEE_VERIFICATION_PENDING; admin queue updated | Core verification track | P0 |
| VER-002 | Employee ID upload — PDF accepted | Account is EMAIL_VERIFIED | Upload PDF employee ID, submit | PDF accepted; pending queue updated | P1 |
| VER-003 | Employee ID upload — file > 5 MB rejected | Account is EMAIL_VERIFIED | Upload 6 MB image | Error: "File size must not exceed 5 MB." Upload not saved | P1 |
| VER-004 | Employee ID upload — unsupported format | Account is EMAIL_VERIFIED | Upload .docx file | Error: "Only JPG, PNG, or PDF formats are accepted." | P1 |
| VER-005 | Admin approves employee verification | Document uploaded; admin logged in | Admin opens verification queue → opens request → clicks "Approve" → adds note (optional) | User status → EMPLOYEE_VERIFIED; TRID generated (TR-XXXXXX); user receives email "Your employee identity has been verified!"; user can now search and book rides | Business-critical path | P0 |
| VER-006 | Admin rejects employee verification with reason | Document uploaded | Admin clicks "Reject" → enters rejection reason "ID card not clearly visible" → confirm | User status → VERIFICATION_REJECTED; user receives email with rejection reason; user can resubmit | P0 |
| VER-007 | User resubmits after employee verification rejection | Status = VERIFICATION_REJECTED | User uploads new clearer document, submits | Status back to EMPLOYEE_VERIFICATION_PENDING; admin queue updated with resubmission flag | P0 |
| VER-008 | EMPLOYEE_VERIFIED user cannot post rides | Status = EMPLOYEE_VERIFIED (no DL/RC) | Navigate to /rides/create | Blocked: "Complete driver verification to post rides." CTA to start driver verification shown | P0 |
| VER-009 | DL upload — valid | Status = EMPLOYEE_VERIFIED | Navigate to /verify/driver → upload DL front + back (JPG) → submit | Upload accepted; driver verification status = DL_PENDING | P0 |
| VER-010 | RC upload — valid | DL uploaded | Upload vehicle RC (JPG/PDF) → submit | Upload accepted; driver verification status = RC_PENDING (or combined DRIVER_VERIFICATION_PENDING) | P0 |
| VER-011 | Admin approves DL only — role does not change yet | DL uploaded; RC not uploaded | Admin approves DL | DL marked verified; overall driver status remains DRIVER_VERIFICATION_PENDING until RC also approved | P1 |
| VER-012 | Admin approves both DL + RC → DRIVER_VERIFIED | Both DL and RC uploaded and pending | Admin approves DL → Admin approves RC | User status → DRIVER_VERIFIED; role updated to BOTH; user receives notification; Ride Giver features unlocked | P0 |
| VER-013 | Admin rejects DL with reason | DL uploaded | Admin rejects DL → enters "DL number not visible" | User receives email with reason; must reupload DL | P0 |
| VER-014 | Admin rejects RC with reason | RC uploaded | Admin rejects RC → enters "RC document expired" | User receives email with reason; must reupload RC | P0 |
| VER-015 | Driver verification: DL missing but RC uploaded | User uploads RC without DL | Submit driver verification | Error: "Driving License is required before uploading RC." or system requires DL first | P1 |
| VER-016 | DRIVER_VERIFIED user has BOTH role | Status = DRIVER_VERIFIED | Check user profile via API GET /users/me | role = "BOTH"; can create rides AND book rides | P0 |
| VER-017 | Unverified user (EMAIL_VERIFIED only) cannot seek rides | Status = EMAIL_VERIFIED; no employee ID submitted | Attempt to request a ride via UI or API POST /ride-requests | Blocked: "Complete employee verification to book rides." | P0 |
| VER-018 | EMPLOYEE_VERIFIED user can seek rides | Status = EMPLOYEE_VERIFIED | Search for ride → click "Request" | Request flow proceeds normally | P0 |
| VER-019 | Re-verification after driver document update | DRIVER_VERIFIED user renews vehicle | User uploads new RC → submits | Previous DRIVER_VERIFIED status maintained until new document reviewed; admin sees "Document Update" in queue | P1 |
| VER-020 | Admin views full verification queue | Admin logged in | Navigate to /admin/verification-queue | Queue shows all PENDING employee and driver verifications, sorted by submission date ascending | P0 |
| VER-021 | Admin cannot approve own verification | Admin submits employee ID for themselves | In queue, admin's own request appears | System must prevent self-approval — either hide admin's own request or show "Cannot approve own verification" | P0 |
| VER-022 | Verification queue shows resubmission badge | User resubmitted after rejection | Admin views queue | Resubmitted entries are visually differentiated (e.g., "Resubmission" badge) | P1 |
| VER-023 | Verification status visible on user profile | Status = EMPLOYEE_VERIFIED | Navigate to user profile | Verification badge visible (e.g., "Verified Employee") | P2 |
| VER-024 | Multiple DL uploads: only latest counted | User uploads DL, then uploads again (correction) | Two DL documents exist for user | Only the latest submission is active in admin queue; previous auto-archived | P1 |
| VER-025 | Admin approval email content accuracy | Admin approves employee verification | Check email received by user | Email contains: user's name, TRID, next steps (how to search for rides), support link | P1 |
| VER-026 | Verification document not stored in public URL | Admin approves; check document URL | Use browser to access document URL without auth | URL returns 401/403; documents not publicly accessible | Security / P0 |
| VER-027 | Verification expiry — expired DL (future feature) | DL with past expiry date uploaded | Admin approves DL with expired date | System warns admin "DL expiry date is in the past"; admin must manually decide; risk flagged | P1 |
| VER-028 | Concurrent admin approvals (race condition) | Two admins open the same verification request simultaneously | Both click "Approve" at the same moment | Only one approval persists; second admin sees "This request has already been processed." | Data integrity / P1 |
| VER-029 | Employee verification status reflected in ride search | User status changes EMAIL_VERIFIED → EMPLOYEE_VERIFIED | Immediately after admin approval, user searches for rides | Search results appear (user now has seeker privileges) | P0 |
| VER-030 | Driver verification: vehicle category validation | User uploads RC for a commercial taxi | Admin reviews | System or admin flags: "Commercial/taxi vehicles not permitted. Only personal vehicles." | P1 |

---

## Missing Business Rules / Risks

1. **Verification expiry not implemented.** DL and RC documents expire. A background job to flag/expire verifications based on document expiry dates is not yet built. This is a significant compliance and safety risk.
2. **RC-to-DL owner match not validated.** The system doesn't verify that the RC owner matches the DL holder name. A user could upload another person's vehicle documents.
3. **Employee ID format not validated.** Any image is accepted. No check for company name on card, no OCR, no format check per company.
4. **No document authenticity check.** Uploaded images could be fabricated or edited. No integration with DigiLocker or government APIs.
5. **Two-admin review not required.** Sensitive driver verifications (DL + RC) have no four-eyes principle.
6. **TRID format undefined in code.** Sequential vs random — sequential leaks user counts.
7. **Verification queue SLA not enforced.** No escalation if an admin hasn't reviewed a request in N hours.
8. **Resubmission count not capped.** A user can theoretically resubmit indefinitely, spamming the admin queue.
9. **No face match between DL photo and profile photo.** Impersonation risk.
10. **Company HR cross-check not automated.** Employee IDs are not cross-validated against any HR system or API.
