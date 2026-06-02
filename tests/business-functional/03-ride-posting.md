# 03 — Ride Posting

**Platform:** TechieRide v2 · **Module:** Ride Creation & Publishing  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Only `DRIVER_VERIFIED` users with an `rcVerified` vehicle can publish rides. A ride is created as `DRAFT` and then published to become `PUBLISHED`. Only one active ride (PUBLISHED or ONGOING) is allowed per giver at a time. Rides are immutable after publishing to prevent bait-and-switch with seekers.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| RP-01 | Happy path — verified giver creates ride | DRIVER_VERIFIED + rcVerified vehicle | POST /rides with all required fields | 201 Created; status = DRAFT | Core giver flow | P0 |
| RP-02 | Happy path — giver publishes draft ride | DRAFT ride exists | PATCH /rides/{id}/publish | 200 OK; status = PUBLISHED; ride visible in search | Core giver flow | P0 |
| RP-03 | Unverified user (EMPLOYEE_VERIFIED only) cannot create ride | Status = EMPLOYEE_VERIFIED | POST /rides | 403 Forbidden | Role gate | P0 |
| RP-04 | EMAIL_VERIFICATION_PENDING user blocked | Status = EMAIL_VERIFICATION_PENDING | POST /rides | 401 Forbidden | Access gate | P0 |
| RP-05 | Giver without vehicle blocked | DRIVER_VERIFIED but no vehicle | POST /rides | 404 or 403; no vehicle found | Vehicle dependency | P0 |
| RP-06 | Vehicle with unverified RC blocked at publish | DRAFT ride exists; rcVerified=false | PATCH /rides/{id}/publish | 403; "RC not verified" | Safety gate | P0 |
| RP-07 | Second active ride blocked | PUBLISHED ride already exists | POST /rides → publish | 409; "Active ride already exists" | One-ride-per-giver rule | P0 |
| RP-08 | Second ONGOING ride blocked | ONGOING ride exists | POST /rides → publish | 409 Conflict | One-ride-per-giver rule | P0 |
| RP-09 | Past date rejected | None | POST /rides with departureDate = yesterday | 400 Bad Request | Data integrity | P0 |
| RP-10 | Today's date accepted | None | POST /rides with departureDate = today (IST) | 201 Created | Date boundary | P0 |
| RP-11 | Seat count 1 accepted | None | POST /rides with totalSeats: 1 | 201 Created | Minimum seats | P1 |
| RP-12 | Seat count 4 accepted | None | POST /rides with totalSeats: 4 | 201 Created | Maximum seats | P1 |
| RP-13 | Seat count 0 rejected | None | POST /rides with totalSeats: 0 | 400 Bad Request | Boundary | P0 |
| RP-14 | Seat count 5 rejected | None | POST /rides with totalSeats: 5 | 400 Bad Request | Boundary | P0 |
| RP-15 | Missing origin rejected | None | POST /rides without originName | 400 Bad Request | Required field | P0 |
| RP-16 | Missing destination rejected | None | POST /rides without destinationName | 400 Bad Request | Required field | P0 |
| RP-17 | Missing vehicle rejected | None | POST /rides without vehicleId | 400 Bad Request | Required field | P0 |
| RP-18 | availableSeats equals totalSeats on creation | Ride created | GET /rides/{id} | availableSeats = totalSeats | Seat tracking | P0 |
| RP-19 | Ride immutable after publish — origin cannot change | PUBLISHED ride | PATCH /rides/{id} with new originName | 400 or 403; immutability enforced | Trust with seekers | P0 |
| RP-20 | Departure time in HH:MM format | None | POST /rides with departureTime: "09:00" | 201 Created | Time validity | P1 |
| RP-21 | Notes field optional and stored | None | POST /rides with notes: "No smoking" | 201 Created; notes stored and returned | UX | P2 |
| RP-22 | Notes visible to seeker in search results | Ride with notes | GET /rides/search | notes field present in response | Communication | P2 |
| RP-23 | Commute template creates recurring ride | DRIVER_VERIFIED | POST /commute-templates with weekdays [1,2,3,4,5] | 201 Created; template stored | Recurring rides | P1 |
| RP-24 | Ride created from template appears in search | Template active | GET /rides/search for template date | Ride visible | Template-to-ride flow | P1 |
| RP-25 | Giver cannot publish ride for another giver's vehicle | None | POST /rides with another giver's vehicleId | 403 or 404 | Security | P0 |
| RP-26 | Ride cancelled by giver returns to offering ride | PUBLISHED ride cancelled | PATCH /rides/{id}/cancel → POST new ride | 200 cancel; then 201 new ride | Lifecycle reset | P1 |
| RP-27 | COMPLETED ride allows new ride creation | COMPLETED ride exists | POST /rides | 201 Created | Post-ride reuse | P1 |
| RP-28 | CANCELLED ride allows new ride creation | CANCELLED ride exists | POST /rides | 201 Created | Post-cancel reuse | P1 |
| RP-29 | Regression — ride still published after page refresh | Just published | Refresh, GET /rides | Ride still PUBLISHED | State persistence | P0 |
| RP-30 | Boundary — departure time "00:00" (midnight) accepted | None | POST /rides with departureTime: "00:00" | 201 Created | Edge time | P2 |

---

## UAT Acceptance Criteria

- [ ] A verified giver can create and publish a ride in under 3 minutes
- [ ] Attempting a second ride while one is active shows a clear "complete or cancel existing ride" message
- [ ] Published ride is visible in search within 5 seconds
- [ ] Ride creation form defaults to today's date in IST
- [ ] Unverified users see a "Complete verification first" prompt, not a generic 403

---

## Missing Business Rules / Risks

1. **No origin/destination geocoding validation** — giver can enter any text; no map verification
2. **No route sanity check** — origin and destination can be identical or 1m apart
3. **No departure time in the past check** — a ride with today's date but a past time (e.g., 08:00 when it's 10:00 IST) is currently allowed
4. **No intermediate stops** — platform does not support multi-stop rides; seekers cannot join at waypoints
5. **Vehicle becomes unavailable mid-ride** — no mechanic to handle vehicle switch after publishing
6. **Women-only ride flag not implemented** — schema may have field but UI/filter not built
7. **No maximum advance booking window** — giver can create rides months in advance
8. **Draft rides not cleaned up** — abandoned DRAFT rides accumulate in DB indefinitely
