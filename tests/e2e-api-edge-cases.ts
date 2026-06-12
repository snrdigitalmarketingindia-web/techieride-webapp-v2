/**
 * TechieRide — Edge Case & Race Condition Tests
 *
 * EDGE-01  Last-seat race — giver approves 2 requests on a 1-seat ride → 2nd approve 400
 * EDGE-02  Re-request after rejection — seeker can re-request same ride after being rejected
 * EDGE-03  Re-request while already CONFIRMED — duplicate blocked → 400
 * EDGE-04  Pending requests auto-cancelled when giver cancels ride
 * EDGE-05  Pending request exists when ride is forcibly completed → request rejected
 * EDGE-06  Notification ordering — GET /notifications returns newest notification first
 * EDGE-07  Board after manual start (simulates cron auto-start path) → 200
 * EDGE-08  Complete with WAITING + DEBOARDED → 400 if attendance flag on, else 200 auto-resolve
 */

import {
  BASE,
  freshGiver,
  freshSeeker,
  publishRide,
} from './helpers';

// ─── Colours ─────────────────────────────────────────────────────────────────
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

// ─── Edge Case Tests ──────────────────────────────────────────────────────────

async function runEdgeCaseTests() {

  // ── EDGE-01: Last-seat race ─────────────────────────────────────────────────
  section('EDGE — Last-Seat Race Condition');

  await test('EDGE-01: Giver approves 2nd request on 1-seat ride → 400 (seat taken)', async () => {
    const giver   = await freshGiver('edge01');
    const seeker1 = await freshSeeker('edge01a');
    const seeker2 = await freshSeeker('edge01b');

    // 1-seat ride
    const rideId = await publishRide(giver.client, giver.vehicleId, 1);

    const req1 = await seeker1.client.post('/ride-requests', { rideId, pickupName: 'Kondapur' });
    assert(req1.status === 201, `seeker1 request failed: ${JSON.stringify(req1.data)}`);
    const reqId1 = req1.data.requestId as string;

    const req2 = await seeker2.client.post('/ride-requests', { rideId, pickupName: 'Gachibowli' });
    assert(req2.status === 201, `seeker2 request failed: ${JSON.stringify(req2.data)}`);
    const reqId2 = req2.data.requestId as string;

    // Giver approves seeker1 → direct CONFIRMED (seat now taken)
    const approve1 = await giver.client.patch(`/ride-requests/${reqId1}/approve`);
    assert(approve1.status === 200, `First approval failed: ${JSON.stringify(approve1.data)}`);

    // Giver tries to approve seeker2 → should fail (no seats left)
    const approve2 = await giver.client.patch(`/ride-requests/${reqId2}/approve`);
    assert(approve2.status === 400, `Expected 400 for last-seat conflict, got ${approve2.status}: ${JSON.stringify(approve2.data)}`);
  });

  await test('EDGE-01b: Ride with 2 seats — both approvals succeed, 3rd blocked → 400', async () => {
    const giver   = await freshGiver('edge01c');
    const seeker1 = await freshSeeker('edge01c1');
    const seeker2 = await freshSeeker('edge01c2');
    const seeker3 = await freshSeeker('edge01c3');

    const rideId = await publishRide(giver.client, giver.vehicleId, 2);

    const ids: string[] = [];
    for (const s of [seeker1, seeker2, seeker3]) {
      const r = await s.client.post('/ride-requests', { rideId, pickupName: 'Madhapur' });
      assert(r.status === 201, `Request failed: ${JSON.stringify(r.data)}`);
      ids.push(r.data.requestId as string);
    }

    const a1 = await giver.client.patch(`/ride-requests/${ids[0]}/approve`);
    assert(a1.status === 200, `1st approval failed: ${JSON.stringify(a1.data)}`);

    const a2 = await giver.client.patch(`/ride-requests/${ids[1]}/approve`);
    assert(a2.status === 200, `2nd approval failed: ${JSON.stringify(a2.data)}`);

    const a3 = await giver.client.patch(`/ride-requests/${ids[2]}/approve`);
    assert(a3.status === 400, `Expected 400 when 3rd request approved on 2-seat ride, got ${a3.status}`);
  });

  // ── EDGE-02 & 03: Re-request scenarios ─────────────────────────────────────
  section('EDGE — Re-request After Rejection / Duplicate Prevention');

  await test('EDGE-02: Seeker can re-request same ride after being rejected → 201', async () => {
    const giver  = await freshGiver('edge02');
    const seeker = await freshSeeker('edge02');

    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    // First request
    const req1 = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Ameerpet' });
    assert(req1.status === 201, `First request failed: ${JSON.stringify(req1.data)}`);
    const reqId1 = req1.data.requestId as string;

    // Giver rejects
    const reject = await giver.client.patch(`/ride-requests/${reqId1}/reject`);
    assert(reject.status === 200, `Reject failed: ${JSON.stringify(reject.data)}`);

    // Seeker re-requests the same ride (simulates re-request after expiry/rejection)
    const req2 = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Ameerpet' });
    assert(req2.status === 201, `Re-request after rejection failed — got ${req2.status}: ${JSON.stringify(req2.data)}`);
  });

  await test('EDGE-03: Seeker cannot re-request while already CONFIRMED on same ride → 400', async () => {
    const giver  = await freshGiver('edge03');
    const seeker = await freshSeeker('edge03');

    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    const req = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Begumpet' });
    assert(req.status === 201, `Request failed: ${JSON.stringify(req.data)}`);
    const reqId = req.data.requestId as string;

    await giver.client.patch(`/ride-requests/${reqId}/approve`);

    // Seeker tries to request the same ride again while already CONFIRMED
    const dup = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Begumpet' });
    assert(dup.status === 400 || dup.status === 409, `Expected 400/409 for duplicate request, got ${dup.status}: ${JSON.stringify(dup.data)}`);
  });

  // ── EDGE-04 & 05: Pending requests when ride state changes ─────────────────
  section('EDGE — Pending Requests On Ride Cancellation / Completion');

  await test('EDGE-04: Pending requests auto-cancelled when giver cancels ride', async () => {
    const giver   = await freshGiver('edge04');
    const seeker1 = await freshSeeker('edge04a');
    const seeker2 = await freshSeeker('edge04b');

    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    // Two seekers request — both stay PENDING (giver doesn't approve)
    const r1 = await seeker1.client.post('/ride-requests', { rideId, pickupName: 'Kukatpally' });
    assert(r1.status === 201, `seeker1 request failed`);
    const reqId1 = r1.data.requestId as string;

    const r2 = await seeker2.client.post('/ride-requests', { rideId, pickupName: 'KPHB' });
    assert(r2.status === 201, `seeker2 request failed`);
    const reqId2 = r2.data.requestId as string;

    // Giver cancels the ride
    const cancel = await giver.client.patch(`/rides/${rideId}/cancel`);
    assert(cancel.status === 200, `Ride cancel failed: ${JSON.stringify(cancel.data)}`);

    // Both pending requests should now be CANCELLED or REJECTED
    const s1mine = await seeker1.client.get('/ride-requests/mine');
    const s1req = (s1mine.data as any[]).find((r: any) => r.id === reqId1);
    assert(!!s1req, `seeker1 request ${reqId1} not found in /mine`);
    assert(
      ['CANCELLED', 'REJECTED'].includes(s1req.status),
      `Expected seeker1 request CANCELLED/REJECTED after ride cancel, got ${s1req.status}`,
    );

    const s2mine = await seeker2.client.get('/ride-requests/mine');
    const s2req = (s2mine.data as any[]).find((r: any) => r.id === reqId2);
    assert(!!s2req, `seeker2 request ${reqId2} not found in /mine`);
    assert(
      ['CANCELLED', 'REJECTED'].includes(s2req.status),
      `Expected seeker2 request CANCELLED/REJECTED after ride cancel, got ${s2req.status}`,
    );
  });

  await test('EDGE-05: Pending request exists when giver completes ride → request auto-rejected', async () => {
    const giver         = await freshGiver('edge05');
    const confirmedSeeker = await freshSeeker('edge05a');
    const pendingSeeker   = await freshSeeker('edge05b');

    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    // confirmedSeeker gets approved and confirmed
    const confReq = await confirmedSeeker.client.post('/ride-requests', { rideId, pickupName: 'Secunderabad' });
    assert(confReq.status === 201, `Confirmed seeker request failed`);
    const confReqId = confReq.data.requestId as string;
    await giver.client.patch(`/ride-requests/${confReqId}/approve`);

    // pendingSeeker requests but giver never approves
    const pendReq = await pendingSeeker.client.post('/ride-requests', { rideId, pickupName: 'Paradise' });
    assert(pendReq.status === 201, `Pending seeker request failed`);
    const pendReqId = pendReq.data.requestId as string;

    // Giver starts, confirmedSeeker boards + deboars, then complete
    await giver.client.patch(`/rides/${rideId}/start`);
    await confirmedSeeker.client.patch(`/rides/${rideId}/board`);
    await confirmedSeeker.client.patch(`/rides/${rideId}/deboard`);
    const complete = await giver.client.patch(`/rides/${rideId}/complete`);
    assert(complete.status === 200, `Complete failed: ${JSON.stringify(complete.data)}`);

    // The pending request should now be CANCELLED or REJECTED (not left PENDING)
    const pendMine = await pendingSeeker.client.get('/ride-requests/mine');
    const pendCheck = (pendMine.data as any[]).find((r: any) => r.id === pendReqId);
    assert(!!pendCheck, `pending request ${pendReqId} not found in /mine`);
    assert(
      ['CANCELLED', 'REJECTED'].includes(pendCheck.status),
      `Expected pending request to be closed after ride complete, got ${pendCheck.status}`,
    );
  });

  // ── EDGE-06: Notification ordering ─────────────────────────────────────────
  section('EDGE — Notification Ordering');

  await test('EDGE-06: Notifications returned newest-first (descending createdAt)', async () => {
    const giver  = await freshGiver('edge06g');
    const seeker = await freshSeeker('edge06s');

    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    // Generate 3 sequential notifications by making 3 ride requests
    const seeker2 = await freshSeeker('edge06s2');
    const seeker3 = await freshSeeker('edge06s3');

    const r1 = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Stop A' });
    assert(r1.status === 201, `Request 1 failed`);
    await new Promise(r => setTimeout(r, 200));

    const r2 = await seeker2.client.post('/ride-requests', { rideId, pickupName: 'Stop B' });
    assert(r2.status === 201, `Request 2 failed`);
    await new Promise(r => setTimeout(r, 200));

    const r3 = await seeker3.client.post('/ride-requests', { rideId, pickupName: 'Stop C' });
    assert(r3.status === 201, `Request 3 failed`);

    // Giver should have 3 "new request" notifications — verify ordering
    const notifs = await giver.client.get('/notifications');
    assert(notifs.status === 200, `GET /notifications failed: ${JSON.stringify(notifs.data)}`);

    const items: any[] = notifs.data.data ?? notifs.data ?? [];
    assert(items.length >= 3, `Expected at least 3 notifications, got ${items.length}`);

    // Verify descending order
    for (let i = 0; i < items.length - 1; i++) {
      const a = new Date(items[i].createdAt).getTime();
      const b = new Date(items[i + 1].createdAt).getTime();
      assert(a >= b, `Notification at index ${i} (${items[i].createdAt}) is older than index ${i + 1} (${items[i + 1].createdAt}) — not newest-first`);
    }
  });

  // ── EDGE-07: Board after manual start (cron-start simulation) ───────────────
  section('EDGE — Board After Auto-Start (Cron Simulation)');

  await test('EDGE-07: Seeker boards ride that giver started (simulates cron auto-start) → 200', async () => {
    const giver  = await freshGiver('edge07');
    const seeker = await freshSeeker('edge07');

    const rideId = await publishRide(giver.client, giver.vehicleId, 2);

    const req = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Miyapur' });
    assert(req.status === 201, `Request failed`);
    const reqId = req.data.requestId as string;

    await giver.client.patch(`/ride-requests/${reqId}/approve`);

    // Simulate cron auto-start by calling /start (same code path the cron uses)
    const start = await giver.client.patch(`/rides/${rideId}/start`);
    assert(start.status === 200, `Start failed: ${JSON.stringify(start.data)}`);

    // Seeker should be able to board the auto-started ride
    const board = await seeker.client.patch(`/rides/${rideId}/board`);
    assert(board.status === 200, `Board after cron-start failed: ${JSON.stringify(board.data)}`);
    assert(board.data.boardingStatus === 'BOARDED', `Expected BOARDED, got ${board.data.boardingStatus}`);
  });

  await test('EDGE-07b: Seeker cannot board if their request was never confirmed on auto-started ride → 400', async () => {
    const giver         = await freshGiver('edge07b');
    const confirmedS    = await freshSeeker('edge07b1');
    const unconfirmedS  = await freshSeeker('edge07b2');

    const rideId = await publishRide(giver.client, giver.vehicleId, 2);

    // confirmedS gets approved
    const req1 = await confirmedS.client.post('/ride-requests', { rideId, pickupName: 'LB Nagar' });
    assert(req1.status === 201, `Request failed`);
    await giver.client.patch(`/ride-requests/${req1.data.requestId}/approve`);

    // unconfirmedS request stays PENDING
    const req2 = await unconfirmedS.client.post('/ride-requests', { rideId, pickupName: 'Uppal' });
    assert(req2.status === 201, `Request 2 failed`);

    // Giver starts ride
    await giver.client.patch(`/rides/${rideId}/start`);

    // Unconfirmed seeker tries to board → should be blocked
    const board = await unconfirmedS.client.patch(`/rides/${rideId}/board`);
    assert(board.status === 400 || board.status === 403, `Expected 400/403 for non-participant board, got ${board.status}`);
  });

  // ── EDGE-08: WAITING blocks completion even with some DEBOARDED ─────────────
  section('EDGE — Completion Gate With Mixed Boarding States');

  // FEATURE_ATTENDANCE_TRACKING=true → 400 (WAITING blocks completion)
  // flag off (default, current release) → 200, WAITING passengers auto-DEBOARDED
  await test('EDGE-08: Complete with 1 DEBOARDED + 1 WAITING → 400 (flag on) or 200 auto-resolve (flag off)', async () => {
    const giver   = await freshGiver('edge08');
    const seeker1 = await freshSeeker('edge08a');
    const seeker2 = await freshSeeker('edge08b');

    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    for (const s of [seeker1, seeker2]) {
      const r = await s.client.post('/ride-requests', { rideId, pickupName: 'Test Stop' });
      assert(r.status === 201, `Request failed`);
      await giver.client.patch(`/ride-requests/${r.data.requestId}/approve`);
    }

    await giver.client.patch(`/rides/${rideId}/start`);

    // seeker1 boards and deboars
    await seeker1.client.patch(`/rides/${rideId}/board`);
    await seeker1.client.patch(`/rides/${rideId}/deboard`);

    // seeker2 is still WAITING — giver tries to complete
    const complete = await giver.client.patch(`/rides/${rideId}/complete`);
    assert([200, 400].includes(complete.status), `Expected 200/400, got ${complete.status}: ${JSON.stringify(complete.data)}`);
    if (complete.status === 200) {
      const ride = await giver.client.get(`/rides/${rideId}`);
      const bad = (ride.data.participants ?? []).filter(
        (p: any) => p.boardingStatus !== 'DEBOARDED' && p.boardingStatus !== 'NO_SHOW');
      assert(bad.length === 0, `Auto-resolve left ${bad.length} unresolved participants`);
      const penalised = (ride.data.participants ?? []).filter((p: any) => p.boardingStatus === 'NO_SHOW');
      assert(penalised.length === 0, 'Auto-resolve must use DEBOARDED, not NO_SHOW');
    }
  });
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}TechieRide — Edge Case & Race Condition Test Suite${c.reset}`);
  console.log(`${c.dim}API: ${BASE}${c.reset}\n`);

  await runEdgeCaseTests();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`\n${c.bold}━━━ Results ━━━${c.reset}`);
  console.log(`  Total : ${results.length}`);
  console.log(`  ${c.green}Passed: ${passed}${c.reset}`);
  console.log(`  ${c.red}Failed: ${failed.length}${c.reset}`);

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
