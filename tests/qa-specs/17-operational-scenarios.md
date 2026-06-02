# TechieRide QA Spec — 17: Operational Scenarios

**Module:** Real-World Operational Edge Cases  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

This document covers 16 real-world operational scenarios that arise during the lifecycle of IT employee carpooling in Hyderabad. For each scenario, the business impact, current system behavior, required workflow, admin actions, notifications, and test cases are documented. A "Missing Feature Gap" section identifies what the platform does not yet handle.

---

## Scenario 1: Ride Giver Late Arrival (> 15 Minutes)

**Description:** The giver is stuck in traffic and arrives at the pickup point more than 15 minutes after the agreed departure time.

**Business Impact:** Seekers are waiting, possibly causing them to miss work. Trust in the platform erodes if no communication mechanism exists.

**Current System Behavior:** No automated detection. Giver must manually communicate via phone (after confirmation). Seekers have no in-app visibility of the delay.

**Required Workflow:**
1. Giver updates an "I'm running late" status in the app with a delay duration.
2. Seekers receive a push notification: "[GiverName] is running ~15 min late."
3. If giver hasn't started the ride 30 minutes after scheduled departure, the system sends admin an alert.

**Admin Actions:** Monitor rides that are > 30 min overdue. Contact giver. If no response, escalate to cancellation.

**Notifications Required:**
- To seekers: Delay notification with updated ETA.
- To admin: Alert if ride hasn't started 30 min after scheduled time.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-001 | Giver marks delay | Giver taps "I'm running late" → enters 15 min | Seekers notified: "Giver is 15 min late." | P1 |
| OPS-002 | Admin alerted for overdue ride | Ride not started 30 min after scheduled | Admin dashboard flags ride; admin receives notification | P1 |
| OPS-003 | Seeker can cancel while waiting | Ride not yet started; seeker waiting | Seeker cancels request | Request → CANCELLED; allowed pre-ONGOING | P0 |

**Missing Feature Gap:** No "running late" status exists in the current system. Seekers have zero visibility unless the giver calls them.

---

## Scenario 2: Ride Giver No-Show (Never Starts Ride)

**Description:** The giver never opens the app to start the ride. Confirmed seekers waited but the giver never appeared or responded.

**Business Impact:** High trust damage. Confirmed seekers had no fallback. Giver should face consequences.

**Current System Behavior:** Ride remains PUBLISHED/CONFIRMED indefinitely. No auto-cancellation.

**Required Workflow:**
1. System detects ride departure time has passed + 60 minutes with no ONGOING transition.
2. Auto-cancel ride; notify all confirmed passengers.
3. Giver's trust score decremented (see file 18).
4. Repeat no-shows → account warning → suspension.

**Admin Actions:** Review no-show reports. Apply trust score penalty. Issue warning to giver.

**Notifications Required:**
- To seekers: "Your ride on [Date] was cancelled — the giver did not show. We're sorry for the inconvenience."
- To giver: "Your ride was auto-cancelled due to no activity."

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-004 | Auto-cancel after 60 min of no activity | Scheduled departure + 60 min passes | Ride → CANCELLED; seekers notified | P0 |
| OPS-005 | Giver trust score deducted | Ride auto-cancelled due to no-show | Giver's trust score decremented per 18-trust-score.md formula | P1 |
| OPS-006 | Third no-show triggers warning | Giver has 3 auto-cancellations | Admin notified; giver receives formal warning | P1 |

**Missing Feature Gap:** No auto-cancellation job exists. No trust score deduction for giver no-show. Seekers currently have no recourse.

---

## Scenario 3: Ride Seeker No-Show (Marked NO_SHOW by Giver)

**Description:** The giver arrived at the pickup point but the seeker was absent. Giver marks them NO_SHOW.

**Business Impact:** Giver wasted time at pickup. The empty seat could have been offered to another seeker.

**Current System Behavior:** Giver marks NO_SHOW → seeker's boarding status = NO_SHOW → call button hidden. No further automated action.

**Required Workflow:**
1. Giver marks NO_SHOW.
2. System records noShowAt timestamp.
3. Seeker's trust score decremented.
4. System notifies seeker they were marked NO_SHOW.
5. Freed seat logic: seat count NOT restored (confirmed seat is consumed — no late replacement).

**Admin Actions:** Monitor users with repeated NO_SHOW patterns. Intervene after 3+ no-shows.

**Notifications Required:**
- To seeker: "You were marked as No Show on the [Date] ride. This may affect your trust score."

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-007 | NO_SHOW recorded with timestamp | Giver marks seeker NO_SHOW | noShowAt populated; status = NO_SHOW | P0 |
| OPS-008 | Seeker trust score decremented | NO_SHOW marked | Trust score -10 pts (per spec in file 18) | P1 |
| OPS-009 | Seeker notified of NO_SHOW | Giver marks NO_SHOW | Seeker push + email notification | P1 |
| OPS-010 | Repeated NO_SHOW — 3rd incident triggers warning | Seeker has 3 NO_SHOW records | Admin notified; seeker warned | P1 |

