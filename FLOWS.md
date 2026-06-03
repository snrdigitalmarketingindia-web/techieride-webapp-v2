# TechieRide — System Flow Diagrams

---

## 1. Signup & Email Verification Flow

```mermaid
flowchart TD
    A([User visits /signup]) --> B[Fills registration form\ncompany email + personal email]
    B --> C{Domain allowed?}
    C -- No --> D[❌ Rejected\nOnly IT company emails]
    C -- Yes --> E[Account created\nstatus: EMAIL_VERIFICATION_PENDING]
    E --> F[Verification email sent\nto company email]
    E --> G{Personal email\nprovided?}
    G -- Yes --> H[Verification email sent\nto personal email]
    G -- No --> I[Skip]
    F --> J[User clicks link in\ncompany email]
    H --> K[User clicks link in\npersonal email]
    K --> L[personalEmailVerified = true\n✅ badge shown on profile]
    J --> M[emailStatus = VERIFIED\nstatus: DOCUMENT_VERIFICATION_PENDING]
    M --> N[User uploads Employee ID\non profile page]
    N --> O[Admin reviews\nverification queue]
```

---

## 2. Admin Approval / Rejection Flow

```mermaid
flowchart TD
    A([Admin logs in]) --> B[Opens Verification Queue]
    B --> C{Review type}

    C --> D[Employee Verification]
    D --> E{Decision}
    E -- Approve --> F[status: EMPLOYEE_VERIFIED\nTRID assigned e.g. TR2001\nWelcome email sent]
    E -- Reject --> G[status: REJECTED\nReason recorded\nUser notified]

    C --> H[Driver Verification\nDL + RC uploaded]
    H --> I{Decision}
    I -- Approve --> J[role: RIDE_GIVER\nstatus: DRIVER_VERIFIED\nlicenseVerified = true]
    I -- Reject --> K[Rejection reason saved\nUser notified]

    J --> L{RC also needs\nseparate approval}
    L -- Approve RC --> M[vehicle.rcVerified = true\nGiver can now publish rides]
    L -- Reject RC --> N[Giver cannot publish\nuntil RC approved]

    F --> O{Account actions}
    O -- Suspend --> P[status: SUSPENDED\nReason required\nUser locked out]
    O -- Reinstate --> Q[status: EMPLOYEE_VERIFIED\nAccess restored]
    O -- Deactivate --> R[status: DEACTIVATED\nPermanent — no reinstate]

    P --> S{Score-based\nauto actions}
    S -- score < 5 --> T[Auto SUSPENDED]
    S -- score = 0 --> U[Auto BANNED\nPermanent]
```

---

## 3. Ride Lifecycle Flow

```mermaid
flowchart TD
    A([Giver creates ride]) --> B[status: DRAFT]
    B --> C{RC verified?}
    C -- No --> D[❌ Cannot publish\nRC approval required]
    C -- Yes --> E[Giver publishes ride]
    E --> F[status: PUBLISHED\nVisible on search board]

    F --> G[Seekers browse\n& submit requests]
    G --> H[Request status: PENDING\nGiver notified via GENERIC notification]

    H --> I{Giver decision}
    I -- Approve --> J[Request: CONFIRMED\nSeeker notified]
    I -- Reject --> K[Request: REJECTED\nSeeker notified\nSeat freed]

    J --> L[Departure time arrives]
    L --> M[Giver starts ride]
    M --> N[status: ONGOING\nAll pending requests auto-rejected]

    N --> O[Boarding phase]
    O --> P[Each seeker: WAITING → BOARDED]
    P --> Q{All resolved?}
    Q -- No → mark no-show --> R[BOARDED → DEBOARDED\nor WAITING → NO_SHOW\n-10 ECO, -3 Trust to no-show]
    Q -- Yes --> S[Giver completes ride]
    S --> T[status: COMPLETED\nECO + Trust points awarded\nSeekers prompted to rate]

    F --> U{Giver cancels\nbefore start}
    U --> V[status: CANCELLED\nAll CONFIRMED seekers notified\nAll PENDING requests rejected]

    F --> W{Auto-expire cron\n30 min past departure}
    W --> X[status: CANCELLED\nSystem audit log entry]
```

---

## 4. Seat Request Flow

