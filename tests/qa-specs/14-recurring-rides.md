# TechieRide QA Spec — 14: Recurring Rides (Commute Templates)

**Module:** Recurring Ride / Commute Template  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

IT employees in Hyderabad follow predictable weekday commute patterns (Monday to Friday, 8:00–10:00 AM and 6:00–9:00 PM). TechieRide supports commute templates that allow givers to define a recurring ride (route, time, seats, vehicle) and automatically generate individual ride instances for selected days. Seekers can book a recurring slot on the template. Templates can be deactivated (stopping future ride generation) or deleted. Individual ride-day skipping is also supported.

---

## Template vs One-Off Ride Differentiation

| Attribute | One-Off Ride | Template-Generated Ride |
|-----------|--------------|------------------------|
| templateId | null | Reference to parent template |
| isRecurring | false | true |
| canSkip | N/A | Yes (by giver) |
| Deactivation | Cancel ride | Deactivate template |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| REC-001 | Create commute template (Mon–Fri) | DRIVER_VERIFIED giver | Navigate to /rides/templates → fill: origin=HITEC City, destination=Gachibowli, time=09:00, seats=2, days=[Mon,Tue,Wed,Thu,Fri], vehicle=registered → Save | Template created; 5 rides generated for next occurrence week | Core recurring feature | P0 |
| REC-002 | Template generates rides for selected days only | Template set for Mon + Wed only | Check generated rides | Only Monday and Wednesday rides generated; no Tue/Thu/Fri rides | P0 |
| REC-003 | Generated rides appear in search | Template rides generated | Seeker searches Mon/Wed for the route | Template-generated rides appear in search results; visually same as one-off rides | P0 |
| REC-004 | Generated rides have PUBLISHED status | Template created | Check ride status | Each generated ride has status=PUBLISHED immediately (or after explicit template activation) | P0 |
| REC-005 | Template ride differentiated from one-off in giver's My Rides | Template ride and manual ride both exist | Giver views My Rides | Template rides show recurring icon or "Recurring" label; one-off rides show no such label | P1 |
| REC-006 | Seeker books a recurring slot | Template rides for Mon–Fri | Seeker requests Monday's ride → approved | Seeker can also request Tuesday's ride (separate request per day) | P1 |
| REC-007 | Template deactivation stops future ride generation | Active template | Giver clicks "Deactivate Template" → confirm | No new rides generated beyond the current week (or immediate stop, per business rule); existing generated rides unaffected | P0 |
| REC-008 | Template deactivation does not cancel already-published rides | Template deactivated | Check rides already generated before deactivation | Existing PUBLISHED template rides remain PUBLISHED and bookable | P0 |
| REC-009 | Edit template — change departure time | Active template | Giver edits template: time 09:00 → 09:30 | Future-generated rides use new time; already-published rides unchanged | P1 |
| REC-010 | Edit template — change seat count | Active template | Giver edits template: seats 2 → 3 | Future rides have 3 seats; already-published rides retain original seat count | P1 |
| REC-011 | Giver skips a day on recurring template | Template active; next Monday exists as PUBLISHED | Giver clicks "Skip Monday [date]" | That Monday's ride → CANCELLED; seekers with pending requests notified; future Mondays unaffected | P1 |
| REC-012 | Giver cannot skip a day that already has CONFIRMED bookings | Monday ride has 1 CONFIRMED seeker | Giver attempts to skip that day | Warning: "You have confirmed passengers on this ride. Cannot skip." Or requires admin intervention | P0 |
| REC-013 | Template deletion | Active template with no upcoming rides with confirmed bookings | Giver deletes template | Template deleted; all future PUBLISHED template rides → CANCELLED; seekers notified | P1 |
| REC-014 | Template deletion blocked if confirmed bookings exist | Template ride has CONFIRMED bookings | Giver attempts delete | Error: "Cannot delete template with confirmed bookings. Contact support." | P0 |
| REC-015 | Template end date respected | Template set end date = last Friday of month | Generate rides | Rides generated up to and including end date; no rides after | P1 |
| REC-016 | Template with no end date generates rides rolling 7 days ahead | Template has no end date | Check ride generation | System generates rides for the next 7 days (or configured horizon) on a rolling basis | P1 |
| REC-017 | One active ride per giver rule applies to templates | Giver has PUBLISHED template ride on Monday | Giver tries to manually publish a one-off ride for same Monday | Blocked: "You already have an active ride on this date." | P0 |
| REC-018 | Template ride visible on correct date only | Template Mon–Fri | Seeker searches Saturday | No template rides shown | P0 |
| REC-019 | Holiday handling — public holiday ride | Template generates ride on August 15 (Independence Day) | Check if ride is generated | System either: (a) generates ride (user decides to skip manually) or (b) skips public holidays automatically. Behavior must be defined | P1 |
| REC-020 | Template with vehicle removed mid-lifecycle | Giver removes vehicle from account | System attempts to generate next week's rides | Ride generation fails; giver notified: "Vehicle removed — update your template before rides can be generated." | P1 |
| REC-021 | Multiple templates per giver | — | Giver creates 2 templates: one morning, one evening | Both templates active; both generate rides; each is independent | P2 |
| REC-022 | One active ride per giver — morning template + evening template conflict | Morning template generates ride for Day X; evening template also generates a ride for Day X | Check | If the one-active-ride rule applies per-day, evening ride generation blocked. Must clarify: "one active at any given TIME" vs "one active at any DATE." | P1 |
| REC-023 | Template ride with women-only flag | Female giver creates women-only template | Template rides generated | All generated rides have womenOnly=true | P1 |
| REC-024 | Seeker sees "Recurring" badge on template rides | Template ride in search results | Search | Visual indicator that this is a recurring ride (e.g., ↻ icon); helps seekers understand consistency | P2 |
| REC-025 | Recurring ride history in giver's stats | Template active for 4 weeks | Giver views stats | Shows total rides from this template; ECO points contributed by template | P2 |

---

## Missing Business Rules / Risks

1. **"Rolling 7 days" generation window is an assumption.** The spec doesn't define how far ahead template rides are generated. This must be explicitly configured (7 days, 14 days, 30 days rolling window).
2. **Template ride conflicts with one-active-ride rule not clearly resolved.** Does a PUBLISHED template ride count as an "active ride" for the same-day one-off rule? This creates ambiguity for morning + evening commuters.
3. **Public holiday calendar not integrated.** Without a holiday calendar, givers must manually skip rides on Telangana/national public holidays. An optional holiday-aware generation toggle is needed.
4. **Seeker cannot subscribe to a recurring slot.** A seeker must individually request each day's ride. A "subscribe" feature where a seeker auto-requests all rides from a template would dramatically improve UX.
5. **Template generation race condition.** If the generation job runs while a previously generated ride is being deleted, a duplicate might be created. Idempotency must be ensured.
6. **No notification when template generates new rides.** Seekers who requested last week's ride are not notified that this week's ride is now available.
7. **Multiple templates may violate the one-active-ride-per-giver rule.** Two active morning templates generating rides for the same day would conflict. Template-level conflict detection is not mentioned.
8. **Template ride modification after seeker booking.** If a giver edits a template (e.g., changes time), seekers who booked earlier rides on the template are not affected — but this is unintuitive. Seekers expect consistency on a recurring ride.
