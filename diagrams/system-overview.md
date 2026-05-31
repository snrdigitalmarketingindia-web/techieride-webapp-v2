# System Diagrams — Techie Ride WebApp V2

---

## 1. Full System Architecture

```mermaid
graph TB
    subgraph Users["Users"]
        GiverApp["Ride Giver\n(Next.js PWA)"]
        SeekerApp["Ride Seeker\n(Next.js PWA)"]
        AdminApp["Admin\n(Next.js Web)"]
    end

    subgraph Gateway["Edge / Gateway"]
        NGINX["Nginx\nReverse Proxy + SSL"]
    end

    subgraph NestJS["NestJS Backend (Modular Monolith)"]
        direction TB
        AUTH["Auth\nModule"]
        USER["User\nModule"]
        RIDE["Ride\nModule"]
        TEMPLATE["Template\nModule + Cron"]
        MATCH["Matching\nEngine"]
        TRACK["Live Tracking\nModule"]
        NOTIFY["Notification\nModule"]
        GAMIFY["Gamification\nModule"]
        VERIFY["Verification\nModule"]
        SOS["SOS\nModule"]
        ADMIN["Admin\nModule"]
    end

    subgraph WS["Realtime (Socket.io)"]
        WSS["WebSocket Server\n(embedded in NestJS)"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL 15\nPrimary DB")]
        REDIS[("Redis 7\nCache + Pub/Sub")]
        MINIO[("MinIO\nDocument Storage")]
    end

    subgraph External["External Services"]
        FCM["Firebase\nFCM Push"]
        SMTP["SMTP\nEmail"]
        OSM["OpenStreetMap\n+ OSRM Routing"]
        SMS["SMS Gateway\n(OTP + SOS)"]
    end

    GiverApp & SeekerApp & AdminApp -->|HTTPS| NGINX
    GiverApp & SeekerApp -->|WSS| WSS
    NGINX --> NestJS
    WSS --> TRACK & NOTIFY

    NestJS --> PG
    NestJS --> REDIS
    NestJS --> MINIO
    NOTIFY --> FCM & SMTP
    SOS --> SMS
    MATCH --> OSM
    TRACK --> REDIS
    TEMPLATE --> PG
```

---

## 2. Ride Request & Confirmation Flow

```mermaid
sequenceDiagram
    participant Seeker
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Redis
    participant Giver
    participant NotifSvc as Notification Service

    Seeker->>API: GET /rides/search
    API->>DB: Geospatial + time query
    DB-->>API: Matching rides[]
    API-->>Seeker: Ride list

    Seeker->>API: POST /ride-requests {rideId}
    API->>DB: INSERT ride_request (PENDING)
    API->>NotifSvc: Notify Giver (push + WS)
    NotifSvc-->>Giver: "New seat request"

    Giver->>API: PATCH /ride-requests/:id/approve
    API->>DB: UPDATE request status → APPROVED
    API->>DB: UPDATE rides.available_seats -= 1
    API->>Redis: SET hold:{rideId}:{seekerId} EX 900
    API->>NotifSvc: Notify Seeker (15-min window)
    NotifSvc-->>Seeker: "Confirm your seat in 15 min"

    alt Seeker confirms in time
        Seeker->>API: PATCH /ride-requests/:id/confirm
        API->>Redis: DEL hold key
        API->>DB: UPDATE request → CONFIRMED
        API->>DB: INSERT ride_participants
        API->>NotifSvc: Notify both parties
        NotifSvc-->>Giver: "Seat confirmed by Seeker"
        NotifSvc-->>Seeker: "You're all set for tomorrow!"
    else Hold expires (TTL)
        Redis-->>API: TTL expiry event (Bull queue)
        API->>DB: UPDATE request → CANCELLED (hold_expired)
        API->>DB: UPDATE rides.available_seats += 1
        API->>NotifSvc: Notify both parties
        NotifSvc-->>Seeker: "Your hold expired"
        NotifSvc-->>Giver: "Seat is available again"
    end
```

---

## 3. Live Tracking Flow

```mermaid
sequenceDiagram
    participant Giver as Giver App
    participant WS as WebSocket Server
    participant Redis
    participant DB as PostgreSQL
    participant Seeker as Seeker App

    Note over Giver,Seeker: Ride status → ONGOING

    Giver->>WS: connect (JWT auth)
    WS->>WS: join room: ride:{rideId}
    Seeker->>WS: connect (JWT auth)
    WS->>WS: join room: ride:{rideId}

    loop Every 5 seconds
        Giver->>WS: emit gps:update {lat, lng, speed}
        WS->>Redis: SET gps:{rideId} {lat,lng,ts} EX 86400
        WS->>DB: INSERT ride_location_log (async)
        WS-->>Seeker: broadcast gps:update
        Seeker->>Seeker: Update map marker position
    end

    Note over Giver,Seeker: Ride status → COMPLETED
    WS->>WS: close room ride:{rideId}
    Note over Redis: Key expires after 24h
```

---

## 4. SOS Flow

```mermaid
sequenceDiagram
    participant User as User (Seeker/Giver)
    participant API as NestJS API
    participant Redis
    participant DB as PostgreSQL
    participant Contacts as Emergency Contacts
    participant Admin as Admin Dashboard

    User->>API: POST /sos {rideId, lat, lng}
    API->>DB: INSERT sos_events (TRIGGERED)
    API->>Redis: snapshot last known GPS
    API->>Contacts: Push notification (FCM)
    API->>Contacts: Email with map link
    API->>Contacts: SMS via gateway
    API->>Admin: WebSocket: sos:alert event
    API-->>User: 201 "Emergency contacts notified"

    Admin->>API: PATCH /sos/:id/resolve {notes}
    API->>DB: UPDATE sos_events (RESOLVED)
    API-->>Admin: Resolved confirmation
```

---

## 5. Auto-Publish Cron Flow

```mermaid
flowchart TD
    A["⏰ Cron: 06:00 AM IST daily"] --> B["Query all active\nCommute Templates"]
    B --> C{"Is today in\ndeparture_days?"}
    C -- No --> D["Skip template"]
    C -- Yes --> E{"Ride for today\nalready exists?"}
    E -- Yes --> F["Skip (idempotent)"]
    E -- No --> G["Create Ride\nstatus = PUBLISHED"]
    G --> H["Notify Giver:\n'Your ride for today\nis published'"]
    H --> I["Ride visible\nin search results"]
```

---

## 6. Verification Flow

```mermaid
flowchart TD
    A["User uploads documents"] --> B["Documents stored\nin MinIO (private)"]
    B --> C["Verification request\ncreated (PENDING)"]
    C --> D["Admin notified\n(verification queue)"]
    D --> E{"Admin reviews"}
    E -- Approve --> F["user.verification_status\n= APPROVED"]
    E -- Reject --> G["rejection_reason\nstored"]
    F --> H["User notified:\nFull access unlocked"]
    G --> I["User notified:\nRe-upload prompt"]
    I --> A
```