```mermaid
flowchart TD
    A([Seeker searches rides]) --> B{Gender filter}
    B -- womenOnly ride\n& no gender set --> C[⚠️ Banner shown\nSet gender in profile]
    B -- OK --> D[Seeker views ride detail]
    D --> E{Already requested?}
    E -- Yes --> F[Shows existing request status]
    E -- No --> G[Seeker submits request]
    G --> H[seats available check]
    H -- No seats --> I[❌ 400 Ride is full]
    H -- Seats available --> J[Request: PENDING\nGiver notified]

    J --> K{Giver action}
    K -- Approve --> L[Request: CONFIRMED\nSeeker notified\nSeats decremented]
    K -- Reject --> M[Request: REJECTED\nSeeker notified\nNo seat change]
    K -- No action\n4h timeout --> N[Request: REJECTED\nauto by cron\nSeeker notified]

    L --> O{Seeker cancels\nbefore ONGOING}
    O --> P[Request: CANCELLED\nSeat restored\nGiver notified]
    O -- After ONGOING --> Q[❌ 400 Cannot cancel\nride already started]
```

---

## 5. Trust Score & Eco Points Flow

```mermaid
flowchart TD
    A([New user]) --> B[trustScore: 10\ntrusband: NEW\necoPoints: 0\necoLevel: SEED]

    B --> C{Actions}
    C --> D[Complete ride as giver\n+ECO points based on distance\n+Trust points]
    C --> E[Complete ride as seeker\n+ECO points\n+Trust points]
    C --> F[No-show as seeker\n-10 ECO\n-3 Trust]
    C --> G[Inactive 30 days\n-2 Trust decay cron]
    C --> H[Inactive 60 days\n-5 Trust decay cron]
    C --> I[Inactive 90 days\n-10 Trust decay cron]

    D & E & F & G & H & I --> J{Trust Score}
    J -- 0–20 --> K[Band: NEW 🆕\nSearch only]
    J -- 21–40 --> L[Band: BRONZE 🟤\nFull seeker access]
    J -- 41–60 --> M[Band: SILVER ⚪\nFull access + priority]
    J -- 61–80 --> N[Band: GOLD 🟡\nGiver eligibility]
    J -- 81–100 --> O[Band: PLATINUM 🟣\nTop priority]

    J -- score < 5 --> P[Auto SUSPENDED]
    J -- score = 0 --> Q[BANNED permanent]

    D & E --> R{Eco Points}
    R -- 0–99 --> S[🌱 SEED]
    R -- 100–299 --> T[🌿 SPROUT]
    R -- 300–599 --> U[🍃 LEAF]
    R -- 600–999 --> V[🌳 TREE]
    R -- 1000+ --> W[🌲 FOREST]
```

---

## 6. Verification Two-Track Flow

```mermaid
flowchart LR
    A([Registered User\nEMPLOYEE_VERIFIED]) --> B{Wants to\noffer rides?}
    B -- No --> C[Stays as RIDE_SEEKER\nCan book rides only]
    B -- Yes --> D[Goes to Become a Giver]
    D --> E[Uploads DL + RC\nvia profile page]
    E --> F[Admin reviews\nDriver queue]
    F -- Reject --> G[Stays RIDE_SEEKER\nReason shown]
    F -- Approve DL --> H[role: RIDE_GIVER\nstatus: DRIVER_VERIFIED\nlicenseVerified = true]
    H --> I{RC separately\nreviewed}
    I -- Reject RC --> J[Can log in as Giver\nbut cannot publish rides]
    I -- Approve RC --> K[vehicle.rcVerified = true\n✅ Can publish rides]
```

---

## 7. Boarding Flow

```mermaid
flowchart TD
    A([Ride goes ONGOING]) --> B[Each confirmed seeker\ngets boardingStatus: WAITING]
    B --> C{Giver action\nper passenger}

    C -- Passenger boards --> D[boardingStatus: BOARDED]
    D --> E{Passenger exits\nat destination}
    E -- Deboard --> F[boardingStatus: DEBOARDED ✅]

    C -- Passenger never shows --> G[boardingStatus: NO_SHOW\n-10 ECO to seeker\n-3 Trust to seeker]

    F & G --> H{All passengers\nresolved?}
    H -- No --> I[Giver cannot complete ride\n❌ 400 error]
    H -- Yes --> J[Giver can complete ride\nstatus: COMPLETED]
```

