# Wireframe: Home Dashboard — Techie Ride

> **Status:** Placeholder — visual wireframes to be designed in Figma.

---

## Overview

The Home Dashboard is the primary landing screen after login. It adapts based on the user's role (Ride Giver / Ride Seeker / Both).

---

## Layout Structure

```
┌─────────────────────────────────┐
│  Header: Logo + Notification 🔔  │
│  User: "Good morning, Arjun 👋"  │
│  ECO Level chip + Points badge   │
├─────────────────────────────────┤
│  TODAY'S RIDE CARD               │
│  (Giver) "Your ride at 9:00 AM"  │
│  (Seeker) "Your ride with Priya" │
│  [View Details]  [Track Live]    │
├─────────────────────────────────┤
│  QUICK ACTIONS                   │
│  [Offer Ride] [Find Ride]        │
│  [My Schedule] [Leaderboard]     │
├─────────────────────────────────┤
│  UPCOMING RIDES (scroll list)    │
│  Ride card × n                   │
├─────────────────────────────────┤
│  ECO IMPACT BANNER               │
│  "You've saved 12.4 kg CO2 🌱"   │
├─────────────────────────────────┤
│  Bottom Navigation Bar           │
│  Home | Rides | Map | Profile    │
└─────────────────────────────────┘
```

---

## Components

### Header
- App logo (left)
- Notification bell with unread badge (right)

### Greeting Section
- Personalized greeting with time of day
- ECO Level chip (e.g., "🌱 LEAF")
- Current ECO points

### Today's Ride Card
- Shows if there is a ride today (as Giver or confirmed Seeker)
- Ride time, co-passengers count
- CTA: **"Start Ride"** (Giver) or **"Track Live"** (Seeker)
- If no ride today: empty state with "No ride today. Find or offer one."

### Quick Actions Grid (2×2)
| | |
|-|-|
| Offer Ride | Find Ride |
| My Schedule | Leaderboard |

### Upcoming Rides List
- Next 3–5 rides shown as cards
- Each card: date, time, route summary, status chip
- "View All" link

### ECO Impact Banner
- Total CO2 saved in kg
- Progress bar toward next level
- "Share your impact" CTA

### Bottom Navigation
- **Home** — Dashboard
- **Rides** — Full ride history / upcoming
- **Map** — Search rides with map view
- **Profile** — Account and settings

---

## Role-Specific Differences

| Element | Ride Giver | Ride Seeker | Both |
|---------|-----------|-------------|------|
| Today's card | "Your ride" | "Riding with" | Shows both if applicable |
| Quick action 1 | Offer Ride | Find Ride | Both |
| Pending requests banner | Yes (incoming requests count) | No | Yes |

---

## States

| State | Display |
|-------|---------|
| Verification pending | Banner: "Verification in progress — limited access" |
| No upcoming rides | Illustration + "Start by offering or finding a ride" |
| SOS active | Red alert banner persists until resolved |
