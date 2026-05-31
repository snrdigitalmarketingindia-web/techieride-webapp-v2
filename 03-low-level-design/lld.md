# Low-Level Design — TechieRide WebApp v2.0_Beta

> **Version:** 2.0_Beta | **Last Updated:** May 2026

## 1. User Model *(Updated in v2.0_Beta)*

```typescript
User {
  id: UUID (PK)
  email: string (unique, work email — domain whitelist enforced)
  passwordHash: string (bcrypt, 12 rounds)
  fullName: string
  profilePhoto: string (MinIO URL, nullable)
  gender: enum(MALE, FEMALE, OTHER) (nullable)
  companyName: string (nullable)
  phone: string (unique, optional — 10 digits Indian mobile)
  role: enum(RIDE_GIVER, RIDE_SEEKER, BOTH, ADMIN)
  verificationStatus: enum(PENDING, APPROVED, REJECTED)
  emailStatus: enum(PENDING, VERIFIED, BOUNCED)      // NEW
  emailVerificationToken: string (nullable, unique)  // NEW
  emailVerificationExpiry: timestamp (nullable)      // NEW
  passwordResetToken: string (nullable, unique)      // NEW
  passwordResetExpiry: timestamp (nullable)          // NEW
  isActive: boolean
  fcmToken: string (nullable)
  ecoPoints: integer (default: 0)
  ecoLevel: enum(SEED, SPROUT, LEAF, TREE, FOREST)
  createdAt: timestamp
  updatedAt: timestamp
}
```

> **Removed in v2.0_Beta:** `employeeId` field (user uploads Company ID card instead)  
> **Removed in v2.0_Beta:** `Otp` model (replaced by email+password auth)  
> **Changed in v2.0_Beta:** `phone` is now optional (was required in v1)

### Email Status Transitions

```
PENDING → VERIFIED  (user clicks verification link in email)
PENDING → BOUNCED   (Resend bounce webhook fires — email undeliverable)
VERIFIED → BOUNCED  (bounce on subsequent emails — rare)
```

### Verification Status Transitions

```
PENDING → APPROVED  (admin reviews and approves Company ID card)
PENDING → REJECTED  (admin rejects with reason)
REJECTED → PENDING  (user re-uploads documents)
```

---

## 2. Ride Giver Model

```typescript
RideGiver {
  id: UUID (PK)
  userId: UUID (FK → users)
  vehicleId: UUID (FK → vehicles)
  drivingLicenseUrl: string (MinIO)
  licenseVerified: boolean
  totalRidesGiven: integer
  averageRating: decimal(3,2)
  preferredGender: enum(ANY, FEMALE_ONLY, MALE_ONLY)
  isAvailable: boolean
  createdAt: timestamp
}

Vehicle {
  id: UUID (PK)
  ridGiverId: UUID (FK)
  make: string
  model: string
  year: integer
  color: string
  plateNumber: string (unique)
  rcUrl: string (MinIO)
  rcVerified: boolean
  totalSeats: integer
  availableSeats: integer
}
```

---

## 3. Ride Seeker Model

```typescript
RideSeeker {
  id: UUID (PK)
  userId: UUID (FK → users)
  totalRidesTaken: integer
  averageRating: decimal(3,2)
  preferredGender: enum(ANY, FEMALE_ONLY, MALE_ONLY)
  createdAt: timestamp
}
```

---

## 4. Ride Model

