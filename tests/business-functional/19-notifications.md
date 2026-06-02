# 19 — Notifications

**Platform:** TechieRide v2 · **Module:** In-App Notifications  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

Notifications are the primary communication channel between the platform and its users. Every significant ride lifecycle event — request approval, confirmation, ride start, ride cancellation, SOS, boarding, rating — must trigger an accurate, timely, and non-duplicate notification to the correct recipient(s). Missed or delayed notifications directly cause missed rides, rider confusion, and loss of platform trust. Notification correctness is a P0 production readiness requirement.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| NOT-01 | Seeker receives notification when giver approves ride request | Seeker has PENDING request; ride PUBLISHED | Giver approves request via PATCH /ride-requests/:id/approve | Seeker receives notification: type=REQUEST_APPROVED, body references ride route | Seeker must know to confirm within hold window | P0 |
| NOT-02 | Seeker receives notification when request is rejected | Seeker has PENDING request | Giver rejects request via PATCH /ride-requests/:id/reject | Seeker receives notification: type=REQUEST_REJECTED, body explains reason | Seeker can search alternate rides | P0 |
| NOT-03 | Seeker receives notification when ride request is confirmed | Seeker approved; confirmation pending | Seeker confirms via PATCH /ride-requests/:id/confirm | Seeker receives notification: type=RIDE_CONFIRMED, booking details present | Seeker has proof of confirmed booking | P0 |
| NOT-04 | Giver receives notification when seeker confirms booking | Giver approved request; seeker yet to confirm | Seeker confirms booking | Giver receives notification: type=RIDE_CONFIRMED, seeker name present | Giver knows final passenger count | P0 |
| NOT-05 | All confirmed seekers notified when giver starts ride | Multiple seekers CONFIRMED; ride PUBLISHED | Giver starts ride via PATCH /rides/:id/start | Every confirmed seeker receives type=RIDE_STARTED notification | Seekers know to proceed to pickup point | P0 |
| NOT-06 | All confirmed seekers notified when giver cancels ride | Seekers CONFIRMED; ride PUBLISHED | Giver cancels via PATCH /rides/:id/cancel | Every confirmed seeker receives type=RIDE_CANCELLED; PENDING requests also notified | Seekers can find alternate transport immediately | P0 |
| NOT-07 | All confirmed seekers notified when ride is completed | Ride ONGOING; all DEBOARDED | Giver completes via PATCH /rides/:id/complete | Every participant receives type=RIDE_COMPLETED | Triggers rating window; ECO points awarded | P0 |
| NOT-08 | Admin receives SOS alert notification | Authenticated user triggers SOS | POST /sos | All admin accounts receive type=SOS_ALERT with user name, GPS, ride context | Admin must respond immediately | P0 |
| NOT-09 | Seeker receives PENDING request expiry notification | Seeker has PENDING request older than 4h | Cron job runs expiry pass | Seeker receives notification: type=GENERIC, body = "Your request has expired — please try again" | Seeker is not left waiting indefinitely | P0 |
| NOT-10 | User receives RATING_RECEIVED notification after being rated | Ride COMPLETED; rater submits rating | POST /ratings with rateeId | Ratee receives type=RATING_RECEIVED, body includes star count and rater name | User knows their reputation has been updated | P0 |
| NOT-11 | Giver notified when ride is auto-cancelled by departure timeout | Ride PUBLISHED; departure passed 1h ago | Cron departure timeout job runs | Giver receives type=RIDE_CANCELLED notification explaining auto-cancel reason | Giver is aware ride was removed from platform | P0 |
| NOT-12 | Confirmed seekers notified when ride is auto-cancelled by departure timeout | Seekers CONFIRMED on timed-out ride | Cron departure timeout job runs | All confirmed seekers receive type=RIDE_CANCELLED with explanation | Seekers can arrange alternate transport | P0 |
| NOT-13 | Giver receives notification when seeker boards | Ride ONGOING; seeker boards | Seeker PATCH /rides/:id/board | Giver receives type=SEEKER_BOARDED with seeker name | Giver has visibility of all boarded passengers | P1 |
| NOT-14 | Giver receives notification when seeker deboarded | Ride ONGOING; seeker deboarded | Seeker PATCH /rides/:id/deboard | Giver receives type=SEEKER_DEBOARDED with seeker name | Giver can track drop-off completion | P1 |
| NOT-15 | Seeker receives notification when giver marks them as no-show | Ride ONGOING | Giver PATCH /rides/:id/no-show/:seekerId | Seeker receives type=SEEKER_NO_SHOW notification | Seeker is informed of no-show record on account | P0 |
| NOT-16 | Notification not sent to wrong user (recipient isolation) | Two seekers on same ride | Giver approves Seeker A's request | Only Seeker A receives REQUEST_APPROVED; Seeker B receives nothing | Privacy and UX correctness | P0 |
| NOT-17 | Duplicate notification not sent for the same event | Single approval action | Giver approves request once | Seeker receives exactly 1 REQUEST_APPROVED notification; no duplicates | Duplicate notifications erode user trust | P0 |
| NOT-18 | Unauthenticated user cannot fetch notifications | No token | GET /notifications | 401 Unauthorized; no notification data returned | Security — notifications contain personal ride data | P0 |
| NOT-19 | User can fetch their own notification list | User has received notifications | GET /notifications | 200 OK; array of notifications for that user only; no other user's notifications | Data isolation | P0 |
| NOT-20 | User can mark a single notification as read | User has unread notification | PATCH /notifications/:id/read | Notification isRead = true; unread count decrements by 1 | Unread badge reflects real state | P0 |
| NOT-21 | User can mark all notifications as read | User has multiple unread notifications | PATCH /notifications/read-all | All notifications isRead = true; unread count = 0 | Mass-read action for UX | P1 |
| NOT-22 | Unread notification count returns correct value | User has 3 unread notifications | GET /notifications | Response includes count = 3 or array length matches | Badge accuracy drives engagement | P0 |
| NOT-23 | Notifications persist after logout and login | User has notifications; logs out | Logout → Login → GET /notifications | All pre-logout notifications still present; isRead state preserved | Notifications must not be session-scoped | P0 |
| NOT-24 | Verification approved — user notified | User submitted verification docs; admin approves | Admin PATCH /admin/verification/:id/review with APPROVED | User receives type=VERIFICATION_APPROVED notification | User knows they can now post or book rides | P0 |
| NOT-25 | Verification rejected — user notified with reason | User submitted docs; admin rejects | Admin PATCH /admin/verification/:id/review with REJECTED | User receives type=VERIFICATION_REJECTED notification with rejection reason | User knows corrective action required | P0 |
| NOT-26 | Admin-only SOS notification not visible to regular users | SOS triggered; admin + user both have accounts | Seeker calls GET /notifications | SOS_ALERT notification does not appear in seeker or giver notification feed | SOS alerts are admin-only operational data | P0 |
| NOT-27 | Notification body contains actionable ride context | Ride approved notification | Giver approves request | Notification body includes origin, destination, departure date/time | Vague notifications cause missed rides | P1 |
| NOT-28 | Cancelled ride notification sent to PENDING (not just CONFIRMED) seekers | Multiple seekers: some PENDING, some CONFIRMED | Giver cancels ride | Both PENDING and CONFIRMED seekers receive RIDE_CANCELLED notification | PENDING seekers must be released to find alternatives | P0 |
| NOT-29 | Notification order — newest first | User has 5 notifications at different times | GET /notifications | Notifications returned in descending order by createdAt | Correct order prevents user confusion | P1 |
| NOT-30 | Regression — notifications survive API restart | User has unread notifications; API restarts | Restart API; GET /notifications | All notifications intact; isRead state preserved | Notifications stored in DB not memory | P0 |

