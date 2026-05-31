# Wireframe: Ride Details — Techie Ride

> **Status:** Placeholder — visual wireframes to be designed in Figma.

---

## Overview

The Ride Details screen shows the full information about a specific ride, allowing a Seeker to review it and send a seat request.

---

## Layout Structure

```
┌─────────────────────────────────┐
│  ← Back      Ride Details        │
├─────────────────────────────────┤
│  GIVER PROFILE SECTION           │
│  [Photo]  Priya K.               │
│           ⭐ 4.7  🌱 TREE         │
│           TechCorp • Verified ✅  │
│           [View Profile]         │
├─────────────────────────────────┤
│  VEHICLE SECTION                 │
│  Maruti Swift • White            │
│  MH12 AB 1234 • 2020             │
│  Seats available: 2 / 4          │
├─────────────────────────────────┤
│  ROUTE MAP (Leaflet)             │
│  ┌────────────────────────────┐ │
│  │  Route polyline on OSM map  │ │
│  │  Start 📍 → End 🏢         │ │
│  └────────────────────────────┘ │
├─────────────────────────────────┤
│  RIDE INFO                       │
│  📍 From: Kondapur               │
│  🏢 To:   HITEC City             │
│  🕐 Departure: 09:15 AM          │
│  ⏱ Est. arrival: ~10:00 AM      │
│  📏 Distance: 8.4 km             │
│  📅 Date: Tomorrow, 01 Jun 2026  │
├─────────────────────────────────┤
│  PREFERENCES                     │
│  Gender: Any                     │
│  Notes: "I prefer no music"      │
├─────────────────────────────────┤
│  CO-PASSENGERS (2 confirmed)     │
│  [Avatar] Rahul S.               │
│  [Avatar] Meena T.               │
├─────────────────────────────────┤
│  [        Request a Seat       ] │
└─────────────────────────────────┘
```

---

## Components

### Giver Profile Card
- Profile photo (circular)
- Full name, average rating, ECO level badge
- Company name with Verified checkmark
- "View Profile" link → public profile modal

### Vehicle Card
- Make, model, color, year
- Plate number (partially masked for privacy before booking)
- Seat availability indicator

### Route Map
- Leaflet map with OSM tiles
- Route polyline (GeoJSON from OSRM)
- Origin and destination pins
- Non-interactive (no zoom) unless user taps to expand

### Ride Info Section
- All key trip details in a clean list layout

### Co-Passengers Section
- Shows avatars + first names of confirmed passengers
- Helps Seeker assess comfort level
- Max 3 shown + "+ N more" if applicable

### Request a Seat CTA
- Full-width primary button
- Disabled if: seats = 0, user already requested, user is the Giver
- On tap → Seat Request Confirmation bottom sheet

---

## Seat Request Bottom Sheet

```
┌──────────────────────────────┐
│  Confirm Seat Request        │
│                              │
│  📍 Pickup near:             │
│  [  Enter custom pickup   ]  │
│  (or leave blank for route)  │
│                              │
│  🏢 Drop near:               │
│  [  Enter custom drop     ]  │
│                              │
│  By requesting, you agree to │
│  be on time and be respectful│
│                              │
│  [  Request Seat  ]          │
└──────────────────────────────┘
```

---

## States

| State | Display |
|-------|---------|
| Already requested | Button: "Request Pending" (disabled) |
| Seats full | Button: "No Seats Available" (disabled) |
| Confirmed | Button: "Confirmed ✅" + Track button appears |
| Ride ongoing | Button replaced by "Track Live" |
| Ride completed | Button replaced by "Rate this ride" |
