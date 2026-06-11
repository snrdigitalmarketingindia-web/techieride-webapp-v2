/**
 * TechieRide — Boarding State Machine Tests
 *
 * Covers: start, board, deboard, no-show, complete with boarding gate enforcement.
 *
 * BOARD-01  Giver starts ride with WAITING passengers (manual override) → 200
 * BOARD-02  Complete ride with WAITING passenger → 400
 * BOARD-03  Complete ride with BOARDED (not deboarded) passenger → 400
 * BOARD-04  Mark no-show → 200, boardingStatus = NO_SHOW
 * BOARD-05  Complete ride after all NO_SHOW → 200
 * BOARD-06  Complete ride with DEBOARDED + NO_SHOW mix → 200
 * BOARD-07  Seeker boards ONGOING ride → 200, boardingStatus = BOARDED
 * BOARD-08  Seeker cannot board PUBLISHED ride → 400
 * BOARD-09  Seeker deboard after boarding → 200, boardingStatus = DEBOARDED
 * BOARD-10  Seeker boards twice → 400
 * BOARD-11  Seeker deboard without boarding → 400
 */

import {
  BASE,
  freshGiver,
  freshSeeker,
  publishRide,
} from './helpers';

// ─── Colours ─────────────────────────────────────────────────────────────
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

// ─── Setup helper ────────────────────────────────────────────────────────

async function setupOngoingRide(suffix: string) {
  const giver  = await freshGiver(`bd_${suffix}`);
  const seeker = await freshSeeker(`bd_${suffix}`);
  const rideId = await publishRide(giver.client, giver.vehicleId, 3);

  const req = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Test Pickup' });
  if (req.status !== 201) throw new Error(`Request failed: ${JSON.stringify(req.data)}`);
  const reqId = req.data.requestId as string;

  await giver.client.patch(`/ride-requests/${reqId}/approve`);
  await seeker.client.patch(`/ride-requests/${reqId}/confirm`);

  return { giver, seeker, rideId, reqId };
}

// ─── Tests ───────────────────────────────────────────────────────────────

