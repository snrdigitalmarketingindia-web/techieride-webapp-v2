# 17 — Real-World Operational Scenarios

**Platform:** TechieRide v2 · **Module:** Operational Edge Cases  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

This document covers 16 real-world operational failures that will inevitably occur on a live carpooling platform. For each scenario: current system behavior is described, required platform response is defined, missing feature gaps are identified, and test cases are generated.

---

## Scenario 1: Ride Giver Late Arrival (>15 min)

**Business Impact:** Seeker misses pickup; may miss office; trust erosion  
**Current System Behavior:** No detection. No notification. No SLA.  
**Required Workflow:** Giver should be able to notify seekers of delay; seekers should receive notification

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-01-01 | Giver sends delay notification to all confirmed seekers | All seekers receive "Giver is running late" notification | P1 |
| OPS-01-02 | Seeker can see giver's real-time location to estimate arrival | Live tracking shows giver position | P1 |
| OPS-01-03 | If giver is 30+ min late and no notification, SOS option appears for seeker | Seeker SOS trigger available | P1 |
| OPS-01-04 | Late arrival recorded in trust score | Trust score penalised for repeated late arrivals | P2 |

**Missing Features:** Delay notification feature, automatic detection via GPS, SLA enforcement

---

## Scenario 2: Ride Giver No-Show (Never Starts Ride)

**Business Impact:** All seekers stranded; potentially Miss work; major trust failure  
**Current System Behavior:** Ride stays PUBLISHED. No timeout. Seekers see no change.  
**Required Workflow:** Auto-cancel after N minutes past departure time; notify all seekers; penalise giver

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-02-01 | Ride not started 30 min after departure time → admin flagged | Admin notification: "Ride overdue" | P0 |
| OPS-02-02 | Auto-cancel after configured timeout (e.g., 45 min past departure) | Ride → CANCELLED; seekers notified | P1 |
| OPS-02-03 | Giver no-show recorded in trust score | Trust score deduction applied | P0 |
| OPS-02-04 | Seekers receive "Giver did not show — ride cancelled" notification | Notification delivered | P0 |
| OPS-02-05 | Seekers automatically freed to request other rides | No CONFIRMED lock on any ride | P0 |

**Missing Features:** Departure timeout job, auto-cancel, no-show penalty, seeker re-search redirect

---

## Scenario 3: Ride Seeker No-Show

**Business Impact:** Giver loses eco points for that seat; seat wasted  
**Current System Behavior:** Giver manually marks NO_SHOW. Call button removed. No further action.  
**Required Workflow:** NO_SHOW recorded; giver ECO points for that seat TBD; seeker's trust score affected

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-03-01 | Giver marks seeker NO_SHOW → boarding status updates | boardingStatus = NO_SHOW | P0 |
| OPS-03-02 | NO_SHOW seeker loses ECO points for that ride | No ECO credit for missed ride | P1 |
| OPS-03-03 | Repeated NO_SHOW (3+ times) triggers trust score warning | Trust score threshold alert | P1 |
| OPS-03-04 | Giver receives ECO points for their own effort regardless of NO_SHOW | Giver ECO points credited | P1 |

**Missing Features:** Auto-trust-score update on NO_SHOW, seeker NO_SHOW notification to admin

---

## Scenario 4: Route Deviation

**Business Impact:** Seeker taken on wrong route; safety risk; potential fraud  
**Current System Behavior:** No detection. No alert. No route validation.  
**Required Workflow:** GPS breadcrumb vs. planned route comparison; alert on deviation > threshold

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-04-01 | Giver deviates 2km from planned route → no alert (minor deviation) | No action | P2 |
| OPS-04-02 | Giver deviates 10km from planned route → seeker SOS option highlighted | "Route deviation detected — you can trigger SOS" UI prompt | P0 |
| OPS-04-03 | Admin notified on major deviation during ONGOING ride | Admin alert: "Ride {ID} has deviated {X}km from planned route" | P1 |
| OPS-04-04 | Seeker can share their location independently during a deviation | SOS works independently of giver's GPS | P0 |

