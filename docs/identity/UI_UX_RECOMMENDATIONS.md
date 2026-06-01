# UI/UX RECOMMENDATIONS
> TechieRide Identity Architecture — v1.0

---

## 1. Profile Page Redesign

### Current Issues
- Single long scrollable page — no section separation
- Not role-aware — shows same fields for all roles
- No visual progress indicator
- No inline field editing — full form submit only

### Recommended Design

#### Header Section
```
┌─────────────────────────────────────────────────┐
│  [Photo]  Priya Sharma                          │
│           🌿 LEAF · TR2001 · RIDE_GIVER          │
│           ████████░░  80% profile complete       │
│                           [Edit Profile]        │
└─────────────────────────────────────────────────┘
```

#### Tab-Based Layout
```
[ Personal ] [ Company ] [ Vehicles ] [ Documents ] [ Preferences ] [ Security ]
```
- Personal: name, gender, photo, blood group, phone, personal email
- Company: company name, employee ID, official email (with verification status badge)
- Vehicles: (GIVER/BOTH only) vehicle list + add vehicle
- Documents: verification status, document cards with expiry dates
- Preferences: ride preferences, notification preferences
- Security: password change, session management, account deactivation

#### Inline Editing Pattern
Each field row has an edit (✏️) icon. Clicking opens inline edit with Save/Cancel. No full page submit.

---

## 2. Role Switching UI

### Entry Point: Profile → "Manage Roles" section

```
┌─────────────────────────────────────────────────────┐
│  Your Roles                                         │
│                                                     │
│  ✅  Ride Seeker    Active since 12 Jan 2026         │
│  ❌  Ride Giver    Not active                        │
│                                                     │
│  [+ Become a Ride Giver]                            │
└─────────────────────────────────────────────────────┘
```

### Upgrade Flow (Seeker → Giver)
```
Step 1/3: Documents
  "To become a Ride Giver, we need a few more things."
  [Upload Driving License]  [Upload RC]
  
Step 2/3: Add Your Vehicle
  Make / Model / Color / Plate / Seats
  
Step 3/3: Review & Submit
  [Submit for Review]
  "You'll be notified within 24 hours."
```

### During Review
```
⏳ Giver upgrade under review
   Submitted 2 hours ago
   [View submitted documents]
```

### After Approval
```
🎉 You're now a Ride Giver!
   Your TRID: TR2001
   [Start offering rides →]
```

---

## 3. Verification Banner System

Show persistent banners based on account status:

| Status | Banner | CTA |
|---|---|---|
| EMAIL_PENDING | ⚠️ Please verify your email | Resend / Change email |
| DOCS_PENDING | 📄 Complete verification to access all features | Submit Documents |
| UNDER_REVIEW | ⏳ Your documents are being reviewed (24h) | View Status |
| REJECTED | ❌ Verification rejected — please re-upload | Re-upload |
| DL expiring in 15 days | ⏰ Your driving license expires soon | Update DL |
| SUSPENDED | 🚫 Account suspended until [date] | View Reason |

---

## 4. Email Verification Flow

### On Registration
```
"We've sent a verification link to priya@infosys.com
 Check your inbox and click the link to continue."

[Resend email] [Change email]
```

### On Email Change
```
"We've sent a verification link to priya@newcompany.com
 Your current email (priya@infosys.com) remains active until verified."
 
[Resend to new email] [Cancel change]
```

---

## 5. Account Status Visibility for User

Show current status clearly on profile:

```
┌──────────────────────────────────────────────┐
│ Account Status                               │
│                                              │
│ ✅ Email: Verified (priya@infosys.com)        │
│ ✅ Identity: Approved                         │
│ ✅ TRID: TR2001                               │
│ ✅ Vehicle: TS09AB5678 — RC Verified          │
│ ⏰ Driving License: Expires in 45 days        │
│                          [Renew DL →]        │
└──────────────────────────────────────────────┘
```

---

## 6. Company Change UX

Entry: Profile → Company → "Change Company Email"

```
┌──────────────────────────────────────────────────┐
│  Change Company Email                            │
│                                                  │
│  Current: priya@infosys.com ✅ Verified           │
│                                                  │
│  New company email:                              │
│  [priya@newcompany.com          ]                │
│                                                  │
│  ⚠️ Your old email remains active until the       │
│     new one is verified.                         │
│     You'll also need to re-upload your           │
│     Company ID for the new employer.             │
│                                                  │
│  [Send verification email]                       │
└──────────────────────────────────────────────────┘
```

---

## 7. Dynamic Profile — Role-Specific Sections

### RIDE_SEEKER profile shows:
- Personal Info ✅
- Company Info ✅
- Emergency Contact ✅
- Ride Preferences ✅
- Ride Statistics (taken) ✅
- ❌ No Vehicles section
- ❌ No Driving License section
- ❌ No RC section

### RIDE_GIVER profile shows:
- Personal Info ✅
- Company Info ✅
- Emergency Contact ✅
- Vehicles section ✅
- Driving License + RC ✅
- Ride Preferences ✅
- Ride Statistics (given) ✅
- ❌ No Rides Taken stats

### BOTH profile shows: everything.

---

## 8. Onboarding Improvements

### Current: 4-step signup
Works well. Suggested improvement: Add **Step 5: Role Confirmation** with clear explanation.

```
Step 5/5: Choose Your Role

   🧳 Ride Seeker
   Find and book rides with verified colleagues
   ✅ Company ID verification only
   
   🚗 Ride Giver  
   Offer rides and earn ECO points
   ✅ Driving License + RC required
   
   🔄 Both (Recommended)
   Full platform access
   ✅ All documents required for giver features
   
   [Continue as Both] ← recommended, highlighted
   [Choose for me based on my commute]
```

---

## 9. Missing UX Screens (to Build)

| Screen | Priority | Description |
|---|---|---|
| Role Upgrade Flow | High | 3-step wizard for adding giver role |
| Company Change Form | High | Email change with dual-email explanation |
| Document Renewal | High | Re-upload individual expired document |
| Notification Preferences | Medium | Toggle switches per notification type |
| Ride Preferences | Medium | Set preferences for ride experience |
| Account Deactivation | Medium | With cooling period explanation |
| Suspension Notice | Medium | Clear reason, duration, appeal option |
| Profile Completeness Bar | Low | Progress bar on profile header |