---

## UAT Acceptance Criteria

- [ ] Every ride lifecycle event (approved, confirmed, started, cancelled, completed) triggers a notification to the correct recipient within 5 seconds
- [ ] No user receives another user's notification at any point
- [ ] Duplicate notifications are never sent for a single event — verified by count check after each action
- [ ] Notifications persist across logout/login and API restarts — stored in database, not session
- [ ] Unread badge count accurately reflects real unread notification count at all times

---

## Missing Business Rules / Risks

1. **No push notifications (FCM/APNs)** — all notifications are in-app only; users who are not actively using the app miss time-critical events (ride started, SOS, cancellation)
2. **No SMS or email fallback for critical notifications** — ride cancellation and SOS alerts rely solely on in-app delivery; users with poor connectivity may never receive them
3. **No notification TTL or expiry** — old notifications accumulate indefinitely; no archiving or auto-delete policy defined
4. **No notification preference settings** — users cannot opt out of low-priority notifications (boarding updates) while keeping P0 alerts active
5. **Admin notification routing not role-segmented** — all admins receive all SOS alerts; no assignment or acknowledgement mechanism to prevent duplicate admin responses
6. **No notification delivery confirmation** — platform cannot detect if a notification was actually delivered or seen; read receipts are self-reported via PATCH
7. **PENDING request expiry notification depends on cron job reliability** — if the hourly cron fails, seekers are never informed their requests expired
8. **No bulk notification for platform-wide events** — no mechanism to notify all users of maintenance, policy changes, or emergency platform downtime