**Missing Features:** Route deviation detection, GPS breadcrumb storage, deviation threshold config

---

## Scenario 5: Vehicle Breakdown Mid-Ride

**Business Impact:** All passengers stranded; ride incomplete; ECO points ambiguous  
**Current System Behavior:** No INTERRUPTED ride state. Ride stays ONGOING indefinitely.  
**Required Workflow:** Giver triggers "breakdown" status; ride paused; seekers notified; ECO points partial

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-05-01 | Giver can report vehicle breakdown | PATCH /rides/{id}/breakdown or equivalent | 200 OK; all participants notified | P1 |
| OPS-05-02 | Ride enters INTERRUPTED state | New ride status: INTERRUPTED | P1 |
| OPS-05-03 | All seekers notified of breakdown immediately | Notification: "Vehicle breakdown — giver will update shortly" | P0 |
| OPS-05-04 | Admin notified of breakdown | Admin alert | P1 |
| OPS-05-05 | ECO points awarded proportionally for distance completed | Partial ECO credit | P2 |
| OPS-05-06 | Admin can force-complete a INTERRUPTED ride | Admin action | P1 |

**Missing Features:** INTERRUPTED ride state, breakdown reporting, partial ECO points, admin force-complete

---

## Scenario 6: Emergency SOS Trigger

**Business Impact:** Life-threatening emergency; must reach admin and emergency services  
**Current System Behavior:** SOS creates a DB record and notifies admin. No emergency dial integration.

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-06-01 | SOS triggered → admin notified within 30s | Admin notification with GPS + ride context | P0 |
| OPS-06-02 | SOS triggers emergency contact notification | Emergency contact receives SMS/email | P1 |
| OPS-06-03 | SOS GPS location shareable link generated | Google Maps link in notification | P1 |
| OPS-06-04 | Admin can call giver and seeker from SOS dashboard | Call buttons in admin SOS view | P0 |

**Missing Features:** Emergency services auto-dial, push notification for admin, emergency contact feature

---

## Scenario 7: Accident Reporting

**Business Impact:** Insurance, legal liability, platform credibility  
**Current System Behavior:** No accident reporting feature. SOS is the only mechanism.

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-07-01 | User can report accident via SOS + "Accident" category | Accident type attached to SOS | P1 |
| OPS-07-02 | Admin creates incident report from accident SOS | Incident report with ride ID, users, GPS, time | P1 |
| OPS-07-03 | Accident ride data frozen (cannot be modified/deleted) | Ride data locked for legal preservation | P1 |

**Missing Features:** Accident category on SOS, incident report generation, data freeze

---

## Scenario 8: GPS Loss During Tracking

**Business Impact:** Seeker cannot track giver; safety concern  
**Current System Behavior:** Last known location shown; "Last seen at HH:MM" fallback

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-08-01 | GPS lost → last known location displayed with timestamp | "Last seen at HH:MM" visible | P0 |
| OPS-08-02 | GPS lost > 10 min → seeker receives "GPS lost" notification | Notification to seeker | P1 |
| OPS-08-03 | GPS restores → live tracking resumes automatically | Tracking resumes; no user action needed | P0 |
| OPS-08-04 | Admin sees GPS-loss event in ride monitoring | Admin alert for extended GPS loss | P1 |

**Missing Features:** GPS loss notification, admin GPS-loss alert, auto-resume detection

---

## Scenario 9: Network Outage

**Business Impact:** Users cannot book; active riders lose tracking; potential safety issue

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-09-01 | Seeker loses internet during ride search — graceful error | "Check your connection" message; no crash | P0 |
| OPS-09-02 | Giver loses internet during location sharing — last location cached | Last known location shown to seekers | P0 |
| OPS-09-03 | API server outage — 503 shown to users, not 500 crash | 503 Service Unavailable with retry guidance | P0 |
| OPS-09-04 | WebSocket reconnects automatically after network restore | Connection re-established; tracking resumes | P0 |

