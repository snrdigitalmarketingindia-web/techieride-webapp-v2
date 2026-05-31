# API Design — Techie Ride WebApp V2

**Base URL:** `https://api.techieride.in/v1`  
**Auth:** Bearer JWT (except public endpoints)  
**Content-Type:** `application/json`

---

## Authentication Rules

| Route Pattern | Auth Required |
|--------------|--------------|
| `POST /auth/*` | No |
| `GET /rides/search` | No (limited response) |
| All other routes | Yes — `Authorization: Bearer <access_token>` |
| `/admin/*` | Yes + role = ADMIN |

---

## 1. Auth APIs

### Register
```
POST /auth/register
Body: {
  phone: string,
  email: string,         // work email
  fullName: string,
  password: string,
  companyName: string,
  employeeId: string,
  gender: "MALE" | "FEMALE" | "OTHER"
}
Response 201: {
  userId: string,
  message: "OTP sent to phone"
}
```

### Verify OTP
```
POST /auth/verify-otp
Body: { phone: string, otp: string }
Response 200: {
  accessToken: string,
  refreshToken: string,
  user: UserDTO
}
```

### Login (request OTP)
```
POST /auth/login
Body: { phone: string }
Response 200: { message: "OTP sent" }
```

### Refresh Token
```
POST /auth/refresh
Body: { refreshToken: string }
Response 200: { accessToken: string, refreshToken: string }
```

### Logout
```
POST /auth/logout
Auth: Required
Response 200: { message: "Logged out" }
```

---

## 2. User APIs

### Get My Profile
```
GET /users/me
Response 200: {
  id, phone, email, fullName, profilePhoto,
  gender, companyName, role,
  verificationStatus, ecoPoints, ecoLevel,
  averageRating, totalRides
}
```

### Update Profile
```
PATCH /users/me
Body: { fullName?, profilePhoto?, gender?, preferredGender? }
Response 200: UserDTO
```

### Upload Profile Photo
```
POST /users/me/photo
Content-Type: multipart/form-data
Body: { file: File }
Response 200: { photoUrl: string }
```

### Get Emergency Contacts
```
GET /users/me/emergency-contacts
Response 200: EmergencyContact[]
```

### Add Emergency Contact
```
POST /users/me/emergency-contacts
Body: { name: string, phone: string, relationship: string }
Response 201: EmergencyContact
```

### Get User Public Profile
```
GET /users/:id/public
Response 200: {
  fullName, profilePhoto, ecoLevel,
  averageRating, totalRides, companyName
}
```

---

## 3. Verification APIs

### Submit Verification Documents
```
POST /verification/submit
Content-Type: multipart/form-data
Body: {
  employeeId: File,
  drivingLicense?: File,   // required for RIDE_GIVER
  rc?: File                // required for RIDE_GIVER
}
Response 201: {
  requestId: string,
  status: "PENDING"
}
```

### Get My Verification Status
```
GET /verification/status
Response 200: {
  status: "PENDING" | "APPROVED" | "REJECTED",
  rejectionReason?: string,
  submittedAt: string
}
```

---

## 4. Vehicle APIs

### Add Vehicle
```
POST /vehicles
Auth: RIDE_GIVER only
Body: {
  make, model, year, color, plateNumber, totalSeats
}
Response 201: VehicleDTO
```

### Upload RC Document
```
POST /vehicles/:id/rc
Content-Type: multipart/form-data
Body: { file: File }
Response 200: { rcUrl: string }
```

### Get My Vehicles
```
GET /vehicles/my
Response 200: VehicleDTO[]
```

---

## 5. Commute Template APIs

### Create Template
```
POST /templates
Auth: RIDE_GIVER
Body: {
  vehicleId: string,
  originName, originLat, originLng,
  destinationName, destinationLat, destinationLng,
  departureDays: number[],  // [1,2,3,4,5]
  departureTime: "HH:MM",
  totalSeats: number
}
Response 201: TemplateDTO
```

### Get My Templates
```
GET /templates/my
Response 200: TemplateDTO[]
```

### Toggle Template Active
```
PATCH /templates/:id/toggle
Response 200: { isActive: boolean }
```

### Delete Template
```
DELETE /templates/:id
Response 204
```

---

## 6. Ride APIs

### Search Rides
```
GET /rides/search
Query: {
  originLat, originLng,
  destinationLat, destinationLng,
  date: "YYYY-MM-DD",
  timeFrom: "HH:MM",
  timeTo: "HH:MM",
  page?: number,
  limit?: number
}
Response 200: {
  rides: RideMatchDTO[],
  total: number,
  page: number
}

RideMatchDTO: {
  id, rideGiver: { fullName, photo, rating, ecoLevel },
  vehicle: { make, model, color, plateNumber },
  departureTime, estimatedArrivalTime,
  availableSeats, originName, destinationName,
  distanceFromOriginM, distanceFromDestinationM
}
```

### Get Ride Details
```
GET /rides/:id
Response 200: RideDetailDTO (full details + participants count)
```

### Create Ride (manual, without template)
```
POST /rides
Auth: RIDE_GIVER
Body: {
  vehicleId, originName, originLat, originLng,
  destinationName, destinationLat, destinationLng,
  departureDate, departureTime, totalSeats, notes?
}
Response 201: RideDTO
```

### Publish Ride
```
PATCH /rides/:id/publish
Auth: RIDE_GIVER (owner)
Response 200: { status: "PUBLISHED" }
```

### Start Ride
```
PATCH /rides/:id/start
Auth: RIDE_GIVER (owner)
Response 200: { status: "ONGOING", startedAt: string }
```

