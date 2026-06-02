# 12 — SOS Emergency System

**Platform:** TechieRide v2 · **Module:** SOS & Emergency Response  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

The SOS feature allows any ride participant (giver or seeker) to trigger an emergency alert during an active ride. The alert must capture GPS location, ride context, and notify admin immediately. This is a zero-tolerance safety feature — false negatives (SOS not delivered) are unacceptable.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| SOS-01 | Giver triggers SOS during ONGOING ride | Ride ONGOING | POST /sos with rideId | 201 Created; admin notified immediately | Core safety | P0 |
| SOS-02 | Seeker triggers SOS during ONGOING ride | Seeker CONFIRMED; ride ONGOING | POST /sos with rideId | 201 Created; admin notified | Core safety | P0 |
| SOS-03 | SOS captures current GPS coordinates | GPS available | POST /sos with lat/lng | GPS stored with SOS record | Location evidence | P0 |
| SOS-04 | SOS attaches ride context | Ride ONGOING | POST /sos | SOS record contains rideId, giver info, seeker list | Incident context | P0 |
| SOS-05 | Admin receives real-time notification on SOS | SOS triggered | Admin dashboard | Alert badge + notification within 5s | Admin response | P0 |
| SOS-06 | SOS logged in audit trail | SOS triggered | DB/admin log check | SOS event stored with timestamp, userId, location | Audit | P0 |
| SOS-07 | SOS cannot be triggered on COMPLETED ride | Ride COMPLETED | POST /sos with completed rideId | 400 Bad Request; ride not active | State gate | P0 |
| SOS-08 | SOS cannot be triggered on CANCELLED ride | Ride CANCELLED | POST /sos | 400 Bad Request | State gate | P0 |
| SOS-09 | SOS cannot be triggered by non-participant | User not on ride | POST /sos with foreign rideId | 403 Forbidden | Authorization | P0 |
| SOS-10 | Unauthenticated SOS attempt blocked | No token | POST /sos | 401 Unauthorized | Security | P0 |
| SOS-11 | Duplicate SOS within 60 seconds blocked (spam prevention) | SOS just triggered | POST /sos again within 60s | 429 Too Many Requests | Spam prevention | P0 |
| SOS-12 | SOS after 60s cooldown accepted | Previous SOS 61s ago | POST /sos | 201 Created | Genuine repeat emergency | P0 |
| SOS-13 | SOS works without GPS (GPS unavailable) | GPS off | POST /sos without coordinates | 201 Created; location = null; admin still notified | Degraded GPS resilience | P0 |
| SOS-14 | Emergency contact notification on SOS (if configured) | User has emergency contact | POST /sos | Emergency contact notified via SMS/email | Personal safety network | P1 |
| SOS-15 | Admin SOS dashboard shows all active SOS events | Multiple SOS triggered | Admin views SOS queue | All active SOS with location + ride context | Admin operations | P0 |
| SOS-16 | Admin can resolve/acknowledge SOS | SOS triggered | Admin marks SOS resolved | SOS status = RESOLVED; removed from active queue | Incident management | P1 |
| SOS-17 | SOS button accessible on tracking page (seeker) | Seeker on tracking page | Check for SOS button | SOS button visible during ONGOING | UX accessibility | P0 |
| SOS-18 | SOS button accessible on My Rides (giver) | Giver during ONGOING | Check for SOS button | SOS button or emergency option visible | UX accessibility | P0 |
| SOS-19 | SOS event triggers ride status review by admin | SOS during ONGOING | Admin reviews ride | Admin can see all participants and their status | Safety workflow | P1 |
| SOS-20 | Multiple SOS from same ride (different users) | Giver SOS, then seeker SOS | Both POST /sos | Both recorded; admin sees both | Multi-party incident | P0 |
| SOS-21 | SOS response time < 30 seconds (admin notification) | SOS triggered | Measure time to admin notification | Admin notified within 30s | Response SLA | P0 |
| SOS-22 | SOS on PUBLISHED ride (before start) handled | Ride PUBLISHED (not started) | POST /sos | 400; ride not active OR allow (safety edge case) | Edge case policy | P1 |
| SOS-23 | SOS data retained after ride completion | SOS triggered; ride later completed | Query SOS records | SOS record permanent; not deleted on completion | Incident record retention | P0 |
| SOS-24 | Regression — SOS works after WebSocket reconnection | WebSocket disconnected | Reconnect; trigger SOS | SOS delivered | Resilience | P0 |
| SOS-25 | SOS notification includes shareable location link | SOS triggered with GPS | Admin notification | Location link (Google Maps) in notification | Admin response speed | P1 |

---

## UAT Acceptance Criteria

- [ ] SOS button is reachable in ≤ 2 taps during an active ride
- [ ] Admin receives notification within 30 seconds on any platform
- [ ] SOS captures GPS coordinates when available; works without GPS as fallback
- [ ] Spam prevention (60s cooldown) does not block genuine repeat emergencies
- [ ] All SOS events are permanently logged; cannot be deleted

---

## Missing Business Rules / Risks

1. **No dedicated SOS UI implemented** — SOS exists in backend but frontend button/page not confirmed in all flows
2. **No emergency services integration** — platform cannot auto-dial 112; relies entirely on admin response
3. **No SLA for admin response to SOS** — no escalation if admin is offline
4. **No emergency contact storage in profile** — emergency contact notification (TC-14) requires feature not yet built
5. **SOS cooldown may block genuine rapid distress** — 60s cooldown could prevent legitimate repeat signals
6. **No push notification for SOS on mobile** — admin may miss SOS if not on dashboard; requires push/SMS
7. **No SOS drill/test mode** — admin cannot test the SOS pipeline without a real incident
8. **Ride context attached but not formatted for emergency response** — raw data not useful for police/ambulance
