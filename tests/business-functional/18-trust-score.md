# 18 — Trust & Reputation System

**Platform:** TechieRide v2 · **Module:** Trust Score Design & Validation  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Trust is the core asset of TechieRide. Every user action — positive or negative — must affect their trust standing. The Trust Score (0–100) governs access to platform features, ride eligibility, and community standing. This document defines the scoring algorithm, trust bands, suspension thresholds, admin overrides, and all test cases.

---

## Trust Score Algorithm

### Score Range: 0 – 100

| Band | Range | Label | Colour | Access Level |
|---|---|---|---|---|
| 0–20 | NEW | 🌱 New Member | Grey | Can search only; limited booking |
| 21–40 | BRONZE | 🥉 Bronze | Bronze | Full seeker access |
| 41–60 | SILVER | 🥈 Silver | Silver | Full access; priority in search |
| 61–80 | GOLD | 🥇 Gold | Gold | Giver eligibility; featured profile |
| 81–100 | PLATINUM | 💎 Platinum | Teal | Top giver priority; admin-lite visibility |

---

### Starting Score

| Account Type | Initial Score |
|---|---|
| New registration | 10 (NEW band) |
| Employee verified | +5 (total: 15) |
| Driver verified | +5 (total: 20, crosses into BRONZE) |

---

### Positive Events (+points)

| Event | Points | Max per Day | Notes |
|---|---|---|---|
| Ride completed as giver | +5 | +15 | Per completed ride |
| Ride completed as seeker | +2 | +6 | Per confirmed + completed ride |
| 5-star rating received | +3 | +9 | Per ride rating |
| 4-star rating received | +2 | +6 | |
| 3-star rating received | +1 | +3 | Neutral-positive |
| On-time arrival (future) | +2 | +6 | When tracking supports it |
| SOS response (admin) | +5 | once | For correctly reporting emergency |
| Profile fully completed | +3 | once | All fields filled |
| 10 rides completed | +10 | milestone | Milestone bonus |
| 50 rides completed | +15 | milestone | Milestone bonus |

---

### Negative Events (−points)

| Event | Points | Escalation |
|---|---|---|
| Seeker NO_SHOW | −3 | After 3: warning notification |
| Giver NO_SHOW (ride never started) | −10 | After 2: admin flagged |
| Giver cancels PUBLISHED ride | −2 | Per cancellation |
| Ride seeker cancels PENDING request | 0 | No penalty (pre-approval) |
| Complaint filed against user | −5 | Per verified complaint |
| 1-star rating received | −3 | Per ride |
| 2-star rating received | −1 | Per ride |
| SOS misuse (spam) | −15 | Admin override |
| Policy violation (admin decision) | −10 to −25 | Admin discretion |
| Fake document submission | −50 | Immediate review |

---

### Suspension Thresholds

| Score | Action |
|---|---|
| < 10 | Warning notification sent |
| < 5 | Automatic suspension (SUSPENDED status) |
| 3 consecutive giver no-shows | Immediate suspension regardless of score |
| 5 complaints in 30 days | Immediate admin review + suspension |
| Score < 0 (if reached) | Permanent ban (BANNED status) |

---

### Score Decay (Inactivity)

