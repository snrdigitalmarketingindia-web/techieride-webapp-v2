# 20 — Audit Trail

**Platform:** TechieRide v2 · **Module:** Audit Logging & Event Trail  
**Domain:** Verified IT Employee Carpooling · **Owner:** QA Lead

---

## Business Context

An audit trail is the non-negotiable foundation of a trusted carpooling platform. Every state-changing action — ride creation, approval, boarding, cancellation, SOS, admin intervention, suspension — must be permanently logged with actor identity, timestamp, and before/after state. The audit trail is the primary evidence source for dispute resolution, compliance, fraud investigation, and operational post-mortems. Missing or tampered audit records make it impossible to resolve complaints, investigate incidents, or meet legal obligations. Audit logging is a P0 production readiness requirement.

---

## Test Cases

| TC-ID | Scenario | Preconditions | Test Steps | Expected Result | Business Impact | Priority |
|---|---|---|---|---|---|---|
| AUD-01 | Ride creation is logged | Giver is DRIVER_VERIFIED | POST /rides | Audit record created: actor=giverId, action=RIDE_CREATED, rideId, timestamp | Foundation of ride lifecycle traceability | P0 |
| AUD-02 | Ride publish is logged | Ride in DRAFT state | PATCH /rides/:id/publish | Audit record: action=RIDE_PUBLISHED, rideId, actorId, timestamp; previousStatus=DRAFT, newStatus=PUBLISHED | Ride goes live — must be traceable | P0 |
| AUD-03 | Ride cancellation by giver is logged | Ride PUBLISHED | PATCH /rides/:id/cancel | Audit record: action=RIDE_CANCELLED, actorId=giverId, cancelReason, timestamp | Cancellation disputes require timestamped evidence | P0 |
| AUD-04 | Ride auto-cancellation by cron is logged | Ride PUBLISHED; departure passed 1h | Departure timeout cron runs | Audit record: action=RIDE_AUTO_CANCELLED, actorId=SYSTEM, reason=departure_timeout, timestamp | Distinguishes admin/giver cancel from system cancel | P0 |
| AUD-05 | Ride start is logged | Ride PUBLISHED; all seekers confirmed | PATCH /rides/:id/start | Audit record: action=RIDE_STARTED, actorId=giverId, startedAt timestamp | Marks legal start of ride — SOS and boarding depend on this | P0 |
| AUD-06 | Ride completion is logged | Ride ONGOING; all participants DEBOARDED | PATCH /rides/:id/complete | Audit record: action=RIDE_COMPLETED, actorId=giverId, completedAt, participantCount | ECO points, ratings, and trust score triggered from this event | P0 |
| AUD-07 | Ride request submission is logged | Seeker is EMPLOYEE_VERIFIED | POST /ride-requests | Audit record: action=REQUEST_SUBMITTED, seekerId, rideId, timestamp | Request lifecycle must be fully traceable | P0 |
| AUD-08 | Ride request approval is logged | Seeker has PENDING request | PATCH /ride-requests/:id/approve | Audit record: action=REQUEST_APPROVED, actorId=giverId, seekerId, rideId, timestamp | Seat deduction event must be auditable | P0 |
| AUD-09 | Ride request rejection is logged | Seeker has PENDING request | PATCH /ride-requests/:id/reject | Audit record: action=REQUEST_REJECTED, actorId=giverId, seekerId, rejectionReason, timestamp | Discrimination patterns detectable via audit | P0 |
| AUD-10 | Seeker boarding is logged | Ride ONGOING; seeker CONFIRMED | PATCH /rides/:id/board | Audit record: action=SEEKER_BOARDED, seekerId, rideId, boardedAt timestamp | Physical presence confirmed — safety accountability | P0 |
| AUD-11 | Seeker deboarding is logged | Seeker BOARDED | PATCH /rides/:id/deboard | Audit record: action=SEEKER_DEBOARDED, seekerId, rideId, deboardedAt timestamp | Drop-off confirmation — legal duty of care | P0 |
| AUD-12 | No-show marking is logged | Ride ONGOING; seeker did not board | PATCH /rides/:id/no-show/:seekerId | Audit record: action=SEEKER_NO_SHOW, actorId=giverId, seekerId, rideId, timestamp | No-show feeds trust score and dispute resolution | P0 |
| AUD-13 | SOS event is logged | Authenticated ride participant | POST /sos | Audit record: action=SOS_TRIGGERED, userId, rideId, lat, lng, timestamp; status=TRIGGERED | Emergency events must be permanently and immediately logged | P0 |
| AUD-14 | SOS resolution by admin is logged | SOS in TRIGGERED state | Admin PATCH /admin/sos/:id/resolve | Audit record: action=SOS_RESOLVED, adminId, sosId, resolutionNotes, resolvedAt | Incident closure must be logged for legal compliance | P0 |
| AUD-15 | Admin user suspension is logged | Admin suspends a user | PATCH /admin/users/:id/suspend | Audit record: action=USER_SUSPENDED, adminId, targetUserId, reason, timestamp | Suspension without audit creates liability | P0 |
| AUD-16 | Admin user reactivation is logged | Admin reactivates a suspended user | PATCH /admin/users/:id/activate | Audit record: action=USER_REACTIVATED, adminId, targetUserId, timestamp | Reactivation of bad actor without log is a safety risk | P0 |
| AUD-17 | Verification approval by admin is logged | User submitted verification docs | Admin PATCH /admin/verification/:id/review with APPROVED | Audit record: action=VERIFICATION_APPROVED, adminId, userId, verificationType, timestamp | Fraudulent approvals traceable to specific admin | P0 |
| AUD-18 | Verification rejection by admin is logged | User submitted verification docs | Admin PATCH /admin/verification/:id/review with REJECTED | Audit record: action=VERIFICATION_REJECTED, adminId, userId, rejectionReason, timestamp | Ensures admin accountability for every decision | P0 |
| AUD-19 | Vehicle RC verification by admin is logged | Giver submitted RC document | Admin PATCH /admin/vehicles/:id/verify | Audit record: action=VEHICLE_RC_VERIFIED, adminId, vehicleId, timestamp | RC approval enables ride publishing — must be traceable | P0 |
| AUD-20 | Call initiation is logged | Giver and seeker on same ride | User taps call button | Audit record: action=CALL_INITIATED, callerId, calleeId, rideId, timestamp | Harassment evidence; call volume monitoring | P0 |
| AUD-21 | Audit records are immutable — cannot be deleted by any user | Existing audit records | Any user DELETE attempt on audit record | 403 Forbidden or 404; record unchanged in DB | Evidence tampering prevention | P0 |
| AUD-22 | Audit records are immutable — cannot be deleted by admin | Existing audit records | Admin DELETE attempt on audit record | 403 Forbidden; record unchanged; admin cannot erase own actions | Admin accountability | P0 |
| AUD-23 | Audit record includes actor identity for every action | Any logged action | Check audit record | Every record has actorId (userId or SYSTEM), actorRole, and timestamp — never anonymous | Anonymous actions cannot be investigated | P0 |
| AUD-24 | System actions logged with SYSTEM actor (not a user) | Cron job triggers auto-cancel or expiry | Cron runs | Audit record: actorId=SYSTEM, action=*, timestamp; no real userId attributed | Distinguishes automated vs human actions | P0 |
| AUD-25 | Audit log is append-only — no UPDATE on existing records | Audit record exists | Attempt to modify existing audit record via API | No UPDATE endpoint exists; records are insert-only | Prevent retroactive evidence modification | P0 |
| AUD-26 | Audit records survive API restart | Actions logged before restart | Restart API server; query audit records | All pre-restart records present and intact | Logs stored in DB — not in-memory | P0 |
| AUD-27 | Audit log query by rideId returns all events for that ride | Ride has lifecycle from CREATE to COMPLETE | Admin queries audit log filtered by rideId | All ride events returned in chronological order: CREATED → PUBLISHED → STARTED → COMPLETED | Full ride reconstruction possible for disputes | P1 |
| AUD-28 | Audit log query by userId returns all actions by that user | User has multiple actions across rides | Admin queries audit log filtered by userId | All actions by that user returned: requests, boardings, SOS, calls | User behaviour pattern visible for trust review | P1 |
| AUD-29 | Audit log query by time range returns correct records | Multiple events across different timestamps | Admin queries with from/to date range | Only events within range returned; boundary timestamps inclusive | Time-scoped investigation for incidents | P1 |
| AUD-30 | Regression — audit log records correct timestamp in IST | Action performed at known time | Perform action; check audit record | Timestamp stored in UTC; displayed in IST; no midnight UTC/IST mismatch | Incorrect timestamps invalidate incident timelines | P0 |

