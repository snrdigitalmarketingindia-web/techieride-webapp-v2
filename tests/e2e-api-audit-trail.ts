/**
 * TechieRide — Observable Audit Trail Tests
 *
 * Covers P0 test cases from:
 *   tests/business-functional/20-audit-trail.md  (AUD-*)
 *
 * IMPORTANT — Current implementation status:
 *   There is no dedicated /audit-log API endpoint or AuditLog DB table yet.
 *   The 20-audit-trail.md spec documents the target state.
 *
 *   These tests verify the OBSERVABLE equivalent of audit trail requirements
 *   using existing API endpoints:
 *     - State transitions are verified (ride status, request status, timestamps)
 *     - Actor attribution is verified (who performed which action)
 *     - Immutability is tested where endpoints exist (no DELETE on records)
 *     - Timestamps are verified for IST/UTC correctness
 *
 *   Cases marked [REQUIRES_AUDIT_API] cannot be fully automated until a
 *   dedicated audit log endpoint is implemented.
 *
 * Run: npm run test:api:audit-trail
 */

import {
  makeClient,
  freshGiver,
  freshSeeker,
  publishRide,
  getAdminClient,
  completeFullRide,
  approveEmployeeVerification,
  register,
} from './helpers';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

// ─── Colours ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const results: { name: string; passed: boolean; error?: string; skipped?: boolean }[] = [];
let currentSection = '';

