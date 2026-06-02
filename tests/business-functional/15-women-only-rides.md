# 15 — Women-Only Rides

**Platform:** TechieRide v2 · **Module:** Gender-Restricted Rides  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Women-only rides are a safety and comfort feature that allows female givers to offer rides exclusively to female seekers. This is critical for trust and adoption by female IT professionals. **Note: This feature is planned but not yet fully implemented.** The schema may have a flag; the enforcement layer (search filter + API gate) needs to be built and validated.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| WOR-01 | Giver marks ride as women-only | DRIVER_VERIFIED female giver | POST /rides with womenOnly: true | 201 Created; womenOnly flag set | Core feature | P0 |
| WOR-02 | Women-only badge visible on ride card | womenOnly ride published | Search or giver My Rides | "Women Only" badge visible | UX transparency | P0 |
| WOR-03 | Women-only ride hidden from male seekers in search | womenOnly = true | Male seeker GET /rides/search | Women-only ride absent from results | Gender gate | P0 |
| WOR-04 | Women-only ride visible to female seekers in search | womenOnly = true | Female seeker GET /rides/search | Women-only ride present | Intended visibility | P0 |
| WOR-05 | Male seeker cannot book women-only ride via API | womenOnly = true | Male seeker POST /ride-requests | 403 Forbidden | API-level gate | P0 |
| WOR-06 | Female seeker can book women-only ride | womenOnly = true | Female seeker POST /ride-requests | 201 Created | Core booking | P0 |
| WOR-07 | Male giver cannot mark ride as women-only | Male giver | POST /rides with womenOnly: true | 400/403; only female givers can create women-only rides | Gender consistency | P0 |
| WOR-08 | Gender stored in user profile | Female user | GET /auth/me | gender = "FEMALE" field present | Data foundation | P0 |
| WOR-09 | Gender not set — default behavior for women-only rides | Gender null | Female seeker without gender set searches | Women-only rides hidden (conservative default) | Safety-first default | P1 |
| WOR-10 | Admin can view all rides including women-only | Admin | Admin GET /admin/rides | Women-only rides visible with flag | Admin visibility | P1 |
| WOR-11 | Giver can convert women-only to open ride (before bookings) | womenOnly ride; 0 confirmed seekers | PATCH /rides/{id} with womenOnly: false | 200 OK; flag cleared; ride now open | Giver flexibility | P1 |
| WOR-12 | Cannot convert to open after female seeker confirms | womenOnly ride; 1 female seeker CONFIRMED | PATCH womenOnly: false | 400; cannot change after confirmation | Booking integrity | P0 |
| WOR-13 | Women-only filter persists after page refresh | Female seeker on search page | Apply filter → refresh | Filter still applied | UX | P1 |
| WOR-14 | Giver My Rides shows women-only badge | Women-only ride in giver list | Giver views My Rides | Badge visible | Giver awareness | P1 |
| WOR-15 | Women-only ride not visible in default search (no gender set) | Women-only ride; user gender null | GET /rides/search | Women-only ride absent (safety default) | Conservative default | P0 |
| WOR-16 | Male seeker cannot see women-only ride detail by direct URL | womenOnly ride; male seeker | GET /rides/{id} | 403 or 404 Forbidden | URL-level gate | P0 |
| WOR-17 | Women-only ride appears in seeker's search if gender = FEMALE | Female seeker | GET /rides/search | Women-only rides included in results | Feature core | P0 |
| WOR-18 | Women-only notification uses appropriate messaging | Seeker requests women-only ride | Giver receives notification | Notification: "A female employee has requested your women-only ride" | Communication | P2 |
| WOR-19 | BOTH-role female user can both offer and book women-only rides | Female BOTH role | Create women-only ride + search | Both work correctly | BOTH role compatibility | P1 |
| WOR-20 | Regression — women-only flag survives publish | womenOnly flag set in DRAFT | Publish ride | womenOnly still true after publish | State preservation | P0 |
| WOR-21 | Admin can override women-only restriction in emergency | Admin exception needed | Admin marks male account as eligible (edge case) | Admin override possible | Admin flexibility | P2 |
| WOR-22 | Gender field cannot be changed after verification | Female account | PATCH gender: "MALE" | 400 or locked field | Identity integrity | P1 |
| WOR-23 | Women-only ride count shown separately in admin KPI | Multiple women-only rides | Admin dashboard | "X women-only rides active today" | Admin monitoring | P2 |
| WOR-24 | Open ride cannot accidentally become women-only after booking | Open ride with male seekers confirmed | PATCH womenOnly: true | 400; cannot restrict after mixed-gender bookings | Integrity | P0 |
| WOR-25 | Boundary — ride with womenOnly: false is treated as open (no restriction) | womenOnly = false | All seekers can request | All genders can request | Default behaviour | P0 |

---

## UAT Acceptance Criteria

- [ ] Female seeker sees women-only rides in search; male seeker does not
- [ ] Male seeker cannot book women-only ride through any UI or API path
- [ ] Women-only badge is clearly visible and distinct on ride cards
- [ ] Feature is invisible to users when all their rides are open
- [ ] Admin can see all rides (including women-only) for safety monitoring

---

## Missing Business Rules / Risks

1. **Gender verification not implemented** — platform relies on self-declared gender; no verification layer
2. **Non-binary/transgender policy undefined** — what happens when gender = "OTHER" or "PREFER_NOT_TO_SAY"?
3. **Female giver creating open ride — male seekers can join** — no warning to female givers about mixed-gender rides
4. **Gender field not in current schema** — feature cannot be built without adding gender to user profile
5. **No female-only flag on seeker search UI** — filter toggle not confirmed in current implementation
6. **Legal compliance** — gender-based restrictions may have legal implications in some jurisdictions; needs legal review
7. **Admin monitoring gap** — no women-only ride safety report or incident tracking
8. **Giver anonymity** — female giver's identity may be exposed through the calling feature before she's comfortable
