# TechieRide QA Spec — 06: Ride Request

**Module:** Ride Request & Booking Initiation  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

A Ride Seeker requests a seat on a published ride. The request creates a `RideRequest` record with status `PENDING`. The Ride Giver then approves or rejects. Cancellation by either party is only permitted before approval. Once the giver approves, the booking is confirmed and immutable. Seekers with BOTH role cannot request their own rides. Unverified users are blocked.

---

## Request State Machine

```
PENDING → APPROVED → CONFIRMED (seat reserved)
PENDING → REJECTED (by giver)
PENDING → CANCELLED (by seeker, before approval)
APPROVED → (no cancellation allowed)
CONFIRMED → (no cancellation allowed)
```

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| REQ-001 | Seeker successfully requests a ride | EMPLOYEE_VERIFIED seeker; PUBLISHED ride with seats available | 1. Find ride in search 2. Click "Request Ride" 3. Optionally add a note 4. Confirm | RideRequest created with status=PENDING; seeker sees "Request Sent"; giver notified via push/email | Core booking flow | P0 |
| REQ-002 | Duplicate request by same seeker blocked | Seeker already has PENDING request on same ride | Attempt to request the same ride again | Error: "You already have a pending request for this ride." No duplicate created | Data integrity | P0 |
| REQ-003 | Seeker cannot request same ride after rejection (without giver re-opening) | Seeker's previous request was REJECTED | Attempt to request same ride again | Behavior must be defined: either blocked ("You were rejected for this ride") or allowed for retry — current behavior must be documented | P1 |
| REQ-004 | Full ride (0 seats) blocks new request | All seats confirmed | Attempt to click "Request Ride" | Button disabled/hidden OR API returns 409: "This ride is full." | P0 |
| REQ-005 | Request for ONGOING ride blocked | Ride status = ONGOING | Seeker attempts to request via UI or API | 409: "This ride has already started." | P0 |
| REQ-006 | Request for CANCELLED ride blocked | Ride status = CANCELLED | Attempt request | 404 or 409: "This ride is no longer available." | P0 |
| REQ-007 | Request for COMPLETED ride blocked | Ride status = COMPLETED | Attempt request via API | 409: "This ride has been completed." | P0 |
| REQ-008 | Giver receives notification on new request | Giver has push notifications enabled | Seeker submits request | Giver receives: in-app notification + email: "[SeekName] has requested a seat on your [Date] ride." | Trust & communication | P0 |
| REQ-009 | Seeker receives confirmation of pending status | — | After submitting request | Seeker sees request in "My Bookings" with status = PENDING | P0 |
| REQ-010 | BOTH-role user cannot request own ride | User is giver AND seeker; they own the ride | Attempt to request their own PUBLISHED ride via UI or API | UI: Request button hidden. API: 403: "You cannot request your own ride." | P0 |
| REQ-011 | Unverified seeker (EMAIL_VERIFIED) blocked from requesting | Status = EMAIL_VERIFIED (no employee ID approved) | Attempt POST /ride-requests | 403: "Employee verification required to book rides." | P0 |
| REQ-012 | EMAIL_VERIFICATION_PENDING user blocked | Not email-verified | Attempt request | 401/403 with appropriate message | P0 |
| REQ-013 | Seeker cancels PENDING request | Request status = PENDING | Click "Cancel Request" → confirm | Request status → CANCELLED; giver notified; seeker no longer in giver's request list | P0 |
| REQ-014 | Seeker cannot cancel APPROVED request | Request status = APPROVED | Attempt cancel via UI or API | Error: "Booking has been approved and cannot be cancelled." Cancel button disabled | Business rule: no cancellation after approval | P0 |
| REQ-015 | Seeker cannot cancel CONFIRMED booking | Request status = CONFIRMED | Attempt cancel | Error: "Confirmed bookings cannot be cancelled. Contact support." | P0 |
| REQ-016 | Giver rejects request | Request in PENDING state | Giver opens My Rides → Requests → clicks "Reject" → optionally enters reason | Request status → REJECTED; seeker notified with reason (if provided); seat count unchanged | P0 |
| REQ-017 | Giver approves request | Request in PENDING state | Giver clicks "Approve" | Request status → APPROVED → CONFIRMED; seat count decrements by 1; both parties notified; phone numbers now visible to each other | P0 |
| REQ-018 | Giver approves request — seat count decrements | Ride has 3 seats; giver approves one request | Check ride details after approval | Available seats = 2 | P0 |
| REQ-019 | Concurrent approval of last seat — race condition | Ride has 1 seat; two seekers in PENDING state | Giver (or system) approves both simultaneously | Only one approval succeeds; second returns: "No seats available." seat count does not go negative | Critical data integrity | P0 |
| REQ-020 | Request note saved and visible to giver | Seeker adds note: "I'll be at Gate 2" | Giver opens request | Note visible in request detail | P2 |
| REQ-021 | Multiple seekers can request same ride | Ride has 3 seats | 5 seekers each send a request | All 5 requests created as PENDING; giver can approve up to 3 | P0 |
| REQ-022 | Giver sees all pending requests sorted by submission time | Multiple PENDING requests | Giver navigates to My Rides → Requests | Requests sorted oldest-first (fairness); or clearly documented sort order | P1 |
| REQ-023 | Request details page shows seeker profile | Giver views a pending request | Open request detail | Shows: seeker name, company, TRID, rating, verification badge | Trust | P1 |
| REQ-024 | Seeker's My Bookings shows all request statuses | Seeker has: 1 PENDING, 1 CONFIRMED, 1 REJECTED | Navigate to My Bookings | All three visible with correct status labels | P1 |
| REQ-025 | Request auto-expires if giver never responds | Request in PENDING for > 24 hours before ride departure | Ride departure passes | System auto-rejects (or auto-expires) stale PENDING requests; seeker notified | P1 |
| REQ-026 | API: seeker cannot approve own request | Seeker calls PATCH /ride-requests/:id/approve | API | 403: "Only the ride giver can approve requests." | Security / P0 |
| REQ-027 | API: giver cannot request their own ride via API | Giver calls POST /ride-requests with their own rideId | API | 403: "You cannot request your own ride." | Security / P0 |
| REQ-028 | Request survives giver account session expiry | Giver has PENDING requests; giver's JWT expires | Seeker checks My Bookings | Requests still PENDING; not auto-rejected due to giver session state | P1 |
| REQ-029 | Ride with pending requests: giver cancels ride | Giver cancels a PUBLISHED ride that has PENDING requests | Giver cancels | All PENDING requests auto-rejected; seekers notified: "The ride you requested has been cancelled by the giver." | P0 |
| REQ-030 | Request timestamps recorded accurately (IST) | — | Submit request; check DB or API response | createdAt field shows IST-equivalent timestamp; not UTC without context | Audit / P2 |

