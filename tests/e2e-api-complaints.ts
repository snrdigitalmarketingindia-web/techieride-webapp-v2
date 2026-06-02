/**
 * TechieRide — P0 Automated Tests: Complaint System
 *
 * Covers all P0 business rules for:
 *   POST   /complaints           — file a complaint
 *   GET    /complaints/my        — reporter sees own complaints
 *   GET    /complaints/admin     — admin sees all complaints
 *   PATCH  /complaints/admin/:id — admin updates status
 *
 * Business rules tested:
 *   - No self-complaint
 *   - Cannot report an admin
 *   - If rideId provided: both reporter and reported must be participants
 *   - Duplicate complaint (same reporter + reported + ride) blocked
 *   - Invalid reason rejected
 *   - Unauthenticated blocked
 *   - Non-admin cannot access admin endpoints
 *   - Admin can review, resolve, dismiss
 *   - Terminal states (RESOLVED, DISMISSED) cannot be re-updated
 *   - Admin receives COMPLAINT_FILED notification
 *
 * Run: npm run test:api:complaints
 */

import {
  makeClient,
  freshGiver,
  freshSeeker,
  publishRide,
  getAdminClient,
  completeFullRide,
} from './helpers';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

// ─── Colours ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  blue: '\x1b[34m', bold: '\x1b[1m', dim: '\x1b[2m',
};

const results: { name: string; passed: boolean; error?: string }[] = [];
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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ─── Setup helpers ────────────────────────────────────────────────────────

async function setupCompletedRideWithParticipants() {
  const { giver, seeker, rideId } = await completeFullRide(1);
  return { giver, seeker, rideId };
}

async function setupOngoingRide() {
  const giver = await freshGiver('cmp');
  const seeker = await freshSeeker('cmp');
  const rideId = await publishRide(giver.client, giver.vehicleId);

  const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
  assert(reqR.status === 201, `Request failed: ${JSON.stringify(reqR.data)}`);
  const reqId = reqR.data.requestId;
  await giver.client.patch(`/ride-requests/${reqId}/approve`);
  await seeker.client.patch(`/ride-requests/${reqId}/confirm`);
  await giver.client.patch(`/rides/${rideId}/start`);
  return { giver, seeker, rideId };
}

// ══════════════════════════════════════════════════════════════════════════
// HAPPY PATH
// ══════════════════════════════════════════════════════════════════════════

