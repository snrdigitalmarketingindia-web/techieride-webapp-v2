# DOCUMENT VERIFICATION RULES
> TechieRide Identity Architecture — v1.0

---

## 1. Document Requirements Matrix

| Document | SEEKER | GIVER | BOTH | Expiry Tracked | Re-verification |
|---|---|---|---|---|---|
| Official Company Email | ✅ Mandatory | ✅ Mandatory | ✅ Mandatory | N/A | On company change |
| Company ID Card | ✅ Mandatory | ✅ Mandatory | ✅ Mandatory | ⚠️ Should be | On company change |
| Driving License | ❌ Optional | ✅ Mandatory | ✅ Mandatory | ✅ Yes — DL expiry | On expiry |
| RC (Vehicle Registration) | ❌ Optional | ✅ Mandatory | ✅ Mandatory | ✅ Yes — RC expiry | On expiry |
| Vehicle Details | ❌ N/A | ✅ Mandatory | ✅ Mandatory | N/A | On vehicle change |
| Profile Photo | ⚠️ Recommended | ⚠️ Recommended | ⚠️ Recommended | N/A | Anytime |

---

## 2. Current Implementation Gaps

| Gap | Severity | Recommendation |
|---|---|---|
| DL expiry date not captured | High | Add `dlExpiryDate` field to verification form |
| RC expiry date not captured | High | Add `rcExpiryDate` field to verification form |
| No expiry alert system | High | Notify giver 30 days before DL/RC expiry |
| No document re-upload after initial submission | High | Allow re-upload via profile page |
| Admin cannot reject individual documents | Medium | Admin should reject specific docs, not whole submission |
| No document version history | Medium | Keep previous versions for audit |
| Company ID not validated against company name | Low | Could add optional manual check |

---

## 3. Document Validation Rules

### Company ID Card
- Accepted formats: JPG, PNG, PDF
- Max size: 5MB
- Must show: Employee name, Company name, Employee ID
- Admin validates: manually by reading the card

### Driving License
- Accepted formats: JPG, PNG, PDF
- Max size: 5MB
- Must capture: DL number, expiry date, vehicle classes
- System validates: expiry date must be ≥ 6 months from submission date
- Admin validates: name matches profile

### RC (Vehicle Registration Certificate)
- Accepted formats: JPG, PNG, PDF
- Max size: 5MB
- Must capture: vehicle number, owner name, expiry date
- System validates:
  - Plate number matches vehicle details entered
  - RC expiry ≥ 3 months from submission date
  - One RC per plate number (unique constraint)
- Admin validates: name/plate match

### Vehicle Details
- Make, Model, Color: free text
- Plate Number: format `[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{1,4}` (Indian format)
- Total Seats: 2–8
- Unique: plate number unique across platform

---

## 4. Expiry Management (Recommended)

### Alert Timeline
| Days Before Expiry | Action |
|---|---|
| 30 days | In-app notification + email |
| 15 days | Second reminder |
| 7 days | Urgent notification |
| 0 days (expired) | Ride publishing blocked; active rides can complete |
| +1 day (expired) | Giver features suspended until renewal |

### Expiry Fields to Add to Schema
```prisma
model VerificationRequest {
  dlExpiryDate   DateTime?
  rcExpiryDate   DateTime?
  dlNumber       String?
  rcNumber       String?
}

model Vehicle {
  rcExpiryDate   DateTime?
}
```

---

## 5. Document Status Model

```
NOT_SUBMITTED → SUBMITTED → UNDER_REVIEW → APPROVED
                                         → REJECTED → (re-upload) → SUBMITTED
                          → EXPIRED      → (re-upload) → SUBMITTED
```

---

## 6. Admin Document Review Interface (Required)

Admin should be able to:
- View each document individually (not just as a batch)
- Approve or reject individual documents with reason
- See document version history
- See expiry dates
- Mark documents as expired manually
- Filter queue by document type

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-DV-01 | Giver cannot publish ride if DL is expired |
| AC-DV-02 | RC expiry must be ≥ 3 months from submission date |
| AC-DV-03 | Plate number must match RC document (admin-verified) |
| AC-DV-04 | Seeker submission without DL/RC is accepted (optional for seekers) |
| AC-DV-05 | Giver submission without DL or RC returns 400 |
| AC-DV-06 | Alert sent 30 days before DL expiry |
| AC-DV-07 | After expiry, giver cannot start new rides but active ride can complete |

## 8. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-DV-01 | Giver submits without DL | 400 — Driving License required |
| TC-DV-02 | Giver submits without RC | 400 — RC required |
| TC-DV-03 | Seeker submits without DL | 201 — accepted |
| TC-DV-04 | DL expiry < 6 months from submission | 400 — DL expires too soon |
| TC-DV-05 | Duplicate plate number | 409 — plate already registered |
| TC-DV-06 | Giver tries to publish with expired RC | 403 — RC expired |
| TC-DV-07 | 30 days before DL expiry | Notification sent |

## 9. CI/CD Tests Required

- `POST /verification/submit` for giver without DL → must return 400
- `PATCH /rides/:id/publish` with expired DL → must return 403
- Duplicate plate number → must return 409
- DL expiry < 6 months → must return 400
