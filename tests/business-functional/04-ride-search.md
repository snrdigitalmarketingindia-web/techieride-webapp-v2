# 04 — Ride Search

**Platform:** TechieRide v2 · **Module:** Ride Search & Discovery  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Ride search is the primary discovery mechanism. Rides are matched by haversine distance from origin and destination coordinates within a configurable radius. Searches are date-specific. Only `PUBLISHED` rides appear in results — not DRAFT, ONGOING, COMPLETED, or CANCELLED. The Find Ride page auto-loads today's results in IST on mount.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| RS-01 | Happy path — search returns PUBLISHED rides for today | PUBLISHED ride exists for today | GET /rides/search?date=today&originLat=...&destinationLat=... | 200 OK; ride in results | Core discovery | P0 |
| RS-02 | Search auto-loads on page mount with today's date | Find Ride page opened | Navigate to /rides/search | Results load without user action; date = today IST | UX | P0 |
| RS-03 | DRAFT rides not visible in search | DRAFT ride exists | GET /rides/search | DRAFT ride absent from results | State filtering | P0 |
| RS-04 | COMPLETED rides not visible | COMPLETED ride exists | GET /rides/search | COMPLETED ride absent | State filtering | P0 |
| RS-05 | CANCELLED rides not visible | CANCELLED ride exists | GET /rides/search | CANCELLED ride absent | State filtering | P0 |
| RS-06 | ONGOING rides not visible | ONGOING ride exists | GET /rides/search | ONGOING ride absent (no new requests possible) | State filtering | P0 |
| RS-07 | Full ride (0 seats) not visible | PUBLISHED ride with 0 availableSeats | GET /rides/search | Full ride absent | Seat filtering | P0 |
| RS-08 | Ride with 1 seat remaining visible | PUBLISHED ride with 1 availableSeats | GET /rides/search | Ride visible | Seat filtering | P0 |
| RS-09 | Search by past date returns no rides | No past rides scheduled | GET /rides/search?date=yesterday | 200 OK; empty results | Date filtering | P1 |
| RS-10 | Search by future date returns scheduled rides | Ride scheduled for future date | GET /rides/search?date=future | Ride visible | Date filtering | P0 |
| RS-11 | Radius filtering — ride 4km away visible (within 5km radius) | Ride at 4km | GET /rides/search?radiusMeters=5000 | Ride in results | Geo matching | P0 |
| RS-12 | Radius filtering — ride 8km away hidden (within 5km radius) | Ride at 8km | GET /rides/search?radiusMeters=5000 | Ride not in results | Geo accuracy | P0 |
| RS-13 | Giver does not see own ride in search results | Giver searches | GET /rides/search as giver | Own ride absent | Prevents self-booking | P0 |
| RS-14 | Seeker with EMPLOYEE_VERIFIED can search | Status = EMPLOYEE_VERIFIED | GET /rides/search | 200 OK | Core seeker flow | P0 |
| RS-15 | EMAIL_VERIFICATION_PENDING user blocked from search | Status = EMAIL_VERIFICATION_PENDING | GET /rides/search | 401 or 403 | Access gate | P0 |
| RS-16 | Unauthenticated user cannot search | No token | GET /rides/search | 401 Unauthorized | Auth gate | P0 |
| RS-17 | Search results include giver name (not anonymous) | PUBLISHED ride | GET /rides/search | rideGiver.user.fullName present | Trust transparency | P1 |
| RS-18 | Phone number NOT in search results (pre-confirmation) | PUBLISHED ride | GET /rides/search | No phone field in giver data | Privacy | P0 |
| RS-19 | Search results include seat count | PUBLISHED ride | GET /rides/search | availableSeats visible | Seeker decision-making | P1 |
| RS-20 | Search results include departure time and date | PUBLISHED ride | GET /rides/search | departureTime and departureDate present | Seeker decision-making | P1 |
| RS-21 | Search results include vehicle info | PUBLISHED ride | GET /rides/search | vehicle.make + vehicle.model present | Trust context | P1 |
| RS-22 | Search returns multiple rides sorted by time | 3 rides at different times | GET /rides/search | Results sorted ascending by departure time | UX | P1 |
| RS-23 | Empty search result shows helpful message | No rides for date | GET /rides/search | 200 OK; empty array; UI shows "No rides found" | UX | P1 |
| RS-24 | Search without date parameter uses today | GET /rides/search without date | API handles missing date | Uses today as default | Date defaulting | P1 |
| RS-25 | Search with invalid coordinates returns 400 | None | GET /rides/search?originLat=999 | 400 Bad Request | Input validation | P1 |
| RS-26 | Pagination — 20+ rides paginated | 25 rides published | GET /rides/search?page=1&limit=20 | First 20 returned; hasMore=true | Scalability | P2 |
| RS-27 | Multiple concurrent search requests do not interfere | Two users searching simultaneously | Concurrent GET /rides/search | Each gets correct independent results | Concurrency | P1 |
| RS-28 | Search visible immediately after publish (no indexing delay) | Ride just published | Search within 5s of publish | Ride in results | Real-time visibility | P0 |
| RS-29 | Regression — search results consistent after page refresh | Results loaded | Refresh browser | Same results returned | Caching/state | P0 |
| RS-30 | Regression — search works after logout and re-login | Logged out | Login → search | Same results | Session independence | P0 |

---

## UAT Acceptance Criteria

- [ ] Seeker finds rides without entering anything — Find Ride page loads today's rides automatically
- [ ] Giver's own rides never appear in their own search
- [ ] No phone number visible until after ride is confirmed
- [ ] Search results update within 5 seconds of a ride being published
- [ ] Full rides (0 seats) disappear from search immediately after last seat is taken

---

## Missing Business Rules / Risks

1. **No route-match search** — search is point-to-point only; a seeker at an intermediate location cannot find rides
2. **No time-of-day filter** — seekers cannot filter "rides after 8 AM only"
3. **No gender filter** — women-only ride filter not implemented (rides not tagged yet)
4. **Search coordinates are hardcoded** — origin/destination are lat/lng numbers, not addresses; no geocoding
5. **No "book if available" waitlist** — full rides simply disappear; no queuing mechanism
6. **Default radius undefined** — no documented default if radiusMeters not provided
7. **Past-time rides show today** — a ride at 07:00 still shows up in a 14:00 search; should be filtered
8. **No sorting preference** — only one sort order; seekers cannot sort by distance or time
