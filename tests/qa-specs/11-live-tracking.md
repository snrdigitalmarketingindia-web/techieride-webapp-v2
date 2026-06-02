# TechieRide QA Spec — 11: Live Tracking

**Module:** Real-Time GPS Location Tracking  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Live tracking enables confirmed seekers to see the giver's real-time GPS location during an ONGOING ride. The giver's device shares location via WebSocket (or polling fallback). Multiple seekers can connect simultaneously to the same ride's location feed. If the giver disconnects, the last known location is displayed. Tracking automatically stops when the ride is COMPLETED or CANCELLED. GPS coordinates must be validated for sanity (not 0,0 or outside India).

---

## Technical Assumptions

| Parameter | Value |
|-----------|-------|
| Update frequency | Every 5–10 seconds |
| Transport | WebSocket (primary), HTTPS polling (fallback) |
| Coordinate precision | 6 decimal places (1.1 m accuracy) |
| Valid latitude range (India) | 8.0 to 37.6 |
| Valid longitude range (India) | 68.0 to 97.4 |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| TRK-001 | Giver starts location sharing when ride begins | Ride ONGOING; giver grants location permission | Giver taps "Start Ride"; app begins sending location | WebSocket connection established; location updates emitted every ~5 seconds | Core safety feature | P0 |
| TRK-002 | Seeker sees live location | Booking CONFIRMED; ride ONGOING; giver sharing location | Seeker opens My Bookings → active ride → Track | Map shown with giver's live position; updates in near-real-time | P0 |
| TRK-003 | Location updates every N seconds | Giver is moving | Monitor location events | Coordinates update at configured interval (5–10 seconds); not static | P0 |
| TRK-004 | Multiple seekers connected simultaneously | 3 confirmed seekers; 1 giver sharing location | All 3 seekers open tracking screen | All 3 see the same current giver location; server broadcasts to all connections | P0 |
| TRK-005 | Giver disconnects (app backgrounded) | Giver sends location; then closes app | Seeker's tracking screen | Last known location displayed with "Last updated X seconds ago" indicator | P1 |
| TRK-006 | Giver reconnects after disconnect | Giver closed app; reopens | Giver's location resumes broadcasting | Seekers receive new location updates; "Last updated" indicator cleared | P1 |
| TRK-007 | Seeker reconnects after disconnect | Seeker's WebSocket dropped; seeker refreshes | Seeker opens tracking screen | Gets current giver location immediately upon reconnect; no blank/stale screen | P1 |
| TRK-008 | GPS coordinates validated — not (0,0) | GPS chip not ready; returns 0,0 | Giver's device sends 0,0 | Server rejects 0,0 coordinate; last valid location retained; not displayed to seeker | Data quality | P0 |
| TRK-009 | GPS coordinates validated — within India bounding box | — | Send coordinates outside India range (e.g., lat=1.0) | Server rejects; logs anomaly; last valid location retained | P1 |
| TRK-010 | ETA calculation shown | Giver's current location + destination known | Seeker opens tracking | ETA shown: "Estimated arrival in ~12 minutes" (based on distance + average speed) | P1 |
| TRK-011 | ETA updates as giver moves | Giver approaching destination | Monitor ETA field over 2 minutes | ETA decreases as giver gets closer | P2 |
| TRK-012 | Admin can view active ride location | Admin logged in; ride ONGOING | Admin navigates to /admin/rides/active → opens ride | Admin sees live map with giver's location | Safety monitoring | P1 |
| TRK-013 | Tracking stops on ride completion | Giver marks ride COMPLETED | Seeker's tracking screen | Tracking stops; map shows "Ride Completed" instead of live location; WebSocket connection closed | P0 |
| TRK-014 | Tracking stops on ride cancellation | Admin cancels ride mid-progress | Seekers' tracking screens | All WebSocket connections closed; message: "This ride has been cancelled." | P0 |
| TRK-015 | Tracking not available before ride starts | Ride status = PUBLISHED; not yet ONGOING | Seeker attempts to open tracking | Error: "Tracking is only available when the ride is active." | P0 |
| TRK-016 | Tracking not available after ride completes | Ride status = COMPLETED | Seeker attempts to open tracking | Message: "This ride has ended." No live location shown | P0 |
| TRK-017 | Location accuracy indicator shown | Giver in open area (high accuracy) vs indoor/tunnel (low) | Monitor accuracy field | Accuracy circle on map reflects GPS accuracy (e.g., 5m vs 50m radius) | P2 |
| TRK-018 | Only confirmed seekers can access tracking | Seeker in PENDING/REJECTED state attempts to open tracking | GET /rides/:id/tracking with PENDING seeker's token | 403: "Access to tracking requires a confirmed booking." | Security / P0 |
| TRK-019 | Tracking link not accessible to unauthenticated users | — | GET /rides/:id/tracking without auth | 401: "Authentication required." | Security / P0 |
| TRK-020 | Giver does not see their own tracking page (irrelevant) | BOTH-role giver | Giver opens My Bookings as seeker for their own ride | Own ride excluded from seeker view; no tracking page for own ride | P1 |
| TRK-021 | WebSocket reconnect handled gracefully | Seeker's connection drops mid-ride | WebSocket drops; auto-reconnect | App reconnects automatically within 5 seconds; resumes receiving updates | P1 |
| TRK-022 | Location history stored for audit | Giver moves for 30 minutes | After ride completes, admin queries location log | Location events stored with timestamps; queryable by rideId | Compliance | P2 |
| TRK-023 | High-load: 50 concurrent rides with tracking | 50 rides ONGOING simultaneously | Each with 3 seekers connected (150 WebSocket connections) | All 150 connections receive updates within SLA; no memory leak or connection drop | Performance | P1 |
| TRK-024 | Tracking screen shows giver name and vehicle | Seeker opens tracking | — | Giver's name, vehicle make/model/color shown on tracking screen (helps seeker identify car) | P1 |
| TRK-025 | GPS permission denied — graceful handling | Giver denies location permission | Giver starts ride without GPS | Message to giver: "Location permission is required for live tracking. Seekers will not see your location." App does not crash | P1 |

---

## Missing Business Rules / Risks

1. **Battery drain on giver's device not addressed.** Continuous GPS broadcasting drains battery. The app should use background location efficiently (significant location changes API on iOS, fused location on Android) with user guidance.
2. **Location data retention policy not defined.** How long are location history records kept? DPDP Act compliance requires a retention policy.
3. **Geofencing not implemented.** The system doesn't alert when giver deviates significantly from the registered route (route deviation scenario). This is a safety feature gap.
4. **Tunnel / underground parking tracking failure.** HITEC City and Gachibowli have underground parking areas. The system should handle intermittent GPS loss gracefully without showing stale data to seekers as "live."
5. **ETA calculation algorithm not specified.** Is it straight-line distance / average speed? Google Maps API? Real-time traffic? Straight-line ETA in Hyderabad traffic is wildly inaccurate.
6. **Data cost to giver not addressed.** Continuous WebSocket + GPS data upload uses mobile data. On 2G/3G networks (common in Hyderabad outskirts), this may fail or be expensive.
7. **Location spoofing not prevented.** A giver could use a fake GPS app to spoof their location. No server-side speed plausibility check (e.g., reject if movement > 200 km/h).
8. **Fellow passenger location sharing.** Should seekers be able to see each other's locations for coordination at the pickup point? Not defined.