async function runHappyPathTests() {
  section('CMP — Happy Path');

  // Seeker files complaint against giver without rideId (platform-level)
  await test('CMP-01: seeker files complaint against giver (no rideId) → 201', async () => {
    const giver = await freshGiver('c01');
    const seeker = await freshSeeker('c01');
    const r = await seeker.client.post('/complaints', {
      reportedId: giver.userId,
      reason: 'HARASSMENT',
      description: 'Giver was rude during pickup',
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.complaintId, 'complaintId missing from response');
  });

  // Seeker files complaint against giver with rideId (ride-context complaint)
  await test('CMP-02: seeker files complaint against giver with rideId → 201', async () => {
    const { giver, seeker, rideId } = await setupCompletedRideWithParticipants();
    const r = await seeker.client.post('/complaints', {
      reportedId: giver.userId,
      rideId,
      reason: 'UNSAFE_DRIVING',
      description: 'Driver exceeded 80kmph in school zone',
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.complaintId, 'complaintId missing');
  });

  // Giver files complaint against seeker
  await test('CMP-03: giver files complaint against seeker → 201', async () => {
    const { giver, seeker, rideId } = await setupCompletedRideWithParticipants();
    const r = await giver.client.post('/complaints', {
      reportedId: seeker.userId,
      rideId,
      reason: 'NO_SHOW',
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
  });

  // Complaint without description (optional field)
  await test('CMP-04: complaint without description accepted → 201', async () => {
    const giver = await freshGiver('c04');
    const seeker = await freshSeeker('c04');
    const r = await seeker.client.post('/complaints', {
      reportedId: giver.userId,
      reason: 'OTHER',
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
  });

  // Reporter can view their own complaints
  await test('CMP-05: reporter can fetch their own complaints → 200 array', async () => {
    const giver = await freshGiver('c05');
    const seeker = await freshSeeker('c05');
    await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'FRAUD' });
    const r = await seeker.client.get('/complaints/my');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Response should be an array');
    assert(r.data.length >= 1, 'Should have at least 1 complaint');
    assert(r.data[0].reason === 'FRAUD', `Expected reason=FRAUD, got ${r.data[0].reason}`);
  });

  // Admin can view all complaints
  await test('CMP-06: admin can fetch all complaints → 200 array', async () => {
    const admin = await getAdminClient();
    const r = await admin.get('/complaints/admin');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Response should be an array');
  });

  // Admin marks complaint UNDER_REVIEW
  await test('CMP-07: admin marks complaint UNDER_REVIEW → 200', async () => {
    const giver = await freshGiver('c07');
    const seeker = await freshSeeker('c07');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'HARASSMENT' });
    const complaintId = filed.data.complaintId;

    const admin = await getAdminClient();
    const r = await admin.patch(`/complaints/admin/${complaintId}`, {
      status: 'UNDER_REVIEW',
      adminNotes: 'Reviewing CCTV footage',
    });
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.status === 'UNDER_REVIEW', `Expected UNDER_REVIEW, got ${r.data.status}`);
  });

  // Admin resolves complaint
  await test('CMP-08: admin resolves complaint → 200, status=RESOLVED', async () => {
    const giver = await freshGiver('c08');
    const seeker = await freshSeeker('c08');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'FRAUD' });
    const complaintId = filed.data.complaintId;

    const admin = await getAdminClient();
    const r = await admin.patch(`/complaints/admin/${complaintId}`, {
      status: 'RESOLVED',
      adminNotes: 'Confirmed — giver warned and noted',
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.data.status === 'RESOLVED', `Expected RESOLVED, got ${r.data.status}`);
    assert(!!r.data.resolvedAt, 'resolvedAt must be set');
    assert(!!r.data.resolvedBy, 'resolvedBy must be set to admin userId');
  });

  // Admin dismisses complaint
  await test('CMP-09: admin dismisses complaint → 200, status=DISMISSED', async () => {
    const giver = await freshGiver('c09');
    const seeker = await freshSeeker('c09');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'OTHER' });
    const complaintId = filed.data.complaintId;

    const admin = await getAdminClient();
    const r = await admin.patch(`/complaints/admin/${complaintId}`, {
      status: 'DISMISSED',
      adminNotes: 'Insufficient evidence',
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.data.status === 'DISMISSED', `Expected DISMISSED, got ${r.data.status}`);
  });

  // Admin receives COMPLAINT_FILED notification
  await test('CMP-10: admin receives COMPLAINT_FILED notification when complaint filed', async () => {
    const giver = await freshGiver('c10');
    const seeker = await freshSeeker('c10');
    await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'HARASSMENT' });

    const admin = await getAdminClient();
    const notifs = await admin.get('/notifications');
    assert(notifs.status === 200, `Notifications failed: ${notifs.status}`);
    const found = notifs.data.data.find((n: any) => n.type === 'COMPLAINT_FILED');
    assert(!!found, 'Admin must receive COMPLAINT_FILED notification');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// NEGATIVE / GUARD CASES
// ══════════════════════════════════════════════════════════════════════════