---

## Scenario 10: Weather Disruption

**Business Impact:** Giver needs to cancel ride due to weather; all seekers need notification

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-10-01 | Giver cancels PUBLISHED ride with reason "Weather" | All PENDING seekers notified with reason | P0 |
| OPS-10-02 | Giver cancels PUBLISHED ride with CONFIRMED seekers | 403; cannot cancel; admin exception needed | P0 |
| OPS-10-03 | Admin cancels confirmed ride on giver's behalf | Admin override; all seekers notified | P1 |
| OPS-10-04 | Cancelled seekers can immediately search for alternatives | No lockout after cancellation | P0 |

---

## Scenario 11: Ride Giver Suspended Mid-Active-Ride

**Business Impact:** ONGOING ride with seekers; giver suspended during journey

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-11-01 | Giver suspended during ONGOING ride → ride continues | Ride remains ONGOING; seekers not affected mid-journey | P0 |
| OPS-11-02 | Giver suspended → cannot start new rides | PUBLISHED rides cancelled; no new rides | P0 |
| OPS-11-03 | Admin notified when suspending giver with active ride | Warning: "This giver has an active ride" | P1 |
| OPS-11-04 | All confirmed seekers notified of giver suspension | Notification: "Your upcoming ride has been affected" | P1 |

---

## Scenario 12: Employee Leaves Company

**Business Impact:** Former employee retains platform access; security and trust risk

| TC-ID | Test Case | Expected | Priority |
|---|---|---|---|
| OPS-12-01 | Email domain becomes invalid → account flagged | No automatic detection currently (gap) | P0 |
| OPS-12-02 | Admin manually deactivates departed employee | User SUSPENDED/DEACTIVATED | P0 |
| OPS-12-03 | Departed employee's PUBLISHED rides auto-cancelled on deactivation | Active rides cancelled; seekers notified | P1 |
| OPS-12-04 | Re-employment: new verification required before re-access | Cannot reactivate without fresh doc upload | P1 |

**Missing Features:** Domain validation job, HR integration, automated offboarding

---

## Scenario 13–16: Verification Expiry, Multiple Complaints, Policy Violations, Repeated Offences

| TC-ID | Scenario | Test Case | Expected | Priority |
|---|---|---|---|---|
| OPS-13-01 | DL expires | System flags expired DL | Admin notified; giver blocked from new rides | P1 |
| OPS-13-02 | RC expires | System flags expired RC | giver.rcVerified → false; blocked from publish | P1 |
| OPS-14-01 | 3 complaints against same user | Complaint counter reaches threshold | Auto-flag for admin review | P0 |
| OPS-14-02 | Admin reviews complaints | Admin sees complaint history | All complaints with context visible | P0 |
| OPS-14-03 | 5 complaints → auto-suspend | Threshold reached | Account auto-suspended; admin notified | P1 |
| OPS-15-01 | Giver repeatedly cancels confirmed rides | 3+ cancellations | Trust score deduction; admin flagged | P0 |
| OPS-15-02 | Seeker repeatedly no-shows | 3+ no-shows | Trust score threshold; warning notification | P0 |
| OPS-16-01 | Repeated policy violations → permanent ban | 3 suspensions | Account permanently banned; cannot re-register same email | P1 |
| OPS-16-02 | Banned user attempts registration with new email | None | If same phone detected → blocked | P1 |

---

## Cross-Cutting Missing Features

1. **No INTERRUPTED ride state** — vehicle breakdown, giver unwell mid-ride have no workflow
2. **No departure timeout job** — rides that never start stay PUBLISHED indefinitely
3. **No complaint system** — no in-platform way for users to report each other; SOS only
4. **No HR/corporate directory integration** — no automatic offboarding for ex-employees
5. **No document expiry tracking** — DL/RC expiry dates not stored or monitored
6. **No admin escalation chain** — single admin; no on-call rotation or backup
7. **No weather/external data integration** — giver manually manages weather cancellations
8. **No ride insurance integration** — accident scenario has no liability management
