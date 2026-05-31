# Wireframe: Admin Panel — Techie Ride

> **Status:** Placeholder — visual wireframes to be designed in Figma.  
> Admin panel is a web-only interface (desktop-first).

---

## Overview

The Admin Panel is a protected web dashboard used by Techie Ride operators to manage verifications, monitor rides, handle SOS events, and view platform analytics.

---

## Layout Structure (Desktop)

```
┌──────────────────────────────────────────────────────┐
│  SIDEBAR          │  MAIN CONTENT AREA                │
│  ─────────────── │  ─────────────────────────────── │
│  🏠 Dashboard     │  [Dynamic content based on menu] │
│  👤 Users         │                                   │
│  ✅ Verification  │                                   │
│  🚗 Rides         │                                   │
│  🆘 SOS Alerts   │                                   │
│  📊 Analytics     │                                   │
│  ⚙️ Settings      │                                   │
│                   │                                   │
│  [Admin Name]     │                                   │
│  [Logout]         │                                   │
└──────────────────────────────────────────────────────┘
```

---

## Screens

### 1. Dashboard (Home)

**Purpose:** At-a-glance platform health.

**KPI Cards Row 1:**
| Total Users | Verified Users | Active Rides Today | SOS Alerts |
|-------------|---------------|-------------------|-----------|
| 1,240 | 987 | 43 | 2 🔴 |

**KPI Cards Row 2:**
| Rides This Month | CO2 Saved (kg) | Avg Rating | Pending Verifications |
|-----------------|---------------|-----------|----------------------|
| 2,340 | 1,820 | 4.6 ⭐ | 12 |

**Charts:**
- Daily rides trend (line chart, last 30 days)
- User registration trend
- Verification approval rate (pie: approved / rejected / pending)

---

### 2. Users Management

**Table columns:**
- Name | Phone | Email | Role | Status | Verification | Actions

**Filters:**
- Role: All / Giver / Seeker / Both
- Verification: All / Pending / Approved / Rejected
- Status: All / Active / Suspended

**Actions per user:**
- View profile (modal)
- Suspend account
- Ban account
- View rides
- View documents

---

### 3. Verification Queue

**Purpose:** Review uploaded documents and approve/reject.

**Table columns:**
- User | Submitted At | Documents | Status | Actions

**Document Review Modal:**
```
┌──────────────────────────────────┐
│  Reviewing: Arjun Mehta          │
│  Submitted: 30 May 2026 10:15 AM │
│                                  │
│  [Employee ID]  [View]           │
│  [Driving License] [View]        │
│  [RC Document] [View]            │
│                                  │
│  Decision:                       │
│  [✅ Approve] [❌ Reject]        │
│                                  │
│  Rejection reason (if reject):   │
│  [________________________________]│
│  [Submit Decision]               │
└──────────────────────────────────┘
```

**SLA indicator:** Flag requests older than 24 hours in yellow/red.

---

### 4. Rides Monitor

**Table columns:**
- Ride ID | Giver | Date | Time | Route | Seats | Status | Actions

**Filters:**
- Date range
- Status: All / Published / Ongoing / Completed / Cancelled

**Ride Detail Modal:**
- Full ride info
- Participants list
- Map with route
- Option to cancel ride (with reason)

---

### 5. SOS Alerts

**Active SOS banner** (if any active): red strip at top of page.

**Table columns:**
- Alert ID | User | Ride ID | Location | Triggered At | Status | Actions

**Alert Detail Panel:**
```
┌──────────────────────────────────┐
│  🆘 SOS ALERT #2041              │
│  User: Meena T.  📞 +91-9876..   │
│  Ride: #R-8812                   │
│  Triggered: 31 May 2026 09:22 AM │
│  Location: 17.4401, 78.3489      │
│  [View on Map]                   │
│                                  │
│  Emergency Contacts Notified: ✅  │
│                                  │
│  Resolution Notes:               │
│  [________________________________]│
│  [Mark Resolved]                 │
└──────────────────────────────────┘
```

---

### 6. Analytics

**Date range picker** at the top.

**Charts and stats:**
- Rides per day / week / month (bar chart)
- CO2 savings over time (area chart)
- Top routes by ride volume (table)
- User growth (line chart)
- Verification turnaround time (average days)
- SOS events per month

**Export:** CSV export for all tables.

---

## Access Control

- Admin panel is only accessible to users with `role = ADMIN`
- All admin actions are audit-logged with admin ID + timestamp
- No PII is stored in analytics aggregates
