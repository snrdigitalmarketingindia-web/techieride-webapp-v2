# 06 — Ride Request

**Platform:** TechieRide v2 · **Module:** Ride Request & Booking Initiation  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

A seeker requests a published ride. The request is PENDING until the giver approves or rejects. **There is no seat hold timer** — multiple seekers can request the same seat simultaneously. Upon giver approval, the booking is immediately CONFIRMED with no cancellation option for either party. Only an Admin exception can override a confirmed booking.

**Booking States:** PENDING → CONFIRMED (on approval) | PENDING → REJECTED (on rejection)

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| RQ-01 | Happy path — seeker requests published ride | EMPLOYEE_VERIFIED seeker; PUBLISHED ride | POST /ride-requests with rideId | 201 Created; status = PENDING | Core booking initiation | P0 |
| RQ-02 | Giver receives notification on new request | Ride published; request submitted | Submit request | Notification created for giver | Giver awareness | P0 |
| RQ-03 | Request appears in giver's My Rides pending section | Request submitted | Giver views My Rides | Seeker name + Call + Approve + Reject visible | Giver workflow | P0 |
| RQ-04 | Request appears in seeker's Awaiting Approval | Request submitted | Seeker views My Rides | Request with route, giver name, PENDING badge | Seeker awareness | P0 |
| RQ-05 | Duplicate request by same seeker blocked | Seeker already has PENDING request for this ride | POST /ride-requests again | 409 Conflict; "Already requested" | Overbooking prevention | P0 |
| RQ-06 | Full ride (0 seats) blocks new request | Ride with 0 availableSeats | POST /ride-requests | 409 Conflict; "Ride is full" | Overbooking prevention | P0 |
| RQ-07 | Request for ONGOING ride blocked | Ride is ONGOING | POST /ride-requests | 400 Bad Request; ride not accepting requests | Lifecycle integrity | P0 |
| RQ-08 | Request for COMPLETED ride blocked | Ride is COMPLETED | POST /ride-requests | 400 Bad Request | Lifecycle integrity | P0 |
| RQ-09 | Request for CANCELLED ride blocked | Ride is CANCELLED | POST /ride-requests | 400 or 404 | Lifecycle integrity | P0 |
| RQ-10 | Request for DRAFT ride blocked | Ride is DRAFT | POST /ride-requests | 403 or 404; not published | State gate | P0 |
| RQ-11 | Giver (RIDE_GIVER only) cannot request their own ride | Giver views own ride | POST /ride-requests for own ride | 403 Forbidden | Self-booking prevention | P0 |
| RQ-12 | BOTH-role user cannot request their own ride | BOTH role giver/seeker | POST /ride-requests for own ride | 403 Forbidden | Self-booking prevention | P0 |
| RQ-13 | EMAIL_VERIFICATION_PENDING user blocked | Status = EMAIL_VERIFICATION_PENDING | POST /ride-requests | 401/403 | Access gate | P0 |
| RQ-14 | DOCUMENT_VERIFICATION_PENDING user blocked | Docs uploaded, not yet approved | POST /ride-requests | 403; must complete verification | Access gate | P0 |
| RQ-15 | Multiple seekers can request same ride simultaneously | 3-seat ride | 4 seekers request simultaneously | All 4 get PENDING; giver approves first 3; 4th rejected or waitlisted | Concurrency | P0 |
| RQ-16 | No seat hold on request — seat remains available to others | Seeker A requests; seat not held | Seeker B requests same seat | Seeker B also gets PENDING | No-hold policy | P0 |
| RQ-17 | Seeker can cancel PENDING request (before giver approval) | PENDING request | DELETE /ride-requests/{id} or PATCH cancel | 200 OK; request CANCELLED; seat not affected | Seeker flexibility (pre-approval) | P1 |
| RQ-18 | Seeker cannot cancel CONFIRMED request | CONFIRMED request | Attempt cancellation | 403 Forbidden; "Booking confirmed — contact admin" | Post-approval lock | P0 |
| RQ-19 | Giver cannot cancel CONFIRMED request | CONFIRMED request | Attempt cancellation | 403 Forbidden; admin exception required | Post-approval lock | P0 |
| RQ-20 | Request includes seeker name visible to giver | Request submitted | Giver views pending list | Seeker fullName, initial avatar, call button | Giver information | P1 |
| RQ-21 | Request does not expose seeker phone until confirmed | PENDING request | Giver views pending list | Phone visible (call button present for pre-screening) | Trust design | P1 |
| RQ-22 | Seeker receives notification when giver approves | PENDING → CONFIRMED | Giver approves | Seeker notification: "Your ride is confirmed!" | Seeker awareness | P0 |
| RQ-23 | Seeker receives notification when giver rejects | PENDING → REJECTED | Giver rejects | Seeker notification: "Request declined" | Seeker awareness | P1 |
| RQ-24 | Rejected seeker can request a different ride | Request REJECTED | POST /ride-requests for different ride | 201 Created | Recovery path | P1 |
| RQ-25 | Rejected seeker cannot re-request same ride | Request REJECTED for ride X | POST /ride-requests for ride X | 409 or 403; already rejected | Spam prevention | P1 |
| RQ-26 | Request status visible in seeker My Rides with colour badge | Any status | GET taken rides | PENDING=yellow, CONFIRMED=green, REJECTED=red | Status clarity | P1 |
| RQ-27 | Unauth user cannot request rides | No token | POST /ride-requests | 401 Unauthorized | Security | P0 |
| RQ-28 | Boundary — requesting ride with exactly 1 seat remaining | 1 availableSeats | POST /ride-requests | 201 Created; seat not yet deducted (still PENDING) | Boundary | P0 |
| RQ-29 | Regression — request survives API restart | PENDING request | Restart API; GET requests | Request still PENDING | State persistence | P0 |
| RQ-30 | Regression — My Rides updates without page reload after request | Request submitted | Check My Rides (poll/refresh) | New request visible | Real-time UI | P1 |

---

## UAT Acceptance Criteria

- [ ] Seeker can request a ride in 2 taps from search results
- [ ] Giver sees new request within 30 seconds (notification + My Rides update)
- [ ] Once approved, neither party sees a cancel button — only admin contact
- [ ] Seeker sees real-time status badge (PENDING/CONFIRMED/REJECTED) in My Rides
- [ ] Multiple seekers can request the same ride; giver chooses who to approve

---

## Missing Business Rules / Risks

1. **No PENDING request expiry** — a giver who ignores a request leaves the seeker waiting indefinitely; needs auto-reject after N hours
2. **No waitlist mechanism** — once a ride is full, seekers have no way to queue for cancellations
3. **No "withdraw and re-request" cooldown** — seekers could spam requests by repeatedly cancelling and re-requesting
4. **Giver can selectively discriminate** — no audit trail of rejections; a giver could reject specific seekers unfairly
5. **No booking limit per seeker** — a seeker could PENDING-request 20 rides simultaneously
6. **No notification when PENDING request expires (if expiry added later)** — silent expiry would confuse seekers
7. **Admin exception workflow for confirmed bookings not documented** — how does admin cancel a CONFIRMED booking?
8. **No re-request limit after multiple rejections** — a rejected seeker can immediately request the same ride again (same day, different ride)
