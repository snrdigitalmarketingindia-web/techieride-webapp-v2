# TechieRide QA Spec — 18: Trust Score System

**Module:** User Trust Score Design & Test Specification  
**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Author:** QA Architecture Team  
**Status:** Design Proposal + Test Specification

---

## Overview

The TechieRide Trust Score is a 0–100 numerical measure of a user's reliability and trustworthiness on the platform. It is computed from a combination of behavioral events, verification status, ride history, and safety incidents. The score governs feature access, suspension thresholds, and visible trust badges. This document defines the scoring algorithm, event table, trust bands, decay, admin override rules, and the test cases to validate each.

---

## Trust Score Scale

| Range | Level | Badge | Description |
|-------|-------|-------|-------------|
| 0–20 | NEW | — | Just joined or severely penalized |
| 21–40 | BRONZE | 🟤 | Limited history or recent violations |
| 41–60 | SILVER | ⬜ | Average trust; normal access |
| 61–80 | GOLD | 🟡 | Reliable user; preferred matching |
| 81–100 | PLATINUM | 🔵 | Exceptional trust; maximum privileges |

---

## Starting Score

| Event | Starting Score |
|-------|---------------|
| New account registered | 30 (BRONZE) |
| Employee verified | +10 → 40 (BRONZE top) |
| Driver verified | +10 → 50 (SILVER) |

---

## Scoring Events Table

### Points Awarded (Positive)

| Event | Points | Frequency Cap | Notes |
|-------|--------|---------------|-------|
| Complete a ride as giver | +5 | Per ride | Awarded when ride = COMPLETED |
| Complete a ride as seeker (DEBOARDED) | +3 | Per ride | Must be DEBOARDED, not NO_SHOW |
| Receive 5-star rating | +3 | Per rating received | Based on ratings received |
| Receive 4-star rating | +2 | Per rating received | |
| Receive 3-star rating | +0 | Per rating received | Neutral |
| Submit a rating (fulfilling trust) | +1 | Per ride | Rating submitted within 24h |
| Streak: 5 rides completed in 7 days (giver) | +5 | Once per 7-day window | Consistency bonus |
| Streak: 10 consecutive completed rides (giver) | +10 | Per milestone | Reliability milestone |
| Employee re-verification passed | +5 | Per re-verification | Annual re-verify |
| Profile completed (photo + bio) | +5 | Once | One-time bonus |
| Emergency contact added | +2 | Once | Safety feature adoption |

### Points Deducted (Negative)

| Event | Points | Notes |
|-------|--------|-------|
| Seeker NO_SHOW | -10 | Per occurrence |
| Giver NO_SHOW (ride auto-cancelled) | -20 | Per occurrence; high penalty |
| Late arrival > 15 min (reported by seeker) | -5 | Admin verified |
| Receive 1-star rating | -5 | Per rating received |
| Receive 2-star rating | -3 | Per rating received |
| Complaint filed and upheld by admin | -15 | Per upheld complaint |
| SOS triggered against user (found credible) | -25 | Admin determined credible |
| Policy violation (first) | -10 | Admin-applied |
| Policy violation (second) | -20 | Admin-applied |
| Policy violation (third) | -30 | Admin-applied |
| Account suspended | -20 | On suspension event |
| Verification document expired (unresolved > 7 days) | -10 | Per document type |

---

## Suspension Thresholds

| Condition | Automatic Action |
|-----------|-----------------|
| Trust score drops to 0–10 | Account suspended automatically; admin notified |
| Trust score drops to 11–20 | Warning email sent; admin notified; restricted features (cannot post new rides) |
| 3 NO_SHOWS in 30 days (giver) | Auto-suspend regardless of trust score |
| 5 NO_SHOWS in 30 days (seeker) | Auto-suspend regardless of trust score |
| 3 upheld complaints in 60 days | Auto-suspend |
| SOS incident triggered against user (credible) | Immediate suspension pending investigation |

---

## Score Decay (Time-Based)