---

## 8. SOS Flow

```mermaid
flowchart TD
    A([User taps SOS button]) --> B{60-second\ncooldown active?}
    B -- Yes --> C[❌ 429 Wait N seconds]
    B -- No --> D{rideId provided?}
    D -- Yes --> E{Ride is ONGOING?}
    E -- No --> F[❌ 400 Ride not ongoing]
    E -- Yes --> G{User is participant?\nGiver or confirmed seeker}
    G -- No --> H[❌ 403 Not a participant]
    G -- Yes --> I[SOS event created\nlat/lng recorded]
    D -- No\nstandalone SOS --> I
    I --> J[All ride participants notified\nSOS_ALERT notification]
    J --> K[Admin dashboard shows\nactive SOS events]
    K --> L{Admin reviews}
    L --> M[Admin contacts user\nvia phone/app]
```

---

## 9. Complaint Flow

```mermaid
flowchart TD
    A([User files complaint]) --> B{Against self?}
    B -- Yes --> C[❌ Cannot report yourself]
    B -- No --> D{Against admin?}
    D -- Yes --> E[❌ Cannot report admin]
    D -- No --> F{rideId provided?}
    F -- Yes --> G{Both users\nwere participants?}
    G -- No --> H[❌ 403 Not a ride participant]
    G -- Yes --> I[Complaint created\nstatus: OPEN]
    F -- No --> I
    I --> J[Admin sees complaint\nin admin queue]
    J --> K{Admin decision}
    K -- Resolve --> L[status: RESOLVED\n-Trust points to reported user\nreportedBy admin]
    K -- Dismiss --> M[status: DISMISSED\nNo trust impact]
    L --> N[Reported user notified\nTrust score updated]
```

---

## 10. Rating Flow

```mermaid
flowchart TD
    A([Ride COMPLETED]) --> B[Giver notified ✅\nSeekers notified — Rate your experience]
    B --> C{Who rates whom}
    C --> D[Seeker rates Giver\nscore 1–5 + optional comment]
    C --> E[Giver rates Seeker\nscore 1–5 + optional comment]
    D --> F{Ride COMPLETED?}
    E --> F
    F -- No --> G[❌ 400 Can only rate completed rides]
    F -- Yes --> H{Already rated\nthis person for this ride?}
    H -- Yes --> I[❌ 409 Duplicate rating]
    H -- No --> J[Rating saved]
    J --> K[Ratee's averageRating updated]
    K --> L[Trust score adjusted\nbased on rating]
    L --> M[Ratee notified\nof new rating]
```

---

## 11. Password Reset Flow

```mermaid
flowchart TD
    A([User clicks Forgot Password]) --> B[Enters company email]
    B --> C{Email exists?}
    C -- No --> D[Silent success\nno email sent — security]
    C -- Yes --> E[Reset token generated\n1-hour expiry]
    E --> F[Reset link sent\nto company email]
    F --> G[User clicks link]
    G --> H{Token valid\n& not expired?}
    H -- No --> I[❌ Invalid or expired link]
    H -- Yes --> J[User enters new password]
    J --> K[Password updated\ntoken cleared]
    K --> L[User redirected to login]
```

---

## 12. Official Email Change Flow

```mermaid
flowchart TD
    A([User on Profile page]) --> B[Clicks Change Office Email]
    B --> C[Enters new company email]
    C --> D{Domain allowed?}
    D -- No --> E[❌ Only IT company domains]
    D -- Yes --> F[Token generated\n24-hour expiry]
    F --> G[Verification sent\nto NEW email address]
    G --> H[pendingEmail stored\ncurrent email still active for login]
    H --> I[User clicks link\nin new email inbox]
    I --> J{Token valid?}
    J -- No --> K[❌ Invalid or expired]
    J -- Yes --> L[email field updated\nto new address]
    L --> M[Old email no longer works\nUser logs in with new email]
```

---

## 13. Commute Template Flow

```mermaid
flowchart TD
    A([Giver creates template]) --> B[Stores: origin, destination\nvehicle, seats, departure time\nwomenOnly flag]
    B --> C{isActive?}
    C -- No --> D[Template saved\nbut not auto-published]
    C -- Yes --> E[Template active\nwaiting for cron]

    E --> F[Cron fires\n00:30 IST Mon–Fri daily]
    F --> G{Template still active?}
    G -- No --> H[Skip]
    G -- Yes --> I[New ride created\nfrom template for today]
    I --> J[status: PUBLISHED\nVisible on search board]
    J --> K[Seekers can request seats]

    A --> L[Giver can toggle\ntemplate on/off anytime]
    L --> C
```

