# TechieRide QA Spec — 08: Calling (Phone Visibility & Call Button)

**Module:** In-App Calling & Phone Visibility  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

TechieRide uses phone numbers as the primary communication channel between confirmed ride participants. Phone numbers are kept private until a booking is CONFIRMED. After confirmation, the giver can see all confirmed seekers' phone numbers, and each seeker can see the giver's phone number (and fellow confirmed passengers'). A "Call" button renders as a `tel:` link. Calls are fire-and-forget — the app records the intent but does not route the call through the platform. Phone numbers must include the Indian country code (+91) when rendered in the `tel:` link.

---

## Phone Visibility Rules

| Who | Can See |
|-----|---------|
| Giver | Confirmed seekers' phone numbers (after approval) |
| Seeker | Giver's phone number (after confirmation) |
| Seeker | Fellow confirmed passengers' phone numbers (after confirmation) |
| Anyone (search results) | Nobody's phone numbers |
| Giver | NO_SHOW passengers' phone numbers — HIDDEN |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| CALL-001 | Giver sees confirmed seeker's phone number on My Rides | Seeker's request CONFIRMED | Giver navigates to My Rides → ride detail → passenger list | Seeker's phone number visible (formatted as 9876543210 or +91 9876543210) | Safety & coordination | P0 |
| CALL-002 | Seeker sees giver's phone number after confirmation | Booking CONFIRMED | Seeker navigates to My Bookings → confirmed ride | Giver's phone number visible | P0 |
| CALL-003 | Seeker sees fellow confirmed passenger's phone number | 2 confirmed seekers on same ride | Seeker A opens confirmed booking | Seeker B's phone number visible (group coordination) | P1 |
| CALL-004 | Phone NOT visible before confirmation (PENDING state) | Request in PENDING state | Seeker views ride request detail | Giver's phone NOT shown | Privacy / P0 |
| CALL-005 | Phone NOT visible before confirmation (APPROVED state) | Request in APPROVED state | Seeker views booking | Giver's phone NOT shown (phone visible only after CONFIRMED) — verify state transition | P0 |
| CALL-006 | Phone NOT visible in search results | PUBLISHED ride | Any seeker views search result card | Giver's phone absent from search result card, list, or detail before booking | Privacy / P0 |
| CALL-007 | Phone NOT visible to unauthenticated user | — | GET /rides/:id via Postman without auth | Phone number not in response payload | Privacy / P0 |
| CALL-008 | Call button renders correct tel: link — mobile | Booking CONFIRMED; mobile browser | Tap "Call" button | Device dialer opens with giver's number pre-filled as tel:+919876543210 | Core UX | P0 |
| CALL-009 | Call button renders correct tel: link — desktop | Booking CONFIRMED; Chrome desktop | Click "Call" button | Browser opens tel: link (default phone app on OS, or shows "No app available" gracefully) | P1 |
| CALL-010 | Country code +91 prepended | Indian number stored as 9876543210 | Tap Call button | tel: link = tel:+919876543210 (not tel:9876543210) | P1 |
| CALL-011 | Call button hidden for NO_SHOW passengers | Giver marks passenger as NO_SHOW | Giver views passenger list | NO_SHOW passenger's call button is hidden/disabled | Safety rule | P0 |
| CALL-012 | Call audit log created (fire-and-forget) | Booking CONFIRMED; user clicks Call | Click Call button | POST /call-logs fires in background; callLog record created with userId, targetUserId, rideId, timestamp | Audit trail | P1 |
| CALL-013 | Call audit log does not block UI | Call log API is slow/down | Click Call button | Call button still triggers dialer immediately; log failure does not block the tel: link from firing | P1 |
| CALL-014 | Missing phone number → no call button | User registered without phone (legacy or edge case) | Open confirmed booking | Call button absent; replaced with "Phone not available" message or nothing | P1 |
| CALL-015 | Phone number masked in partial view (if applicable) | Confirmed booking | Check if partial masking (e.g., 98765*****) is used before full reveal | Consistent behavior documented: either always full number or masked with "reveal" button | P1 |
| CALL-016 | Multiple confirmed seekers — each can call independently | 3 confirmed seekers | Each seeker opens their booking | Each sees giver's number; giver sees each seeker's number separately | P1 |
| CALL-017 | Giver cannot call REJECTED seeker | Seeker request REJECTED | Giver views ride; REJECTED seeker not in passenger list | REJECTED seeker's phone not visible in any context to giver | Privacy | P1 |
| CALL-018 | Seeker cannot call PENDING request's giver | Request status PENDING | Seeker views request detail | Giver's phone not visible | Privacy / P0 |
| CALL-019 | Phone visible immediately after approval (no delay) | Giver approves request | Seeker refreshes My Bookings immediately after approval | Giver's phone now visible | P0 |
| CALL-020 | Call button accessible on mobile with screen reader | CONFIRMED booking on mobile | Use TalkBack/VoiceOver; focus on Call button | Button announced as "Call [Name]"; tel: link activates | Accessibility / P2 |
| CALL-021 | International number format stored incorrectly | User stores phone as +91-98765-43210 (with dashes) | Tap Call button | tel: link strips dashes: tel:+919876543210 | P1 |
| CALL-022 | API response does not expose phone of non-confirmed passengers | Giver has 3 PENDING and 1 CONFIRMED request | GET /rides/:id/passengers (as seeker) | API only returns confirmed passengers; no phone data for PENDING | Security / P0 |
| CALL-023 | Admin can see all phone numbers in user management | Admin logged in | Admin views user record | Full phone number visible to admin | Admin function / P1 |
| CALL-024 | Call log queryable by admin for audit | Multiple calls made | Admin queries /admin/call-logs?rideId=xxx | All call intent records returned with timestamps | Compliance / P1 |
| CALL-025 | Call button visible on both giver and seeker views post-confirmation | Confirmed booking | Both giver and seeker open their respective views | Both see a call button for the other party | P0 |

---

## Missing Business Rules / Risks

1. **Phone visibility state: APPROVED vs CONFIRMED ambiguity.** The spec says phone visible "after confirmation." Does this mean after APPROVED or after CONFIRMED? These are different states in the booking flow. This needs explicit definition.
2. **No in-app calling / VoIP.** The platform exposes raw mobile numbers — there's no anonymized calling. If privacy is important, a VoIP proxy (like Ola/Uber's masked calling) should be considered.
3. **Phone numbers are permanently exposed post-confirmation.** Even after ride completion, confirmed participants can still call each other. Is there a "phone visibility window" (e.g., only during ride day)?
4. **Call audit is fire-and-forget — incomplete.** We log call intent, not actual call completion. The audit log cannot prove a call was made.
5. **Fellow passenger phone visibility not clearly specified.** The spec says giver sees confirmed seekers — but does Seeker A see Seeker B's number? This is implied but not explicit, and has privacy implications.
6. **No rate limiting on call button.** A malicious user could trigger thousands of tel: link clicks (each creating a call log record) as a DoS on the logging service.
7. **Phone number change after confirmation not handled.** If a user changes their phone number after a booking is confirmed, the other party still sees the old number until the page is refreshed.
8. **No WhatsApp / messaging deep link.** Indian users predominantly coordinate over WhatsApp. A `wa.me/+91...` deep link alongside the call button would significantly improve UX.