| Condition | Decay Rule |
|-----------|------------|
| No activity (no rides) for 30 days | -2 points per 30 days of inactivity |
| No activity for 90 days | -5 points per additional 30 days |
| Score floor during decay | 20 (cannot decay below NEW bottom without explicit penalty) |
| Decay stops when user completes next ride | Clock resets |

**Rationale:** Active users should maintain or improve their score. Dormant accounts should slowly decay to reflect stale trust data.

---

## Admin Override Rules

| Action | Requirement | Notes |
|--------|-------------|-------|
| Manual score adjustment (+ or -) | Admin with reason | Logged in audit trail |
| Override suspension | SuperAdmin only | Requires documented justification |
| Freeze score (no decay) | Admin | For users on medical leave / sabbatical |
| Reset to 30 (soft reset) | Admin | For rehabilitated users |
| Permanent ban (score = 0, no recovery) | Admin | Triggered on severe/criminal incidents |

---

## Trust Level Feature Access

| Feature | NEW (0–20) | BRONZE (21–40) | SILVER (41–60) | GOLD (61–80) | PLATINUM (81–100) |
|---------|------------|----------------|----------------|-------------|-------------------|
| Search rides | ✓ | ✓ | ✓ | ✓ | ✓ |
| Request rides | ✗ (must verify first) | ✓ | ✓ | ✓ | ✓ |
| Post rides | ✗ | ✓ (max 2 seats) | ✓ (max 4 seats) | ✓ | ✓ |
| Post women-only rides | ✗ | ✓ | ✓ | ✓ | ✓ |
| Access recurring templates | ✗ | ✗ | ✓ | ✓ | ✓ |
| Priority matching in search | ✗ | ✗ | ✗ | ✓ | ✓ (top-ranked) |
| Access leaderboard | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Test Cases

### Positive Scoring Events

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| TST-001 | New account starts at 30 | User registers | Check trust score after registration | trustScore = 30; level = BRONZE | Baseline | P0 |
| TST-002 | Employee verification adds 10 points | trustScore = 30 | Admin approves employee verification | trustScore = 40; level = BRONZE | P0 |
| TST-003 | Driver verification adds 10 more points | trustScore = 40 | Admin approves driver verification | trustScore = 50; level = SILVER | P0 |
| TST-004 | Completing a ride as giver adds 5 points | trustScore = 50 | Giver completes ride | trustScore = 55 | P0 |
| TST-005 | Completing a ride as seeker (DEBOARDED) adds 3 points | trustScore = 50 | Seeker deboarded on completed ride | trustScore = 53 | P0 |
| TST-006 | Receiving a 5-star rating adds 3 points | trustScore = 55 | Seeker rates giver 5 stars | trustScore = 58 | P0 |
| TST-007 | Receiving a 4-star rating adds 2 points | trustScore = 55 | Seeker rates giver 4 stars | trustScore = 57 | P0 |
| TST-008 | Receiving a 3-star rating — no change | trustScore = 55 | Seeker rates giver 3 stars | trustScore = 55 | P1 |
| TST-009 | Streak bonus: 5 rides in 7 days | Giver completes 5 rides in one week | Check score after 5th ride | Additional +5 bonus awarded | P1 |
| TST-010 | Score does not exceed 100 | trustScore = 98; giver completes ride (+5) | Check score after completion | trustScore capped at 100 | P0 |
| TST-011 | Profile completion bonus — one-time | User adds photo + bio | Check score after saving profile | +5 awarded once; not on subsequent edits | P1 |
| TST-012 | Emergency contact bonus — one-time | User adds emergency contact | Check score | +2 awarded once | P1 |