**Missing Feature Gap:** Trust score deduction for seeker NO_SHOW not automated. No repeat-offender detection.

---

## Scenario 4: Route Deviation

**Description:** The giver takes a different route than the one shown to seekers during booking — whether due to traffic, GPS error, or deliberate deviation.

**Business Impact:** Seekers feel unsafe. A significant deviation (> 2 km off route) is a safety concern.

**Current System Behavior:** No route validation or deviation detection. The registered route is only shown at booking — there's no real-time route comparison.

**Required Workflow:**
1. Track giver's real-time GPS path.
2. Compare against registered route polyline.
3. If deviation > 2 km for > 5 minutes, trigger alert to seekers.
4. Seekers can escalate to SOS.

**Admin Actions:** Review deviation logs. Contact giver if deviation is unexplained. Initiate SOS protocol if giver unresponsive.

**Notifications Required:**
- To seekers: "Your driver has deviated from the planned route. If you feel unsafe, press SOS."

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-011 | Deviation detection | Giver's GPS 3 km from planned route for 6 min | Seeker notified of deviation; admin alerted | P1 |
| OPS-012 | Deviation within tolerance | Giver 500 m off route (traffic reroute) | No alert triggered | P1 |
| OPS-013 | Seeker triggers SOS after deviation alert | Seeker taps SOS after deviation notification | SOS created with deviation context attached | P0 |

**Missing Feature Gap:** Route polyline not stored at booking time. No route comparison logic. No deviation detection. This is a critical safety gap.

---

## Scenario 5: Vehicle Breakdown Mid-Ride

**Description:** The giver's vehicle breaks down during an ONGOING ride. All passengers are stranded.

**Business Impact:** Passengers stranded mid-commute; could be late to office; safety concern in unfamiliar area.

**Current System Behavior:** Giver would need to manually cancel the ride. No "breakdown" status exists.

**Required Workflow:**
1. Giver taps "Vehicle Breakdown" → confirms.
2. Ride status → INTERRUPTED (new state needed).
3. All BOARDED seekers notified with last-known GPS location.
4. Admin alerted.
5. Seekers can request reimbursement for alternate transport (future feature).

**Admin Actions:** Acknowledge the breakdown. Assist with alt-transport if possible. Do not penalize giver for breakdown (vs. willful no-show).

**Notifications Required:**
- To seekers: "Vehicle breakdown at [Location]. Please arrange alternate transport. [Map Link]"
- To admin: Breakdown alert with ride context.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-014 | Giver reports breakdown | Giver taps "Breakdown" | Ride → INTERRUPTED; seekers notified with location | P1 |
| OPS-015 | Giver trust score NOT penalized for breakdown | Breakdown reported | Trust score unchanged (differentiated from no-show) | P1 |
| OPS-016 | ECO points still awarded for partial ride | Giver completed 60% of route before breakdown | ECO points awarded proportionally (or full — business rule needed) | P2 |

**Missing Feature Gap:** No "Breakdown" status exists. No INTERRUPTED ride state. No alt-transport coordination.

---

## Scenario 6: Emergency SOS Trigger

**Description:** A participant triggers SOS during an ONGOING ride due to a perceived safety threat.

*(See 12-sos.md for full SOS test cases.)*

**Required Workflow:** See file 12. Admin acknowledges within 2 minutes. Emergency contacts notified. Ride flagged for investigation.

### Test Cases (Additional Operational Cases)

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-017 | Admin response SLA | SOS triggered; admin does not acknowledge in 10 min | Second admin or escalation receives notification | P0 |
| OPS-018 | SOS escalation to backup admin | Primary admin unresponsive | Backup admin notified via SMS/email after 5 min | P1 |

**Missing Feature Gap:** No admin SLA enforcement. No escalation chain if primary admin is unavailable.

---

## Scenario 7: Accident Reporting

**Description:** A traffic accident occurs during an ONGOING ride. Injury and vehicle damage possible.

**Business Impact:** Highest-severity safety event. Legal, insurance, and platform liability implications.

**Current System Behavior:** No "Accident" reporting flow. SOS is the closest analog.

**Required Workflow:**
1. Either party taps "Report Accident" (distinct from SOS).
2. Accident report captures: GPS coordinates, ride context, user-submitted photos (optional).
3. Admin immediately notified.
4. Ride status → INCIDENT_REPORTED.
5. All participants' emergency contacts notified.

**Admin Actions:** Open incident ticket. Retain all ride data (GPS, call logs, boarding status) for minimum 90 days. Assist with insurance claim process if needed.