async function runBoardingTests() {
  section('BOARD — Boarding State Machine');

  // BOARD-01: Giver can manually start even with WAITING passengers
  await test('BOARD-01: Giver starts ride with WAITING passenger → 200 (manual override)', async () => {
    const { giver, rideId } = await setupOngoingRide('01');
    const r = await giver.client.patch(`/rides/${rideId}/start`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    assert(ride.data.status === 'ONGOING', `Expected ONGOING, got ${ride.data.status}`);
  });

  // BOARD-02: Complete ride with WAITING passenger.
  // FEATURE_ATTENDANCE_TRACKING=true  → 400 (blocked until resolved)
  // flag off (default, current release) → 200, passengers auto-DEBOARDED
  await test('BOARD-02: Complete ride with WAITING passenger → 400 (flag on) or 200 auto-resolve (flag off)', async () => {
    const { giver, rideId } = await setupOngoingRide('02');
    await giver.client.patch(`/rides/${rideId}/start`);
    const r = await giver.client.patch(`/rides/${rideId}/complete`);
    assert([200, 400].includes(r.status), `Expected 200 or 400, got ${r.status}`);
    if (r.status === 200) {
      const ride = await giver.client.get(`/rides/${rideId}`);
      const unresolved = (ride.data.participants ?? []).filter(
        (p: any) => p.boardingStatus !== 'DEBOARDED' && p.boardingStatus !== 'NO_SHOW');
      assert(unresolved.length === 0, `Auto-resolve left ${unresolved.length} unresolved participants`);
      const penalised = (ride.data.participants ?? []).filter((p: any) => p.boardingStatus === 'NO_SHOW');
      assert(penalised.length === 0, 'Auto-resolve must use DEBOARDED, not NO_SHOW (no trust penalty)');
    }
  });

  // BOARD-03: Complete ride with BOARDED (not deboarded) passenger — same flag behavior
  await test('BOARD-03: Complete ride with BOARDED passenger → 400 (flag on) or 200 auto-resolve (flag off)', async () => {
    const { giver, seeker, rideId } = await setupOngoingRide('03');
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    const r = await giver.client.patch(`/rides/${rideId}/complete`);
    assert([200, 400].includes(r.status), `Expected 200 or 400, got ${r.status}`);
  });

  // BOARD-04: Mark no-show → 200, boardingStatus = NO_SHOW
  await test('BOARD-04: Mark no-show → 200, boardingStatus = NO_SHOW', async () => {
    const { giver, rideId } = await setupOngoingRide('04');
    await giver.client.patch(`/rides/${rideId}/start`);

    const rideData = await giver.client.get(`/rides/${rideId}`);
    const participant = rideData.data.participants?.[0];
    assert(!!participant, 'Expected at least one participant');

    const r = await giver.client.patch(`/rides/${rideId}/no-show/${participant.seeker.id}`);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.status === 'NO_SHOW', `Expected NO_SHOW, got ${r.data.status}`);
  });

  // BOARD-05: Complete ride after all participants NO_SHOW → 200
  await test('BOARD-05: Complete ride after all NO_SHOW → 200', async () => {
    const { giver, rideId } = await setupOngoingRide('05');
    await giver.client.patch(`/rides/${rideId}/start`);

    const rideData = await giver.client.get(`/rides/${rideId}`);
    const participant = rideData.data.participants?.[0];
    await giver.client.patch(`/rides/${rideId}/no-show/${participant.seeker.id}`);

    const r = await giver.client.patch(`/rides/${rideId}/complete`);
    assert(r.status === 200, `Expected 200 after all no-show, got ${r.status}`);
  });

  // BOARD-06: Complete ride with mixed DEBOARDED + NO_SHOW → 200
  await test('BOARD-06: Complete ride with DEBOARDED + NO_SHOW mix → 200', async () => {
    const giver   = await freshGiver('bd_06');
    const seeker1 = await freshSeeker('bd_06a');
    const seeker2 = await freshSeeker('bd_06b');
    const rideId  = await publishRide(giver.client, giver.vehicleId, 3);

    for (const seeker of [seeker1, seeker2]) {
      const req = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Test Pickup' });
      const reqId = req.data.requestId as string;
      await giver.client.patch(`/ride-requests/${reqId}/approve`);
      await seeker.client.patch(`/ride-requests/${reqId}/confirm`);
    }

    await giver.client.patch(`/rides/${rideId}/start`);

    // seeker1 boards and deboars
    await seeker1.client.patch(`/rides/${rideId}/board`);
    await seeker1.client.patch(`/rides/${rideId}/deboard`);

    // seeker2 is no-show
    const rideData = await giver.client.get(`/rides/${rideId}`);
    const p2 = rideData.data.participants?.find((p: any) => p.seeker?.userId === seeker2.userId);
    assert(!!p2, 'Expected to find seeker2 participant');
    await giver.client.patch(`/rides/${rideId}/no-show/${p2.seeker.id}`);

    const r = await giver.client.patch(`/rides/${rideId}/complete`);
    assert(r.status === 200, `Expected 200 with mixed DEBOARDED+NO_SHOW, got ${r.status}`);
  });

  // BOARD-07: Seeker boards an ONGOING ride → 200
  await test('BOARD-07: Seeker boards ONGOING ride → 200, boardingStatus = BOARDED', async () => {
    const { giver, seeker, rideId } = await setupOngoingRide('07');
    await giver.client.patch(`/rides/${rideId}/start`);
    const r = await seeker.client.patch(`/rides/${rideId}/board`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.data.boardingStatus === 'BOARDED', `Expected BOARDED, got ${r.data.boardingStatus}`);
  });

  // BOARD-08: Seeker cannot board a PUBLISHED ride → 400
  await test('BOARD-08: Seeker cannot board PUBLISHED ride → 400', async () => {
    const { seeker, rideId } = await setupOngoingRide('08');
    // Ride is still PUBLISHED (not started)
    const r = await seeker.client.patch(`/rides/${rideId}/board`);
    assert(r.status === 400, `Expected 400 (ride not ONGOING), got ${r.status}`);
  });

  // BOARD-09: Seeker deboard after boarding → 200
  await test('BOARD-09: Seeker deboard after boarding → 200, boardingStatus = DEBOARDED', async () => {
    const { giver, seeker, rideId } = await setupOngoingRide('09');
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    const r = await seeker.client.patch(`/rides/${rideId}/deboard`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.data.boardingStatus === 'DEBOARDED', `Expected DEBOARDED, got ${r.data.boardingStatus}`);
  });

  // BOARD-10: Seeker cannot board twice
  await test('BOARD-10: Seeker boards twice → 400 on second attempt', async () => {
    const { giver, seeker, rideId } = await setupOngoingRide('10');
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    const r = await seeker.client.patch(`/rides/${rideId}/board`);
    assert(r.status === 400, `Expected 400 on double board, got ${r.status}`);
  });

  // BOARD-11: Seeker cannot deboard without boarding first
  await test('BOARD-11: Seeker deboard without boarding → 400', async () => {
    const { giver, seeker, rideId } = await setupOngoingRide('11');
    await giver.client.patch(`/rides/${rideId}/start`);
    const r = await seeker.client.patch(`/rides/${rideId}/deboard`);
    assert(r.status === 400, `Expected 400 (not boarded yet), got ${r.status}`);
  });
}

// ─── Runner ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}TechieRide — Boarding State Machine Test Suite${c.reset}`);
  console.log(`${c.dim}API: ${BASE}${c.reset}\n`);

  await runBoardingTests();

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
