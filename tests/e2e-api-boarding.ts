/**
 * e2e-api-boarding.ts — Boarding state machine tests
 *
 * Covers: start, board, deboard, no-show, complete
 * with boarding gate enforcement.
 *
 * BOARD-01  Giver can start ride (manual override even with WAITING passengers)
 * BOARD-02  Complete ride with WAITING passenger → 400
 * BOARD-03  Complete ride with BOARDED (not yet deboarded) passenger → 400
 * BOARD-04  Mark no-show → 200, boardingStatus = NO_SHOW
 * BOARD-05  Complete ride after all NO_SHOW → 200
 * BOARD-06  Complete ride after some DEBOARDED + some NO_SHOW → 200
 * BOARD-07  Seeker boards an ONGOING ride → 200, boardingStatus = BOARDED
 * BOARD-08  Seeker cannot board a PUBLISHED ride → 400
 */

import {
  BASE,
  test,
  section,
  assert,
  makeClient,
  freshGiver,
  freshSeeker,
  publishRide,
} from './helpers';

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

export async function runBoardingTests() {
  section('BOARD — Boarding State Machine');

  // BOARD-01: Giver can manually start even with WAITING passengers
  await test('BOARD-01: Giver starts ride with WAITING passenger → 200 (manual override)', async () => {
    const { giver, rideId } = await setupOngoingRide('01');
    const r = await giver.client.patch(`/rides/${rideId}/start`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    const ride = await giver.client.get(`/rides/${rideId}`);
    assert(ride.data.status === 'ONGOING', `Expected ONGOING, got ${ride.data.status}`);
  });

  // BOARD-02: Complete ride with WAITING passenger → 400
  await test('BOARD-02: Complete ride with WAITING passenger → 400', async () => {
    const { giver, rideId } = await setupOngoingRide('02');
    await giver.client.patch(`/rides/${rideId}/start`);
    const r = await giver.client.patch(`/rides/${rideId}/complete`);
    assert(r.status === 400, `Expected 400 (passenger still WAITING), got ${r.status}`);
    assert(
      JSON.stringify(r.data).toLowerCase().includes('no-show') ||
      JSON.stringify(r.data).toLowerCase().includes('deboard') ||
      JSON.stringify(r.data).toLowerCase().includes('passenger'),
      `Expected boarding-gate error message, got: ${JSON.stringify(r.data)}`
    );
  });

  // BOARD-03: Complete ride with BOARDED (not deboarded) passenger → 400
  await test('BOARD-03: Complete ride with BOARDED passenger → 400', async () => {
    const { giver, seeker, rideId } = await setupOngoingRide('03');
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    const r = await giver.client.patch(`/rides/${rideId}/complete`);
    assert(r.status === 400, `Expected 400 (passenger still BOARDED), got ${r.status}`);
  });

  // BOARD-04: Mark no-show → 200, boardingStatus = NO_SHOW
  await test('BOARD-04: Mark no-show → 200, boardingStatus = NO_SHOW', async () => {
    const { giver, seeker, rideId } = await setupOngoingRide('04');
    await giver.client.patch(`/rides/${rideId}/start`);

    // Get seeker's RideSeeker profile id from participants
    const rideData = await giver.client.get(`/rides/${rideId}`);
    const participant = rideData.data.participants?.[0];
    assert(participant, 'Expected at least one participant');

    const r = await giver.client.patch(`/rides/${rideId}/no-show/${participant.seeker.id}`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
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

  // BOARD-08: Seeker cannot board a PUBLISHED ride
  await test('BOARD-08: Seeker cannot board PUBLISHED ride → 400', async () => {
    const { seeker, rideId } = await setupOngoingRide('08');
    // Ride is still PUBLISHED (not started)
    const r = await seeker.client.patch(`/rides/${rideId}/board`);
    assert(r.status === 400, `Expected 400 (ride not ONGOING), got ${r.status}`);
  });

  // BOARD-09: Seeker deboard → 200, boardingStatus = DEBOARDED
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

// ── Runner ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🧪 TechieRide API — Boarding Tests\n${'─'.repeat(50)}`);
  console.log(`API: ${BASE}\n`);
  await runBoardingTests();
})();