**Notifications Required:**
- All participants: "Incident reported on your ride. Stay safe. Help is being arranged."
- Admin: High-priority incident notification.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-019 | Accident reported mid-ride | Giver taps "Report Accident" | Incident record created; admin alerted; ride data frozen | P1 |
| OPS-020 | Accident data retained 90 days | Incident reported | Data not auto-deleted; retention flag set | P1 |
| OPS-021 | Ride status during incident | Accident reported | Ride status → INCIDENT_REPORTED (or similar) — cannot be completed/cancelled without admin review | P1 |

**Missing Feature Gap:** No accident reporting flow. No INCIDENT_REPORTED ride state. No data retention policy per incident. Critical compliance and liability gap.

---

## Scenario 8: GPS Signal Loss During Tracking

**Description:** Giver's GPS signal is lost mid-ride (tunnel, underground parking, rural outskirts).

*(See 11-live-tracking.md TC TRK-005, TRK-006.)*

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-022 | GPS loss: last known location displayed | GPS signal drops | Seekers see "Last seen X seconds ago" with last valid coordinates | P1 |
| OPS-023 | GPS loss exceeds 5 minutes | Signal down > 5 min | Admin notified: "GPS signal lost for Ride #[ID]" | P1 |
| OPS-024 | GPS resumes | Signal restored | Live tracking resumes automatically; "Last seen" replaced with live indicator | P1 |

**Missing Feature Gap:** No GPS loss threshold alert to admin.

---

## Scenario 9: Network Outage (Seeker/Giver Offline)

**Description:** Either the seeker or giver loses network connectivity during the ride.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-025 | Giver offline — boarding updates queued | Giver marks BOARDED without internet | Update queued locally; synced when connection restored | P1 |
| OPS-026 | Seeker offline — tracking shows stale | Seeker's internet drops | Tracking shows "Reconnecting..." indicator | P1 |
| OPS-027 | Giver completes ride offline | Network down at completion | Completion queued; processed when back online; timestamps preserved | P1 |

**Missing Feature Gap:** No offline-first PWA design. All actions require live internet. Offline queuing not implemented.

---

## Scenario 10: Weather Disruption (Giver Cancels Due to Flooding/Storm)

**Description:** Hyderabad flooding (common during monsoon) forces giver to cancel a PUBLISHED ride.

**Current System Behavior:** Giver cancels ride manually. If confirmed bookings exist, system may block cancellation.

**Required Workflow:** Admin triggers "Platform-Wide Event" that allows givers to cancel rides with confirmed bookings without trust score penalty, during declared weather emergencies.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-028 | Giver cancels during admin-declared weather event | Admin activates emergency mode; giver cancels ride with confirmed bookings | Cancellation allowed; no trust score penalty; seekers notified | P1 |
| OPS-029 | Cancellation outside emergency mode | Giver cancels ride with confirmed bookings normally | Blocked or penalized (standard flow) | P0 |

**Missing Feature Gap:** No "platform emergency mode." No mechanism to exempt cancellations from penalties during force-majeure events.

---

## Scenario 11: Giver Account Suspended Mid-Active Ride

**Description:** Admin suspends a giver's account while they have an ONGOING ride with passengers in the vehicle.

**Business Impact:** Passengers in a moving vehicle. Abrupt suspension could disrupt safety.

**Current System Behavior:** Undefined. Suspension likely invalidates sessions immediately.

**Required Workflow:**
1. Admin should not be able to suspend a user with an ONGOING ride without explicit override.
2. If override is used, ride continues with warning to admin.
3. Ride must be completed before session invalidation, or admin takes over communication with affected passengers.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-030 | Admin suspends giver with ONGOING ride | Admin tries to suspend giver mid-ride | Warning: "User has an active ride in progress. Proceed anyway?" — requires confirmation | P1 |
| OPS-031 | Suspension during ONGOING ride — passengers not stranded | Admin confirms suspension | Ride allowed to continue; giver's app continues to function until ride is COMPLETED | P0 |

**Missing Feature Gap:** No "active ride check before suspension" guard. Immediate session invalidation on suspension would strand passengers.

---

## Scenario 12: Seeker Account Suspended

**Description:** A seeker's account is suspended. They have a CONFIRMED booking on a future ride.

**Required Workflow:** Suspended seeker's confirmed booking cancelled automatically. Giver notified. Seat freed.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-032 | Seeker suspended — confirmed booking cancelled | Admin suspends seeker | Seeker's confirmed bookings cancelled; giver notified; seat freed | P0 |
| OPS-033 | Suspended seeker cannot view ride details | Suspended seeker attempts to view booking | 403: "Account suspended." | P0 |

**Missing Feature Gap:** No automated booking cancellation on account suspension. Manual admin intervention currently required.

---

## Scenario 13: Employee Leaves Company (Domain Becomes Invalid)

