# 10 — Deboarding & Ride Completion

**Platform:** TechieRide v2 · **Module:** Deboarding & Completion  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Deboarding marks a passenger as dropped off (`BOARDED → DEBOARDED`). Once all passengers are deboarded (or NO_SHOW), the giver can mark the ride `COMPLETED`. Completion triggers ECO points, CO2 savings, and leaderboard updates. Ratings become available post-completion. A ride cannot be completed if any passenger is still `BOARDED`.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| DEBOARD-01 | Happy path — giver deboarded a BOARDED passenger | ONGOING ride; seeker BOARDED | PATCH /rides/{id}/deboard/{participantId} | boardingStatus = DEBOARDED | Core deboarding flow | P0 |
| DEBOARD-02 | Giver completes ride after all deboarded | All participants DEBOARDED or NO_SHOW | PATCH /rides/{id}/complete | Status = COMPLETED; ECO points awarded | Core completion flow | P0 |
| DEBOARD-03 | ECO points awarded to giver on completion | Ride COMPLETED | GET /gamification/summary | ecoPoints increased | Gamification | P0 |
| DEBOARD-04 | ECO points awarded to BOARDED seekers | Seeker was BOARDED | GET /gamification/summary for seeker | ecoPoints increased | Gamification | P0 |
| DEBOARD-05 | NO_SHOW seeker does not earn ECO points | Seeker NO_SHOW | GET /gamification/summary for seeker | No new ECO points | Gamification integrity | P1 |
| DEBOARD-06 | CO2 saved calculated on completion | Ride COMPLETED | GET /gamification/summary | co2SavedKg > 0 | Environmental metric | P1 |
| DEBOARD-07 | CO2 calculation uses haversine distance | Known origin/destination | Complete ride; check co2SavedKg | co2 = distance × factor; verify formula | Metric accuracy | P1 |
| DEBOARD-08 | Leaderboard updates after completion | Ride COMPLETED | GET /gamification/leaderboard | Giver's rank updated | Community engagement | P1 |
| DEBOARD-09 | Cannot complete ride if any passenger still BOARDED | 1 of 2 passengers still BOARDED | PATCH /rides/{id}/complete | 400 Bad Request; "All passengers must be deboarded" | Completion gate | P0 |
| DEBOARD-10 | Ride with all NO_SHOW can be completed | All passengers NO_SHOW | PATCH /rides/{id}/complete | 200 OK; COMPLETED; giver points only | Edge case completion | P1 |
| DEBOARD-11 | WAITING passenger blocks completion | 1 passenger still WAITING | PATCH /rides/{id}/complete | 400 Bad Request | Completion gate | P0 |
| DEBOARD-12 | Cannot deboard a WAITING passenger directly | boardingStatus = WAITING | PATCH deboard | 400; must board first | State machine | P0 |
| DEBOARD-13 | Cannot deboard a NO_SHOW passenger | boardingStatus = NO_SHOW | PATCH deboard | 400; terminal state | State machine | P0 |
| DEBOARD-14 | Only giver can deboard passengers | Seeker attempts deboard | Seeker PATCH deboard | 403 Forbidden | Role gate | P0 |
| DEBOARD-15 | Deboard badge visible (🏁) in giver My Rides | Passenger DEBOARDED | Giver views My Rides | 🏁 Deboarded badge (grey) | Status visibility | P1 |
| DEBOARD-16 | COMPLETED ride visible in seeker My Rides | Ride COMPLETED | Seeker GET taken rides | Ride present with COMPLETED badge | History visibility | P0 |
| DEBOARD-17 | COMPLETED ride visible in giver My Rides | Ride COMPLETED | Giver GET /rides | Ride present with COMPLETED badge | History visibility | P0 |
| DEBOARD-18 | Rating becomes available post-completion | Ride COMPLETED | GET /rides/{id} | ratingEligible = true or ratings endpoint accessible | Rating gate | P1 |
| DEBOARD-19 | Completion notification sent to all participants | Ride COMPLETED | Check notifications | Notification: "Your ride is complete! Rate your experience" | Post-ride UX | P1 |
| DEBOARD-20 | COMPLETED ride cannot be cancelled | Ride COMPLETED | PATCH /rides/{id}/cancel | 400 Bad Request | Lifecycle integrity | P0 |
| DEBOARD-21 | COMPLETED ride cannot be started again | Ride COMPLETED | PATCH /rides/{id}/start | 400 Bad Request | Lifecycle integrity | P0 |
| DEBOARD-22 | Giver can create new ride after completion | Ride COMPLETED | POST /rides | 201 Created | Lifecycle reset | P0 |
| DEBOARD-23 | Double completion blocked (idempotency) | Ride COMPLETED | PATCH /rides/{id}/complete again | 400; already completed | Idempotency | P0 |
| DEBOARD-24 | Double ECO points blocked (idempotency) | Ride COMPLETED | Complete again attempt | ECO points not doubled | Gamification integrity | P0 |
| DEBOARD-25 | Regression — COMPLETED status persists after logout | Ride COMPLETED | Logout → login → GET /rides | Status still COMPLETED | State persistence | P0 |

---

## UAT Acceptance Criteria

- [ ] Giver can complete a ride in 3 taps: deboard all → complete
- [ ] ECO points and CO2 savings appear on dashboard within 10 seconds of completion
- [ ] Ratings prompt appears for both giver and seekers after completion
- [ ] Completed ride cannot be reopened, cancelled, or modified
- [ ] Double-completion (accidental second tap) does not duplicate ECO points

---

## Missing Business Rules / Risks

1. **No geofence-based deboarding** — giver marks deboard manually; no destination proximity check
2. **No partial-ride CO2 calculation** — if a seeker deboarded early (intermediate stop), CO2 is calculated for full distance
3. **Completion timeout not defined** — a giver could never complete a ride; it stays ONGOING indefinitely
4. **No admin force-complete** — if giver goes offline during ONGOING, only admin can intervene (workflow not documented)
5. **ECO points formula not publicly documented** — users cannot verify points calculation
6. **Leaderboard update delay** — leaderboard may not refresh in real time on completion
7. **No ride completion verification** — giver can complete a ride without physically reaching destination
8. **Ratings window undefined** — how long after completion can a user rate? (no documented expiry)
