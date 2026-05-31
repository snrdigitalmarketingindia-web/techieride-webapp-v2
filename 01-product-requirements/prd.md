# Product Requirements Document — Techie Ride WebApp V2

## 1. Product Overview

Techie Ride is a verified IT employee carpooling platform for Hyderabad. It enables recurring commute sharing between verified IT professionals, reducing traffic congestion and daily commute costs while building a trusted community.

**This is not a taxi app.** There is no surge pricing, no driver ratings based on service quality alone, and no anonymous rides. Every user is a verified IT employee.

---

## 2. Problem Statement

- IT employees in Hyderabad spend 1.5–3 hours daily commuting to tech parks (HITEC City, Gachibowli, Madhapur).
- Most drive alone, causing traffic and high fuel costs.
- Existing carpooling apps lack verified identity, safety mechanisms, and recurring commute support.
- There is no trusted, IT-employee-only platform for daily commute sharing.

---

## 3. Target Users

| Persona | Description |
|---------|-------------|
| Ride Giver | IT employee with a personal vehicle, willing to offer seats on their daily route |
| Ride Seeker | IT employee without a vehicle or preferring not to drive, seeking a verified carpool |
| Admin | Platform operator managing verifications, disputes, and analytics |

---

## 4. Core Features

### 4.1 Authentication & Verification
- Register with work email (company domain validation)
- Upload Employee ID for admin review
- Phone number OTP for login
- Ride Givers additionally upload Driving License + RC

### 4.2 Commute Templates
- Givers define a recurring route (home → office) with departure time and available days
- System auto-publishes rides based on the template
- Seekers define their recurring pickup location and destination

### 4.3 Ride Matching
- System matches Seeker templates against Giver templates
- Match criteria: route proximity (≤500m pickup/drop deviation), time overlap (±30 min)
- Seeker reviews matches and sends a seat request

### 4.4 Seat Reservation
- Seeker requests a seat → Giver approves → 15-minute confirmation hold
- Seeker confirms within 15 min → seat reserved
- If not confirmed in time → hold expires, seat becomes available again

### 4.5 Live Tracking
- Giver shares real-time GPS during an active ride
- Seeker and emergency contacts can view live location
- Location history retained for 24 hours post-ride

### 4.6 Ratings & Reviews
- Post-ride mutual rating (1–5 stars)
- Short text review (optional)
- Ratings affect ECO level and trust score

### 4.7 Gamification (ECO Points)
- Points awarded per ride completed
- CO2 savings calculated and displayed
- Levels unlock perks and profile badges
- Monthly leaderboard

### 4.8 SOS & Safety
- One-tap SOS button during active ride
- Broadcasts location to emergency contacts + admin
- Admin notified immediately for intervention

### 4.9 Admin Panel
- Review and approve/reject verification documents
- View all rides, flag disputes
- User management (suspend, ban)
- Platform analytics dashboard

---

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API response time | < 300ms (p95) |
| Live tracking update interval | Every 5 seconds |
| Seat hold expiry accuracy | ±5 seconds |
| Uptime | 99.5% |
| File upload max size | 5MB per document |
| Concurrent WebSocket connections | 5,000+ |
| Data retention | Ride data: 1 year; Location data: 24 hours |

---

## 6. User Stories

### Authentication
- As a new user, I can register with my work email and employee ID so the platform can verify I am a real IT employee.
- As a user, I can log in via phone OTP so I don't need to remember a password.

### Ride Giver
- As a Ride Giver, I can create a commute template so the system automatically publishes my ride each working day.
- As a Ride Giver, I can approve or reject seat requests from Seekers.
- As a Ride Giver, I can see who is riding with me today on a dashboard.

### Ride Seeker
- As a Ride Seeker, I can search for available rides near my route and time.
- As a Ride Seeker, I can request a seat and confirm it within 15 minutes.
- As a Ride Seeker, I can track the Giver's live location when the ride is active.

### Safety
- As any user, I can tap SOS during a ride to immediately alert emergency contacts and admin.
- As a Ride Seeker, I can share my live ride link with a family member.

### Admin
- As an admin, I can review uploaded documents and approve/reject verification requests.
- As an admin, I can respond to SOS alerts with intervention tools.

---

## 7. Out of Scope (V2)

- In-app payments or fare splitting (planned for V3)
- Inter-city rides
- Non-IT-employee users
- Driver-as-a-service model
- iOS/Android native apps (V2 is PWA via Next.js)
