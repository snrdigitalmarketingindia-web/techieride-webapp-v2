# TechieRide QA Spec — 15: Women-Only Rides

**Module:** Women-Only Ride Visibility & Access Control  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Women-only rides are a safety-first feature designed for female IT employees commuting in Hyderabad. A ride giver can mark their ride as "Women Only." Such rides are completely hidden from male-identified users — in search results, via direct URL, and via API. The gender filter operates at the server level (not just UI). A "Women Only" badge is visible on the ride card for eligible female seekers. Givers can convert a women-only ride to an open ride before any bookings are confirmed.

---

## Gender Definitions for This Module

| Gender Value | Visibility of Women-Only Rides |
|---|---|
| FEMALE | Visible |
| MALE | Hidden |
| PREFER_NOT_TO_SAY / OTHER / null | Hidden (conservative default) |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| WOM-001 | Giver marks ride as women-only during creation | Female giver (gender=FEMALE); DRIVER_VERIFIED | Toggle "Women Only" on ride creation form → create ride | Ride created with womenOnly=true; badge shown on giver's My Rides card | Core safety feature | P0 |
| WOM-002 | Women-only ride visible to female seeker in search | womenOnly=true ride PUBLISHED | Female seeker (gender=FEMALE) searches same route/date | Ride appears with "Women Only" badge | P0 |
| WOM-003 | Women-only ride hidden from male seeker in search | womenOnly=true ride PUBLISHED | Male seeker (gender=MALE) searches | Ride does not appear in results | P0 |
| WOM-004 | Women-only ride hidden from male seeker via API | — | Male seeker calls GET /rides/search with valid auth | Women-only ride not in response JSON | Security / P0 |
| WOM-005 | Women-only ride direct URL access blocked for male | Male seeker has rideId | Male seeker navigates to /rides/:id directly | 403: "You do not have access to this ride." or redirect to search | Security / P0 |
| WOM-006 | Male seeker cannot book women-only ride via API | Male seeker has rideId | POST /ride-requests with women-only rideId | 403: "This ride is restricted to female passengers." | Security / P0 |
| WOM-007 | PREFER_NOT_TO_SAY gender cannot see women-only rides | User gender = PREFER_NOT_TO_SAY | Search | Women-only rides hidden (conservative default) | P1 |
| WOM-008 | Null/unset gender cannot see women-only rides | User has no gender set in profile | Search | Women-only rides hidden | P1 |
| WOM-009 | Women-only badge visible on ride card for female seekers | Female seeker views search results | — | Badge clearly labeled (e.g., "♀ Women Only" or a gender-neutral icon with label) | P1 |
| WOM-010 | Women-only filter toggle — female seeker filters to see only women-only rides | Female seeker; mix of regular and women-only rides | Toggle "Women Only" filter ON | Only women-only rides shown | P1 |
| WOM-011 | Women-only filter toggle OFF shows all rides (for female seeker) | Female seeker | Toggle filter OFF | Both regular and women-only rides shown | P1 |
| WOM-012 | Giver converts women-only to open ride — no bookings | Ride is womenOnly=true; 0 confirmed bookings | Giver edits ride → untoggle "Women Only" → save | Ride becomes open (womenOnly=false); visible to all seekers; no notification needed (no affected passengers) | P1 |
| WOM-013 | Giver cannot convert women-only to open ride after booking confirmed | womenOnly=true ride has 1 CONFIRMED female seeker | Giver attempts to remove women-only flag | Error: "Cannot change ride type after bookings are confirmed." | Safety: confirmed female passenger assumed women-only environment | P0 |
| WOM-014 | Admin can override women-only visibility | Admin viewing user management | Admin opens women-only ride | Admin can view ride details regardless of own gender | P1 |
| WOM-015 | Male giver cannot mark ride as women-only | Male giver (gender=MALE) | Toggle "Women Only" | Blocked: "Women-only rides can only be created by female givers." OR toggle hidden for male givers | P0 |
| WOM-016 | Women-only toggle not shown to male givers | Male giver on ride creation screen | — | Toggle absent from form | P1 |
| WOM-017 | Women-only ride appears in female-only search count | 2 regular + 1 women-only ride available | Female seeker searches; views result count | Result count = 3 (all 3 shown to female seeker) | P1 |
| WOM-018 | Male seeker search count does not include women-only | Same 3 rides | Male seeker searches | Result count = 2 (women-only excluded) | P1 |
| WOM-019 | Women-only ride in templates | Female giver creates template with women-only | Template generates rides | All generated rides have womenOnly=true | P1 |
| WOM-020 | Gender change after booking — female seeker changes to MALE | Female seeker has CONFIRMED booking on women-only ride; changes gender to MALE | Admin or system re-evaluates | Policy decision: booking remains (grandfathered), but future bookings blocked. Must be defined. | P1 |
| WOM-021 | Admin can report and investigate women-only access breach | Admin suspects a male user accessed women-only content | Admin queries access logs | Admin can filter logs by rideId + gender to verify no unauthorized access | Compliance | P1 |
| WOM-022 | Women-only ride booking confirmation email mentions women-only | Female seeker gets confirmed | Email received | Email body mentions "Women-Only Ride" clearly | P2 |
| WOM-023 | Women-only badge on My Bookings for seeker | Female seeker has confirmed women-only booking | View My Bookings | Badge visible on booking card | P2 |
| WOM-024 | Women-only ride created by BOTH-role female giver | Female giver with BOTH role | Create women-only ride | Allowed; own ride hidden from her seeker search view (same rule as regular rides) | P1 |
| WOM-025 | Non-female giver attempts API POST with womenOnly=true | Male giver uses API | POST /rides with womenOnly: true | 403: "Only female givers can create women-only rides." | Security | P0 |

---

## Missing Business Rules / Risks

1. **Gender verification not implemented.** Any user can set gender=FEMALE in their profile to access women-only rides. There is no verification of biological or legal gender. This is a significant safety gap.
2. **Profile gender change audit not tracked.** If a user's gender changes (legitimately or maliciously), there's no log of the change for admin review.
3. **No women-only corporate office/company filter.** Some companies may want women-only rides restricted to employees of specific companies — not yet possible.
4. **Women-only ride giver gender rule needs legal review.** Blocking male givers from posting women-only rides may conflict with India's non-discrimination laws in some interpretations. Legal counsel review recommended.
5. **Non-binary / transgender users not addressed.** The current binary (FEMALE visible, MALE hidden) does not account for non-binary gender identities. A more inclusive policy is needed.
6. **Admin gender bypass not consistently defined.** For incident investigations, admins need to access all rides. If the admin's profile gender is MALE, women-only rides should still be accessible in admin context — this bypass must be explicitly implemented and not leak into seeker context.
7. **No women-only indicator in admin ride list.** If admin is browsing all rides in a table view, women-only rides should have a visual indicator for quick identification.
8. **Giver conversion of women-only to open ride notification.** If a PENDING (not yet confirmed) female seeker's request is on a women-only ride and the giver converts to open, she should be notified of the policy change before accepting.
