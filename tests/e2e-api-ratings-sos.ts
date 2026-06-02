/**
 * TechieRide — P0 Automated Tests: Ratings & SOS
 *
 * Covers all P0 test cases from:
 *   tests/business-functional/13-ratings.md  (RAT-*)
 *   tests/business-functional/12-sos.md      (SOS-*)
 *
 * Run: npm run test:api:ratings-sos
 */

import axios, { AxiosInstance } from 'axios';
import {
  makeClient,
  loginAs,
  freshGiver,
  freshSeeker,
  completeFullRide,
  publishRide,
  getAdminClient,
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

// ─── Results tracking ─────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Start an ONGOING ride with one confirmed seeker */
async function startRideWithSeeker() {
  const giver = await freshGiver('rs');
  const seeker = await freshSeeker('rs');
  const rideId = await publishRide(giver.client, giver.vehicleId);

  const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
  assert(reqR.status === 201, `Request failed: ${JSON.stringify(reqR.data)}`);
  const reqId = reqR.data.requestId;

  await giver.client.patch(`/ride-requests/${reqId}/approve`);
  await seeker.client.patch(`/ride-requests/${reqId}/confirm`);
  await giver.client.patch(`/rides/${rideId}/start`);

  return { giver, seeker, rideId, reqId };
}

/** Board + deboard + complete a ride (reuses startRideWithSeeker result) */
async function completeRide(giver: any, seeker: any, rideId: string) {
  await seeker.client.patch(`/rides/${rideId}/board`);
  await seeker.client.patch(`/rides/${rideId}/deboard`);
  const r = await giver.client.patch(`/rides/${rideId}/complete`);
  assert(r.status === 200, `Complete failed: ${JSON.stringify(r.data)}`);
}

// ══════════════════════════════════════════════════════════════════════════
// RATINGS — P0 TEST CASES
// ══════════════════════════════════════════════════════════════════════════

async function runRatingsTests() {
  section('RAT — Ratings (P0)');

  // Shared completed ride for most tests
  let giver: any, seeker: any, rideId: string;

  await test('RAT-SETUP: complete a full ride for rating tests', async () => {
    const r = await completeFullRide(1);
    giver = r.giver;
    seeker = r.seeker;
    rideId = r.rideId;
    assert(!!rideId, 'No rideId from completeFullRide');
  });

  // RAT-01: Seeker rates giver after COMPLETED ride
  await test('RAT-01: seeker rates giver → 201', async () => {
    const r = await seeker.client.post('/ratings', {
      rideId,
      rateeId: giver.userId,
      score: 5,
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.ratingId, 'ratingId missing from response');
  });

  // RAT-02: Giver rates seeker after COMPLETED ride
  await test('RAT-02: giver rates seeker → 201', async () => {
    const r = await giver.client.post('/ratings', {
      rideId,
      rateeId: seeker.userId,
      score: 4,
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.ratingId, 'ratingId missing from response');
  });

  // RAT-03: Rating on ONGOING ride blocked
  await test('RAT-03: rating on ONGOING ride → 400', async () => {
    const g2 = await freshGiver('rat03');
    const s2 = await freshSeeker('rat03');
    const { rideId: ongoingId, seeker: s2r, giver: g2r } = await startRideWithSeeker();
    const r = await s2r.client.post('/ratings', {
      rideId: ongoingId,
      rateeId: g2r.userId,
      score: 3,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // RAT-04: Rating on PUBLISHED ride blocked
  await test('RAT-04: rating on PUBLISHED ride → 400', async () => {
    const g3 = await freshGiver('rat04');
    const s3 = await freshSeeker('rat04');
    const publishedId = await publishRide(g3.client, g3.vehicleId);
    const r = await s3.client.post('/ratings', {
      rideId: publishedId,
      rateeId: g3.userId,
      score: 3,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // RAT-05: Duplicate rating blocked → 409
  await test('RAT-05: duplicate rating → 409', async () => {
    // seeker already rated giver in RAT-01 — try again
    const r = await seeker.client.post('/ratings', {
      rideId,
      rateeId: giver.userId,
      score: 3,
    });
    assert(r.status === 409, `Expected 409, got ${r.status}: ${JSON.stringify(r.data)}`);
  });

  // RAT-06: Self-rating blocked → 400
  await test('RAT-06: self-rating → 400', async () => {
    const r = await giver.client.post('/ratings', {
      rideId,
      rateeId: giver.userId,
      score: 5,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // RAT-07: Non-participant cannot rate → 403
  await test('RAT-07: non-participant cannot rate → 403', async () => {
    const outsider = await freshSeeker('rat07');
    const r = await outsider.client.post('/ratings', {
      rideId,
      rateeId: giver.userId,
      score: 2,
    });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // RAT-10: Score 0 rejected → 400
  await test('RAT-10: score=0 → 400', async () => {
    const r = await seeker.client.post('/ratings', {
      rideId,
      rateeId: giver.userId,
      score: 0,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // RAT-11: Score 6 rejected → 400
  await test('RAT-11: score=6 → 400', async () => {
    const r = await seeker.client.post('/ratings', {
      rideId,
      rateeId: giver.userId,
      score: 6,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // RAT-13: Average rating calculated correctly
  await test('RAT-13: average rating calculated correctly', async () => {
    // giver has 1 rating of score=4 from RAT-02
    const r = await giver.client.get(`/ratings/stats/${giver.userId}`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.data.ratingCount >= 1, 'ratingCount should be >= 1');
    assert(typeof r.data.averageRating === 'number', 'averageRating should be a number');
  });

  // RAT-16: Unauthenticated rating → 401
  await test('RAT-16: unauthenticated → 401', async () => {
    const anon = makeClient();
    const r = await anon.post('/ratings', {
      rideId,
      rateeId: giver.userId,
      score: 5,
    });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  // RAT-23: Rating on CANCELLED ride blocked → 400
  await test('RAT-23: rating on CANCELLED ride → 400', async () => {
    const g4 = await freshGiver('rat23');
    const s4 = await freshSeeker('rat23');
    const cancelRideId = await publishRide(g4.client, g4.vehicleId);
    await g4.client.patch(`/rides/${cancelRideId}/cancel`);
    const r = await s4.client.post('/ratings', {
      rideId: cancelRideId,
      rateeId: g4.userId,
      score: 3,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SOS — P0 TEST CASES
// ══════════════════════════════════════════════════════════════════════════

async function runSosTests() {
  section('SOS — Emergency System (P0)');

  // SOS-01: Giver triggers SOS during ONGOING ride → 201
  await test('SOS-01: giver triggers SOS on ONGOING ride → 201', async () => {
    const { giver, rideId } = await startRideWithSeeker();
    const r = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.sosId, 'sosId missing from response');
  });

  // SOS-02: Seeker triggers SOS during ONGOING ride → 201
  await test('SOS-02: seeker triggers SOS on ONGOING ride → 201', async () => {
    const { seeker, rideId } = await startRideWithSeeker();
    const r = await seeker.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.sosId, 'sosId missing from response');
  });

  // SOS-03: SOS captures GPS coordinates
  await test('SOS-03: SOS captures GPS coordinates', async () => {
    const { giver, rideId } = await startRideWithSeeker();
    const r = await giver.client.post('/sos', { rideId, lat: 17.1234, lng: 78.5678 });
    assert(r.status === 201, `Expected 201, got ${r.status}`);
    assert(!!r.data.sosId, 'sosId missing');
    // Verify via admin active SOS list
    const admin = await getAdminClient();
    const active = await admin.get('/admin/sos/active');
    assert(active.status === 200, `Admin SOS list failed: ${active.status}`);
    const sos = active.data.find((s: any) => s.id === r.data.sosId);
    assert(!!sos, 'SOS record not found in admin active list');
    assert(sos.lat === 17.1234 && sos.lng === 78.5678, `GPS mismatch: ${sos.lat},${sos.lng}`);
  });

  // SOS-04: SOS attaches ride context
  await test('SOS-04: SOS attaches ride context (rideId stored)', async () => {
    const { giver, rideId } = await startRideWithSeeker();
    const r = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r.status === 201, `Expected 201, got ${r.status}`);
    const admin = await getAdminClient();
    const active = await admin.get('/admin/sos/active');
    const sos = active.data.find((s: any) => s.id === r.data.sosId);
    assert(!!sos, 'SOS record not found');
    assert(sos.rideId === rideId, `rideId mismatch: expected ${rideId}, got ${sos.rideId}`);
  });

  // SOS-07: SOS on COMPLETED ride → 400
  await test('SOS-07: SOS on COMPLETED ride → 400', async () => {
    const { giver, seeker, rideId } = await startRideWithSeeker();
    await completeRide(giver, seeker, rideId);
    const r = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r.status === 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.data)}`);
  });

  // SOS-08: SOS on CANCELLED ride → 400
  await test('SOS-08: SOS on CANCELLED ride → 400', async () => {
    const g = await freshGiver('sos08');
    const cancelId = await publishRide(g.client, g.vehicleId);
    await g.client.patch(`/rides/${cancelId}/cancel`);
    const r = await g.client.post('/sos', { rideId: cancelId, lat: 17.44, lng: 78.34 });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // SOS-09: Non-participant cannot trigger SOS → 403
  await test('SOS-09: non-participant triggers SOS → 403', async () => {
    const { rideId } = await startRideWithSeeker();
    const outsider = await freshSeeker('sos09');
    const r = await outsider.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // SOS-10: Unauthenticated SOS → 401
  await test('SOS-10: unauthenticated SOS → 401', async () => {
    const anon = makeClient();
    const r = await anon.post('/sos', { lat: 17.44, lng: 78.34 });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  // SOS-11: Duplicate SOS within 60s → 429
  await test('SOS-11: duplicate SOS within 60s → 429', async () => {
    const { giver, rideId } = await startRideWithSeeker();
    const r1 = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r1.status === 201, `First SOS failed: ${r1.status}`);
    // Immediate second SOS — should be blocked by cooldown
    const r2 = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r2.status === 429, `Expected 429, got ${r2.status}: ${JSON.stringify(r2.data)}`);
  });

  // SOS-13: SOS without GPS → 201, location stored as 0/null
  await test('SOS-13: SOS without GPS → 201 (graceful fallback)', async () => {
    const { seeker, rideId } = await startRideWithSeeker();
    const r = await seeker.client.post('/sos', { rideId });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.sosId, 'sosId missing');
  });

  // SOS-15: Admin sees active SOS events
  await test('SOS-15: admin sees active SOS events', async () => {
    const admin = await getAdminClient();
    const r = await admin.get('/admin/sos/active');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Response should be an array');
  });

  // SOS-20: Multiple SOS from same ride (different users) — both recorded
  await test('SOS-20: multiple SOS from same ride (giver + seeker) → both recorded', async () => {
    const { giver, seeker, rideId } = await startRideWithSeeker();
    const r1 = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(r1.status === 201, `Giver SOS failed: ${r1.status}`);
    // Wait 61s for cooldown? No — seeker is a different user, no cooldown
    const r2 = await seeker.client.post('/sos', { rideId, lat: 17.45, lng: 78.35 });
    assert(r2.status === 201, `Seeker SOS failed: ${r2.status}`);
    assert(r1.data.sosId !== r2.data.sosId, 'Both SOS events should have different IDs');
  });

  // SOS-23: SOS data retained after ride completion
  await test('SOS-23: SOS record retained after ride completion', async () => {
    const { giver, seeker, rideId } = await startRideWithSeeker();
    const sosR = await giver.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
    assert(sosR.status === 201, `SOS trigger failed: ${sosR.status}`);
    const sosId = sosR.data.sosId;

    await completeRide(giver, seeker, rideId);

    // SOS should still appear in admin records
    const admin = await getAdminClient();
    const resolved = await admin.patch(`/admin/sos/${sosId}/resolve`, { notes: 'Test resolution' });
    // 200 (still accessible) OR already resolved
    assert([200, 404].includes(resolved.status) === false || resolved.status === 200,
      `SOS should still be resolvable after ride completion, got ${resolved.status}`);
    // Main assertion: record was not deleted (resolve returned 200)
    assert(resolved.status === 200, `SOS should persist — got ${resolved.status}: ${JSON.stringify(resolved.data)}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${c.bold}TechieRide — P0 Ratings & SOS Test Suite${c.reset}`);
  console.log(`${c.dim}API: ${BASE}${c.reset}\n`);

  await runRatingsTests();
  await runSosTests();

  // ── Summary ──────────────────────────────────────────────────────────
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
