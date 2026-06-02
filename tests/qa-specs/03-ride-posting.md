# TechieRide QA Spec — 03: Ride Posting

**Module:** Ride Creation & Publishing  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

A Ride Giver (status = DRIVER_VERIFIED, role = BOTH) creates rides on TechieRide. A ride starts in DRAFT state when saved, and transitions to PUBLISHED when the giver explicitly publishes it. Once published, the ride is immutable — no edits to route, time, or seat count are permitted. Only one active ride (PUBLISHED, ONGOING) is allowed per giver at a time.

---

## Ride State Machine (Relevant to Posting)

```
DRAFT → PUBLISHED → [Booking States]
DRAFT → CANCELLED (if giver deletes before publish)
PUBLISHED → CANCELLED (if giver cancels before any confirmed bookings)
```

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| RID-001 | Successful ride creation (DRAFT) | User is DRIVER_VERIFIED | 1. Navigate to /rides/create 2. Fill origin=HITEC City, destination=Gachibowli, date=tomorrow, time=09:00, seats=2, vehicle=registered vehicle 3. Click "Save as Draft" | Ride created with status=DRAFT; rideId assigned; giver sees it under My Rides > Drafts | Core business function | P0 |
| RID-002 | Publish ride (DRAFT → PUBLISHED) | Ride in DRAFT state | Click "Publish" on draft ride | Status → PUBLISHED; ride appears in search results; other fields immutable | Core business function | P0 |
| RID-003 | Unverified user blocked from creating ride | Status = EMPLOYEE_VERIFIED (no DL/RC) | Navigate to /rides/create | Blocked with CTA: "Complete driver verification to post rides." | P0 |
| RID-004 | EMAIL_VERIFIED user blocked from creating ride | Status = EMAIL_VERIFIED | Navigate to /rides/create or POST /rides API | 403 Forbidden: "Employee verification required." | P0 |
| RID-005 | Seat count = 1 accepted | DRIVER_VERIFIED user | Create ride with seats=1 | Ride created successfully; 1 seat available | Minimum valid case | P0 |
| RID-006 | Seat count = 4 accepted | DRIVER_VERIFIED user | Create ride with seats=4 | Ride created successfully; 4 seats available | Maximum standard carpool | P0 |
| RID-007 | Seat count = 0 rejected | DRIVER_VERIFIED user | Create ride with seats=0 | Error: "Seat count must be between 1 and 4." | P0 |
| RID-008 | Seat count = 5 rejected | DRIVER_VERIFIED user | Create ride with seats=5 | Error: "Seat count must be between 1 and 4." | P0 |
| RID-009 | Seat count negative rejected | DRIVER_VERIFIED user | POST /rides with seats=-1 | 400 Bad Request: "Seat count must be between 1 and 4." | P0 |
| RID-010 | Origin required | DRIVER_VERIFIED user | Leave origin blank, submit | Error: "Origin is required." | P0 |
| RID-011 | Destination required | DRIVER_VERIFIED user | Leave destination blank, submit | Error: "Destination is required." | P0 |
| RID-012 | Origin = Destination rejected | DRIVER_VERIFIED user | Set origin = destination = "HITEC City" | Error: "Origin and destination cannot be the same." | P1 |
| RID-013 | Past date rejected | DRIVER_VERIFIED user | Set date = yesterday (IST), submit | Error: "Ride date cannot be in the past." | P0 |
| RID-014 | Today's date with past time rejected | DRIVER_VERIFIED user | Set date = today (IST), time = current time - 30 min | Error: "Departure time must be at least 30 minutes from now." (or similar buffer) | P0 |
| RID-015 | Today's date with future time accepted | DRIVER_VERIFIED user | Set date = today (IST), time = current time + 2 hours | Ride created successfully | P0 |
| RID-016 | One active ride per giver — second publish blocked | Giver already has a PUBLISHED ride | Attempt to publish a second ride | Error: "You already have an active ride. Complete or cancel it before posting a new one." | Prevents confusion and double-booking | P0 |
| RID-017 | DRAFT rides do not block second DRAFT | Giver has one ride in DRAFT | Create another DRAFT | Second draft created; multiple drafts allowed | P1 |
| RID-018 | Vehicle required | DRIVER_VERIFIED user; vehicle not registered | Create ride without selecting vehicle | Error: "Please add your vehicle before posting a ride." | P0 |
| RID-019 | Notes field — optional, accepts up to 500 chars | DRIVER_VERIFIED user | Fill notes with 500-char string | Ride created; notes saved | P2 |
| RID-020 | Notes field — rejects > 500 chars | DRIVER_VERIFIED user | Fill notes with 501-char string | Error: "Notes must not exceed 500 characters." or truncated with warning | P2 |
| RID-021 | Ride immutable after publish — origin cannot be edited | Ride is PUBLISHED | Navigate to edit ride → change origin | Edit fields greyed out OR API PATCH /rides/:id returns 403: "Published rides cannot be modified." | Core business rule | P0 |
| RID-022 | Ride immutable after publish — seat count cannot be changed | Ride is PUBLISHED | Attempt to increase/decrease seats via API | 403: "Published rides cannot be modified." | P0 |
| RID-023 | Ride immutable after publish — time cannot be changed | Ride is PUBLISHED | Attempt to change departure time | 403: "Published rides cannot be modified." | P0 |
| RID-024 | Giver can cancel PUBLISHED ride with zero bookings | Ride is PUBLISHED; no requests | Click "Cancel Ride" → confirm | Ride status → CANCELLED; removed from search results | P0 |
| RID-025 | Giver cannot cancel PUBLISHED ride with confirmed bookings | Ride has at least one CONFIRMED booking | Attempt cancel | Error: "You have confirmed passengers. Contact support to cancel." or cancel disabled | Once approved, seat confirmed — no cancellation | P0 |
| RID-026 | Commute template creation | DRIVER_VERIFIED user | Navigate to /rides/templates → create template (Mon–Fri, same route, same time) | Template saved; rides generated for next 7 days (or configured horizon) | Recurring commute support | P1 |
| RID-027 | Ride created from template appears in search | Template published | Search for ride on a template-generated date | Ride visible in search results with standard attributes | P1 |
| RID-028 | Women-only toggle on ride creation | DRIVER_VERIFIED female giver | Toggle "Women Only" → create ride | Ride created with womenOnly=true; badge shown on card | P1 |
| RID-029 | Departure time = midnight boundary | DRIVER_VERIFIED user | Set departure time = 00:00 | Ride created if date is valid; no error (midnight shift workers) | P2 |
| RID-030 | XSS in origin/destination fields | — | Enter origin=<img src=x onerror=alert(1)> | Input sanitized; script does not execute; stored as escaped string | Security / P0 |

