# Techie Ride WebApp V2 — System Design Blueprint

> A verified IT employee carpooling platform built for recurring Hyderabad commutes.

---

## Product Vision

Techie Ride is a **safety-first, verified IT employee-only** carpooling platform designed for the Hyderabad tech corridor. It connects IT professionals sharing the same commute route on a recurring basis — not a taxi service, not an on-demand ride platform. The goal is to reduce traffic congestion, lower individual commute costs, and build a trusted community of verified tech employees who share rides daily.

---

## System Overview

| Dimension | Details |
|-----------|---------|
| Launch City | Hyderabad, India |
| Target Users | Verified IT employees (HITEC City, Gachibowli, Madhapur, etc.) |
| Core Model | Ride Giver / Ride Seeker recurring commute matching |
| Identity Verification | Work email + Employee ID + Driving License + RC |
| Infrastructure | Zero-cost / OSS-first design |
| Maps | OpenStreetMap + Leaflet.js |
| Realtime | WebSockets (Socket.io) |

---

## Architecture Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Backend | NestJS (Modular Monolith) |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| File Storage | MinIO (S3-compatible) |
| Maps | OpenStreetMap + OSRM |
| Realtime | Socket.io (WebSockets) |
| Notifications | FCM (Push) + Nodemailer (Email) |
| Auth | JWT + Refresh Tokens |
| Admin | Custom NestJS Admin Module |

---

## Module List

| # | Module | Description |
|---|--------|-------------|
| 1 | Auth | Registration, login, JWT, refresh, email OTP |
| 2 | User | Profile, verification status, preferences |
| 3 | Ride Giver | Vehicle, availability, recurring schedule |
| 4 | Ride Seeker | Commute needs, seat requests |
| 5 | Ride Matching | Route + time overlap matching engine |
| 6 | Seat Reservation | 15-min hold → confirm → expire flow |
| 7 | Live Tracking | Real-time GPS via WebSockets |
| 8 | Notifications | Push + email + in-app |
| 9 | Commute Templates | Recurring route templates |
| 10 | Gamification | ECO points, levels, leaderboard |
| 11 | Verification | Admin-reviewed document verification |
| 12 | SOS & Safety | Emergency broadcast, last-known location |
| 13 | Admin Panel | User management, verification, analytics |
| 14 | Ratings | Post-ride rating system |

---

## Folder Structure

```
techieride-webapp-v2/
├── 01-product-requirements/     # PRD, user stories, acceptance criteria
├── 02-system-architecture/      # HLD, service design, data flow
├── 03-low-level-design/         # LLD, models, logic flows
├── 04-database-design/          # PostgreSQL schema, ERD
├── 05-api-design/               # REST API contracts
├── 06-state-machines/           # Ride lifecycle state machine
├── 07-wireframes/               # Screen-by-screen wireframe specs
├── 08-gamification-system/      # ECO points, levels, leaderboard
├── 09-security-and-safety/      # Verification, SOS, privacy
├── diagrams/                    # Mermaid + visual architecture diagrams
└── README.md                    # This file
```

---

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Product Requirements | ✅ Complete | PRD, user stories defined |
| System Architecture | ✅ Complete | HLD, service map, data flow |
| Low-Level Design | ✅ Complete | Models, ride logic, templates |
| Database Schema | ✅ Complete | Full PostgreSQL schema |
| API Design | ✅ Complete | REST endpoints defined |
| State Machines | ✅ Complete | Ride lifecycle states |
| Wireframes | 🔄 In Progress | Screen specs (placeholders ready) |
| Gamification | ✅ Complete | ECO points, levels |
| Security & Safety | ✅ Complete | Verification, SOS, privacy |
| Engineering Build | ⏳ Pending | Implementation phase |

---

## Key Design Principles

1. **Verified-only access** — No anonymous users. Every ride giver and seeker is verified before they can post or book.
2. **Recurring commutes** — Not on-demand. Commute templates enable automatic daily matching.
3. **Safety-first** — SOS, live tracking, emergency contacts, and admin oversight are core — not afterthoughts.
4. **Zero-cost infra** — OSS stack (PostgreSQL, Redis, MinIO, OSM) keeps infrastructure costs near zero at launch.
5. **Community trust** — Ratings, ECO levels, and transparency build long-term reliability across the network.

---

*This repository is a production-grade system design blueprint intended for engineering teams and investor technical reviews.*