---

## Missing Business Rules / Risks

1. **No re-request policy after rejection.** Can a seeker re-request the same ride after rejection? The giver might have rejected by mistake. The business rule needs to be defined.
2. **PENDING request expiry not implemented.** If the giver ignores requests, seekers are left waiting indefinitely. An auto-expiry job (e.g., reject all PENDING requests 2 hours before ride departure) is needed.
3. **No seeker-to-giver messaging.** The only communication channel before confirmation is the optional request note. A pre-approval chat would improve match quality.
4. **No waitlist mechanism.** If a ride is full, seekers have no way to be notified if a seat opens up.
5. **Giver rejection reason is optional but should be required.** Repeated rejections without reason could mask discriminatory behavior.
6. **No anti-discrimination policy enforcement.** A giver can reject seekers from certain companies or genders (for non-women-only rides) with no accountability.
7. **Ride request visibility to fellow passengers.** After confirmation, can a seeker see who else is on the ride? This is a privacy vs. safety tradeoff not addressed in the spec.
8. **Giver approval deadline not enforced.** Giver has no time pressure to approve. If giver is inactive for 12 hours before a morning ride, seekers have no certainty.
9. **Seat hold during review not implemented.** There's no seat hold timer — correct per spec — but this means a giver reviewing 5 requests for 1 seat may approve one and leave others waiting while seat is already taken.