### Negative Scoring Events

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|-------|----------|---------------|------------|-----------------|-----------------|----------|
| TST-013 | Seeker NO_SHOW deducts 10 points | Seeker trustScore = 50 | Giver marks seeker as NO_SHOW | trustScore = 40 | P0 |
| TST-014 | Giver NO_SHOW deducts 20 points | Giver trustScore = 60 | Ride auto-cancelled; giver no-show | trustScore = 40 | P0 |
| TST-015 | Receiving a 1-star rating deducts 5 points | trustScore = 55 | Seeker rates giver 1 star | trustScore = 50 | P0 |
| TST-016 | Receiving a 2-star rating deducts 3 points | trustScore = 55 | Seeker rates giver 2 stars | trustScore = 52 | P0 |
| TST-017 | Upheld complaint deducts 15 points | trustScore = 60 | Admin upholds complaint | trustScore = 45 | P0 |
| TST-018 | Score does not go below 0 | trustScore = 5; event triggers -10 | Apply -10 deduction | trustScore floored at 0; not -5 | P0 |
| TST-019 | Suspension auto-triggers at score ≤ 10 | trustScore = 12; 1-star rating received (-5) → 7 | Event fires | trustScore = 7; account auto-suspended; admin notified | P0 |
| TST-020 | Warning issued when score drops to 11–20 | trustScore = 25; upheld complaint (-15) → 10 | Complaint upheld | trustScore = 10; falls in NEW band; warning email + admin notification | P0 |
| TST-021 | Third giver NO_SHOW in 30 days → auto-suspend | Giver has 2 NO_SHOWS in last 30 days; 3rd occurs | Auto-cancel fires | Account auto-suspended regardless of trust score; admin notified | P0 |
| TST-022 | Credible SOS against user deducts 25 points | trustScore = 60 | Admin marks SOS as credible; targets user | trustScore = 35; immediate suspension pending investigation | P0 |

### Score Decay

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| TST-023 | Decay after 30 days inactivity | User has no rides for 30 days | Background job runs | trustScore -2 | P1 |
| TST-024 | Decay after 90 days inactivity | User has no rides for 90 days | Background job runs | Total -6 from 30-day decay + -5/30 days after | P1 |
| TST-025 | Decay stops at floor 20 | trustScore = 21; decay would take to 19 | Apply decay | trustScore = 20; not 19 | P1 |
| TST-026 | Decay clock resets on ride completion | trustScore = 26 (decaying); user completes ride | trustScore = 31 (+5 for completion); decay clock reset | P1 |
| TST-027 | Frozen score does not decay | Admin freezes user's score | 30 days pass with no activity | trustScore unchanged | P1 |

### Admin Override

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| TST-028 | Admin manually adjusts score | Admin opens user profile → adjusts +10 with reason | trustScore updated; audit log entry created | P1 |
| TST-029 | Admin manual adjustment audit logged | Any manual adjustment | Check audit log | Log: {adminId, userId, previousScore, newScore, reason, timestamp} | P0 |
| TST-030 | Admin soft reset to 30 | Admin resets rehabilitated user | trustScore = 30; level = BRONZE | P1 |
| TST-031 | Admin permanent ban | Admin bans user | trustScore = 0; PERMANENTLY_BANNED status; cannot be restored by other admins | P1 |
| TST-032 | Non-admin cannot modify trust score | Seeker calls PATCH /users/:id/trust-score | 403: "Admin access required." | Security / P0 |

### Level Transitions

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| TST-033 | BRONZE → SILVER transition | trustScore reaches 41 | Level = SILVER; badge updated on profile | P1 |
| TST-034 | SILVER → GOLD transition | trustScore reaches 61 | Level = GOLD; priority matching enabled | P1 |
| TST-035 | GOLD → PLATINUM transition | trustScore reaches 81 | Level = PLATINUM; top-ranked in search results | P1 |
| TST-036 | Downgrade GOLD → SILVER | trustScore was 61; drops to 60 | Level = SILVER; priority features revoked | P1 |
| TST-037 | Level shown on user profile | Any trust level | Navigate to user profile (own or public) | Trust badge (BRONZE/SILVER/GOLD/PLATINUM) visible | P1 |
| TST-038 | Trust level visible to other users on ride card | Giver's trust level GOLD | Seeker views search result | Giver's trust badge shown on ride card | P2 |

