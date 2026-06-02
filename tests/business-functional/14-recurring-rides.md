# 14 — Recurring Rides (Commute Templates)

**Platform:** TechieRide v2 · **Module:** Commute Templates  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Most IT professionals have fixed office commute schedules. Commute templates let givers create a recurring pattern (e.g., Mon–Fri, TNR → HITEC, 09:00) that generates rides automatically. Seekers can discover and book slots on these recurring rides. Templates persist until deactivated; individual instances can be skipped.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| REC-01 | Giver creates commute template | DRIVER_VERIFIED + vehicle | POST /commute-templates with weekdays [1,2,3,4,5] | 201 Created; template active | Core recurring feature | P0 |
| REC-02 | Template generates rides for each weekday | Template created for Mon–Fri | Check rides for next 5 days | 5 rides generated in DRAFT/PUBLISHED status | Template-to-ride generation | P0 |
| REC-03 | Template ride visible in search on correct day | Template active; today is Monday | GET /rides/search for today | Template-generated ride visible | Search integration | P0 |
| REC-04 | Seeker books a template-generated ride | Ride from template PUBLISHED | POST /ride-requests | 201 Created; PENDING | Booking on template ride | P0 |
| REC-05 | Template deactivation stops new ride generation | Template deactivated | Check rides for next week | No new rides generated after deactivation | Template lifecycle | P1 |
| REC-06 | Existing bookings survive template deactivation | Seeker CONFIRMED before deactivation | Deactivate template | CONFIRMED bookings remain; only new generation stops | Booking integrity | P0 |
| REC-07 | Giver skips a single day from recurring pattern | Template active | Skip Thursday this week | Thursday ride marked cancelled/skipped; Mon/Tue/Wed/Fri still active | Flexibility | P1 |
| REC-08 | Template vs one-off ride differentiation | Both exist | GET /rides or GET /commute-templates | Templates and one-off rides distinguishable | UX clarity | P1 |
| REC-09 | Template edit — change departure time | Template active | PATCH /commute-templates/{id} with new time | Future rides updated; existing PUBLISHED rides unchanged | Edit immutability | P1 |
| REC-10 | Template edit — change origin | Template active | PATCH origin | Future rides updated; existing unchanged | Edit immutability | P1 |
| REC-11 | Template deletion — removes future DRAFT rides | Template deleted | Check future rides | Future DRAFT rides removed; PUBLISHED rides remain | Cleanup logic | P1 |
| REC-12 | Template only for weekdays [1–5] by default | Create template | Generate rides | No Saturday (6) or Sunday (7) rides | Weekend exclusion | P1 |
| REC-13 | Template can include specific days only | Create template with [1,3,5] (Mon, Wed, Fri) | Generate rides | Only Mon/Wed/Fri rides created | Custom schedule | P1 |
| REC-14 | Unverified giver cannot create template | EMPLOYEE_VERIFIED only | POST /commute-templates | 403 Forbidden | Role gate | P0 |
| REC-15 | Template visible in giver's template list | Template created | GET /commute-templates | Template listed with status ACTIVE | Giver visibility | P1 |
| REC-16 | Template ID referenced in generated rides | Template generates ride | GET /rides/{id} | templateId field present | Data lineage | P2 |
| REC-17 | Two active templates for same giver at same time | Template A and B created | Both active | Allowed if different routes/times; conflict if same slot | Template conflict | P1 |
| REC-18 | Template generates ride for next 7 days in advance | Template created | Check generated rides | 7 upcoming rides pre-generated | Look-ahead window | P1 |
| REC-19 | Regression — template survives API restart | Template created | Restart API | Template and generated rides still exist | State persistence | P0 |
| REC-20 | Seeker sees recurring rides correctly dated | Template generates rides for next 5 days | Seeker searches each day | Correct ride per day visible | Multi-day visibility | P0 |
| REC-21 | Template with vehicle change — uses current vehicle | Template uses vehicle A; giver changes to vehicle B | New rides generated | New rides use vehicle B | Vehicle currency | P1 |
| REC-22 | Template end date (if supported) | Create template with endDate | After endDate | No rides generated beyond endDate | Time-bounded templates | P2 |
| REC-23 | Cannot create template for past dates | None | POST /commute-templates with past startDate | 400 Bad Request | Date validation | P0 |
| REC-24 | Template with 0 seats in ride rejected | Template with totalSeats: 0 | POST /commute-templates | 400 Bad Request | Seat validation | P0 |
| REC-25 | Recurring ride ECO points awarded per ride | 5 rides from template; all completed | GET /gamification/summary | Points for each ride separately | Gamification | P1 |

---

## UAT Acceptance Criteria

- [ ] Giver can set up Mon–Fri recurring commute in under 2 minutes
- [ ] Rides appear in search for each scheduled day immediately after template creation
- [ ] Deactivating a template does not cancel existing confirmed bookings
- [ ] Skipping a single day works without affecting other days in the template
- [ ] Each template-generated ride is individually bookable and trackable

---

## Missing Business Rules / Risks

1. **No automatic ride generation scheduler** — rides may only generate when someone requests them; no cron job confirmed
2. **No conflict detection** — giver with an ONGOING ride and active template could generate a new ride that conflicts
3. **No bank holiday awareness** — template generates rides on Indian public holidays; no calendar integration
4. **Template not copyable** — if giver wants a similar template with minor changes, must create from scratch
5. **No seeker recurring booking** — seekers cannot subscribe to a giver's template; must book each ride individually
6. **No template sharing** — givers cannot see each other's templates to coordinate route coverage
7. **Look-ahead window not configurable** — fixed 7-day advance generation may not suit all use cases
8. **Template pause feature missing** — giver on leave cannot pause template; must deactivate and recreate