### Complete Ride
```
PATCH /rides/:id/complete
Auth: RIDE_GIVER (owner)
Response 200: { status: "COMPLETED", completedAt: string }
```

### Cancel Ride
```
PATCH /rides/:id/cancel
Auth: RIDE_GIVER (owner) or ADMIN
Body: { reason: string }
Response 200: { status: "CANCELLED" }
```

### Get My Rides (as Giver)
```
GET /rides/given
Query: { status?, page?, limit? }
Response 200: { rides: RideDTO[], total: number }
```

### Get My Rides (as Seeker / booked rides)
```
GET /rides/taken
Query: { status?, page?, limit? }
Response 200: { rides: RideDTO[], total: number }
```

---

## 7. Ride Request APIs

### Send Seat Request
```
POST /ride-requests
Auth: RIDE_SEEKER
Body: {
  rideId: string,
  pickupLat?, pickupLng?, pickupName?,
  dropLat?, dropLng?, dropName?
}
Response 201: { requestId: string, status: "PENDING" }
```

### Get Requests for My Ride (Giver view)
```
GET /ride-requests/incoming?rideId=:rideId
Auth: RIDE_GIVER
Response 200: RideRequestDTO[]
```

### Approve Request
```
PATCH /ride-requests/:id/approve
Auth: RIDE_GIVER (ride owner)
Response 200: {
  status: "APPROVED",
  holdExpiresAt: string   // ISO timestamp, 15 min from now
}
```

### Reject Request
```
PATCH /ride-requests/:id/reject
Auth: RIDE_GIVER
Body: { reason?: string }
Response 200: { status: "REJECTED" }
```

### Confirm Seat (Seeker)
```
PATCH /ride-requests/:id/confirm
Auth: RIDE_SEEKER (request owner)
Response 200: { status: "CONFIRMED" }
Response 410: { message: "Hold expired. Request a new seat." }
```

### Cancel Request
```
PATCH /ride-requests/:id/cancel
Auth: RIDE_SEEKER (before ride starts)
Body: { reason?: string }
Response 200: { status: "CANCELLED" }
```

---

## 8. Live Tracking APIs

### Get Live Position
```
GET /tracking/:rideId/position
Auth: Participant of ride
Response 200: {
  lat: number, lng: number,
  timestamp: string, speed: number
}
Response 404: { message: "No active tracking for this ride" }
```

### Get Shareable Tracking Link
```
POST /tracking/:rideId/share-link
Auth: Participant
Response 200: { link: string, expiresAt: string }
```

### Get Location History
```
GET /tracking/:rideId/history
Auth: Participant or Admin
Response 200: { points: [{ lat, lng, timestamp }] }
```

---

## 9. Notification APIs

### Get My Notifications
```
GET /notifications
Query: { page?, limit?, unreadOnly?: boolean }
Response 200: {
  notifications: NotificationDTO[],
  unreadCount: number
}
```

### Mark as Read
```
PATCH /notifications/:id/read
Response 200: { isRead: true }
```

### Mark All as Read
```
PATCH /notifications/read-all
Response 200: { updated: number }
```

---

## 10. Rating APIs

### Submit Rating
```
POST /ratings
Auth: Participant of ride
Body: {
  rideId: string,
  rateeId: string,
  score: 1 | 2 | 3 | 4 | 5,
  comment?: string
}
Response 201: RatingDTO
```

### Get Ratings for User
```
GET /ratings/user/:userId
Query: { page?, limit? }
Response 200: { ratings: RatingDTO[], averageScore: number }
```

---

## 11. Gamification APIs

### Get My Points Summary
```
GET /gamification/summary
Response 200: {
  totalPoints: number,
  ecoLevel: string,
  co2SavedKg: number,
  totalRides: number,
  pointsHistory: PointEventDTO[]
}
```

### Get Leaderboard
```
GET /gamification/leaderboard
Query: { period: "monthly" | "alltime", limit?: number }
Response 200: {
  leaderboard: [{
    rank, userId, fullName, photo, ecoLevel, points, co2SavedKg
  }]
}
```

---

## 12. SOS APIs

### Trigger SOS
```
POST /sos
Auth: Participant of active ride
Body: { rideId: string, lat: number, lng: number }
Response 201: {
  sosId: string,
  message: "Emergency contacts notified"
}
```

### Resolve SOS (Admin)
```
PATCH /sos/:id/resolve
Auth: ADMIN
Body: { notes: string }
Response 200: { status: "RESOLVED" }
```

---

## 13. Admin APIs

### List Users
```
GET /admin/users
Query: { verificationStatus?, role?, page?, limit? }
Response 200: { users: UserDTO[], total: number }
```

### Get Verification Queue
```
GET /admin/verification/pending
Response 200: VerificationRequestDTO[]
```

### Review Verification
```
PATCH /admin/verification/:id/review
Body: {
  decision: "APPROVED" | "REJECTED",
  rejectionReason?: string
}
Response 200: { status: string }
```

### Suspend User
```
PATCH /admin/users/:id/suspend
Body: { reason: string }
Response 200: { isActive: false }
```

### Get Platform Analytics
```
GET /admin/analytics
Query: { from: date, to: date }
Response 200: {
  totalUsers, verifiedUsers, totalRides,
  completedRides, cancelledRides,
  totalCo2SavedKg, activeRideGivers, activeRideSeekers
}
```

### List Active SOS Events
```
GET /admin/sos/active
Response 200: SOSEventDTO[]
```