### Feature Access by Level

| TC-ID | Scenario | Test Steps | Expected Result | Priority |
|-------|----------|------------|-----------------|----------|
| TST-039 | NEW-level user cannot post rides | trustScore = 15 | Attempt to create ride | Blocked: "Complete verification to post rides." (also trust gate) | P0 |
| TST-040 | BRONZE giver limited to 2 seats | BRONZE trust level; DRIVER_VERIFIED | Create ride with seats=3 | Error: "BRONZE level givers can post up to 2 seats." | P1 |
| TST-041 | SILVER giver can post 4 seats | SILVER trust level | Create ride with seats=4 | Allowed | P1 |
| TST-042 | SILVER user can create recurring template | trustScore = 50 | Create commute template | Allowed | P1 |
| TST-043 | BRONZE user cannot create recurring template | trustScore = 35 | Attempt to create template | Blocked: "Commute templates require SILVER trust level or above." | P1 |
| TST-044 | PLATINUM giver appears first in search | PLATINUM giver and SILVER giver both match search | Run search | PLATINUM giver appears first (within same departure time band) | P2 |

---

## Edge Cases

| TC-ID | Edge Case | Expected Result |
|-------|-----------|-----------------|
| TST-045 | Multiple events fire simultaneously | Giver completes ride (+5) AND receives 5-star rating (+3) in same transaction | trustScore +8; both events processed atomically |
| TST-046 | Score event on admin's own account | Admin completes a ride | Trust score events apply to admin accounts normally (admin is also a user) |
| TST-047 | Score change when account is SUSPENDED | Suspended user receives a new rating | Score change recorded; user notified on unsuspension |
| TST-048 | Cancelled ride — no score change | Ride cancelled by giver | No score change for giver or seekers (no ride completed) |
| TST-049 | NO_SHOW on cancelled ride | Seeker was NO_SHOW before giver cancelled | Only giver's cancellation applies; seeker NO_SHOW on that ride is moot — behavior must be defined |
| TST-050 | Trust score of deleted account | Admin soft-deletes user account | Trust score retained in archive for legal/compliance; not exposed publicly |

---

## Missing Business Rules / Risks

1. **Algorithm transparency not communicated to users.** Users should have access to a "Why did my score change?" history log showing every scoring event.
2. **Trust score gaming potential.** PLATINUM users could game the system by giving each other 5-star ratings on intentionally short rides. A minimum ride distance or duration floor should be defined.
3. **NO_SHOW distinction: seeker vs giver penalty asymmetry.** Giver NO_SHOW (-20) is penalized more than seeker NO_SHOW (-10). This asymmetry should be documented and communicated.
4. **Score computation is synchronous vs asynchronous.** For large platforms, computing trust scores synchronously on every event could cause latency. An async event-driven score computation queue is recommended.
5. **Trust score visible to the other party before booking?** Should a seeker see the giver's trust score in search results? This could improve safety decision-making but may also cause discrimination.
6. **Corporate-level trust not implemented.** The platform tracks individual user trust, but not company-level trust (e.g., "employees from Company X have higher average trust scores"). This could enable company-level matching quality in future.
7. **Appeal process for score deductions not defined.** A user who believes a score deduction was unjust (e.g., marked NO_SHOW incorrectly) has no formal appeal channel.
8. **Score decay job scheduling not specified.** The background job that applies decay must be idempotent and precisely scheduled. Missed runs (during maintenance) should not double-apply decay.
9. **First ride on platform — NEW-level barriers.** A new DRIVER_VERIFIED user starts at 50 (SILVER) after both verifications. But if they immediately get a bad rating, they could drop to BRONZE (max 2 seats). New user onboarding protections should be considered.
10. **Trust score vs ECO points conflation.** Trust score and ECO points are separate systems. Care must be taken that events don't double-count (e.g., completing a ride should award both ECO points AND trust score — but the formulas must be independent and documented separately).
