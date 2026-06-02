# TechieRide QA Spec — 07: Seat Management

**Module:** Seat Availability & Count Management  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Seat management ensures that the count of available seats on a ride is always accurate, consistent, and protected against overbooking — especially under concurrent load. `availableSeats` starts equal to `totalSeats` at creation. It decrements on each giver approval and is restored on rejection or pre-approval cancellation. Once a seat is confirmed (approved), it cannot be freed by any user action other than admin intervention.

---

## Seat Count State Transitions

| Event | availableSeats Change |
|-------|-----------------------|
| Ride created | = totalSeats |
| Giver approves request | -1 |
| Giver rejects PENDING request | 0 (no change — seat was never held) |
| Seeker cancels PENDING request | 0 (no change) |
| Giver rejects APPROVED request (not allowed per spec) | Should not occur |
| Admin cancels CONFIRMED booking | +1 (admin only) |
| Ride CANCELLED | N/A (ride hidden) |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| SEAT-001 | availableSeats equals totalSeats at creation | DRIVER_VERIFIED giver | Create ride with totalSeats=3 | GET /rides/:id shows availableSeats=3 | Baseline integrity | P0 |
| SEAT-002 | availableSeats decrements on approval | Ride has 3 seats; giver approves one request | Giver approves request | availableSeats=2; confirmed seeker appears in passenger list | P0 |
| SEAT-003 | availableSeats decrements again on second approval | availableSeats=2 | Giver approves second request | availableSeats=1 | P0 |
| SEAT-004 | Ride becomes full after last seat approved | availableSeats=1; one PENDING request | Giver approves last request | availableSeats=0; ride disappears from search results; full-indicator shown | P0 |
| SEAT-005 | availableSeats does NOT decrement on rejection | Ride has 2 seats; giver rejects PENDING request | Giver rejects | availableSeats unchanged (still 2) | P0 |
| SEAT-006 | availableSeats does NOT change on seeker PENDING cancellation | Seeker cancels PENDING request | Seeker cancels | availableSeats unchanged; ride still visible with same count | P0 |
| SEAT-007 | availableSeats cannot go below 0 — direct API call | Ride is full (availableSeats=0) | POST /ride-requests on this ride | 409: "This ride is full." availableSeats remains 0 | Overbooking prevention / P0 |
| SEAT-008 | Overbooking prevention under concurrent approval | Ride has 1 seat; giver tries to approve 2 requests simultaneously (race) | Simulate concurrent PATCH /ride-requests/:id1/approve and PATCH /ride-requests/:id2/approve | DB transaction ensures only 1 succeeds; second returns 409; availableSeats = 0 | Critical race condition | P0 |
| SEAT-009 | Concurrent requests from 4 seekers for 2-seat ride | 4 seekers all send requests; giver approves all 4 simultaneously | DB-level test | Exactly 2 approvals succeed; remaining 2 are rejected with "No seats available." | P0 |
| SEAT-010 | availableSeats shown in search results | Ride has 3 total, 1 confirmed | Search | Result card shows "2 seats available" | P1 |
| SEAT-011 | availableSeats shown on ride detail page | — | Open ride detail | Shows totalSeats and availableSeats prominently | P1 |
| SEAT-012 | availableSeats negative not possible via admin | Admin inadvertently approves more | Attempt to force negative count | System constraint (DB check constraint or application guard) prevents negative value | P0 |
| SEAT-013 | totalSeats = 1 happy path | Ride with 1 seat | One seeker requests; giver approves | availableSeats → 0; ride full; search hidden | P0 |
| SEAT-014 | totalSeats = 4 fully filled | 4 separate seekers request; giver approves all | Giver approves one by one | After 4th approval: availableSeats=0; ride full | P0 |
| SEAT-015 | Seat count visible to giver on My Rides | Giver views their published ride | Navigate to My Rides | Shows: "3/4 seats filled" or similar breakdown | P1 |
| SEAT-016 | Seat freed when admin cancels confirmed booking | Admin cancels a CONFIRMED booking | Admin POST /admin/bookings/:id/cancel | availableSeats +1; ride visible in search again (if was hidden due to full) | Admin emergency workflow | P1 |
| SEAT-017 | 4 seekers request a 2-seat ride — only 2 approved scenario | 4 PENDING requests; ride has 2 seats | Giver approves 2; remaining 2 auto-rejected or stay PENDING | Only 2 confirmed; remaining 2 either stay PENDING or are rejected with "Sorry, no seats remaining" | P0 |
| SEAT-018 | Giver cannot manually set availableSeats via API | DRIVER_VERIFIED giver | PATCH /rides/:id with body {availableSeats: 10} | Field ignored or 403: "availableSeats is a computed field." | Security | P0 |
| SEAT-019 | Search query with seatsNeeded=2 filters correctly | Ride has 1 available seat | Search with seatsNeeded=2 | Ride not returned (only 1 seat, need 2) | P1 |
| SEAT-020 | Search query with seatsNeeded=1 returns ride with 1 seat | — | Search with seatsNeeded=1 | Ride returned | P1 |
| SEAT-021 | availableSeats updates in real-time on ride detail page | Seeker on ride detail page; another seeker gets approved simultaneously | Check if page updates without refresh | Either real-time update via WebSocket/polling, or stale indicator with "Refresh to see latest" | UX / P1 |
| SEAT-022 | DB consistency: approved count + availableSeats = totalSeats | Ride with various approvals | Query DB: COUNT(confirmed requests) + availableSeats | Must equal totalSeats always | Data integrity / P0 |
| SEAT-023 | Seat count unaffected by NO_SHOW marking | Giver marks a CONFIRMED passenger as NO_SHOW | Check availableSeats after NO_SHOW | availableSeats unchanged (seat was already used/allocated; NO_SHOW ≠ cancellation) | P1 |
| SEAT-024 | Giver adds note while approving — seat still decrements | Giver adds note "I'll pick you up at gate 1" alongside approval | Approve with note | Seat decrements; note saved | P2 |
| SEAT-025 | Full ride badge shown on card | 0 seats available | Seeker with admin access or giver views ride | "Ride Full" badge visible | P2 |

---

## Missing Business Rules / Risks

1. **Optimistic vs pessimistic locking not specified.** The DB transaction strategy for concurrent approvals (row-level lock, SELECT FOR UPDATE, or optimistic versioning) must be defined and implemented. Without this, overbooking is a real risk.
2. **NO_SHOW seats are never recovered.** If a passenger is marked NO_SHOW, their seat is not freed for a late-arriving replacement. Should seats be re-opened after a NO_SHOW cutoff?
3. **Admin cancellation of confirmed bookings lacks workflow.** There's no defined process for compensation or notification when an admin cancels a confirmed seat.
4. **Group booking (seatsNeeded > 1) not supported.** A seeker can only book 1 seat at a time. Corporate colleagues travelling together must submit separate requests and hope both are approved.
5. **Seat count not shown on search by default for all result cards.** UX inconsistency risk — some cards may show count, others not.
6. **Giver cannot see a list of all PENDING requests with their potential approval impact.** A giver with 4 PENDING requests for a 2-seat ride must manually track who to approve.
7. **No hold timer for pending requests.** Since there's no hold, 10 seekers can have PENDING requests simultaneously. The first 2 approved get seats; the rest are left waiting with no indication of queue position.
