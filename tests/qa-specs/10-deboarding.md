# TechieRide QA Spec — 10: Deboarding & Ride Completion

**Module:** Passenger Deboarding & Ride Completion  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Deboarding is the act of the giver marking each passenger as dropped off at their destination. Once all eligible passengers (BOARDED) are DEBOARDED, the giver can mark the ride as COMPLETED. Completion triggers ECO points awards to all participants, CO2 savings calculation, and leaderboard updates. A ride cannot be completed if there are passengers still in BOARDED state. NO_SHOW passengers are excluded from completion prerequisites.

---

## Completion Prerequisites Checklist

- Ride status = ONGOING
- All BOARDED passengers are DEBOARDED (NO_SHOW passengers are excluded)
- At least 0 passengers deboarded (giver-only completion allowed if all were NO_SHOW)

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| DEB-001 | Giver marks BOARDED passenger as DEBOARDED | Passenger status = BOARDED; ride ONGOING | Giver taps "Deboard" next to passenger | Status → DEBOARDED; deboardedAt timestamp recorded; completion button may now be enabled | Core operational flow | P0 |
| DEB-002 | deboardedAt timestamp recorded accurately | Passenger deboarded | Check API response | deboardedAt present, accurate to within 1 min of action (IST) | Audit | P1 |
| DEB-003 | Cannot deboard a WAITING passenger | Passenger status = WAITING | Giver taps "Deboard" for WAITING passenger | Error: "Passenger must be boarded before deboarding." Or button not shown for WAITING passengers | P0 |
| DEB-004 | Cannot deboard a NO_SHOW passenger | Passenger status = NO_SHOW | Giver attempts to deboard NO_SHOW | Error: "Cannot deboard a passenger who was marked No Show." | P0 |
| DEB-005 | Giver completes ride — all passengers deboarded | All BOARDED passengers are now DEBOARDED; none in BOARDED state | Giver taps "Complete Ride" → confirms | Ride status → COMPLETED; ECO points awarded; CO2 calculated; completion notification sent | Core business outcome | P0 |
| DEB-006 | Giver cannot complete ride with BOARDED passengers remaining | 2 DEBOARDED, 1 still BOARDED | Giver taps "Complete Ride" | Error: "Please deboard all passengers before completing the ride." | P0 |
| DEB-007 | Giver can complete ride with all passengers NO_SHOW | All 3 passengers = NO_SHOW; none BOARDED | Giver taps "Complete Ride" | Ride completes; minimal or zero ECO points awarded (no passengers transported) | P1 |
| DEB-008 | Giver can complete ride with mix of DEBOARDED and NO_SHOW | 2 DEBOARDED, 1 NO_SHOW | Giver taps "Complete Ride" | Ride completes; ECO points for 2 passengers transported | P0 |
| DEB-009 | ECO points awarded to giver on completion | Ride completes with 2 passengers | Check giver's profile/gamification | Giver receives ECO points (e.g., 10 pts per passenger * 2 = 20 pts) | Gamification engagement | P1 |
| DEB-010 | ECO points awarded to DEBOARDED seekers on completion | Ride completes | Check each DEBOARDED seeker's profile | Each seeker receives ECO points for participating | P1 |
| DEB-011 | ECO points NOT awarded to NO_SHOW passengers | NO_SHOW passenger on completed ride | Check NO_SHOW seeker's profile | No ECO points awarded to NO_SHOW seeker | P1 |
| DEB-012 | CO2 savings calculated on completion | Ride from HITEC City to Gachibowli (7 km); 2 passengers | Check ride completion record | CO2 saved = distance × passengers × emission factor; stored in rideRecord | P1 |
| DEB-013 | Leaderboard updated after completion | Giver completes ride | Check leaderboard | Giver's total CO2 saved and ECO points updated; leaderboard position recalculated | P1 |
| DEB-014 | Completion notification to all DEBOARDED passengers | Ride completed | Check seeker notifications | Each seeker receives: "Your ride on [Date] has been completed. Rate your experience!" | P1 |
| DEB-015 | Completion notification to giver | Ride completed | Check giver notifications | Giver receives: "Ride completed! You've earned X ECO points." | P2 |
| DEB-016 | Ride cannot be "un-completed" | Ride status = COMPLETED | Attempt PATCH /rides/:id with status=ONGOING | 403: "Completed rides cannot be reverted." | Data integrity | P0 |
| DEB-017 | Only giver can deboard passengers | Seeker attempts to mark themselves DEBOARDED via API | PATCH /passengers/:id/boarding-status as seeker | 403: "Only the ride giver can update boarding status." | Security | P0 |
| DEB-018 | Only giver can complete ride | Seeker or admin attempts to complete ride | POST /rides/:id/complete as seeker | 403: "Only the ride giver can complete the ride." | P0 |
| DEB-019 | Deboarding only possible during ONGOING ride | Ride status = COMPLETED | Attempt to deboard | 403: "Ride is already completed." | P0 |
| DEB-020 | Multiple deboarding in sequence (multi-stop) | 3 passengers boarded; different stops | Giver deboarded Passenger1 at Stop A; Passenger2 at Stop B; Passenger3 at Stop C | Each deboarding succeeds in sequence; final completion unlocked after Passenger3 | P1 |
| DEB-021 | ECO points calculation: distance-based | Short ride vs long ride | Compare ECO points for 5 km vs 20 km ride | Longer ride yields more ECO points (if distance-weighted) | P1 |
| DEB-022 | Rating prompt triggered after completion | Ride completed | Seeker's next app open or notification | Rating prompt shown to seeker: "Rate your ride with [GiverName]" | P1 |
| DEB-023 | Giver's active ride count clears after completion | Giver had 1 active ride | Ride completed | Giver can now post a new ride (1-active-ride-per-giver rule clears) | P0 |
| DEB-024 | Completed ride archived in ride history | Ride COMPLETED | Giver/seeker views ride history | Completed ride visible under "Past Rides" with all details | P1 |
| DEB-025 | Ride completion with 0 passengers (giver rode solo) | All passengers were NO_SHOW or never requested | Giver completes ride | Ride marked COMPLETED; ECO points for giver = base points only or zero; CO2 savings = 0 | P2 |

---

## Missing Business Rules / Risks

1. **ECO points formula not documented.** Points per ride/passenger/km are not defined in the spec. QA cannot validate correctness without the formula.
2. **CO2 emission factor not documented.** What is the per-km CO2 emission factor used? India-specific fuel economy average? Petrol vs. EV givers should have different factors.
3. **No dispute mechanism for deboarding.** If a giver marks a passenger as DEBOARDED (ride complete) but the seeker says they were dropped at the wrong location, there's no appeal workflow.
4. **Giver cannot complete ride if offline.** The "Complete Ride" action requires a server call. If connectivity is lost at destination, the ride remains ONGOING indefinitely. An offline completion queue is needed.
5. **Ride auto-completion not implemented.** If a giver forgets to complete a ride (e.g., closes app after dropping passengers), the ride remains ONGOING forever. An auto-completion trigger (e.g., 2 hours after scheduled departure) is needed.
6. **ECO points awarded on partial completion?** If giver has 3 passengers, deboarded 2, and the 3rd became BOARDED mid-route — the completion is blocked. This is a correctness edge case.
7. **No refund/ECO points deduction mechanism.** If a completed ride is later found to be fraudulent (fake boarding/deboarding), there's no points reversal workflow.
8. **Leaderboard update latency.** If ECO points are updated asynchronously, the leaderboard may be stale. Max acceptable latency should be defined.
