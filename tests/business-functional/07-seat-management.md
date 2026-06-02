# 07 — Seat Management

**Platform:** TechieRide v2 · **Module:** Seat Allocation & Overbooking Prevention  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Seat management is critical. `availableSeats` must always reflect the true number of unallocated seats. Seats are only deducted upon giver **approval** (CONFIRMED), not on request (PENDING). There is no seat hold. The platform must prevent overbooking under concurrent load. A full ride (0 `availableSeats`) must immediately hide from search.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| SM-01 | availableSeats = totalSeats immediately after ride creation | Ride created | GET /rides/{id} | availableSeats === totalSeats | Baseline integrity | P0 |
| SM-02 | PENDING request does NOT deduct a seat | 2-seat ride; 1 PENDING request | GET /rides/{id} | availableSeats still = 2 | No-hold policy | P0 |
| SM-03 | CONFIRMED request deducts exactly 1 seat | 2-seat ride; 1 request approved | GET /rides/{id} after approval | availableSeats = 1 | Core seat tracking | P0 |
| SM-04 | Two approvals deduct 2 seats | 2-seat ride; 2 requests approved | GET /rides/{id} | availableSeats = 0 | Seat tracking | P0 |
| SM-05 | 0 availableSeats triggers ride hidden from search | Last seat approved | GET /rides/search | Ride absent | Full-ride hiding | P0 |
| SM-06 | REJECTED request does not deduct a seat | 2-seat ride; 1 rejected | GET /rides/{id} | availableSeats unchanged | Rejection integrity | P0 |
| SM-07 | Seat restored on admin cancellation of CONFIRMED booking | CONFIRMED booking cancelled by admin | GET /rides/{id} | availableSeats +1; ride re-appears in search | Admin override effect | P0 |
| SM-08 | Overbooking prevention — cannot approve more than totalSeats | 2-seat ride; 3 requests | Approve 3rd request | 409 Conflict; "Ride is full" | Core safety | P0 |
| SM-09 | Concurrent approval race condition — last seat | 2-seat ride; 2 simultaneous approvals for last seat | Both admins/giver approve simultaneously | Exactly one succeeds; second gets 409 | Concurrency safety | P0 |
| SM-10 | 4-seeker scenario — giver approves 1 of 4 | 1-seat ride; 4 PENDING requests | Giver approves seeker A | availableSeats = 0; seekers B/C/D still PENDING (until rejected) | Multi-request handling | P0 |
| SM-11 | Full ride allows no new requests via API | 0 availableSeats | POST /ride-requests | 409 Conflict | API-level gate | P0 |
| SM-12 | totalSeats is immutable after publish | Ride PUBLISHED | PATCH /rides/{id} with totalSeats: 5 | 400 or field ignored | Immutability | P0 |
| SM-13 | Boundary — 1-seat ride: single approval fills ride | 1-seat ride | Approve 1 request | availableSeats = 0; ride hidden | Boundary | P0 |
| SM-14 | Boundary — 4-seat ride: 4 approvals fill ride | 4-seat ride | Approve 4 requests | availableSeats = 0 | Boundary | P0 |
| SM-15 | Seat count visible in search results | PUBLISHED ride with 2 seats | GET /rides/search | availableSeats shown | Seeker decision info | P1 |
| SM-16 | Seat count visible in ride detail | PUBLISHED ride | GET /rides/{id} | totalSeats and availableSeats both shown | Detail transparency | P1 |
| SM-17 | Giver My Rides shows correct seats | Ride with approvals | GET /rides (giver) | "X/Y seats" correct | Giver monitoring | P1 |
| SM-18 | CANCELLED ride — seats irrelevant after cancel | Giver cancels | Check availableSeats | Field still present but ride not in search | Data consistency | P2 |
| SM-19 | Concurrent requests do not cause negative seats | 1-seat ride; 2 approvals attempted simultaneously | Race condition | availableSeats minimum = 0; never negative | Data integrity | P0 |
| SM-20 | NO_SHOW boarding status — seat not recovered | Seeker marked NO_SHOW | GET /rides/{id} | availableSeats not increased (ride ONGOING) | Lifecycle integrity | P1 |
| SM-21 | DEBOARDED boarding status — no seat recovery | Seeker deboarded | GET /rides/{id} | availableSeats unchanged (ride ONGOING) | Lifecycle integrity | P1 |
| SM-22 | Regression — seat count correct after API restart | Ride with approvals | Restart API; GET /rides/{id} | Seat count persisted correctly in DB | State persistence | P0 |
| SM-23 | Seat count shown correctly across multiple device sessions | Giver approves on mobile | Seeker checks on desktop | Updated seat count visible | Cross-device consistency | P1 |
| SM-24 | Admin can view seat status in ride monitoring | Admin dashboard | GET /admin/rides | totalSeats and availableSeats visible | Admin monitoring | P1 |
| SM-25 | Boundary — 0-seat ride creation rejected | None | POST /rides with totalSeats: 0 | 400 Bad Request | Minimum boundary | P0 |

---

## UAT Acceptance Criteria

- [ ] Seat count in search updates within 5 seconds of an approval
- [ ] A ride with 0 available seats disappears from search immediately
- [ ] Under concurrent load (two givers approving simultaneously), overbooking never occurs
- [ ] Giver My Rides always shows "N/Total seats" accurately
- [ ] `availableSeats` never goes below 0 under any scenario

---

## Missing Business Rules / Risks

1. **No database-level seat lock** — without `SELECT FOR UPDATE` or atomic decrement, concurrent approvals could overbook in a high-traffic scenario
2. **PENDING requests not auto-rejected when ride fills** — seekers with PENDING requests on a full ride must be manually rejected by giver; auto-rejection on full would improve UX
3. **No maximum concurrent approvals rate limit** — a compromised giver account could spam approvals
4. **Seat count not shown in notifications** — "Your ride is confirmed" doesn't mention how many seats remain
5. **No reserved capacity mechanism** — platform cannot hold seats for specific groups (e.g., verified women for women-only rides)
6. **Seat recovery on admin cancellation not tested** — admin exception workflow for confirmed bookings unclear
7. **No seat history log** — no audit trail of when each seat was allocated/deducted
