# TechieRide QA Spec — 05: Ride Visibility

**Module:** Ride Listing & Visibility Rules  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Ride visibility governs when and to whom a ride appears in search results. A ride should appear immediately after publishing (or within a defined freshness window) and must be hidden based on its status, seat availability, and demographic rules (women-only). This spec covers the full visibility matrix and regression scenarios for rides that should be visible but aren't, or rides that should be hidden but still appear.

---

## Visibility Matrix

| Ride Status | Seats Available | Women-Only | Male Seeker | Female Seeker | Giver (own ride) |
|-------------|-----------------|------------|-------------|---------------|------------------|
| DRAFT | Any | Any | Hidden | Hidden | Hidden (in search) |
| PUBLISHED | > 0 | No | Visible | Visible | Hidden |
| PUBLISHED | > 0 | Yes | Hidden | Visible | Hidden |
| PUBLISHED | 0 | Any | Hidden | Hidden | Hidden |
| ONGOING | Any | Any | Hidden | Hidden | Hidden |
| COMPLETED | Any | Any | Hidden | Hidden | Hidden |
| CANCELLED | Any | Any | Hidden | Hidden | Hidden |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| VIS-001 | Ride visible immediately after publish | DRIVER_VERIFIED giver publishes ride | Seeker searches same route within 30 seconds of publish | Ride appears in results | Core visibility | P0 |
| VIS-002 | Ride visible after page refresh | Ride published; seeker on search results page | Seeker refreshes browser | Ride remains in results; not disappeared | Regression | P0 |
| VIS-003 | Ride visible after logout and login cycle | Seeker found a ride; logs out; logs in | Seeker searches again for same route/date | Ride still visible (no session-based caching issue) | Regression | P0 |
| VIS-004 | Ride visible when seats remain | Ride has 2 of 4 seats confirmed | Search | Ride appears with "2 seats available" | P0 |
| VIS-005 | Ride hidden when 0 seats remain | All 4 seats confirmed | Search | Ride does not appear in results | P0 |
| VIS-006 | Ride hidden when CANCELLED | Giver cancels published ride | Search immediately after cancellation | Ride not in results | P0 |
| VIS-007 | Ride hidden when COMPLETED | Ride marked COMPLETED by giver | Search | Ride not in results | P0 |
| VIS-008 | Ride hidden when ONGOING | Giver starts ride (status = ONGOING) | Search | Ride not in results (no new bookings during active ride) | P0 |
| VIS-009 | Ride visible for correct date only | Ride scheduled for June 15; seeker searches June 16 | Run search for June 16 | Ride does not appear | P0 |
| VIS-010 | Ride visible for correct date | Ride scheduled for June 15 | Run search for June 15 | Ride appears | P0 |
| VIS-011 | DRAFT ride invisible to seekers | Giver saves DRAFT without publishing | Seeker searches same route/date | DRAFT ride not visible | P0 |
| VIS-012 | Women-only ride hidden from male seeker | Women-only ride PUBLISHED | Male seeker (gender=MALE in profile) searches | Ride not in results | P0 |
| VIS-013 | Women-only ride visible to female seeker | Women-only ride PUBLISHED | Female seeker (gender=FEMALE) searches | Ride appears with women-only badge | P0 |
| VIS-014 | Women-only visibility enforced at API level | Women-only ride PUBLISHED | Male seeker calls GET /rides/search?origin=...&date=... directly via Postman with valid auth token | Response does not include women-only ride | Security / P0 |
| VIS-015 | Non-women-only ride visible to both genders | Standard ride PUBLISHED | Male and female seekers search | Both see the ride | P0 |
| VIS-016 | Giver cannot see own ride in search | BOTH-role user (giver+seeker) published a ride | Same user performs search on that route/date | Own ride absent from results | P0 |
| VIS-017 | Ride disappears from search when last seat filled | 1 seat remaining; concurrent booking | Second seeker confirms last seat; first seeker refreshes | Ride no longer in results | Race condition / P0 |
| VIS-018 | Ride reappears if approved booking is rejected | Ride had 1 available seat; giver rejects a request | Check search results after rejection | Seat count restored; ride visible again (if was hidden due to 0 seats) | P1 |
| VIS-019 | Ride reappears if seeker cancels pre-approval request | Seeker cancels pending request | Search again | Availability unchanged; ride still visible | P1 |
| VIS-020 | Duplicate ride detection — same giver, same route, same time | Giver already has PUBLISHED ride | Giver attempts to publish another ride with identical route + time + date | System warns: "You already have an active ride on this route at this time." | P1 |
| VIS-021 | Missing ride detection — giver sees PUBLISHED ride on My Rides; seeker cannot find it | Ride is PUBLISHED with seats available | Cross-check: seeker searches exact route/date | Ride must be findable. If not, flag as search index bug. | Regression / P0 |
| VIS-022 | Past departure time ride hidden on day-of | Ride departure was 08:00 IST; current time is 09:00 IST | Seeker searches today | Ride with past departure hidden automatically | P0 |
| VIS-023 | Ride from inactive/suspended giver hidden | Giver's account suspended by admin | Seeker searches | Ride no longer visible in search results | P0 |
| VIS-024 | PUBLISHED ride count consistent between search and My Rides | Giver publishes ride | Check count on My Rides (1) vs search results (should match) | Counts consistent — no phantom rides or missing rides | Regression / P1 |
| VIS-025 | Search result updates after seat confirmation (real-time) | Ride has 2 seats; seeker on results page; giver approves another booking | Seeker does not refresh | Result card should update (via polling or WebSocket) OR become stale (behavior must be defined) | P1 |
| VIS-026 | Ride visible across different IST time zones (travel test) | Ride posted from Hyderabad (IST) | Seeker searches from VPN with UTC timezone | Date handling must be IST-anchored on server side; ride appears on correct IST date | P1 |
| VIS-027 | Search freshness after bulk template publish | Giver publishes template that generates 5 rides at once | Seeker searches over next 5 days | All 5 rides visible on respective dates | P1 |
| VIS-028 | Ride visibility with zero-radius exact match | Seeker enters exact same coordinates as ride origin | Search | Ride appears (0 km away — within any radius) | P2 |
| VIS-029 | Ride not duplicated in results | One PUBLISHED ride matches criteria | Run search | Ride appears exactly once in results (no duplicate rows) | P1 |
| VIS-030 | Admin can view all rides regardless of status | Admin user | Admin navigates to /admin/rides | All rides visible (DRAFT, PUBLISHED, CANCELLED, etc.) — admin bypass of seeker visibility rules | P1 |

---

## Missing Business Rules / Risks

1. **Search index update latency not defined.** If rides are cached or indexed (Elasticsearch, Redis), the latency between publish and search visibility must be documented as an SLA (e.g., "visible within 5 seconds").
2. **Past-departure auto-hiding not confirmed implemented.** There's no mention of a scheduled job or real-time filter that hides rides whose departure time has passed on the current day.
3. **Suspended giver ride visibility undefined.** When admin suspends a giver, should their active PUBLISHED rides be auto-cancelled or just hidden? Seekers with CONFIRMED bookings for a suspended giver's ride are left in limbo.
4. **Gender attribute reliability.** Women-only visibility depends on the `gender` field being accurate in the user profile. There's no verification of this field — any male user could set gender=FEMALE to see women-only rides.
5. **No "just published" badge.** Seekers cannot distinguish freshly published rides from older ones.
6. **Ride expiry for no-activity PUBLISHED rides.** If a giver publishes a ride and no one books after N days, should it auto-expire?
7. **"Near full" indicator missing.** A ride with 1 seat remaining looks the same as one with 4 seats — urgency indicator could improve booking conversion.
8. **No saved search / watchlist.** Seekers cannot save a frequent commute route and get notified when a new matching ride is posted.