```typescript
Ride {
  id: UUID (PK)
  ridGiverId: UUID (FK → ride_givers)
  templateId: UUID (FK → commute_templates, nullable)

  // Route
  originName: string
  originLat: decimal(10,7)
  originLng: decimal(10,7)
  destinationName: string
  destinationLat: decimal(10,7)
  destinationLng: decimal(10,7)
  routePolyline: JSONB (GeoJSON LineString)
  estimatedDistanceKm: decimal(6,2)
  estimatedDurationMin: integer

  // Schedule
  departureDate: date
  departureTime: time
  estimatedArrivalTime: time

  // Capacity
  totalSeats: integer
  availableSeats: integer

  // Status
  status: enum(DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED)

  // Meta
  notes: string (nullable)
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## 5. Ride Request Model

```typescript
RideRequest {
  id: UUID (PK)
  rideId: UUID (FK → rides)
  seekerId: UUID (FK → ride_seekers)

  // Pickup/Drop customization
  pickupLat: decimal(10,7)
  pickupLng: decimal(10,7)
  pickupName: string
  dropLat: decimal(10,7)
  dropLng: decimal(10,7)
  dropName: string

  status: enum(PENDING, APPROVED, REJECTED, HOLD, CONFIRMED, CANCELLED, NO_SHOW)
  holdExpiresAt: timestamp (nullable)  // set when APPROVED, 15 min from approval
  confirmedAt: timestamp (nullable)
  cancelledAt: timestamp (nullable)
  cancelReason: string (nullable)

  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## 6. Ride Lifecycle State Machine

### States

| State | Description |
|-------|-------------|
| `DRAFT` | Giver saved but not published |
| `PUBLISHED` | Visible to Seekers for requests |
| `ONGOING` | Ride in progress (Giver started) |
| `COMPLETED` | All participants dropped off |
| `CANCELLED` | Ride cancelled by Giver or admin |

### Request States

| State | Description |
|-------|-------------|
| `PENDING` | Seeker sent request, awaiting Giver approval |
| `APPROVED` | Giver approved; 15-min hold started |
| `HOLD` | Seat held, awaiting Seeker confirmation |
| `CONFIRMED` | Seeker confirmed; seat reserved |
| `REJECTED` | Giver rejected request |
| `CANCELLED` | Seeker or Giver cancelled after confirmation |
| `NO_SHOW` | Seeker confirmed but did not show up |

---

## 7. Seat Reservation Logic (15-Minute Hold)

The seat reservation system prevents double-booking while giving Seekers a grace period to confirm.

### Flow

```
1. Giver approves request
   → DB: request.status = APPROVED
   → Redis: SET hold:{rideId}:{seekerId} = requestId  EX 900 (15 min)
   → DB: ride.availableSeats -= 1  (optimistic decrement)
   → Notification: "You have 15 min to confirm your seat"

2a. Seeker confirms within 15 min
   → Redis: DEL hold:{rideId}:{seekerId}
   → DB: request.status = CONFIRMED
   → DB: create ride_participant record
   → Notification: "Seat confirmed! See you tomorrow."

2b. Hold expires (Redis TTL fires)
   → NestJS Bull queue job: seat-hold-expiry
   → DB: request.status = CANCELLED (reason: HOLD_EXPIRED)
   → DB: ride.availableSeats += 1  (restore seat)
   → Notification to Seeker: "Your hold expired"
   → Notification to Giver: "Seat available again"
```

### Redis Key Design

```
hold:{rideId}:{seekerId}
  value: requestId
  TTL: 900 seconds (15 minutes)
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Seeker confirms after TTL | API checks Redis; returns 410 GONE |
| Giver cancels during hold | Cancel all pending holds, restore seats, notify Seekers |
| Multiple Seekers requesting same last seat | FIFO: first approved gets the hold |

---

## 8. Commute Template System

Templates enable Givers to define a recurring schedule once, with the system auto-creating rides daily.

```typescript
CommuteTemplate {
  id: UUID (PK)
  ridGiverId: UUID (FK)
  vehicleId: UUID (FK)

  // Route (same as Ride)
  originName: string
  originLat: decimal
  originLng: decimal
  destinationName: string
  destinationLat: decimal
  destinationLng: decimal

  // Schedule
  departureDays: integer[]  // [1,2,3,4,5] = Mon–Fri (ISO weekday)
  departureTime: time
  totalSeats: integer

  isActive: boolean
  lastPublishedDate: date
  createdAt: timestamp
}
```

### Auto-Publish Cron Job

```
Schedule: runs daily at 06:00 AM IST
Logic:
  1. Query all active CommuteTemplates
  2. For each template where today is in departureDays:
     a. Check if a Ride for today already exists (idempotency)
     b. If not: create Ride with status = PUBLISHED
     c. Log: template {id} → ride {rideId} created
```

### Seeker Template (Commute Need)

```typescript
SeekerTemplate {
  id: UUID (PK)
  seekerId: UUID (FK)
  originName: string
  originLat: decimal
  originLng: decimal
  destinationName: string
  destinationLat: decimal
  destinationLng: decimal
  preferredDepartureTimeStart: time  // e.g., 08:30
  preferredDepartureTimeEnd: time    // e.g., 09:30
  activeDays: integer[]
  isActive: boolean
  createdAt: timestamp
}
```

---

## 9. Matching Engine Logic

```
Input: seekerTemplateId or manual search params
  - origin (lat/lng)
  - destination (lat/lng)
  - departureTime (window)
  - date

Step 1: Spatial filter (PostgreSQL)
  WHERE
    ST_DWithin(origin, seeker_origin, 500m)        -- pickup within 500m
    AND ST_DWithin(destination, seeker_dest, 500m) -- drop within 500m

Step 2: Time filter
  WHERE departure_time BETWEEN (seekerTime - 30min) AND (seekerTime + 30min)

Step 3: Availability filter
  WHERE available_seats > 0
  AND status = 'PUBLISHED'

Step 4: Gender preference filter
  WHERE giver.preferred_gender = 'ANY'
     OR giver.preferred_gender matches seeker.gender

Step 5: Sort by
  1. Distance from seeker's origin (ascending)
  2. Departure time proximity (ascending)
  3. Giver rating (descending)

Output: Ranked list of matching Ride objects
```

---

## 10. Live Tracking Flow

```
1. Ride status changes to ONGOING
   → Server opens WebSocket room: ride:{rideId}
   → Giver client starts sending GPS every 5 seconds

2. Giver → Server (WebSocket event: gps:update)
   payload: { rideId, lat, lng, timestamp, speed }

3. Server:
   → Redis: SET gps:{rideId} {lat, lng, timestamp}  EX 86400
   → Broadcast to room ride:{rideId}: gps:update event
   → Persist to ride_location_log (async, non-blocking)

4. Seeker client receives gps:update
   → Updates marker position on Leaflet map

5. Ride completes:
   → Server closes room
   → Redis key expires naturally (24h) or is cleaned up
```

---

## 11. Rating System

```typescript
RideRating {
  id: UUID (PK)
  rideId: UUID (FK)
  raterId: UUID (FK → users)
  rateeId: UUID (FK → users)
  score: integer (1–5)
  comment: string (nullable, max 200 chars)
  createdAt: timestamp
}
```

After ride completion:
- Both Giver and each Seeker are prompted to rate
- 24-hour rating window; after that the prompt expires
- Average rating updated on `ride_givers` / `ride_seekers` table via trigger or service call
