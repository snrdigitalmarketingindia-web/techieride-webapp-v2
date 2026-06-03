/**
 * TechieRide — Cancellation Real-World Scenario Tests
 *
 * CAN-01  Seeker cancels CONFIRMED booking → seat count restored → 200
 * CAN-02  Seeker cancels PENDING request → no seat change → 200
 * CAN-03  Seeker cannot cancel after ride goes ONGOING → 400
 * CAN-04  Seeker can re-request same ride after cancelling own booking → 201
 * CAN-05  Giver cancels ride with confirmed seeker → seeker notified → 200
 * CAN-06  Giver cancels ride with multiple confirmed seekers → all notified, all requests CANCELLED → 200
 * CAN-07  Giver cannot cancel ONGOING ride → 400
 * CAN-08  Seeker cancels → seat freed → another seeker can now book that seat → 201
 * CAN-09  Duplicate cancellation → 400
 * CAN-10  Non-owner cannot cancel another seeker's request → 403/404
 */

import {
  BASE,
  freshGiver,
  freshSeeker,
  publishRide,
} from './helpers';

// ─── Colours ──────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupConfirmedBooking(suffix: string, seats = 3) {
  const giver  = await freshGiver(`can_${suffix}`);
  const seeker = await freshSeeker(`can_${suffix}`);
  const rideId = await publishRide(giver.client, giver.vehicleId, seats);

  const req = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Test Pickup' });
  assert(req.status === 201, `Request failed: ${JSON.stringify(req.data)}`);
  const reqId = req.data.requestId as string;

  const approve = await giver.client.patch(`/ride-requests/${reqId}/approve`);
  assert(approve.status === 200, `Approve failed: ${JSON.stringify(approve.data)}`);

  return { giver, seeker, rideId, reqId };
}