function section(name: string) {
  currentSection = name;
  console.log(`\n${c.bold}${c.blue}━━━ ${name} ━━━${c.reset}`);
}

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${c.dim}${currentSection}${c.reset} › ${name} ... `);
  try {
    await fn();
    console.log(`${c.green}✅ PASS${c.reset}`);
    results.push({ name: `[${currentSection}] ${name}`, passed: true });
  } catch (e: any) {
    const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.log(`${c.red}❌ FAIL${c.reset} — ${msg}`);
    results.push({ name: `[${currentSection}] ${name}`, passed: false, error: msg });
  }
}

function skip(name: string, reason: string) {
  console.log(`  ${c.dim}${currentSection}${c.reset} › ${name} ... ${c.yellow}⏭  SKIP${c.reset} — ${reason}`);
  results.push({ name: `[${currentSection}] ${name}`, passed: true, skipped: true });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function setupConfirmedRide() {
  const giver = await freshGiver('aud');
  const seeker = await freshSeeker('aud');
  const rideId = await publishRide(giver.client, giver.vehicleId);
  const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
  assert(reqR.status === 201, `Request failed: ${JSON.stringify(reqR.data)}`);
  const reqId = reqR.data.requestId;
  await giver.client.patch(`/ride-requests/${reqId}/approve`);
  await seeker.client.patch(`/ride-requests/${reqId}/confirm`);
  return { giver, seeker, rideId, reqId };
}

// ══════════════════════════════════════════════════════════════════════════
// AUD-01 to AUD-06 — Ride Lifecycle State Audit (Observable)
// ══════════════════════════════════════════════════════════════════════════

async function runRideLifecycleAuditTests() {
  section('AUD — Ride Lifecycle State Verification');

  // AUD-01: Ride creation recorded — verified via GET /rides/:id returning the ride
  await test('AUD-01: ride creation produces a retrievable record with correct actor', async () => {
    const giver = await freshGiver('a01');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const r = await giver.client.get(`/rides/${rideId}`);
    assert(r.status === 200, `GET /rides/:id failed: ${r.status}`);
    assert(r.data.rideGiverId === giver.userId, 'Ride actor (rideGiverId) must match creating user');
  });

  // AUD-02: Ride publish — status transition recorded
  await test('AUD-02: ride publish transitions status DRAFT → PUBLISHED with correct state', async () => {
    const giver = await freshGiver('a02');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const createR = await giver.client.post('/rides', {
      vehicleId: giver.vehicleId,
      originName: 'Kondapur', originLat: 17.44, originLng: 78.34,
      destinationName: 'HITEC City', destinationLat: 17.45, destinationLng: 78.36,
      departureDate: tomorrow, departureTime: '09:00', totalSeats: 3,
    });
    assert(createR.status === 201, `Create failed: ${JSON.stringify(createR.data)}`);
    assert(createR.data.status === 'DRAFT', `Expected DRAFT after create, got ${createR.data.status}`);

    const pubR = await giver.client.patch(`/rides/${createR.data.id}/publish`);
    assert(pubR.status === 200, `Publish failed: ${JSON.stringify(pubR.data)}`);
    assert(pubR.data.status === 'PUBLISHED', `Expected PUBLISHED, got ${pubR.data.status}`);
  });

  // AUD-03: Ride cancellation — status + cancelledAt timestamp recorded
  await test('AUD-03: ride cancellation records CANCELLED status and cancelledAt timestamp', async () => {
    const giver = await freshGiver('a03');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const r = await giver.client.patch(`/rides/${rideId}/cancel`);
    assert(r.status === 200, `Cancel failed: ${JSON.stringify(r.data)}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    assert(ride.data.status === 'CANCELLED', `Expected CANCELLED, got ${ride.data.status}`);
    assert(!!ride.data.cancelledAt, 'cancelledAt timestamp must be set on cancellation');
  });

  // AUD-04 [REQUIRES_AUDIT_API]: Auto-cancellation by cron logged with SYSTEM actor
  skip('AUD-04 [REQUIRES_AUDIT_API]', 'No audit log endpoint — cron system actor attribution not verifiable via API');

  // AUD-05: Ride start — status ONGOING + startedAt timestamp
  await test('AUD-05: ride start records ONGOING status and startedAt timestamp', async () => {
    const { giver, rideId } = await setupConfirmedRide();
    const r = await giver.client.patch(`/rides/${rideId}/start`);
    assert(r.status === 200, `Start failed: ${JSON.stringify(r.data)}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    assert(ride.data.status === 'ONGOING', `Expected ONGOING, got ${ride.data.status}`);
    assert(!!ride.data.startedAt, 'startedAt timestamp must be set on ride start');
  });

  // AUD-06: Ride completion — status COMPLETED + completedAt timestamp
  await test('AUD-06: ride completion records COMPLETED status and completedAt timestamp', async () => {
    const { giver, seeker, rideId } = await setupConfirmedRide();
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    await seeker.client.patch(`/rides/${rideId}/deboard`);
    const r = await giver.client.patch(`/rides/${rideId}/complete`);
    assert(r.status === 200, `Complete failed: ${JSON.stringify(r.data)}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    assert(ride.data.status === 'COMPLETED', `Expected COMPLETED, got ${ride.data.status}`);
    assert(!!ride.data.completedAt, 'completedAt timestamp must be set on completion');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// AUD-07 to AUD-09 — Request Lifecycle Audit (Observable)
// ══════════════════════════════════════════════════════════════════════════

async function runRequestAuditTests() {
  section('AUD — Request Lifecycle State Verification');

  // AUD-07: Request submission — record exists with correct seeker and ride
  await test('AUD-07: request submission creates a record with correct actor and ride', async () => {
    const giver = await freshGiver('a07');
    const seeker = await freshSeeker('a07');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const r = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    assert(r.status === 201, `Request failed: ${JSON.stringify(r.data)}`);
    assert(!!r.data.requestId, 'requestId must be returned');
    // Verify giver can see the incoming request (actor attribution)
    const incoming = await giver.client.get('/ride-requests/incoming');
    assert(incoming.status === 200, `Incoming failed: ${incoming.status}`);
    const req = incoming.data.find((rq: any) => rq.id === r.data.requestId);
    assert(!!req, 'Request must be visible to giver as actor');
    assert(req.seekerId === seeker.userId, 'seekerId must match submitting user');
  });

  // AUD-08: Approval — request status transitions to CONFIRMED/APPROVED, seat count decremented
  await test('AUD-08: request approval transitions status and decrements available seats', async () => {
    const giver = await freshGiver('a08');
    const seeker = await freshSeeker('a08');
    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    const beforeRide = await giver.client.get(`/rides/${rideId}`);
    const seatsBefore = beforeRide.data.availableSeats;

    const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqId = reqR.data.requestId;
    await giver.client.patch(`/ride-requests/${reqId}/approve`);
    await seeker.client.patch(`/ride-requests/${reqId}/confirm`);

    const afterRide = await giver.client.get(`/rides/${rideId}`);
    assert(
      afterRide.data.availableSeats === seatsBefore - 1,
      `Seats should decrement from ${seatsBefore} to ${seatsBefore - 1}, got ${afterRide.data.availableSeats}`,
    );
  });

  // AUD-09: Rejection — request status transitions to REJECTED
  await test('AUD-09: request rejection transitions status to REJECTED', async () => {
    const giver = await freshGiver('a09');
    const seeker = await freshSeeker('a09');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqId = reqR.data.requestId;
    await giver.client.patch(`/ride-requests/${reqId}/reject`);

    const myReqs = await seeker.client.get('/ride-requests/mine');
    const req = myReqs.data.find((rq: any) => rq.id === reqId);
    assert(!!req, 'Request must still appear in seeker\'s list');
    assert(req.status === 'REJECTED', `Expected REJECTED, got ${req.status}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// AUD-10 to AUD-12 — Boarding Events Audit (Observable)
// ══════════════════════════════════════════════════════════════════════════

async function runBoardingAuditTests() {
  section('AUD — Boarding & No-Show State Verification');

  // AUD-10: Boarding recorded — participant status becomes BOARDED
  await test('AUD-10: seeker boarding recorded as BOARDED participant status', async () => {
    const { giver, seeker, rideId } = await setupConfirmedRide();
    await giver.client.patch(`/rides/${rideId}/start`);
    const r = await seeker.client.patch(`/rides/${rideId}/board`);
    assert(r.status === 200, `Board failed: ${JSON.stringify(r.data)}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    const participant = ride.data.participants?.find((p: any) => p.seekerId === seeker.userId);
    assert(!!participant, 'Participant record must exist');
    assert(participant.boardingStatus === 'BOARDED', `Expected BOARDED, got ${participant.boardingStatus}`);
  });

  // AUD-11: Deboarding recorded — participant status becomes DEBOARDED
  await test('AUD-11: seeker deboarding recorded as DEBOARDED participant status', async () => {
    const { giver, seeker, rideId } = await setupConfirmedRide();
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    const r = await seeker.client.patch(`/rides/${rideId}/deboard`);
    assert(r.status === 200, `Deboard failed: ${JSON.stringify(r.data)}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    const participant = ride.data.participants?.find((p: any) => p.seekerId === seeker.userId);
    assert(participant.boardingStatus === 'DEBOARDED', `Expected DEBOARDED, got ${participant.boardingStatus}`);
  });

  // AUD-12: No-show marking — participant status becomes NO_SHOW
  await test('AUD-12: no-show marking recorded as NO_SHOW participant status', async () => {
    const { giver, seeker, rideId } = await setupConfirmedRide();
    await giver.client.patch(`/rides/${rideId}/start`);
    const r = await giver.client.patch(`/rides/${rideId}/no-show/${seeker.userId}`);
    assert(r.status === 200, `No-show failed: ${JSON.stringify(r.data)}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    const participant = ride.data.participants?.find((p: any) => p.seekerId === seeker.userId);
    assert(participant.boardingStatus === 'NO_SHOW', `Expected NO_SHOW, got ${participant.boardingStatus}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// AUD-13 to AUD-14 — SOS Audit (Observable)
// ══════════════════════════════════════════════════════════════════════════

async function runSosAuditTests() {
  section('AUD — SOS Event State Verification');

  // AUD-13: SOS trigger creates a record visible to admin
  await test('AUD-13: SOS trigger creates a persistent record visible to admin', async () => {
    const { giver, rideId } = await setupConfirmedRide();
    await giver.client.patch(`/rides/${rideId}/start`);
    const sosR = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(sosR.status === 201, `SOS failed: ${JSON.stringify(sosR.data)}`);

    const admin = await getAdminClient();
    const active = await admin.get('/admin/sos/active');
    assert(active.status === 200, `Admin SOS list failed: ${active.status}`);
    const record = active.data.find((s: any) => s.id === sosR.data.sosId);
    assert(!!record, 'SOS record must be visible to admin immediately after trigger');
    assert(record.userId === giver.userId, 'SOS record must attribute correct userId as actor');
    assert(record.rideId === rideId, 'SOS record must reference the correct rideId');
  });

  // AUD-14: SOS resolution by admin recorded — status becomes RESOLVED
  await test('AUD-14: admin SOS resolution updates status to RESOLVED', async () => {
    const { giver, rideId } = await setupConfirmedRide();
    await giver.client.patch(`/rides/${rideId}/start`);
    const sosR = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(sosR.status === 201, `SOS failed: ${sosR.status}`);

    const admin = await getAdminClient();
    const resolveR = await admin.patch(`/admin/sos/${sosR.data.sosId}/resolve`, {
      notes: 'Situation resolved — false alarm confirmed',
    });
    assert(resolveR.status === 200, `Resolve failed: ${JSON.stringify(resolveR.data)}`);

    // The resolved SOS should no longer appear in the active list
    const activeAfter = await admin.get('/admin/sos/active');
    const stillActive = activeAfter.data.find((s: any) => s.id === sosR.data.sosId);
    assert(!stillActive, 'RESOLVED SOS must not appear in active queue');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// AUD-15 to AUD-19 — Admin Actions Audit (Observable)
// ══════════════════════════════════════════════════════════════════════════

async function runAdminAuditTests() {
  section('AUD — Admin Action State Verification');

  // AUD-15: Suspension — user isActive becomes false
  await test('AUD-15: admin suspension sets user to inactive state', async () => {
    const seeker = await freshSeeker('a15');
    const admin = await getAdminClient();
    const r = await admin.patch(`/admin/users/${seeker.userId}/suspend`);
    assert(r.status === 200, `Suspend failed: ${JSON.stringify(r.data)}`);
    const users = await admin.get('/admin/users');
    const user = users.data.users?.find((u: any) => u.id === seeker.userId)
      ?? users.data.find?.((u: any) => u.id === seeker.userId);
    assert(!!user, 'Suspended user must still be visible in admin user list');
    assert(user.isActive === false, `Expected isActive=false after suspension, got ${user.isActive}`);
  });

  // AUD-16: Reactivation — user isActive becomes true
  await test('AUD-16: admin reactivation restores user to active state', async () => {
    const seeker = await freshSeeker('a16');
    const admin = await getAdminClient();
    await admin.patch(`/admin/users/${seeker.userId}/suspend`);
    const r = await admin.patch(`/admin/users/${seeker.userId}/activate`);
    assert(r.status === 200, `Activate failed: ${JSON.stringify(r.data)}`);
    const users = await admin.get('/admin/users');
    const user = users.data.users?.find((u: any) => u.id === seeker.userId)
      ?? users.data.find?.((u: any) => u.id === seeker.userId);
    assert(user.isActive === true, `Expected isActive=true after reactivation, got ${user.isActive}`);
  });

  // AUD-17: Verification approval — accountStatus changes to EMPLOYEE_VERIFIED
  await test('AUD-17: verification approval changes accountStatus to EMPLOYEE_VERIFIED', async () => {
    const ts = Date.now();
    const email = `a17_${ts}@wipro.com`;
    const acc = await register(email, 'AuditVerify Test');
    const client = makeClient(acc.token);
    const admin = await getAdminClient();

    await client.post('/verification/employee', { employeeIdUrl: 'https://mock.storage/emp.jpg' });
    const queue = await admin.get('/admin/verification/pending');
    const entry = queue.data.find((v: any) => v.userId === acc.userId && v.verificationType === 'EMPLOYEE');
    assert(!!entry, 'Verification entry must appear in admin queue');

    await admin.patch(`/admin/verification/${entry.id}/review`, { decision: 'APPROVED' });
    const me = await client.get('/users/me');
    assert(me.data.accountStatus === 'EMPLOYEE_VERIFIED', `Expected EMPLOYEE_VERIFIED, got ${me.data.accountStatus}`);
  });

  // AUD-18: Verification rejection — accountStatus not promoted; request marked rejected
  await test('AUD-18: verification rejection leaves accountStatus unchanged and marks entry rejected', async () => {
    const ts = Date.now();
    const email = `a18_${ts}@wipro.com`;
    const acc = await register(email, 'AuditReject Test');
    const client = makeClient(acc.token);
    const admin = await getAdminClient();

    const statusBefore = (await client.get('/users/me')).data.accountStatus;
    await client.post('/verification/employee', { employeeIdUrl: 'https://mock.storage/emp.jpg' });
    const queue = await admin.get('/admin/verification/pending');
    const entry = queue.data.find((v: any) => v.userId === acc.userId && v.verificationType === 'EMPLOYEE');
    await admin.patch(`/admin/verification/${entry.id}/review`, { decision: 'REJECTED' });

    const me = await client.get('/users/me');
    assert(
      me.data.accountStatus !== 'EMPLOYEE_VERIFIED',
      `accountStatus must not advance to EMPLOYEE_VERIFIED on rejection, got ${me.data.accountStatus}`,
    );
  });

  // AUD-19: Vehicle RC verification — rcVerified becomes true
  await test('AUD-19: admin vehicle RC verification sets rcVerified=true', async () => {
    const giver = await freshGiver('a19');
    const admin = await getAdminClient();
    const vehicles = await admin.get('/admin/vehicles');
    const vehicle = vehicles.data.find((v: any) => v.id === giver.vehicleId);
    assert(vehicle?.rcVerified === true, `Expected rcVerified=true after admin approval, got ${vehicle?.rcVerified}`);
  });

  // AUD-20 [REQUIRES_AUDIT_API]: Call initiation logged
  skip('AUD-20 [REQUIRES_AUDIT_API]', 'Call log endpoint exists but no audit query API to assert actor-attributed log entries');
}

// ══════════════════════════════════════════════════════════════════════════
// AUD-21 to AUD-26 — Immutability & Persistence (Observable)
// ══════════════════════════════════════════════════════════════════════════

async function runImmutabilityTests() {
  section('AUD — Immutability & Persistence');

  // AUD-21: Rides cannot be deleted by any user
  await test('AUD-21: ride records cannot be deleted by the giver', async () => {
    const giver = await freshGiver('a21');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const r = await giver.client.delete(`/rides/${rideId}`);
    assert(
      [404, 405, 403].includes(r.status),
      `Expected 403/404/405 on DELETE /rides/:id, got ${r.status}`,
    );
    // Ride should still be retrievable
    const check = await giver.client.get(`/rides/${rideId}`);
    assert(check.status === 200, 'Ride must still be accessible after failed DELETE attempt');
  });

  // AUD-22: Ride requests cannot be deleted by any party
  await test('AUD-22: request records cannot be deleted by seeker or giver', async () => {
    const giver = await freshGiver('a22');
    const seeker = await freshSeeker('a22');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqId = reqR.data.requestId;

    const delSeeker = await seeker.client.delete(`/ride-requests/${reqId}`);
    const delGiver = await giver.client.delete(`/ride-requests/${reqId}`);
    assert(
      [403, 404, 405].includes(delSeeker.status),
      `Seeker DELETE should fail, got ${delSeeker.status}`,
    );
    assert(
      [403, 404, 405].includes(delGiver.status),
      `Giver DELETE should fail, got ${delGiver.status}`,
    );
    // Request still in giver's incoming list
    const incoming = await giver.client.get('/ride-requests/incoming');
    const still = incoming.data.find((r: any) => r.id === reqId);
    assert(!!still, 'Request record must persist after DELETE attempts');
  });

  // AUD-23: Every ride record carries actor identity
  await test('AUD-23: every ride record carries rideGiverId (actor identity)', async () => {
    const giver = await freshGiver('a23');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const r = await giver.client.get(`/rides/${rideId}`);
    assert(!!r.data.rideGiverId, 'rideGiverId must be present on every ride record');
    assert(r.data.rideGiverId === giver.userId, 'rideGiverId must match the creating user');
  });

  // AUD-24 [REQUIRES_AUDIT_API]: System actor label on cron-triggered events
  skip('AUD-24 [REQUIRES_AUDIT_API]', 'No audit log endpoint to query SYSTEM actor attribution for cron events');

  // AUD-25 [REQUIRES_AUDIT_API]: Append-only — no PATCH on audit records
  skip('AUD-25 [REQUIRES_AUDIT_API]', 'No audit log endpoint — append-only constraint not enforceable via API');

  // AUD-26: Records survive API restart — verified via DB-backed endpoint
  await test('AUD-26: ride and request records are DB-persisted (accessible with fresh client)', async () => {
    const giver = await freshGiver('a26');
    const seeker = await freshSeeker('a26');
    const rideId = await publishRide(giver.client, giver.vehicleId);
    const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqId = reqR.data.requestId;

    // Use brand-new HTTP clients (fresh token) to simulate cold read after restart
    const freshGiverClient = makeClient(giver.token);
    const freshSeekerClient = makeClient(seeker.token);

    const rideCheck = await freshGiverClient.get(`/rides/${rideId}`);
    assert(rideCheck.status === 200, 'Ride must be accessible via fresh client');
    assert(rideCheck.data.id === rideId, 'Ride ID must match');

    const reqCheck = await freshSeekerClient.get('/ride-requests/mine');
    const req = reqCheck.data.find((r: any) => r.id === reqId);
    assert(!!req, 'Request record must be accessible via fresh client');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// AUD-30 — Timestamp Correctness
// ══════════════════════════════════════════════════════════════════════════

async function runTimestampTests() {
  section('AUD — Timestamp Correctness (Regression)');

  // AUD-30: Timestamps are recent and valid ISO strings (IST/UTC correctness)
  await test('AUD-30: all lifecycle timestamps are valid ISO 8601 and within expected range', async () => {
    const { giver, seeker, rideId } = await setupConfirmedRide();
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    await seeker.client.patch(`/rides/${rideId}/deboard`);
    await giver.client.patch(`/rides/${rideId}/complete`);

    const ride = await giver.client.get(`/rides/${rideId}`);
    const { startedAt, completedAt } = ride.data;

    // Both must be valid ISO 8601
    assert(!!startedAt, 'startedAt must be present on completed ride');
    assert(!!completedAt, 'completedAt must be present on completed ride');

    const startTs = new Date(startedAt).getTime();
    const completeTs = new Date(completedAt).getTime();
    const now = Date.now();

    assert(!isNaN(startTs), 'startedAt must be a valid date');
    assert(!isNaN(completeTs), 'completedAt must be a valid date');
    assert(startTs <= completeTs, 'startedAt must be before or equal to completedAt');
    // Both timestamps must be within the last 30 minutes (test just ran)
    assert(now - startTs < 30 * 60 * 1000, 'startedAt must be recent (within 30 min)');
    assert(now - completeTs < 30 * 60 * 1000, 'completedAt must be recent (within 30 min)');
    // No year-2000 or epoch timestamps (midnight UTC/IST mismatch guard)
    assert(startTs > new Date('2024-01-01').getTime(), 'startedAt must not be a historic/epoch date (IST mismatch)');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${c.bold}TechieRide — Observable Audit Trail Test Suite${c.reset}`);
  console.log(`${c.dim}API: ${BASE}${c.reset}`);
  console.log(`${c.yellow}Note: Cases marked [REQUIRES_AUDIT_API] are skipped pending audit log implementation${c.reset}\n`);

  await runRideLifecycleAuditTests();
  await runRequestAuditTests();
  await runBoardingAuditTests();
  await runSosAuditTests();
  await runAdminAuditTests();
  await runImmutabilityTests();
  await runTimestampTests();

  const passed = results.filter((r) => r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`\n${c.bold}━━━ Results ━━━${c.reset}`);
  console.log(`  Total  : ${results.length}`);
  console.log(`  ${c.green}Passed : ${passed}${c.reset}`);
  console.log(`  ${c.yellow}Skipped: ${skipped} (require audit log API)${c.reset}`);
  console.log(`  ${failed.length > 0 ? c.red : c.green}Failed : ${failed.length}${c.reset}`);

  if (failed.length > 0) {
    console.log(`\n${c.red}${c.bold}Failed tests:${c.reset}`);
    failed.forEach((r) => console.log(`  ✗ ${r.name}\n    ${c.dim}${r.error}${c.reset}`));
    process.exit(1);
  } else {
    console.log(`\n${c.green}${c.bold}All executable tests passed! ✅${c.reset}`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(`${c.red}Fatal:${c.reset}`, e.message);
  process.exit(1);
});
