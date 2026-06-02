# 11 — Live Tracking

**Platform:** TechieRide v2 · **Module:** Real-Time GPS Tracking  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Live tracking enables seekers to see the giver's real-time location during an ONGOING ride via WebSocket. The giver shares their GPS coordinates; seekers and optionally admins subscribe. This is a safety-critical feature — it enables pickup confirmation and incident detection. Tracking stops when the ride is COMPLETED or CANCELLED.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| TRK-01 | Giver starts location sharing on ONGOING ride | Ride ONGOING | Navigate to Share Location; WebSocket connects | Connection established; giver location emitted | Core tracking flow | P0 |
| TRK-02 | Seeker receives giver location on live tracking page | Giver sharing location | Seeker navigates to /tracking/{rideId} | Giver's current location displayed | Safety | P0 |
| TRK-03 | Location updates in real time (≤ 5s delay) | Giver moving | Giver location changes | Seeker sees updated location within 5s | Tracking freshness | P0 |
| TRK-04 | Multiple seekers on same ride receive updates simultaneously | 2 seekers CONFIRMED | Both open tracking page | Both receive same location updates | Multi-subscriber | P0 |
| TRK-05 | Giver disconnects — last known location displayed | Giver closes app | Seeker tracking page | "Last seen at HH:MM" + last coordinates | Disconnection UX | P0 |
| TRK-06 | Giver reconnects — live updates resume | Giver reconnects | Seeker tracking page | Live marker updates restart | Reconnection | P0 |
| TRK-07 | Seeker disconnects and reconnects — gets current location | Seeker disconnects | Seeker reopens tracking | Current giver location fetched | Seeker reconnection | P0 |
| TRK-08 | GPS coordinates validated (not 0,0 null island) | Giver sends 0,0 | Receive location event | Coordinate ignored or flagged | Data validation | P1 |
| TRK-09 | GPS coordinates validated (not out-of-India range) | Giver sends lat=99, lng=200 | Receive location event | Invalid coordinates rejected/flagged | Data validation | P1 |
| TRK-10 | Admin can view active ride location | Ride ONGOING | Admin views /admin/rides/{id} | Giver location visible to admin | Admin monitoring | P1 |
| TRK-11 | Tracking not accessible for COMPLETED ride | Ride COMPLETED | Navigate to /tracking/{rideId} | 404 or redirect; tracking ended | Lifecycle gate | P0 |
| TRK-12 | Tracking not accessible for CANCELLED ride | Ride CANCELLED | Navigate to /tracking/{rideId} | 404 or redirect | Lifecycle gate | P0 |
| TRK-13 | Tracking not accessible for PUBLISHED ride | Ride PUBLISHED | Navigate to /tracking/{rideId} | 404 or redirect; ride not started | State gate | P0 |
| TRK-14 | Unauthenticated user cannot access tracking | No token | WebSocket connect to tracking | 401 / connection refused | Security | P0 |
| TRK-15 | Non-participant cannot access tracking | User not on ride | Navigate to /tracking/{rideId} | 403 Forbidden | Authorization | P0 |
| TRK-16 | Share Location button visible only during ONGOING | Giver My Rides | Check for 📡 Share Location button | Visible only when ONGOING | UX | P1 |
| TRK-17 | Track Live button visible to seeker only during ONGOING | Seeker My Rides | Check for 📍 Track Live button | Visible only when ONGOING | UX | P1 |
| TRK-18 | Location stops broadcasting after ride COMPLETED | Giver completes ride | WebSocket event | Tracking connection closed; final location sent | Lifecycle cleanup | P0 |
| TRK-19 | Network outage during tracking — graceful degradation | Seeker loses internet | Mobile goes offline | "Connection lost" message; no crash | Resilience | P0 |
| TRK-20 | Route ETA estimation displayed | Giver moving toward destination | Tracking page | ETA shown based on current speed (if implemented) | UX enhancement | P2 |
| TRK-21 | Tracking map loads on mobile | Seeker on mobile | Open tracking on mobile | Map renders correctly in mobile viewport | Mobile UX | P0 |
| TRK-22 | Multiple rides tracked independently | 2 givers on separate rides | Both tracked simultaneously | No location data cross-contamination | Data isolation | P0 |
| TRK-23 | Location history not exposed via API | Ride COMPLETED | GET /tracking/{rideId}/history | 404 or empty (no stored history) | Privacy | P1 |
| TRK-24 | Regression — tracking resumes after browser tab switch | Seeker switches tabs | Return to tracking tab | Location still updating | Browser state | P1 |
| TRK-25 | GPS loss during ride — last known shown | Giver loses GPS (airplane mode) | Seeker tracking page | Last known location with timestamp | GPS failure UX | P0 |

---

## UAT Acceptance Criteria

- [ ] Seeker can see giver's location within 5 seconds of opening the tracking page
- [ ] If giver disconnects, tracking shows "Last seen" timestamp; no blank screen
- [ ] Tracking page only accessible to confirmed participants of that specific ride
- [ ] Tracking ends cleanly when ride is completed — no orphan WebSocket connections
- [ ] Works on mobile browser (most seekers will track on phones)

---

## Missing Business Rules / Risks

1. **No route deviation detection** — if giver takes a different route, no alert is raised; major safety gap
2. **No location history stored** — cannot replay the journey for incident investigation
3. **No ETA calculation** — seeker has no idea when giver will arrive
4. **WebSocket scalability not tested** — at 1000 concurrent rides, WebSocket server may be overwhelmed
5. **No battery-saver mode** — continuous GPS sharing drains giver's phone; no adaptive update frequency
6. **Admin tracking delayed** — admin may need near-real-time tracking during SOS; WebSocket subscription for admin not confirmed
7. **No map provider configured** — tracking likely shows coordinates without a map (Google Maps/Mapbox API key needed for production)
8. **Tracking accessible by ride ID guessing** — if ride IDs are sequential or guessable, non-participants could monitor rides