async function runNegativeTests() {
  section('CMP — Negative & Guard Cases');

  // Cannot report yourself
  await test('CMP-11: self-complaint → 400', async () => {
    const seeker = await freshSeeker('c11');
    const r = await seeker.client.post('/complaints', {
      reportedId: seeker.userId,
      reason: 'OTHER',
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // Cannot report an admin
  await test('CMP-12: cannot report an admin user → 403', async () => {
    const seeker = await freshSeeker('c12');
    // Get admin userId via login
    const adminLogin = await makeClient().post('/auth/login', {
      email: 'admin@techieride.in',
      password: 'TechieRide@2024',
    });
    const adminPayload = JSON.parse(
      Buffer.from(adminLogin.data.accessToken.split('.')[1], 'base64').toString(),
    );
    const r = await seeker.client.post('/complaints', {
      reportedId: adminPayload.sub,
      reason: 'OTHER',
    });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // Non-participant cannot file ride-scoped complaint
  await test('CMP-13: non-participant cannot file ride-scoped complaint → 403', async () => {
    const { giver, rideId } = await setupCompletedRideWithParticipants();
    const outsider = await freshSeeker('c13');
    const r = await outsider.client.post('/complaints', {
      reportedId: giver.userId,
      rideId,
      reason: 'HARASSMENT',
    });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // Reported user not on ride
  await test('CMP-14: reported user not on ride → 403', async () => {
    const { seeker, rideId } = await setupCompletedRideWithParticipants();
    const outsider = await freshSeeker('c14out');
    const r = await seeker.client.post('/complaints', {
      reportedId: outsider.userId,
      rideId,
      reason: 'NO_SHOW',
    });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // Duplicate complaint (same reporter + reported + ride) → 409
  await test('CMP-15: duplicate ride-scoped complaint → 409', async () => {
    const { giver, seeker, rideId } = await setupCompletedRideWithParticipants();
    await seeker.client.post('/complaints', { reportedId: giver.userId, rideId, reason: 'UNSAFE_DRIVING' });
    const r = await seeker.client.post('/complaints', { reportedId: giver.userId, rideId, reason: 'HARASSMENT' });
    assert(r.status === 409, `Expected 409, got ${r.status}`);
  });

  // Invalid reason enum
  await test('CMP-16: invalid reason → 400', async () => {
    const giver = await freshGiver('c16');
    const seeker = await freshSeeker('c16');
    const r = await seeker.client.post('/complaints', {
      reportedId: giver.userId,
      reason: 'MADE_UP_REASON',
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // Unauthenticated cannot file complaint
  await test('CMP-17: unauthenticated POST /complaints → 401', async () => {
    const giver = await freshGiver('c17');
    const anon = makeClient();
    const r = await anon.post('/complaints', {
      reportedId: giver.userId,
      reason: 'OTHER',
    });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  // Non-admin cannot access admin endpoint
  await test('CMP-18: non-admin GET /complaints/admin → 403', async () => {
    const seeker = await freshSeeker('c18');
    const r = await seeker.client.get('/complaints/admin');
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // Non-admin cannot update complaint status
  await test('CMP-19: non-admin PATCH /complaints/admin/:id → 403', async () => {
    const giver = await freshGiver('c19');
    const seeker = await freshSeeker('c19');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'FRAUD' });
    const complaintId = filed.data.complaintId;
    const r = await seeker.client.patch(`/complaints/admin/${complaintId}`, { status: 'RESOLVED' });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // Cannot update a RESOLVED complaint
  await test('CMP-20: updating already-RESOLVED complaint → 400', async () => {
    const giver = await freshGiver('c20');
    const seeker = await freshSeeker('c20');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'OTHER' });
    const complaintId = filed.data.complaintId;

    const admin = await getAdminClient();
    await admin.patch(`/complaints/admin/${complaintId}`, { status: 'RESOLVED' });
    const r = await admin.patch(`/complaints/admin/${complaintId}`, { status: 'DISMISSED' });
    assert(r.status === 400, `Expected 400 on re-update of RESOLVED, got ${r.status}`);
  });

  // Cannot update a DISMISSED complaint
  await test('CMP-21: updating already-DISMISSED complaint → 400', async () => {
    const giver = await freshGiver('c21');
    const seeker = await freshSeeker('c21');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'OTHER' });
    const complaintId = filed.data.complaintId;

    const admin = await getAdminClient();
    await admin.patch(`/complaints/admin/${complaintId}`, { status: 'DISMISSED' });
    const r = await admin.patch(`/complaints/admin/${complaintId}`, { status: 'RESOLVED' });
    assert(r.status === 400, `Expected 400 on re-update of DISMISSED, got ${r.status}`);
  });

  // Ride does not exist
  await test('CMP-22: complaint against non-existent rideId → 404', async () => {
    const giver = await freshGiver('c22');
    const seeker = await freshSeeker('c22');
    const fakeRideId = '00000000-0000-0000-0000-000000000000';
    const r = await seeker.client.post('/complaints', {
      reportedId: giver.userId,
      rideId: fakeRideId,
      reason: 'HARASSMENT',
    });
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });

  // Reported user does not exist
  await test('CMP-23: complaint against non-existent user → 404', async () => {
    const seeker = await freshSeeker('c23');
    const fakeUserId = '00000000-0000-4000-8000-000000000001'; // valid UUID v4 format, guaranteed non-existent
    const r = await seeker.client.post('/complaints', {
      reportedId: fakeUserId,
      reason: 'FRAUD',
    });
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// DATA INTEGRITY
// ══════════════════════════════════════════════════════════════════════════

async function runDataIntegrityTests() {
  section('CMP — Data Integrity');

  // My complaints returns only own complaints (not others)
  await test('CMP-24: GET /complaints/my returns only reporter\'s own complaints', async () => {
    const giver = await freshGiver('c24');
    const seekerA = await freshSeeker('c24a');
    const seekerB = await freshSeeker('c24b');

    await seekerA.client.post('/complaints', { reportedId: giver.userId, reason: 'HARASSMENT' });
    await seekerB.client.post('/complaints', { reportedId: giver.userId, reason: 'FRAUD' });

    const myR = await seekerA.client.get('/complaints/my');
    assert(myR.status === 200, `Expected 200, got ${myR.status}`);
    const allMine = myR.data.every((c: any) => c.reporterId === seekerA.userId);
    assert(allMine, 'All returned complaints must belong to the requesting user only');
  });

  // Admin filter by status works
  await test('CMP-25: admin can filter complaints by status', async () => {
    const giver = await freshGiver('c25');
    const seeker = await freshSeeker('c25');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'OTHER' });
    const complaintId = filed.data.complaintId;

    const admin = await getAdminClient();
    await admin.patch(`/complaints/admin/${complaintId}`, { status: 'UNDER_REVIEW' });

    const filtered = await admin.get('/complaints/admin?status=UNDER_REVIEW');
    assert(filtered.status === 200, `Expected 200, got ${filtered.status}`);
    assert(Array.isArray(filtered.data), 'Response should be an array');
    const allUnderReview = filtered.data.every((c: any) => c.status === 'UNDER_REVIEW');
    assert(allUnderReview, 'All returned complaints must have status=UNDER_REVIEW');
  });

  // Complaint carries ride context when rideId provided
  await test('CMP-26: complaint with rideId carries ride context in response', async () => {
    const { giver, seeker, rideId } = await setupCompletedRideWithParticipants();
    await seeker.client.post('/complaints', { reportedId: giver.userId, rideId, reason: 'UNSAFE_DRIVING' });

    const myR = await seeker.client.get('/complaints/my');
    const complaint = myR.data.find((c: any) => c.rideId === rideId);
    assert(!!complaint, 'Complaint with rideId must appear in my complaints');
    assert(!!complaint.ride, 'Complaint must include ride context (origin, destination)');
  });

  // Regression: complaint persists after logout
  await test('CMP-27: complaint persists after re-fetch with fresh client', async () => {
    const giver = await freshGiver('c27');
    const seeker = await freshSeeker('c27');
    const filed = await seeker.client.post('/complaints', { reportedId: giver.userId, reason: 'FRAUD' });
    const complaintId = filed.data.complaintId;

    // Fresh client with same token — simulates app restart
    const freshClient = makeClient(seeker.token);
    const r = await freshClient.get('/complaints/my');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    const found = r.data.find((c: any) => c.id === complaintId);
    assert(!!found, 'Complaint must be retrievable via fresh client (DB-persisted)');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${c.bold}TechieRide — P0 Complaint System Test Suite${c.reset}`);
  console.log(`${c.dim}API: ${BASE}${c.reset}\n`);

  await runHappyPathTests();
  await runNegativeTests();
  await runDataIntegrityTests();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`\n${c.bold}━━━ Results ━━━${c.reset}`);
  console.log(`  Total : ${results.length}`);
  console.log(`  ${c.green}Passed: ${passed}${c.reset}`);
  console.log(`  ${failed.length > 0 ? c.red : c.green}Failed: ${failed.length}${c.reset}`);

  if (failed.length > 0) {
    console.log(`\n${c.red}${c.bold}Failed tests:${c.reset}`);
    failed.forEach((r) => console.log(`  ✗ ${r.name}\n    ${c.dim}${r.error}${c.reset}`));
    process.exit(1);
  } else {
    console.log(`\n${c.green}${c.bold}All tests passed! ✅${c.reset}`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(`${c.red}Fatal:${c.reset}`, e.message);
  process.exit(1);
});