**Description:** An employee resigns; their corporate email (user@techcorp.in) is deactivated by their company's IT team.

**Business Impact:** Former employee retains platform access and could impersonate current employees.

**Current System Behavior:** No mechanism to detect email deactivation. User can continue using the platform indefinitely.

**Required Workflow:**
1. Platform periodically sends a "re-verify your employment" email to all users (e.g., quarterly).
2. If user does not click the verification link within 7 days, status drops to EMAIL_VERIFICATION_PENDING.
3. Admin can manually flag and deactivate specific users when notified by the company's HR.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-034 | Re-verification email sent quarterly | System sends re-verify email | User receives email; must click to stay active | P1 |
| OPS-035 | User fails re-verify — status downgraded | User ignores re-verify email for 7 days | Status → EMAIL_VERIFICATION_PENDING; cannot search or post rides | P1 |
| OPS-036 | Admin manually deactivates former employee | HR reports user has left company | Admin deactivates account | Account → DEACTIVATED; all active rides/bookings cancelled | P1 |

**Missing Feature Gap:** No re-verification mechanism. No HR integration. Former employees can use platform indefinitely.

---

## Scenario 14: Verification Document Expiry

**Description:** A giver's DL or RC expires after the platform approved it. Platform has no mechanism to flag the expiry.

*(Covered in 02-verification.md as a future feature gap.)*

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-037 | System flags expired DL | DL expiry date in DB is past | Background job runs; giver receives "Your DL has expired — please update to continue giving rides." | P1 |
| OPS-038 | Giver with expired DL blocked from posting | DL expired | Attempt to post new ride | Blocked: "Your driving license is expired. Please re-upload." | P1 |

**Missing Feature Gap:** No expiry tracking or background jobs for document expiry detection.

---

## Scenario 15: Multiple Complaints Against Same User

**Description:** Multiple seekers (or givers) file complaints against the same user for behavior issues (harassment, aggression, driving, etc.).

**Required Workflow:** After 3 complaints, admin automatically notified. Admin investigates. At 5 complaints, account temporarily suspended pending investigation.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-039 | 3 complaints — admin auto-notified | 3 complaints filed against same user | Admin notification: "User [X] has received 3 complaints." | P1 |
| OPS-040 | 5 complaints — auto-suspension | 5 complaints filed | Account auto-suspended; user notified; admin informed | P1 |
| OPS-041 | Complaint requires ride reference | User submits complaint without rideId | Error: "Complaints must reference a specific ride." | P1 |

**Missing Feature Gap:** No complaint threshold automation. No auto-suspension trigger. Admin must manually monitor.

---

## Scenario 16: Repeated Policy Violations

**Description:** A user repeatedly violates platform policies (e.g., using personal vehicles not registered, posting misleading routes, harassment).

**Required Workflow:**
1. First violation: Warning email.
2. Second violation: 7-day suspension.
3. Third violation: Permanent ban.
4. Admin can override at any threshold.

### Test Cases

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| OPS-042 | First violation — warning issued | Admin marks violation #1 | User receives warning email; violation count = 1 in DB | P1 |
| OPS-043 | Second violation — 7-day suspension | Admin marks violation #2 | Account suspended for 7 days; user notified | P1 |
| OPS-044 | Third violation — permanent ban | Admin marks violation #3 | Account permanently deactivated; email: "Your account has been permanently banned." | P1 |
| OPS-045 | Admin overrides escalation | Admin deems first violation is severe | Admin can apply immediate permanent ban regardless of violation count | P1 |

**Missing Feature Gap:** No violation tracking schema. No automated escalation. All enforcement is manual. No appeal process for the banned user.

---

## Cross-Cutting Missing Business Rules / Risks

1. **No force-majeure / emergency mode.** Hyderabad's monsoon (June–September) regularly causes flooding and cancellations. Platform needs a "weather emergency" mode.
2. **No legal/compliance review of incident data retention.** Under India's Motor Vehicles Act and DPDP Act, accident and SOS data may need to be retained for specific periods and produced to law enforcement on request.
3. **No admin escalation chain.** If the only admin is unavailable, all operational emergencies (SOS, accidents, suspensions) stall.
4. **No user communication channel during incidents.** Post-confirmation, the only channel is phone calls. An in-app emergency broadcast would be safer.
5. **"Breakdown" and "Late" are not formalized ride states.** The current state machine has no INTERRUPTED, DELAYED, or INCIDENT states.
6. **No insurance or liability framework.** The platform facilitates rides but disclaims liability. As ridesharing scales, IRDAI-compliant ridesharing insurance for participants is a regulatory requirement.
7. **No incident classification taxonomy.** Complaints, SOS events, breakdowns, and accidents are all treated similarly (or not at all). A severity classification system is needed for proper triage.
