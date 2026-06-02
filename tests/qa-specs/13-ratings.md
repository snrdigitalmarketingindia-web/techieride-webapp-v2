# TechieRide QA Spec — 13: Ratings & Reviews

**Module:** Post-Ride Ratings  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Active

---

## Overview

Ratings are the primary trust signal on TechieRide. After a ride is COMPLETED, both parties can rate each other: seekers rate the giver (driving quality, punctuality, behavior) and givers rate each seeker (behavior, punctuality). Ratings are 1–5 stars with an optional text review. Duplicate ratings are blocked. Self-rating is blocked. Ratings are only allowed on COMPLETED rides. The average rating is recalculated dynamically and displayed on user profiles. A 24-hour edit window is provided.

---

## Rating Business Rules

| Rule | Detail |
|------|--------|
| Who rates whom | Seeker → Giver; Giver → Seeker |
| When | Only after ride = COMPLETED |
| Scale | 1–5 stars (integer) |
| Duplicates | Blocked (one rating per pairing per ride) |
| Self-rating | Blocked |
| Edit window | 24 hours from submission |
| Average | Rolling average of all received ratings |
| Rating on cancelled ride | NOT allowed |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| RAT-001 | Seeker rates giver after COMPLETED ride | Ride status = COMPLETED; seeker was DEBOARDED | Seeker opens completed ride → taps "Rate Giver" → selects 4 stars → submits | Rating saved; giver's average rating recalculated; seeker sees "Thank you for your rating!" | Core trust system | P0 |
| RAT-002 | Giver rates seeker after COMPLETED ride | Ride COMPLETED | Giver opens completed ride → taps "Rate Passenger [Name]" → selects 5 stars → submits | Rating saved; seeker's average rating recalculated | P0 |
| RAT-003 | Rating with text review | Any rating | Add review text: "Punctual and polite, great ride!" → submit | Rating + text saved; text visible on profile/ride detail | P1 |
| RAT-004 | Rating = 1 (minimum) accepted | — | Submit 1-star rating | Accepted; review saved; average recalculated | P0 |
| RAT-005 | Rating = 5 (maximum) accepted | — | Submit 5-star rating | Accepted; review saved | P0 |
| RAT-006 | Rating = 0 rejected | — | POST /ratings with stars=0 | 400: "Rating must be between 1 and 5." | P0 |
| RAT-007 | Rating = 6 rejected | — | POST /ratings with stars=6 | 400: "Rating must be between 1 and 5." | P0 |
| RAT-008 | Duplicate rating blocked | Seeker already rated this ride's giver | Seeker attempts to rate same giver for same ride again | Error: "You have already rated this ride." | P0 |
| RAT-009 | Self-rating blocked (BOTH-role user) | BOTH-role user | User attempts to rate themselves via API | 403: "You cannot rate yourself." | P0 |
| RAT-010 | Rating before ride COMPLETED blocked | Ride status = ONGOING | Seeker attempts to rate giver | Error: "Ratings are only available after the ride is completed." | P0 |
| RAT-011 | Rating for CANCELLED ride blocked | Ride status = CANCELLED | Seeker attempts to rate | Error: "Ratings are not available for cancelled rides." | P0 |
| RAT-012 | Rating for ride in PENDING/APPROVED state blocked | — | Seeker attempts to rate before completion | 403 with appropriate message | P0 |
| RAT-013 | Average rating calculated correctly — 3 ratings | User receives ratings: 4, 3, 5 | Check user profile | Average = 4.0 stars | P0 |
| RAT-014 | Average rating shows decimal precision | User receives: 5, 4, 3 | Check profile | Average = 4.0; UI shows "4.0 ★" | P1 |
| RAT-015 | Average rating shown on profile page | User has 10 ratings | Navigate to user profile | Shows "4.3 ★ (10 ratings)" or similar | P1 |
| RAT-016 | Rating visible on ride search result card | Giver has average 4.5 | Search results | Giver's average rating shown on ride card | Trust signal | P1 |
| RAT-017 | NO_SHOW seeker cannot be rated by giver | Passenger was marked NO_SHOW | Giver opens completed ride → looks for NO_SHOW passenger rating option | Rating option either not shown OR clearly labeled "Cannot rate — no show" | P1 |
| RAT-018 | NO_SHOW seeker cannot rate giver | Seeker was marked NO_SHOW | Seeker attempts POST /ratings for this ride | 403: "You were marked No Show and cannot rate this ride." | P1 |
| RAT-019 | Edit rating within 24 hours | Seeker submitted 3-star rating 2 hours ago | Seeker opens rating → changes to 4 stars → saves | Rating updated; average recalculated; editedAt timestamp recorded | P1 |
| RAT-020 | Edit rating after 24 hours blocked | Rating submitted 25 hours ago | Seeker attempts edit | Error: "Rating editing window (24 hours) has passed." | P1 |
| RAT-021 | Rating prompt shown after ride completion | Ride marked COMPLETED | Seeker opens app next time or gets notification | Rating prompt shown: "How was your ride with [GiverName]?" | P1 |
| RAT-022 | Rating prompt dismissible | — | Seeker dismisses rating prompt | Prompt gone; seeker can still rate from ride history later | P2 |
| RAT-023 | Anonymous review option (if implemented) | — | Seeker submits rating anonymously | Name hidden from giver; admin can see author | P2 |
| RAT-024 | Profanity in review text flagged | — | Submit review: "This driver is a f***ing idiot" | Either blocked by content filter OR flagged for admin review | P1 |
| RAT-025 | API: unauthorized user cannot submit rating | — | POST /ratings without auth | 401: "Authentication required." | Security | P0 |
| RAT-026 | Non-participant cannot rate | User not on this ride attempts to rate giver | POST /ratings with rideId they weren't part of | 403: "You are not a participant in this ride." | Security | P0 |
| RAT-027 | Rating summary on giver profile: breakdown | Giver has 20 ratings | View giver's public profile | Breakdown shown: "5★: 8, 4★: 6, 3★: 4, 2★: 1, 1★: 1" | P2 |
| RAT-028 | New user with 0 ratings shows "No ratings yet" | New DRIVER_VERIFIED giver | Seeker views giver's ride card | Shows "No ratings yet" instead of "0.0 ★" | P2 |
| RAT-029 | Rating count increments after each new rating | User has 5 ratings | 6th rating submitted | Profile shows "X.X ★ (6 ratings)" | P1 |
| RAT-030 | Rating not affected by ride data edits | Ride data edited by admin | Re-check user's ratings | Ratings remain unchanged (stored separately from ride record) | Data integrity / P1 |