---

## 14. Cron Jobs Overview

```mermaid
flowchart LR
    subgraph Every 30 min
        A[⏱ Auto-expire unstated rides\nCancels PUBLISHED rides\n30+ min past departure\nNotifies all participants\nSystem audit log]
        B[⏱ Departure reminder\n60 min before departure\nNotifies giver + all confirmed seekers]
    end

    subgraph Every Hour
        C[⏱ Pending request expiry\nRejects PENDING requests\nolder than 4 hours\nSeeker notified]
    end

    subgraph Daily 00:30 IST Mon–Fri
        D[⏱ Commute template\nauto-publish\nCreates rides from\nactive templates]
    end

    subgraph Daily 03:00 IST
        E[⏱ Trust score decay\nInactive 30 days → -2\nInactive 60 days → -5\nInactive 90 days → -10\nFloor: 10]
    end
```

---

## 15. Notification Delivery Flow

```mermaid
flowchart TD
    A([System event occurs\ne.g. request approved]) --> B[notifications.create called\nwith userId + type + title + body]
    B --> C[Notification stored in DB\nisRead: false]
    C --> D{FCM token\navailable?}
    D -- Yes --> E[Push notification sent\nvia FCM to device]
    D -- No --> F[In-app only]
    E & F --> G[User opens app]
    G --> H[Bell icon shows\nunread count badge]
    H --> I[User taps bell]
    I --> J[GET /notifications\nreturns paginated list\nnewest first]
    J --> K[User reads notification]
    K --> L[PATCH /notifications/:id/read\nor mark all read]
    L --> M[isRead: true\nreadAt: timestamp]

    C --> N{Personal email\nverified?}
    N -- Yes --> O[Email notification sent\nto personalEmail]
    N -- No --> P[Email sent to\ncompany email as fallback]
```

---

## 16. Live Tracking Flow

```mermaid
flowchart TD
    A([Ride goes ONGOING]) --> B[Giver opens ride detail]
    B --> C[Frontend connects\nWebSocket to API]
    C --> D{JWT token valid?}
    D -- No --> E[Connection rejected\ndisconnect]
    D -- Yes --> F[Connected\nclient.data.userId set]

    F --> G[Giver emits JOIN_RIDE\nwith rideId]
    G --> H{User is participant?}
    H -- No --> I[❌ Cannot join room]
    H -- Yes --> J[Client joins Socket.io room\nride:rideId]

    F --> K[Seeker emits JOIN_RIDE\nwith rideId]
    K --> H

    J --> L[Giver emits GPS_UPDATE\nlat + lng + heading]
    L --> M[Server stores last known\nlocation in Redis]
    M --> N[Server broadcasts\nto all in ride:rideId room]
    N --> O[All seekers receive\nGPS_UPDATE in real-time]
    O --> P[Seeker map updates\nwith giver position]

    P --> Q{Ride COMPLETED\nor CANCELLED?}
    Q -- Yes --> R[All clients\ndisconnect from room]
```

---

## 17. Upload / Document Flow

```mermaid
flowchart TD
    A([User on profile/verification page]) --> B[Selects file\nimage or document]
    B --> C[POST /uploads\nmultipart/form-data\ndocType + file]
    C --> D{File valid?\nsize + mime type}
    D -- No --> E[❌ 400 Invalid file]
    D -- Yes --> F[Cloudinary SDK\nuploads file]
    F --> G[Stored at\ntechieride/docType/userId/filename]
    G --> H[Returns secure_url]
    H --> I{docType}
    I -- employeeId --> J[URL saved to\nverificationRequest.employeeIdUrl]
    I -- drivingLicense --> K[URL saved to\nverificationRequest.drivingLicenseUrl]
    I -- rc --> L[URL saved to\nverificationRequest.rcUrl]
    I -- profile --> M[URL saved to\nuser.profilePhoto]
    J & K & L --> N[Admin sees document\nin verification queue]
    N --> O[Admin opens URL\nreviews document]
    O --> P{Approve or Reject}
```
