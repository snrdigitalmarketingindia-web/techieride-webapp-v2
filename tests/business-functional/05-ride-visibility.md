# 05 — Ride Visibility

**Platform:** TechieRide v2 · **Module:** Ride Visibility & State Filtering  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Ride visibility directly affects platform utility. A ride must appear immediately after publishing and must disappear immediately when full, cancelled, or completed. Stale or invisible rides destroy seeker trust. This module validates the full visibility matrix across all ride states, user roles, devices, and sessions.

---

## Visibility Matrix

| Ride State | Visible in Search | Visible in My Rides (Giver) | Visible in My Rides (Seeker) |
|---|---|---|---|
| DRAFT | ❌ | ✅ | ❌ |
| PUBLISHED (seats > 0) | ✅ | ✅ | ✅ (if confirmed) |
| PUBLISHED (seats = 0) | ❌ | ✅ | ✅ (if confirmed) |
| ONGOING | ❌ | ✅ | ✅ |
| COMPLETED | ❌ | ✅ | ✅ |
| CANCELLED | ❌ | ✅ | ✅ (if had request) |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| VIS-01 | Ride visible immediately after publish | Ride just published | GET /rides/search within 5s | Ride present in results | Real-time discovery | P0 |
| VIS-02 | Ride visible after browser refresh | Ride published | Publish → refresh → search | Ride still visible | State persistence | P0 |
| VIS-03 | Ride visible after seeker logout and re-login | Ride published | Login → search → logout → login → search | Ride still visible | Session independence | P0 |
| VIS-04 | Ride visible after partial seat fill | 3-seat ride, 1 approved | Search | Ride visible with 2 availableSeats | Seat update visibility | P0 |
| VIS-05 | Ride hidden when all seats filled (0 availableSeats) | 2-seat ride; 2 approved | Search | Ride absent from results | Full-ride hiding | P0 |
| VIS-06 | Ride reappears if a CONFIRMED request is rejected/cancelled | Full ride; one request cancelled by admin | Search | Ride visible again with 1 seat | Seat recovery visibility | P0 |
| VIS-07 | CANCELLED ride hidden from search | Giver cancels ride | Search | Ride absent | State filtering | P0 |
| VIS-08 | COMPLETED ride hidden from search | Ride completed | Search | Ride absent | State filtering | P0 |
| VIS-09 | ONGOING ride hidden from search (no new requests) | Ride started | Search | Ride absent | Workflow integrity | P0 |
| VIS-10 | DRAFT ride hidden from search | Ride created but not published | Search | Draft absent | State filtering | P0 |
| VIS-11 | DRAFT ride visible in giver's My Rides | DRAFT ride exists | GET /rides (giver) | DRAFT ride present with DRAFT badge | Giver visibility | P1 |
| VIS-12 | COMPLETED ride visible in giver's My Rides | Ride completed | GET /rides (giver) | COMPLETED ride present | History visibility | P1 |
| VIS-13 | COMPLETED ride visible in seeker's My Rides | Seeker was on ride | GET taken rides (seeker) | COMPLETED ride present | History visibility | P1 |
| VIS-14 | CANCELLED ride visible in giver's My Rides | Giver cancelled | GET /rides (giver) | CANCELLED ride present with badge | History visibility | P1 |
| VIS-15 | My Rides sorted newest first | Multiple rides | GET /rides (giver) | Most recent ride at top | UX ordering | P1 |
| VIS-16 | Seeker's taken rides sorted newest first | Multiple taken rides | GET taken rides | Most recent at top | UX ordering | P1 |
| VIS-17 | Ride visible to seeker who requested (before approval) | Seeker has PENDING request | GET taken rides (seeker) | Pending ride shown in Awaiting Approval section | Seeker awareness | P0 |
| VIS-18 | Ride visible to seeker after approval | CONFIRMED request | GET taken rides | Ride visible with CONFIRMED status | Post-approval visibility | P0 |
| VIS-19 | Cancelled giver ride still shows in seeker My Rides | Seeker had CONFIRMED request; giver cancelled | GET taken rides | Ride visible with CANCELLED badge + opacity indicator | Seeker history | P1 |
| VIS-20 | Pending request section disappears after approval | Giver approves seeker | Refresh seeker My Rides | Ride moves from Awaiting Approval to confirmed rides | State transition UI | P0 |
| VIS-21 | Search results do not show duplicate rides | Single ride published | GET /rides/search | Exactly one result per ride | Data integrity | P0 |
| VIS-22 | Admin sees all rides regardless of status | Admin logged in | Admin GET /admin/rides | All statuses visible | Admin completeness | P1 |
| VIS-23 | Seat count in search updates after each approval | Ride has 3 seats; 1 approved | Search again | availableSeats = 2 | Real-time seat display | P0 |
| VIS-24 | Visibility consistent across desktop and mobile | Any ride | Check on mobile viewport | Same rides visible | Cross-device parity | P1 |
| VIS-25 | Ride visible to BOTH-role user in their seeker search | BOTH role user | Search as seeker | Other givers' rides visible; own ride absent | BOTH role parity | P0 |
| VIS-26 | Women-only ride hidden from male seekers | Women-only flag set (when implemented) | Male seeker searches | Women-only ride absent | Gender filtering | P0 |
| VIS-27 | Women-only ride visible to female seekers | Women-only flag set | Female seeker searches | Women-only ride present | Gender filtering | P0 |
| VIS-28 | Regression — ride visibility survives API restart | Ride published before restart | Restart API, search | Ride still visible | Infrastructure resilience | P0 |
| VIS-29 | No ghost rides — deleted vehicles don't leave orphan rides | Vehicle deleted | Search | No rides orphaned to deleted vehicle | Data integrity | P1 |
| VIS-30 | Ride visible with correct remaining seats after concurrent approvals | Race condition: 2 simultaneous approvals for last seat | Search after | 0 seats; ride hidden | Concurrency integrity | P0 |

---

## UAT Acceptance Criteria

- [ ] Published ride appears in search within 5 seconds on a standard connection
- [ ] Full ride disappears from search results immediately after last seat is confirmed
- [ ] Cancelled ride disappears from search and shows "Cancelled" in giver/seeker history
- [ ] My Rides always sorted newest first across both giver and seeker views
- [ ] No duplicate rides appear regardless of how many times the user refreshes

---

## Missing Business Rules / Risks

1. **No cache invalidation strategy defined** — Redis or CDN caching could serve stale ride lists after status changes
2. **No visibility SLA** — no defined maximum delay between state change and search visibility
3. **Seeker sees cancelled ride with no explanation** — "Cancelled" badge shown but no reason displayed
4. **No pagination on My Rides** — if a user has 100+ rides, all load at once; performance risk
5. **ONGOING ride visible on giver dashboard but not in search** — seeker has no way to track a ride they're on unless they have the ride ID
6. **Women-only ride enforcement relies on self-reported gender** — no verification of gender claim
7. **No "ride near me now" visibility** — no real-time map view of available rides
8. **Visibility after rejection** — if giver rejects all seekers, ride should re-appear with full seats; verify this works
