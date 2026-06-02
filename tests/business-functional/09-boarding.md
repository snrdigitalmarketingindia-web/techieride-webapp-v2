# 09 — Boarding

**Platform:** TechieRide v2 · **Module:** Passenger Boarding  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Boarding is the giver's act of marking each confirmed seeker as present at pickup. Boarding status transitions: `WAITING → BOARDED` (present) or `WAITING → NO_SHOW` (absent). Only the giver can change boarding status. Boarding is only possible during an `ONGOING` ride. A `NO_SHOW` passenger loses call button visibility and ECO points for that ride.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| BOARD-01 | Happy path — giver boards a WAITING passenger | ONGOING ride; seeker CONFIRMED | PATCH /rides/{id}/board?seekerId=... | boardingStatus = BOARDED; timestamp recorded | Core boarding flow | P0 |
| BOARD-02 | Giver marks NO_SHOW for absent passenger | ONGOING ride; seeker CONFIRMED | PATCH /rides/{id}/no-show/{participantId} | boardingStatus = NO_SHOW | No-show workflow | P0 |
| BOARD-03 | NO_SHOW passenger — call button removed | boardingStatus = NO_SHOW | View My Rides | No call button for NO_SHOW passenger | UX safety | P0 |
| BOARD-04 | NO_SHOW badge visible on giver My Rides | Passenger marked NO_SHOW | Giver views My Rides | 👻 No-show badge with red styling | Status visibility | P1 |
| BOARD-05 | Boarding only possible during ONGOING ride | Ride is PUBLISHED | Attempt PATCH board | 400/403; ride not started | State gate | P0 |
| BOARD-06 | Boarding not possible before ride starts | Ride is PUBLISHED | Attempt PATCH board | 400 Bad Request | Lifecycle integrity | P0 |
| BOARD-07 | Only giver can change boarding status | Seeker attempts board action | Seeker PATCH board | 403 Forbidden | Role gate | P0 |
| BOARD-08 | Seeker cannot mark self as boarded | Seeker account | PATCH /rides/{id}/board (self) | 403 Forbidden | Role gate | P0 |
| BOARD-09 | Admin can view boarding status | Admin dashboard | GET /admin/rides/{id} | boardingStatus per participant visible | Admin monitoring | P1 |
| BOARD-10 | BOARDED passenger — correct badge shown | boardingStatus = BOARDED | Giver views My Rides | ✅ Boarded badge (green) | Status visibility | P1 |
| BOARD-11 | WAITING passenger — default badge shown | New participant | Giver views My Rides | ⏳ Waiting badge (yellow) | Status visibility | P1 |
| BOARD-12 | Boarding timestamp stored | Giver marks BOARDED | GET /rides/{id} | boardingTimestamp populated | Audit trail | P1 |
| BOARD-13 | Cannot change BOARDED → WAITING (no un-board) | boardingStatus = BOARDED | Attempt to reset to WAITING | 400; no backward transition | State machine integrity | P0 |
| BOARD-14 | Cannot change NO_SHOW → BOARDED (no reinstatement) | boardingStatus = NO_SHOW | Attempt to change to BOARDED | 400; final state | State machine integrity | P0 |
| BOARD-15 | Boarding notification sent to seeker | Giver boards seeker | Check seeker notifications | "You've been marked as boarded" notification | Seeker awareness | P2 |
| BOARD-16 | NO_SHOW seeker — ECO points not awarded | Seeker NO_SHOW; ride completes | GET /gamification/summary for that seeker | No new ECO points for that ride | Gamification integrity | P1 |
| BOARD-17 | All passengers can have different boarding statuses | 3 passengers: 1 BOARDED, 1 NO_SHOW, 1 WAITING | View giver My Rides | Each shows correct individual badge | Multi-participant UX | P0 |
| BOARD-18 | Boarding status visible to seeker themselves | Seeker | GET taken rides | Own boardingStatus visible | Seeker transparency | P1 |
| BOARD-19 | Giver can board passengers in any order | 3 passengers | Board passenger 3 first | 200 OK; independent status per passenger | Flexibility | P1 |
| BOARD-20 | Boarding possible on day-of ride after ONGOING status | Ride started on departure date | PATCH board | 200 OK | Time-of-day boarding | P0 |
| BOARD-21 | Unauthenticated user cannot board | No token | PATCH /rides/{id}/board | 401 Unauthorized | Security | P0 |
| BOARD-22 | Cannot board a participant not on this ride | Wrong participantId | PATCH board with foreign participantId | 404 Not Found | Data integrity | P0 |
| BOARD-23 | Boarding status persists after API restart | Passenger boarded | Restart API; GET ride | boardingStatus = BOARDED | State persistence | P0 |
| BOARD-24 | Regression — UI updates boarding badge without full page reload | Board action taken | Observe UI | Badge updates immediately | Real-time UX | P1 |
| BOARD-25 | Boundary — boarding all passengers changes nothing about seat count | Board all 3 of 3 | GET /rides/{id} | availableSeats = 0 (already was) | Seat count unchanged by boarding | P1 |

---

## UAT Acceptance Criteria

- [ ] Giver can mark each passenger with a single tap during the ongoing ride
- [ ] NO_SHOW passengers have call buttons removed immediately
- [ ] Boarding badges (WAITING/BOARDED/NO_SHOW) are visually distinct and update in real time
- [ ] Only the giver of the ride can change boarding status
- [ ] All boarding actions are logged with timestamps

---

## Missing Business Rules / Risks

1. **No geofence-based auto-boarding** — system cannot verify seeker is physically at pickup; manual mark-as-boarded only
2. **No OTP-at-pickup validation** — any giver could mark anyone as boarded; no seeker confirmation
3. **No time window for boarding** — giver can mark BOARDED at any time during ONGOING; no "you must board within 15 min of departure" enforcement
4. **NO_SHOW reversal not possible** — if giver accidentally marks NO_SHOW, no correction path without admin
5. **Boarding notification is P2** — seekers may not know they've been marked; important for trust
6. **No partial-boarding ride start validation** — giver can start and complete a ride without boarding anyone
7. **ECO points for NO_SHOW seeker unclear** — does the giver still get points for that seat? Business rule undefined
