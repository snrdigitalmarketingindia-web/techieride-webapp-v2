# TechieRide QA Spec — 09: Boarding

**Module:** Passenger Boarding Management  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Boarding is the physical act of a passenger getting into the vehicle at the pickup point. The Ride Giver manages boarding status for each confirmed passenger. A passenger starts in WAITING state (when ride is ONGOING) and transitions to BOARDED when the giver marks them as picked up, or NO_SHOW if they don't appear. Boarding state changes are only possible during an ONGOING ride. The call button is hidden for NO_SHOW passengers to reflect that they're no longer part of the active ride.

---

## Boarding State Machine

```
Ride ONGOING →
  Each confirmed passenger starts: WAITING
  Giver marks picked up: WAITING → BOARDED
  Giver marks absent:    WAITING → NO_SHOW
  Giver marks dropped:   BOARDED → DEBOARDED (see file 10)
```

---

## Passenger Boarding States

| State | Description |
|-------|-------------|
| WAITING | Ride ONGOING; passenger not yet picked up |
| BOARDED | Passenger in the vehicle |
| NO_SHOW | Passenger did not appear at pickup point |
| DEBOARDED | Passenger dropped off (final state) |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| BRD-001 | Giver starts ride — all confirmed passengers move to WAITING | Ride has 2 CONFIRMED passengers; giver taps "Start Ride" | Ride status → ONGOING | Both passengers' boarding status = WAITING; giver's active ride screen shows passenger list with WAITING badges | Core operational flow | P0 |
| BRD-002 | Giver marks passenger as BOARDED | Passenger status = WAITING; ride ONGOING | Giver taps "Boarded" next to passenger name | Passenger status → BOARDED; boarding timestamp recorded; seeker sees status update | P0 |
| BRD-003 | Boarding timestamp recorded accurately | Giver marks BOARDED | Check API response or DB | boardedAt timestamp present and accurate (IST, within 1 min of action) | Audit / P1 |
| BRD-004 | Giver marks passenger as NO_SHOW | Passenger = WAITING; giver waits at pickup but passenger absent | Giver taps "No Show" | Passenger status → NO_SHOW; noShowAt timestamp recorded; call button hidden | P0 |
| BRD-005 | NO_SHOW: call button hidden immediately | Passenger marked NO_SHOW | Giver's active ride screen | Call button for NO_SHOW passenger is hidden or disabled | Safety/UX | P0 |
| BRD-006 | NO_SHOW: seeker receives notification | Passenger marked NO_SHOW | Check seeker's notifications | Seeker receives: "The giver marked you as No Show on the [Date] ride." (For their awareness) | P1 |
| BRD-007 | Boarding status only changeable during ONGOING ride | Ride status = PUBLISHED or CONFIRMED | Attempt to change boarding status | Error: "Boarding can only be updated during an active ride." | P0 |
| BRD-008 | Boarding status not changeable for COMPLETED ride | Ride status = COMPLETED | Attempt PATCH /passengers/:id/boarding-status | 403: "Ride is completed." | P0 |
| BRD-009 | Only giver can change boarding status | Seeker (logged in) attempts to mark themselves BOARDED | PATCH /passengers/:id/boarding-status via seeker's auth token | 403: "Only the ride giver can update boarding status." | Security / P0 |
| BRD-010 | Admin cannot mark boarding (not their ride) | Admin logs in, tries to update boarding | PATCH /passengers/:id/boarding-status via admin token | 403 (admin does not have giver role for this ride) OR admin override allowed — behavior must be defined | P1 |
| BRD-011 | Boarding status visible on giver's active ride screen | Ride ONGOING; 3 passengers with mixed states | Giver views active ride | Each passenger shows their current boarding status: WAITING / BOARDED / NO_SHOW | P0 |
| BRD-012 | Seeker sees their own boarding status | Seeker's booking is CONFIRMED; ride ONGOING | Seeker views My Bookings → active ride | Shows: "Status: Waiting to be picked up" or "Status: Boarded" | P1 |
| BRD-013 | Giver can board passengers in any order | 3 passengers at different stops | Giver marks Passenger 2 BOARDED first, then Passenger 1 | System accepts out-of-order boarding | P1 |
| BRD-014 | Boarding action requires ride to be ONGOING — not just started | Giver has CONFIRMED passengers but hasn't tapped "Start Ride" | Giver attempts to mark BOARDED | Error: "Please start the ride first." | P0 |
| BRD-015 | Giver can reverse NO_SHOW (passenger arrived late) | Passenger marked NO_SHOW; passenger calls and arrives 5 min late | Giver taps "Undo No Show" or re-marks BOARDED | Business rule: can giver change NO_SHOW → BOARDED? This must be defined. Either: allowed within 15 min, or locked | Business rule gap | P1 |
| BRD-016 | All passengers BOARDED — ride can proceed to deboarding phase | 3 passengers, all BOARDED | — | No system action required — giver can start driving; deboarding available | P1 |
| BRD-017 | Boarding notification pushed to seeker | Giver marks seeker as BOARDED | Check seeker's notifications | Seeker receives: "You've been marked as boarded on the [Date] ride." | P2 |
| BRD-018 | Boarding page shows WAITING count | 3 confirmed passengers; 1 boarded | Giver's active ride screen | Shows: "1/3 boarded, 2 waiting" | P1 |
| BRD-019 | NO_SHOW passenger excluded from boarding count | 2 confirmed; 1 NO_SHOW, 1 BOARDED | Active ride screen | Shows: "1/1 boarded (1 no-show)" — not "1/2 boarded" | P1 |
| BRD-020 | Boarding state survives app crash/reload | Giver marks 2 passengers BOARDED; app crashes | Giver reopens app | Active ride screen shows same BOARDED states (persisted in DB, not just local state) | P0 |
| BRD-021 | Giver cannot board a passenger who is REJECTED | REJECTED request passengers are not in the passenger list | — | REJECTED passengers do not appear on the boarding screen | P0 |
| BRD-022 | Giver cannot board a PENDING request passenger | PENDING request exists on ride | PENDING passengers should not appear in boarding list | Only CONFIRMED passengers appear in boarding screen | P0 |
| BRD-023 | All passengers NO_SHOW — giver can complete ride | All 3 passengers marked NO_SHOW | Giver attempts to complete ride | Allowed: giver can complete ride even with all NO_SHOWS; ECO points calculation applies based on passengers who boarded | P1 |
| BRD-024 | Boarding status API response structure | Giver GETs active ride | GET /rides/:id/passengers | Response includes: passengerId, name, boardingStatus, boardedAt (nullable), noShowAt (nullable), phone (for CONFIRMED/WAITING/BOARDED) | API contract / P1 |
| BRD-025 | Concurrent boarding updates (two givers — edge case) | (Should never happen — one ride, one giver) | Attempt two concurrent PATCH requests for same passenger's boarding status | Only last write wins (last-write-wins or optimistic lock); consistent final state | P2 |