---

## Missing Business Rules / Risks

1. **No route validation.** Origin/destination are free-text strings. Two givers can post "HITEC City → Gachibowli" in 10 different spellings, fragmenting search results. Google Maps / geocoding validation is critical for match quality.
2. **"One active ride per giver" rule scope unclear.** Does ONGOING also block a new publish? Does DRAFT count? Needs precise definition.
3. **No vehicle registration flow documented.** Rides require a vehicle, but the vehicle registration (make, model, color, plate) module is not in this spec scope. A giver with DRIVER_VERIFIED but no vehicle in the system is stuck.
4. **Ride far-future date not bounded.** A giver could post a ride 2 years in the future. Maximum advance booking window should be defined (e.g., 30 days).
5. **Minimum departure time buffer undefined.** Is 30 minutes the minimum? This is critical for same-day rides.
6. **No bulk cancellation for template rides.** If giver deactivates a template, what happens to PUBLISHED rides already generated from it?
7. **Women-only rides posted by male giver — edge case.** System should block or warn if a male-identified giver marks a ride as women-only.
8. **DRAFT expiry not defined.** Do drafts expire after N days? Stale drafts clutter the giver's dashboard.
9. **No co-pilot / alternate driver support.** If the registered giver is sick, there is no mechanism to assign a substitute driver.
10. **Ride notes are not searchable.** Seekers cannot filter rides by partial route info in notes.