| Inactivity Period | Decay |
|---|---|
| 30 days no ride | −2 points |
| 60 days no ride | −5 points |
| 90 days no ride | −10 points |
| Score cannot decay below band floor | Minimum: 10 while account active |

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TS-01 | New account starts at score 10 | Registration complete | GET trust score | score = 10; band = NEW | P0 |
| TS-02 | Employee verification adds +5 | Employee approved | Check score | score = 15 | P0 |
| TS-03 | Driver verification adds +5 | Driver approved | Check score | score = 20; crosses into BRONZE | P0 |
| TS-04 | Completing a ride as giver adds +5 | Ride COMPLETED | Check score | score +5 | P0 |
| TS-05 | Completing a ride as seeker adds +2 | Seeker on completed ride | Check score | score +2 | P0 |
| TS-06 | Receiving 5-star rating adds +3 | Rating submitted | Check score | score +3 | P0 |
| TS-07 | Seeker NO_SHOW deducts −3 | Marked NO_SHOW | Check score | score −3 | P0 |
| TS-08 | Giver NO_SHOW deducts −10 | Giver ride auto-cancelled | Check score | score −10 | P0 |
| TS-09 | Receiving complaint deducts −5 | Complaint verified by admin | Check score | score −5 | P0 |
| TS-10 | Score < 5 triggers automatic suspension | Score drops to 4 | Check account status | status = SUSPENDED | P0 |
| TS-11 | Score decay after 30 days inactivity | 30 days no rides | Background job runs | score −2 | P1 |
| TS-12 | Score cannot decay below 10 for active account | Score = 11; decay scheduled | Apply decay | score = 10; no further decay | P1 |
| TS-13 | 10-ride milestone awards +10 | 10th ride completed | Check score | score +10 bonus | P1 |
| TS-14 | Double-award prevention — completing same ride twice | Idempotency | Complete twice | Score only increases once | P0 |
| TS-15 | Admin overrides trust score manually | Admin action | Admin PATCH score | Score updated; audit logged | P0 |
| TS-16 | Admin increases score to reinstate suspended user | Score below suspension | Admin +20 | User reinstated if score > 5 | P1 |
| TS-17 | 3 consecutive giver no-shows → immediate suspension | 3 no-shows | Check status | Suspended regardless of score | P0 |
| TS-18 | 5 complaints in 30 days → admin review | Complaint count | Check | Admin notification triggered | P0 |
| TS-19 | PLATINUM user gets priority in search results | Score 81–100 | Search | Platinum giver listed first among equals | P2 |
| TS-20 | Trust band displayed on user profile | Score = 75 | GET profile | band = GOLD; label shown | P1 |
| TS-21 | Trust badge visible on giver profile to seeker | GOLD giver | Seeker views giver profile | 🥇 Gold badge visible | P1 |
| TS-22 | NEW band seeker — booking limit enforced | score = 10 | Request more than 1 ride | Limited to 1 concurrent booking | P2 |
| TS-23 | Negative score capped at 0 | Score = 3; −5 deduction | Apply deduction | Score = 0; permanent ban triggered | P1 |
| TS-24 | Permanent ban — cannot re-register same email | Score = 0; BANNED | Register same email | 409 Conflict; permanently blocked | P0 |
| TS-25 | Trust score visible in admin user management | Admin | GET /admin/users | trustScore field shown per user | P1 |
| TS-26 | SOS misuse penalty applied by admin | Admin reviews SOS | Admin PATCH penalty −15 | Score −15; audit logged | P1 |
| TS-27 | Policy violation penalty — admin discretion | Admin decision | Admin applies −20 | Score −20; user notified | P1 |
| TS-28 | Profile completion bonus one-time only | Complete profile | Check score | +3 once; not repeatable | P1 |
| TS-29 | Score history audit log | Multiple events | GET /trust-score/history | All +/− events with timestamp and reason | P1 |
| TS-30 | Regression — trust score persists after logout | Score = 65 | Logout → login | Score still 65 | P0 |

---

## Admin Override Rules

| Override | Who | When | Audit |
|---|---|---|---|
| Manual score adjustment | Admin | After investigation | Required |
| Bypass suspension | Admin | Reinstatement decision | Required |
| Apply emergency penalty | Admin | Policy violation | Required |
| Permanent ban | Admin | Final decision after 3 suspensions | Required |
| Restore banned account | Super-admin only | Exceptional circumstance | Required |

---

## Missing Business Rules / Risks

1. **Trust score not yet implemented** — ECO points exist but Trust Score as described here is not built
2. **No decay job** — background score decay requires a scheduled cron job (not yet in CI)
3. **ECO points ≠ Trust Score** — these are separate concepts but may overlap; needs clear distinction in UI
4. **No trust score displayed to seekers** — seekers cannot see a giver's trust score before booking
5. **No complaint system** — no in-platform complaint mechanism; trust deduction from complaints requires it
6. **Platform-level trust not HR-linked** — trust score is TechieRide-only; employer cannot see it
7. **NEW band restriction logic not implemented** — booking limits for new users not enforced
8. **Score manipulation risk** — a BOTH-role user could rate themselves via alternate accounts to inflate score