---

## Missing Business Rules / Risks

1. **NO_SHOW reversal policy undefined.** A giver might mark a passenger as NO_SHOW by mistake while the passenger is merely 2 minutes late. The ability to reverse this within a grace window (e.g., 10 minutes) needs a defined business rule.
2. **NO_SHOW impact on seeker's trust score undefined.** A NO_SHOW by the seeker should negatively affect their reliability score, but the deduction amount and threshold for suspension are not defined.
3. **NO_SHOW by giver (never starts ride) not covered here.** This is in 17-operational-scenarios.md but the boarding module should reference what happens when the giver themselves is the no-show.
4. **Boarding confirmation by seeker not possible.** The seeker has no way to self-confirm they boarded. Only the giver controls this — creating a single point of control that could be abused.
5. **Multiple pickup points not supported.** In multi-stop carpools (common in Hyderabad: HITEC City → Madhapur → Gachibowli), different passengers board at different stops. The boarding module doesn't support stop-level boarding.
6. **Automatic NO_SHOW after X minutes not implemented.** If giver waits 10 minutes at pickup and passenger doesn't arrive, there's no auto-NO_SHOW. Giver must manually mark it.
7. **Boarding screen requires internet.** If giver is at a poor-connectivity area (basement parking, tunnel), boarding updates may fail. Offline queue with retry not mentioned.
