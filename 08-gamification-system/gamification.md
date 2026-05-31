# Gamification System — Techie Ride WebApp V2

---

## 1. Overview

Techie Ride's gamification system uses **ECO Points** to reward consistent, community-positive behavior. The goal is to incentivize reliability, safety, and recurring use — not just ride volume. Points drive **ECO Levels**, which carry social proof on the platform and unlock future perks.

---

## 2. ECO Points System

### Point Events

| Event | Points | Notes |
|-------|--------|-------|
| Complete a ride as Giver | +15 pts | Per ride, regardless of seats filled |
| Complete a ride as Seeker | +10 pts | Per ride completed (boarded + arrived) |
| Receive 5-star rating | +5 pts | After post-ride rating |
| Give a rating | +2 pts | Reward for completing the feedback loop |
| Streak bonus: 5 consecutive days | +25 pts | Ride 5 weekdays in a row |
| Streak bonus: 20 consecutive days | +100 pts | Monthly streak |
| First ride (onboarding bonus) | +20 pts | One-time |
| Refer a verified user | +30 pts | When referee completes first ride |
| Complete profile (100%) | +10 pts | One-time |

### Point Deductions

| Event | Deduction | Notes |
|-------|-----------|-------|
| No-show as Seeker | -10 pts | Confirmed but did not board |
| Last-minute cancellation (<2h before ride) | -5 pts | As Seeker |
| Cancelled by Giver (<2h before ride) | -8 pts | As Giver (impacts reliability) |
| SOS triggered (false alarm confirmed) | -15 pts | Admin-reviewed |

---

## 3. ECO Levels

| Level | Name | Points Required | Badge |
|-------|------|----------------|-------|
| 1 | SEED | 0 – 99 | 🌱 |
| 2 | SPROUT | 100 – 299 | 🌿 |
| 3 | LEAF | 300 – 699 | 🍃 |
| 4 | TREE | 700 – 1,499 | 🌳 |
| 5 | FOREST | 1,500+ | 🌲🌲 |

### Level Perks (planned V3+)

| Level | Perks |
|-------|-------|
| SEED | Basic access |
| SPROUT | Priority in search results |
| LEAF | Profile badge + priority matching |
| TREE | Featured in leaderboard top section |
| FOREST | Beta feature access + community recognition |

### Level Assignment Logic

```
On each point event:
  1. Update user.eco_points += delta
  2. Re-evaluate level thresholds
  3. If level changes: update user.eco_level
  4. If level up: send congratulations notification
```

---

## 4. CO2 Savings Calculation

CO2 savings are calculated per ride based on passengers carried and route distance.

### Formula

```
CO2 saved (grams) = passengers_carried × distance_km × CO2_per_km_per_person

Where:
  passengers_carried = number of Seekers who boarded (not Giver)
  distance_km = ride.estimated_distance_km
  CO2_per_km_per_person = 120g
    (average Indian car emits ~120g CO2/km; each carpooled passenger
     saves one individual car trip equivalent)
```

### Example

```
Ride distance: 10 km
Passengers: 3 Seekers

CO2 saved = 3 × 10 × 120 = 3,600g = 3.6 kg CO2
```

### Display

- Shown on user profile: "You've saved X kg CO2"
- Shown on ride completion screen
- Cumulative platform total displayed on leaderboard page
- Annual equivalent: "= X trees worth of carbon absorption"

---

## 5. Leaderboard

### Types

| Leaderboard | Scope | Reset |
|-------------|-------|-------|
| Monthly | Top 50 by points in current month | 1st of each month |
| All-time | Top 100 by total cumulative points | Never resets |

### Leaderboard Record

```
{
  rank: number,
  userId: string,
  fullName: string,
  profilePhoto: string,
  ecoLevel: string,
  points: number,         // month-to-date or all-time
  co2SavedKg: number,
  totalRides: number
}
```

### Caching

- Leaderboard cached in Redis: `leaderboard:monthly` and `leaderboard:alltime`
- Refreshed every 1 hour via a NestJS scheduled task
- On refresh: aggregate from `gamification_points` table grouped by `user_id`

### UI Placement

- Top 3 shown on Home Dashboard with podium display
- Full leaderboard accessible via "Leaderboard" quick action
- User's own rank shown at bottom of leaderboard page even if outside top 50

---

## 6. Streak System

### Streak Tracking

```
On ride completion:
  1. Check last_ride_date for user
  2. If last_ride_date = yesterday: streak_count++
  3. If last_ride_date = today: no change (duplicate event guard)
  4. If last_ride_date < yesterday: streak_count = 1 (reset)
  5. Persist streak_count on user record
  6. If streak_count == 5 OR 20: award bonus points + notify
```

### Streak Display

- Current streak shown on profile: "🔥 7-day streak"
- Longest streak shown: "Personal best: 22 days"

---

## 7. Point History

Every point award/deduction is logged in `gamification_points` with:
- `event_type` (human-readable)
- `points` (positive or negative)
- `ride_id` (reference, nullable)
- `created_at`

Users can view their full point history in the "My ECO Impact" section of their profile.
