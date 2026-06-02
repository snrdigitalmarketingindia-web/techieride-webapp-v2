# TechieRide QA Spec — 12: SOS / Emergency Alerts

**Module:** SOS & Emergency Response  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

The SOS feature allows any ride participant (giver or seeker) to trigger an emergency alert during an ONGOING ride. The alert captures GPS coordinates, the triggering user's details, ride context, and timestamp — and immediately notifies the admin. SOS triggers on non-ONGOING rides are blocked. Duplicate SOS within 60 seconds is prevented (spam protection). All SOS events are permanently logged for legal and compliance purposes.

---

## SOS Event Fields

| Field | Description |
|-------|-------------|
| triggeredBy | userId of the person who triggered SOS |
| rideId | The associated ride |
| latitude / longitude | GPS at time of trigger |
| timestamp | IST timestamp |
| status | ACTIVE → ACKNOWLEDGED → RESOLVED |
| notes | Admin resolution notes |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| SOS-001 | Giver triggers SOS during ONGOING ride | Ride ONGOING; giver GPS active | Giver taps SOS button → confirms | SOS event created: status=ACTIVE; giver's GPS coordinates attached; admin receives immediate notification | Safety-critical | P0 |
| SOS-002 | Seeker triggers SOS during ONGOING ride | Ride ONGOING; seeker is CONFIRMED/BOARDED | Seeker taps SOS button → confirms | SOS event created; seeker's GPS coordinates attached; admin notified | P0 |
| SOS-003 | GPS coordinates attached to SOS event | SOS triggered while GPS is active | Check SOS record in DB/admin dashboard | latitude and longitude populated with accurate values (not 0,0) | P0 |
| SOS-004 | SOS without GPS — location missing gracefully | GPS permission denied or unavailable | Trigger SOS | SOS event created without coordinates; admin notified with note "Location unavailable"; SOS does not fail | P0 |
| SOS-005 | Admin receives immediate notification | SOS triggered | Check admin's in-app notifications and email | Notification arrives within 10 seconds: "EMERGENCY: [User] triggered SOS on Ride #[ID]" with map link | P0 |
| SOS-006 | Admin dashboard shows active SOS prominently | SOS status = ACTIVE | Admin opens dashboard | Active SOS items highlighted in red/orange at top of dashboard; not buried in a list | P0 |
| SOS-007 | SOS cannot be triggered on COMPLETED ride | Ride status = COMPLETED | User taps SOS in ride history | Error: "SOS can only be triggered during an active ride." | P0 |
| SOS-008 | SOS cannot be triggered on PUBLISHED (not started) ride | Ride status = PUBLISHED | User taps SOS | Error: "SOS can only be triggered during an active ride." | P0 |
| SOS-009 | SOS on ONGOING ride attaches full ride context | SOS triggered | Check SOS record | SOS includes: rideId, giver details, seeker list, route (origin/destination), scheduled departure time | P0 |
| SOS-010 | Duplicate SOS within 60 seconds blocked | SOS triggered; same user triggers again within 30 sec | Second tap → confirm | Error: "SOS recently sent. Wait 60 seconds before sending another." | Spam prevention | P1 |
| SOS-011 | Duplicate SOS after 60 seconds allowed | 65 seconds after first SOS | Trigger SOS again | New SOS event created; new notification to admin | P1 |
| SOS-012 | SOS audit log permanently retained | SOS triggered and resolved | Admin queries /admin/sos-log | SOS record never deleted; retains all fields even after resolution | Compliance / P0 |
| SOS-013 | Admin acknowledges SOS | SOS status = ACTIVE | Admin clicks "Acknowledge" → enters note "Contacted police, dispatched help" | SOS status → ACKNOWLEDGED; timestamp updated; user notified "Help is on the way." | P1 |
| SOS-014 | Admin resolves SOS | SOS status = ACKNOWLEDGED | Admin clicks "Resolve" → enters resolution note | SOS status → RESOLVED; closed timestamp recorded | P1 |
| SOS-015 | Emergency contact notification | User has emergency contact configured | SOS triggered | Emergency contact receives SMS: "[UserName] triggered an emergency on TechieRide. Last location: [Map link]." | P1 |
| SOS-016 | Emergency contact NOT notified if not configured | No emergency contact in user profile | SOS triggered | No SMS sent; SOS still created and admin notified | P1 |
| SOS-017 | SOS button is large and accessible | Active ride screen | Inspect SOS button size and position | Minimum touch target 48x48 dp; high-contrast red background; not hidden behind scroll | Accessibility / P0 |
| SOS-018 | SOS requires explicit confirmation (no accidental trigger) | — | Tap SOS button once | Confirmation dialog: "Are you sure you want to trigger an emergency alert?" — not immediate trigger | Anti-accident design | P0 |
| SOS-019 | SOS confirmation within 5 seconds | Confirmation dialog shown | User must confirm within 5 seconds or it auto-dismisses | (Optional behavior — if implemented) Confirmation auto-dismisses to prevent hesitation in real emergency | P2 |
| SOS-020 | Multiple users trigger SOS on same ride | Giver and seeker both trigger SOS | Both SOS events captured | Two separate SOS records created; admin sees both; admin dashboard shows 2 active SOS items for same ride | P1 |
| SOS-021 | SOS visible on admin active rides list | SOS triggered on Ride #123 | Admin views active rides | Ride #123 has SOS indicator badge | P1 |
| SOS-022 | SOS notification includes map link | Admin receives SOS notification | Click notification | Opens map showing SOS location (Google Maps or in-app) | P1 |
| SOS-023 | SOS not triggerable by non-participant | Seeker not in this ride triggers SOS for a different rideId | POST /sos with another ride's rideId | 403: "You are not a participant in this ride." | Security | P0 |
| SOS-024 | SOS feature available offline (queued) | No internet connection | Giver tries to trigger SOS offline | SOS queued locally; triggers when connection restored; timestamp of original tap preserved | Safety | P1 |
| SOS-025 | Resolved SOS still viewable in history | SOS marked RESOLVED | Admin queries resolved SOS | Full audit trail visible: trigger time, acknowledge time, resolve time, notes | Compliance | P1 |

---

## Missing Business Rules / Risks

1. **Emergency services (112) auto-dial not implemented.** In a real emergency, users may be unable to interact with the app. The SOS trigger should optionally auto-dial India's emergency number (112) or provide a "Call 112" button immediately after SOS confirmation.
2. **Admin response SLA not defined.** There's no defined SLA for admin acknowledgment (e.g., "acknowledge within 2 minutes"). No escalation to backup admin if primary doesn't respond.
3. **SOS resolution criteria not defined.** When is an SOS considered "resolved"? Requires clearer business rules to prevent admins from auto-resolving without proper follow-up.
4. **No integration with local police or ambulance APIs.** India's 112 Emergency Response Support System has APIs — integration would significantly improve response time.
5. **SOS during low battery not handled.** Device may die during an emergency. The app should trigger SOS early when battery is below a threshold, or warn the user.
6. **Background SOS (screen locked) not specified.** In a real emergency, users may not be able to unlock their phone. A shake-to-SOS or power-button-triple-press fallback should be considered.
7. **SOS test / drill mode not implemented.** Users need to be able to test the SOS feature without creating a real alert. A "Test Mode" SOS should notify only the user themselves.
8. **Legal compliance for SOS data.** SOS records contain GPS data tied to individuals — retention, access control, and disclosure rules under DPDP Act are not addressed.
