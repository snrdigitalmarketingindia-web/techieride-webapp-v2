# TechieRide QA Spec — 04: Ride Search

**Module:** Ride Search & Discovery  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Ride Seekers (EMPLOYEE_VERIFIED) search for available rides by specifying origin, destination, and date. The matching engine uses haversine distance to find rides whose origin and destination are within a configurable radius (e.g., 3 km) of the seeker's specified points. Search results are sorted by departure time. Givers must not see their own rides in search results.

---

## Search Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| origin | Yes | Seeker's pickup location |
| destination | Yes | Seeker's drop location |
| date | Yes | Ride date (defaults to today) |
| radius | No | Search radius in km (default: 3 km) |
| seatsNeeded | No | Number of seats (default: 1) |
| womenOnly | No | Filter for women-only rides |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| SRC-001 | Basic search returns matching rides | EMPLOYEE_VERIFIED seeker; ride posted for tomorrow from HITEC City to Gachibowli | Search: origin=HITEC City, destination=Gachibowli, date=tomorrow | Matching ride(s) appear in results | Core search function | P0 |
| SRC-002 | Search with today's date (IST) | Ride exists for today with future departure | Search date = today (IST current date) | Rides with future departure times today appear; past-departure rides hidden | P0 |
| SRC-003 | Search with past date | — | Search date = yesterday | Empty results with message: "No rides available for past dates." OR error: "Please select today or a future date." | P0 |
| SRC-004 | Search returns empty state message | No rides match the criteria | Search for route with no available rides | UI shows: "No rides found for this route. Try adjusting your search." — no crash, no blank screen | P1 |
| SRC-005 | Radius-based matching — within 3 km | Ride origin = HITEC City Metro; seeker searches origin = Inorbit Mall (1.2 km away) | Run search | Ride appears in results (within default 3 km radius) | Core matching logic | P0 |
| SRC-006 | Radius-based matching — outside 3 km | Ride origin = HITEC City; seeker searches origin = Ameerpet (6 km away) | Run search | Ride does NOT appear in results | P0 |
| SRC-007 | Radius-based matching — exactly at 3 km boundary | Ride origin point exactly 3 km from search origin | Run search | Edge case: ride appears (inclusive boundary) — boundary behavior must be documented | P1 |
| SRC-008 | Results sorted by departure time ascending | Multiple rides match criteria | Run search | Results ordered earliest departure first | P1 |
| SRC-009 | Giver cannot see own ride in search results | User is BOTH role (giver+seeker); giver posts ride | Giver searches for rides on same route and date | Own ride is excluded from search results | P0 |
| SRC-010 | Full ride hidden from search (0 available seats) | Ride has 2 seats; 2 bookings confirmed | Run search | Full ride does not appear in results | Prevents false hope for seekers | P0 |
| SRC-011 | CANCELLED ride hidden from search | Ride status = CANCELLED | Run search | Cancelled ride not visible | P0 |
| SRC-012 | COMPLETED ride hidden from search | Ride status = COMPLETED | Run search | Completed ride not visible | P0 |
| SRC-013 | ONGOING ride hidden from search | Ride status = ONGOING | Run search | Ongoing ride not visible (no new bookings accepted mid-ride) | P0 |
| SRC-014 | DRAFT ride hidden from search | Ride status = DRAFT | Run search | Draft ride not visible to seekers | P0 |
| SRC-015 | Unverified seeker cannot search (EMAIL_VERIFIED) | Status = EMAIL_VERIFIED | Attempt search | Blocked: "Complete employee verification to search for rides." | P0 |
| SRC-016 | EMAIL_VERIFICATION_PENDING user blocked from search | Not email-verified | Attempt search | Blocked with appropriate message | P0 |
| SRC-017 | Search result shows correct available seats | Ride has 3 total seats, 1 confirmed booking | Run search | Result shows "2 seats available" | P1 |
| SRC-018 | Pagination — first page | 25 rides match search | Run search (default page size = 10) | First 10 results returned; pagination controls visible | P2 |
| SRC-019 | Pagination — second page | Same 25 rides | Click "Next" or page 2 | Results 11–20 returned | P2 |
| SRC-020 | Filter: women-only rides | Female seeker; mix of regular and women-only rides | Toggle women-only filter ON | Only women-only rides shown | P1 |
| SRC-021 | Women-only ride not visible to male seeker | Male seeker; women-only ride available on route | Run search without any filter | Women-only ride does not appear for male seeker at all | P0 |
| SRC-022 | Search with partial/fuzzy origin | Ride origin = "HITEC City, Hyderabad"; search origin = "Hitec" | Run search | Ride appears (case-insensitive, partial match) OR geocoding resolves to same coordinates | P1 |
| SRC-023 | Search result card shows giver details | Valid search results | View result card | Card shows: giver name, vehicle (make/model/color), departure time, seats available, rating | P1 |
| SRC-024 | Search result card does NOT show giver phone | Valid search results | View result card | Giver's phone number is NOT visible in search results (only after confirmation) | Privacy / P0 |
| SRC-025 | Search with seatsNeeded = 2 | Ride has 1 seat available; another has 2 available | Search with seatsNeeded=2 | Only ride with 2+ available seats shown | P1 |
| SRC-026 | Search for a date 60 days in future | No rides exist for that date | Run search | Empty state: "No rides found." (no error) | P2 |
| SRC-027 | Concurrent searches from multiple users | 10 users search simultaneously | Load test: 10 concurrent GET /rides/search requests | All 10 return results within 2 seconds; no 5xx errors | Performance / P1 |
| SRC-028 | Search response time SLA | 1000 rides in DB | Run search | Response within 800 ms (p95) | P1 |
| SRC-029 | Search API with missing required parameter (no destination) | — | GET /rides/search?origin=HITEC City&date=2026-06-15 | 400 Bad Request: "destination is required" | P1 |
| SRC-030 | Search injection prevention | — | GET /rides/search?origin='; DROP TABLE rides;-- | Input sanitized; no DB damage; 400 or empty result | Security / P0 |

---

## Missing Business Rules / Risks

1. **Geocoding / coordinate storage not enforced.** If origin/destination are stored as free text, haversine matching cannot work. The system needs to geocode user input (via Google Maps API) at ride creation and search time and store lat/lng.
2. **Default radius (3 km) not configurable by admin.** Hyderabad traffic patterns may require a smaller or larger default for different zones (e.g., Old City vs Outer Ring Road).
3. **Search index freshness undefined.** If rides are indexed, how soon does a newly published ride appear in search? Real-time or eventual consistency?
4. **Departure time filtering missing.** Seekers cannot filter by "rides between 8:00 AM and 10:00 AM." This is critical for IT shift employees.
5. **Sort options not available.** Seekers cannot sort by rating, proximity, or price (if future feature).
6. **No map-based search UI.** Free-text entry for Hyderabad localities (HITEC City, Madhapur, Kondapur, Gachibowli) is ambiguous — map pin selection is safer.
7. **Repeated search not debounced.** Typing in search bar may trigger an API call per keystroke.
8. **No "notify me" feature.** If no rides exist for a route today, seeker cannot set an alert for when a matching ride is posted.
9. **ONGOING ride search behavior undefined.** The spec says hide ONGOING rides — but what about a ride that starts 30 min from now? Cutoff for "bookable" window not defined.
10. **Search result cache invalidation.** If giver cancels ride while seeker is viewing results, the stale result may still show. Cache TTL must be short or cache must be invalidated on ride state change.