---

## UAT Acceptance Criteria

- [ ] Every state-changing action on the platform produces a corresponding audit record within 1 second — verified by querying the log immediately after each action
- [ ] No audit record can be modified or deleted by any user, admin, or API call — verified by attempting DELETE and PATCH on audit records
- [ ] Every audit record contains actor identity (userId or SYSTEM), action type, target entity, and UTC timestamp — no anonymous or incomplete records
- [ ] System-triggered events (cron auto-cancel, request expiry) are logged with actorId=SYSTEM and are distinguishable from human actions
- [ ] A complete ride lifecycle can be reconstructed in chronological order from the audit log using rideId as the filter key

---

## Missing Business Rules / Risks

1. **No dedicated audit log table or module implemented** — audit events are currently inferred from DB state changes (e.g. ride status), not from an explicit append-only event log; this means intermediate states and failed attempts are invisible
2. **No audit API endpoint exists** — admin cannot query the audit trail via the UI or API; all investigation requires direct DB access, which is a production security risk
3. **Call logging is partial** — `POST /calls/log` exists but relies on the client to trigger it; a dropped connection or app crash means the call is never logged
4. **No before/after state diff in records** — audit records currently store the action but not the previous value; without diffs, it is impossible to detect what changed in ride edits or profile updates
5. **Cron job actions (auto-cancel, expiry) not attributed to SYSTEM actor** — system-triggered events currently produce no audit record at all, making automated failures invisible in investigation
6. **No audit retention policy** — no defined minimum retention period (regulatory best practice: 2–7 years for transport platforms); records could be accidentally deleted during DB migrations
7. **No tamper-evidence mechanism** — records are stored as plain DB rows with no hash chain or signature; a DB-level admin could silently edit records with no detection
8. **No real-time audit alerting** — unusual patterns (multiple rapid suspensions, SOS spike, repeated rejections of the same seeker) do not trigger automated alerts to platform operations
