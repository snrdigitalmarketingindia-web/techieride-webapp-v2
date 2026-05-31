# Wireframe: Ride Search — Techie Ride

> **Status:** Placeholder — visual wireframes to be designed in Figma.

---

## Overview

The Ride Search screen allows Ride Seekers to find available rides near their pickup point. It combines a map view (Leaflet/OSM) with a list view, with filter controls.

---

## Layout Structure

```
┌─────────────────────────────────┐
│  ← Back    Find a Ride           │
├─────────────────────────────────┤
│  SEARCH FORM                     │
│  📍 Pickup: [Enter location]     │
│  🏢 Drop:   [Enter location]     │
│  📅 Date:   [Today ▾]            │
│  🕐 Time:   [09:00 ▾]            │
│  [Search Rides]                  │
├─────────────────────────────────┤
│  MAP VIEW (Leaflet)              │
│  ┌────────────────────────────┐ │
│  │  OSM map with:             │ │
│  │  • Green pin = Pickup      │ │
│  │  • Red pin = Drop          │ │
│  │  • Blue markers = Rides    │ │
│  └────────────────────────────┘ │
│  [List View ⇄ Map View] toggle  │
├─────────────────────────────────┤
│  RESULTS (4 rides found)         │
│  SORT: [Nearest ▾] FILTER ⚙️     │
│  ─────────────────────────────  │
│  Ride Card 1                     │
│  Ride Card 2                     │
│  Ride Card 3                     │
└─────────────────────────────────┘
```

---

## Components

### Search Form
- **Pickup field** — text input with geocoder autocomplete (OSM Nominatim)
- **Drop field** — text input with geocoder autocomplete
- **Date picker** — defaults to today, future dates only
- **Time window** — departure time ±30 min window
- **Search button** — triggers API call

### Map View (Leaflet)
- OpenStreetMap base tiles
- User's pickup as green pin, drop as red pin
- Each available ride shown as a blue car icon
- Clicking a map marker shows a ride summary popup with "View Details" CTA

### Toggle: Map / List
- Persistent toggle to switch views without losing search state

### Filter Panel (slide-up drawer)
- Gender preference: Any / Female-only / Male-only
- Max pickup deviation: 100m / 250m / 500m
- Min rating: Any / 3+ / 4+
- Reset / Apply buttons

### Ride Result Card

```
┌──────────────────────────────────┐
│ 🟢 Priya K.   ⭐ 4.7   🌱 TREE   │
│ Maruti Swift (White) · MH12AB123 │
│ 09:15 AM → ~10:00 AM            │
│ 📍 300m from your pickup        │
│ 2 seats available                │
│                    [View Details]│
└──────────────────────────────────┘
```

### Empty State
- Illustration: empty road
- "No rides found for this route and time"
- CTAs: "Adjust filters" and "Set an alert for this route"

---

## Search Flow

```
User enters pickup + drop + date + time
  → [Search] tapped
  → API: GET /rides/search?...
  → Results rendered on map + list
  → User taps ride card → Ride Details screen
```

---

## Notes

- Location input uses OSM Nominatim for geocoding (no Google Maps API key required)
- Results are sorted by proximity to pickup by default
- Saved home/work addresses appear as quick-fill suggestions