async function getAvailableSeats(client: any, rideId: string): Promise<number> {
  const r = await client.get(`/rides/${rideId}`);
  return r.data.availableSeats;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runCancellationTests() {

  // ── Seeker-initiated cancellations ─────────────────────────────────────────
  section('CAN — Seeker Cancels Confirmed Booking');

  await test('CAN-01: Seeker cancels CONFIRMED booking → seat restored → 200', async () => {
    const { giver, seeker, rideId, reqId } = await setupConfirmedBooking('01', 2);

    const seatsBefore = await getAvailableSeats(giver.client, rideId);

    const cancel = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
    assert(cancel.status === 200, `Cancel failed: ${JSON.stringify(cancel.data)}`);
    assert(cancel.data.status === 'CANCELLED', `Expected CANCELLED, got ${cancel.data.status}`);

    const seatsAfter = await getAvailableSeats(giver.client, rideId);
    assert(seatsAfter === seatsBefore + 1, `Expected seat restored: before=${seatsBefore} after=${seatsAfter}`);
  });

  await test('CAN-02: Seeker cancels PENDING request → no seat change → 200', async () => {
    const giver  = await freshGiver('can_02');
    const seeker = await freshSeeker('can_02');
    const rideId = await publishRide(giver.client, giver.vehicleId, 3);

    const req = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Test Pickup' });
    assert(req.status === 201, `Request failed`);
    const reqId = req.data.requestId as string;

    const seatsBefore = await getAvailableSeats(giver.client, rideId);

    const cancel = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
    assert(cancel.status === 200, `Cancel failed: ${JSON.stringify(cancel.data)}`);
    assert(cancel.data.status === 'CANCELLED', `Expected CANCELLED, got ${cancel.data.status}`);

    const seatsAfter = await getAvailableSeats(giver.client, rideId);
    assert(seatsAfter === seatsBefore, `PENDING cancel should not change seats: before=${seatsBefore} after=${seatsAfter}`);
  });

  await test('CAN-03: Seeker cannot cancel after ride goes ONGOING → 400', async () => {
    const { giver, seeker, rideId, reqId } = await setupConfirmedBooking('03');

    // Giver starts the ride
    const start = await giver.client.patch(`/rides/${rideId}/start`);
    assert(start.status === 200, `Start failed: ${JSON.stringify(start.data)}`);

    // Seeker tries to cancel — should be blocked
    const cancel = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
    assert(cancel.status === 400, `Expected 400 (ride ONGOING), got ${cancel.status}: ${JSON.stringify(cancel.data)}`);
  });

  await test('CAN-04: Seeker can re-request same ride after cancelling own confirmed booking → 201', async () => {
    const { seeker, rideId, reqId } = await setupConfirmedBooking('04', 3);

    // Seeker cancels
    const cancel = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
    assert(cancel.status === 200, `Cancel failed`);

    // Seeker re-requests the same ride
    const req2 = await seeker.client.post('/ride-requests', { rideId, pickupName: 'New Pickup' });
    assert(req2.status === 201, `Re-request after cancel failed — got ${req2.status}: ${JSON.stringify(req2.data)}`);
  });

  await test('CAN-09: Duplicate cancellation → 400', async () => {
    const { seeker, reqId } = await setupConfirmedBooking('09');

    await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
    const dup = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
    assert(dup.status === 400, `Expected 400 on duplicate cancel, got ${dup.status}`);
  });

  await test('CAN-10: Non-owner cannot cancel another seeker\'s request → 403/404', async () => {
    const { rideId, reqId } = await setupConfirmedBooking('10a');
    const otherSeeker = await freshSeeker('can_10b');

    const attempt = await otherSeeker.client.patch(`/ride-requests/${reqId}/cancel`);
    assert(
      attempt.status === 403 || attempt.status === 404,
      `Expected 403/404, got ${attempt.status}: ${JSON.stringify(attempt.data)}`
    );
  });

  // ── Giver-initiated cancellations ──────────────────────────────────────────
  section('CAN — Giver Cancels Ride');

  await test('CAN-05: Giver cancels ride with confirmed seeker → requests CANCELLED → 200', async () => {
    const { giver, seeker, rideId, reqId } = await setupConfirmedBooking('05');

    const cancel = await giver.client.patch(`/rides/${rideId}/cancel`, { reason: 'Emergency' });
    assert(cancel.status === 200, `Ride cancel failed: ${JSON.stringify(cancel.data)}`);

    const mine = await seeker.client.get('/ride-requests/mine');
    const req = (mine.data as any[]).find((r: any) => r.id === reqId);
    assert(!!req, `Request not found in seeker's list`);
    assert(
      ['CANCELLED', 'REJECTED'].includes(req.status),
      `Expected request CANCELLED after giver cancels ride, got ${req.status}`
    );
  });

  await test('CAN-06: Giver cancels with multiple seekers → all requests CANCELLED → 200', async () => {
    const giver   = await freshGiver('can_06');
    const seeker1 = await freshSeeker('can_06a');
    const seeker2 = await freshSeeker('can_06b');
    const rideId  = await publishRide(giver.client, giver.vehicleId, 3);

    const reqIds: string[] = [];
    for (const s of [seeker1, seeker2]) {
      const r = await s.client.post('/ride-requests', { rideId, pickupName: 'Stop' });
      assert(r.status === 201, `Request failed`);
      reqIds.push(r.data.requestId as string);
      await giver.client.patch(`/ride-requests/${r.data.requestId}/approve`);
    }

    const cancel = await giver.client.patch(`/rides/${rideId}/cancel`, { reason: 'Car breakdown' });
    assert(cancel.status === 200, `Ride cancel failed: ${JSON.stringify(cancel.data)}`);

    // Both requests should be cancelled
    for (let i = 0; i < 2; i++) {
      const seeker = i === 0 ? seeker1 : seeker2;
      const mine = await seeker.client.get('/ride-requests/mine');
      const req = (mine.data as any[]).find((r: any) => r.id === reqIds[i]);
      assert(!!req, `Seeker${i + 1} request not found`);
      assert(
        ['CANCELLED', 'REJECTED'].includes(req.status),
        `Seeker${i + 1} request should be CANCELLED, got ${req.status}`
      );
    }
  });

  await test('CAN-07: Giver cannot cancel ONGOING ride → 400', async () => {
    const { giver, rideId } = await setupConfirmedBooking('07');

    await giver.client.patch(`/rides/${rideId}/start`);
    const cancel = await giver.client.patch(`/rides/${rideId}/cancel`, { reason: 'Test' });
    assert(cancel.status === 400, `Expected 400 (ride ONGOING), got ${cancel.status}`);
  });

  // ── Seat availability after cancellation ───────────────────────────────────
  section('CAN — Seat Availability After Cancellation');

  await test('CAN-08: Seeker cancels → freed seat allows another seeker to book → 201', async () => {
    // 1-seat ride — seeker1 takes it, cancels, seeker2 books the freed seat
    const { giver, seeker, rideId, reqId } = await setupConfirmedBooking('08', 1);

    // Seat is taken — seeker1 cancels
    const cancel = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
    assert(cancel.status === 200, `Cancel failed: ${JSON.stringify(cancel.data)}`);

    // Seat is now free — seeker2 can request
    const seeker2 = await freshSeeker('can_08b');
    const req2 = await seeker2.client.post('/ride-requests', { rideId, pickupName: 'Pickup B' });
    assert(req2.status === 201, `Seeker2 request after seat freed failed: ${JSON.stringify(req2.data)}`);
    const reqId2 = req2.data.requestId as string;

    // Giver approves seeker2
    const approve2 = await giver.client.patch(`/ride-requests/${reqId2}/approve`);
    assert(approve2.status === 200, `Expected approval to succeed after seat freed, got ${approve2.status}: ${JSON.stringify(approve2.data)}`);
  });
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}TechieRide — Cancellation Real-World Scenario Suite${c.reset}`);
  console.log(`${c.dim}API: ${BASE}${c.reset}\n`);

  await runCancellationTests();

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
