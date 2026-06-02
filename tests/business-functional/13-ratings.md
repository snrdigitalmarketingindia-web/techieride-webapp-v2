# 13 — Ratings & Reviews

**Platform:** TechieRide v2 · **Module:** Post-Ride Ratings  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Ratings build platform trust. After a ride is COMPLETED, both givers and seekers can rate each other (1–5 stars). Ratings are visible on profiles and affect Trust Score. Self-rating is blocked. Duplicate rating is blocked. Rating is only available post-completion — not before or during the ride.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| RAT-01 | Seeker rates giver after COMPLETED ride | Ride COMPLETED | POST /ratings with rideId, rateeId (giver), stars: 5 | 201 Created; rating stored | Trust building | P0 |
| RAT-02 | Giver rates seeker after COMPLETED ride | Ride COMPLETED | POST /ratings with rideId, rateeId (seeker), stars: 4 | 201 Created; rating stored | Trust building | P0 |
| RAT-03 | Rating before ride COMPLETED blocked | Ride ONGOING | POST /ratings | 400; ride not completed | Rating gate | P0 |
| RAT-04 | Rating on PUBLISHED ride blocked | Ride PUBLISHED | POST /ratings | 400 Bad Request | Rating gate | P0 |
| RAT-05 | Duplicate rating by same user blocked | Rating already submitted | POST /ratings again | 409 Conflict | Rating integrity | P0 |
| RAT-06 | Self-rating blocked | Seeker tries to rate themselves | POST /ratings with rateeId = own userId | 400/403 Forbidden | Integrity | P0 |
| RAT-07 | Non-participant cannot rate | User not on ride | POST /ratings with foreign rideId | 403 Forbidden | Authorization | P0 |
| RAT-08 | Rating 1 star accepted | Ride COMPLETED | POST /ratings with stars: 1 | 201 Created | Min boundary | P1 |
| RAT-09 | Rating 5 stars accepted | Ride COMPLETED | POST /ratings with stars: 5 | 201 Created | Max boundary | P1 |
| RAT-10 | Rating 0 stars rejected | None | POST /ratings with stars: 0 | 400 Bad Request | Min boundary | P0 |
| RAT-11 | Rating 6 stars rejected | None | POST /ratings with stars: 6 | 400 Bad Request | Max boundary | P0 |
| RAT-12 | Fractional rating rejected | None | POST /ratings with stars: 3.5 | 400 or rounded to integer | Data integrity | P1 |
| RAT-13 | Average rating calculated correctly | 3 ratings: 5, 4, 3 | GET user profile | averageRating = 4.0 | Metric accuracy | P0 |
| RAT-14 | Average rating visible on profile | User has ratings | GET /users/{id} or profile | averageRating field present | Transparency | P1 |
| RAT-15 | Rating count visible on profile | User has 5 ratings | GET profile | ratingCount = 5 | Context for average | P1 |
| RAT-16 | Unauthenticated user cannot rate | No token | POST /ratings | 401 Unauthorized | Security | P0 |
| RAT-17 | Review text (comment) optional with rating | None | POST /ratings with comment | 201 Created; comment stored | Qualitative feedback | P2 |
| RAT-18 | Review text visible on profile | Rating with comment | GET profile | Comment visible | Transparency | P2 |
| RAT-19 | Rating edit within 24h window | Rating just submitted | PATCH /ratings/{id} | 200 OK; updated | Edit window | P2 |
| RAT-20 | Rating edit blocked after 24h | Rating submitted 25h ago | PATCH /ratings/{id} | 400 or 403; window closed | Edit window enforcement | P2 |
| RAT-21 | NO_SHOW seeker — giver can still rate them | Seeker marked NO_SHOW | POST /ratings for NO_SHOW seeker | 201 Created; 1-star no-show rating possible | Accountability | P1 |
| RAT-22 | NO_SHOW seeker cannot rate giver | Seeker was NO_SHOW | Seeker POST /ratings | 200 or 403 (policy decision needed) | Edge case | P1 |
| RAT-23 | Rating on CANCELLED ride blocked | Ride CANCELLED | POST /ratings | 400 | State gate | P0 |
| RAT-24 | Both parties can rate independently | Seeker rates giver; giver rates seeker | Check both | Both ratings stored correctly | Mutual rating | P1 |
| RAT-25 | Regression — rating persists after logout | Rating submitted | Logout → login → check profile | Rating still visible | State persistence | P0 |

---

## UAT Acceptance Criteria

- [ ] Rating prompt appears immediately after ride completion for both giver and seeker
- [ ] Self-rating shows a clear "You cannot rate yourself" message
- [ ] Average rating updates in real time on the rated user's profile
- [ ] Ratings from non-participants are blocked with a clear error
- [ ] Rating out of range (0 or 6) returns a validation error immediately

---

## Missing Business Rules / Risks

1. **Rating visibility policy undefined** — can all users see all ratings, or only public profiles?
2. **No profanity filter on review comments** — offensive comments could be stored and displayed
3. **No rating for cancelled rides** — if giver cancels after seeker confirms, seeker has no way to rate the experience
4. **NO_SHOW seeker rating policy not defined** — should NO_SHOW seekers be able to rate?
5. **No minimum ride completion for rating eligibility** — a new account could rate after first ride
6. **No admin override for false/malicious ratings** — a competitor or troll could leave false 1-star ratings
7. **Rating system not connected to Trust Score** — ratings exist but no scoring algorithm consumes them yet
8. **No notification to rated user** — rated user does not know they've been rated until they check profile