---

## Missing Business Rules / Risks

1. **Rating not mandatory.** There's no incentive or gentle pressure to complete ratings. Low completion rates will leave the trust system sparse.
2. **No minimum rides before ratings displayed.** A user with 1 five-star rating appears as "5.0 ★ (1 rating)" — this is easily gamed. A minimum of 3–5 ratings before displaying average is standard practice.
3. **Report/flag rating feature missing.** A giver who receives an unfair 1-star rating has no recourse. A "Flag as inappropriate" option is needed.
4. **Admin cannot delete a specific rating.** If a fraudulent or abusive rating is submitted, there's no admin workflow to remove it.
5. **NO_SHOW rating policy needs clarification.** The spec says NO_SHOW cannot rate — but what if a seeker was marked NO_SHOW unfairly? They have no ability to contest or submit their side.
6. **Rating weight by ride count not implemented.** A giver with 1 five-star rating ranks the same as one with 50 five-star ratings if averages are equal. Bayesian averaging (like IMDb's weighted rating) is more accurate.
7. **ECO points for completing a rating not specified.** If ratings are important, small ECO point rewards for completing them would drive participation.
8. **Text review length not capped.** Very long reviews could affect UI layout. A 500-character maximum should be enforced.
9. **Multi-language reviews not handled.** Telugu, Hindi, and English reviews may need moderation considerations specific to the Hyderabad user base.
