# 08 — Calling Feature

**Platform:** TechieRide v2 · **Module:** Direct Phone Calling  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

The calling feature enables direct communication between giver and confirmed seekers (and among fellow passengers). Phone numbers are stored at registration and must be visible with a call button on confirmed ride cards. **Phone numbers are never shown in search results** (pre-confirmation) to prevent cold-calling. All calls are initiated via `tel:` links (device dialer). A fire-and-forget audit log captures call initiation events.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| CALL-01 | Giver sees seeker phone on My Rides (CONFIRMED participant) | Seeker CONFIRMED on ride | Giver views My Rides | Call button with seeker name visible | Coordination | P0 |
| CALL-02 | Seeker sees giver phone on My Rides (CONFIRMED ride) | Seeker CONFIRMED | Seeker views My Rides | Giver call button visible | Coordination | P0 |
| CALL-03 | Seeker sees fellow passenger phone on My Rides | 2 seekers confirmed on same ride | Seeker views My Rides | Both giver and fellow seeker call buttons visible | Group coordination | P1 |
| CALL-04 | Call button generates correct tel: link | Phone "9000000001"; countryCode "+91" | Inspect href of call button | href = "tel:+919000000001" | Dialer integration | P0 |
| CALL-05 | Call button absent when phone is null/empty | Seeker account with no phone | Giver views My Rides | No call button for that passenger | Graceful degradation | P0 |
| CALL-06 | Call button hidden for NO_SHOW passenger | Passenger marked NO_SHOW | Giver views My Rides | No call button for NO_SHOW | No-show workflow | P0 |
| CALL-07 | Phone NOT visible in ride search results | PUBLISHED ride | Seeker searches rides | No phone field in giver data | Privacy (pre-confirmation) | P0 |
| CALL-08 | Phone NOT visible in ride detail (unauthenticated) | Any ride | GET /rides/{id} without auth | 401; phone not exposed | Security | P0 |
| CALL-09 | Phone NOT visible in ride detail (unconfirmed seeker) | Seeker has PENDING request | GET /rides/{id} as that seeker | Phone absent (not yet confirmed) | Privacy gate | P0 |
| CALL-10 | Phone visible in ride detail (confirmed seeker) | Seeker CONFIRMED | GET /rides/{id} | Giver phone present | Post-confirmation access | P0 |
| CALL-11 | Call audit log created on button click | Seeker clicks call button | POST /calls/log fires | 201 Created; callerId, receiverId, rideId, event stored | Audit trail | P1 |
| CALL-12 | Call audit log does not block the call | None | POST /calls/log slow/fails | tel: link still opens dialer | UX — fire-and-forget | P0 |
| CALL-13 | Unauthenticated user cannot call log endpoint | No token | POST /calls/log | 401 Unauthorized | Security | P0 |
| CALL-14 | Call button works on mobile (tel: link launches dialer) | Mobile browser | Click call button | Native dialer launches with pre-filled number | Mobile UX | P0 |
| CALL-15 | Call button works on desktop (tel: link opens default app) | Desktop browser | Click call button | Skype/default calling app launches | Desktop UX | P1 |
| CALL-16 | Country code +91 prepended correctly | Phone stored as "9000000001" | Inspect tel: link | tel:+919000000001 (not tel:9000000001) | International dialer format | P0 |
| CALL-17 | countryCode stored at registration | Register with default | GET /auth/me | countryCode = "+91" | Data completeness | P1 |
| CALL-18 | Call button visible on Dashboard ride card | Giver on dashboard with active ride + passengers | View dashboard | Call buttons per participant visible | Dashboard UX | P1 |
| CALL-19 | Call button visible on My Rides giver card | Giver on My Rides | View My Rides | Call buttons per confirmed passenger | My Rides UX | P0 |
| CALL-20 | Call button visible on My Rides seeker card | Seeker on My Rides | View My Rides | Giver call button + fellow passenger call buttons | My Rides seeker UX | P0 |
| CALL-21 | BOARDED passenger still has call button | Passenger BOARDED | Giver views My Rides during ONGOING | Call button present | Live ride coordination | P1 |
| CALL-22 | DEBOARDED passenger still has call button | Passenger DEBOARDED | Giver views My Rides | Call button present | Post-drop coordination | P2 |
| CALL-23 | Pending request (pre-approval) — call button available for giver to pre-screen | PENDING request | Giver views pending section | Call button present in pending list | Pre-screening | P1 |
| CALL-24 | Call log contains correct rideId | Call initiated during ride | POST /calls/log | rideId matches the active ride | Audit accuracy | P1 |
| CALL-25 | Multiple calls logged correctly (no dedup) | Same pair calls twice | Two POST /calls/log | Two separate log entries | Audit completeness | P2 |

---

## UAT Acceptance Criteria

- [ ] Confirmed seeker can call the giver with a single tap; no copy-paste required
- [ ] Phone numbers are never visible until both parties are confirmed on the ride
- [ ] Call button absent for NO_SHOW passengers; avoids confusion after no-show
- [ ] tel: link includes +91 country code regardless of how the number was stored
- [ ] All call initiation events appear in the audit log within 1 second

---

## Missing Business Rules / Risks

1. **No in-app calling** — calls are via device dialer; no call recording, no call quality tracking
2. **Phone number verification not implemented** — `isPhoneVerified=false` for most accounts; calls could go to wrong numbers
3. **No block/mute feature** — giver/seeker cannot block harassing callers
4. **Call audit only logs initiation, not answer/duration** — no way to verify contact was made
5. **No emergency contact calling via platform** — SOS lacks direct emergency dial integration
6. **Fellow passenger visibility is mutual** — all confirmed seekers see each other's phones; some users may not want this
7. **Call button shown for admin accounts** — admin phones visible to regular users via call log; potential privacy issue
8. **No call limit** — a bad actor can repeatedly call a seeker via the tel: link without platform intervention
