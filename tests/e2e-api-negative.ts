/**
 * Techie Ride — Negative / Boundary API Tests
 *
 * Tests every "should fail" path in the service layer:
 * wrong roles, invalid states, duplicate actions, expired holds,
 * suspended users, not-found resources.
 *
 * Run: npm run test:api:negative
 * Requires: API server running on localhost:3001
 */

import axios, { AxiosInstance } from 'axios';
import { execSync } from 'child_process';

const BASE    = 'http://localhost:3001/api/v1';
const API_LOG = '/tmp/techieride-api.log';

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  bold: '\x1b[1m', dim: '\x1b[2m',
};

// ─── Runner ────────────────────────────────────────────────────────────────
const results: { name: string; passed: boolean; error: string }[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true, error: '' });
    console.log(`  ${c.green}✅ PASS${c.reset}  ${c.dim}${name}${c.reset}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message });
    console.log(`  ${c.red}❌ FAIL${c.reset}  ${name}\n       ${c.dim}${e.message}${c.reset}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────
function makeClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    validateStatus: () => true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

const SEED_PASSWORD = 'TechieRide@2024';

async function loginAs(email: string) {
  const c = makeClient();
  const r = await c.post('/auth/login', { email, password: SEED_PASSWORD });
  assert(r.status === 200 && r.data.accessToken, `Login failed for ${email}: ${JSON.stringify(r.data)}`);
  const payload = JSON.parse(Buffer.from(r.data.accessToken.split('.')[1], 'base64').toString());
  return { token: r.data.accessToken, refreshToken: r.data.refreshToken, userId: payload.sub };
}

async function registerAndLogin(email: string, role: 'RIDE_GIVER' | 'RIDE_SEEKER') {
  const c = makeClient();
  const phone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
  await c.post('/auth/register', {
    email, password: SEED_PASSWORD,
    fullName: `Test ${role}`, phone,
    gender: 'MALE', companyName: 'TestCo', employeeId: 'N/A', role,
  });
  return loginAs(email);
}

// ─── Seed emails ──────────────────────────────────────────────────────────
const ADMIN  = 'admin@techieride.in';
const GIVER  = 'priya@infosys.com';   // seeded, verified, has vehicle
const SEEKER = 'arjun@tcs.com';       // seeded, verified

// ─── Main ─────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${c.bold}${c.blue}━━━ 🚫 Negative / Boundary API Tests ━━━${c.reset}\n`);

  const admin  = await loginAs(ADMIN).then(s => makeClient(s.token));
  const giver  = await loginAs(GIVER).then(s => makeClient(s.token));
  const seeker = await loginAs(SEEKER).then(s => makeClient(s.token));

  // ── Role boundary: wrong role attempts ───────────────────────────────────
  console.log(`\n${c.bold}${c.cyan}━━━ 🚧 Role Boundaries ━━━${c.reset}`);

  await test('Seeker cannot create a ride → 403', async () => {
    const r = await seeker.post('/rides', {
      vehicleId: '00000000-0000-0000-0000-000000000000',
      originName: 'A', destinationName: 'B',
      originLat: 17.4, originLng: 78.3, destinationLat: 17.5, destinationLng: 78.4,
      departureDate: new Date().toISOString().split('T')[0],
      departureTime: '09:00', totalSeats: 2,
    });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Seeker cannot add a vehicle → 403', async () => {
    const r = await seeker.post('/vehicles', {
      make: 'Honda', model: 'City', color: 'Black',
      plateNumber: 'TS01ZZ9999', totalSeats: 4,
    });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // Get giver's vehicle for subsequent tests
  const vehiclesRes = await giver.get('/vehicles/my');
  const vehicleId   = vehiclesRes.data[0]?.id;
  assert(vehicleId, 'Giver has no vehicle — seed data missing');

  await test('Giver cannot request a seat on a ride → 403', async () => {
    // First create and publish a ride to have something to request
    const ride = await giver.post('/rides', {
      vehicleId, originName: 'Kondapur', destinationName: 'HITEC',
      originLat: 17.44, originLng: 78.35, destinationLat: 17.45, destinationLng: 78.37,
      departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      departureTime: '09:00', totalSeats: 2,
    });
    await giver.patch(`/rides/${ride.data.id}/publish`);
    const r = await giver.post('/ride-requests', { rideId: ride.data.id });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Seeker cannot approve a ride request → 403', async () => {
    const r = await seeker.patch('/ride-requests/00000000-0000-0000-0000-000000000000/approve');
    assert(r.status === 403 || r.status === 404, `Expected 403/404, got ${r.status}`);
  });

  await test('Seeker cannot start a ride → 403', async () => {
    const r = await seeker.patch('/rides/00000000-0000-0000-0000-000000000000/start');
    assert(r.status === 403 || r.status === 404, `Expected 403/404, got ${r.status}`);
  });

  await test('Seeker cannot complete a ride → 403', async () => {
    const r = await seeker.patch('/rides/00000000-0000-0000-0000-000000000000/complete');
    assert(r.status === 403 || r.status === 404, `Expected 403/404, got ${r.status}`);
  });

  await test('Non-admin cannot suspend a user → 403', async () => {
    const users = await admin.get('/admin/users');
    const targetId = users.data[0]?.id;
    const r = await giver.patch(`/admin/users/${targetId}/suspend`);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // ── Invalid state transitions ─────────────────────────────────────────────
  console.log(`\n${c.bold}${c.cyan}━━━ ⚙️  Invalid State Transitions ━━━${c.reset}`);

  // Create a DRAFT ride for state transition tests
  const draftRideRes = await giver.post('/rides', {
    vehicleId, originName: 'Gachibowli', destinationName: 'Madhapur',
    originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.38,
    departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    departureTime: '10:00', totalSeats: 3,
  });
  const draftRideId = draftRideRes.data.id;
  assert(draftRideId, 'Could not create draft ride for state tests');

  await test('Cannot start a DRAFT ride (not yet published) → 400', async () => {
    const r = await giver.patch(`/rides/${draftRideId}/start`);
    assert(r.status === 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.data)}`);
  });

  await test('Cannot complete a DRAFT ride → 400', async () => {
    const r = await giver.patch(`/rides/${draftRideId}/complete`);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // Publish it
  await giver.patch(`/rides/${draftRideId}/publish`);

  await test('Cannot publish an already-PUBLISHED ride → 400', async () => {
    const r = await giver.patch(`/rides/${draftRideId}/publish`);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Cannot complete a PUBLISHED ride (not started) → 400', async () => {
    const r = await giver.patch(`/rides/${draftRideId}/complete`);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // Create an ONGOING ride for further state tests
  const ongoingRideRes = await giver.post('/rides', {
    vehicleId, originName: 'Kukatpally', destinationName: 'Ameerpet',
    originLat: 17.49, originLng: 78.39, destinationLat: 17.44, destinationLng: 78.44,
    departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    departureTime: '11:00', totalSeats: 2,
  });
  const ongoingRideId = ongoingRideRes.data.id;
  await giver.patch(`/rides/${ongoingRideId}/publish`);
  await giver.patch(`/rides/${ongoingRideId}/start`);

  await test('Cannot publish an ONGOING ride → 400', async () => {
    const r = await giver.patch(`/rides/${ongoingRideId}/publish`);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Cannot start an already-ONGOING ride → 400', async () => {
    const r = await giver.patch(`/rides/${ongoingRideId}/start`);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // ── Request state tests ───────────────────────────────────────────────────
  console.log(`\n${c.bold}${c.cyan}━━━ 📋 Request State Boundaries ━━━${c.reset}`);

  // Create a ride with 1 seat for boundary tests
  const singleSeatRideRes = await giver.post('/rides', {
    vehicleId, originName: 'LB Nagar', destinationName: 'Secunderabad',
    originLat: 17.35, originLng: 78.55, destinationLat: 17.44, destinationLng: 78.50,
    departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    departureTime: '08:00', totalSeats: 1,
  });
  const singleSeatId = singleSeatRideRes.data.id;
  await giver.patch(`/rides/${singleSeatId}/publish`);

  // Seeker requests
  const reqRes = await seeker.post('/ride-requests', { rideId: singleSeatId });
  const requestId = reqRes.data.requestId ?? reqRes.data.id;
  assert(requestId, `Could not create request for state tests: ${JSON.stringify(reqRes.data)}`);

  // Approve (puts in HOLD)
  await giver.patch(`/ride-requests/${requestId}/approve`);

  await test('Cannot confirm a non-existent / wrong request → 404', async () => {
    const r = await seeker.patch('/ride-requests/00000000-0000-0000-0000-000000000000/confirm');
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });

  await test('Cannot cancel a HOLD request with wrong seeker → 403/404', async () => {
    // Register a 3rd seeker who has nothing to do with this request
    const stranger = await registerAndLogin(`stranger.${Date.now()}@tcs.com`, 'RIDE_SEEKER').then(s => makeClient(s.token));
    const r = await stranger.patch(`/ride-requests/${requestId}/cancel`);
    assert(r.status === 403 || r.status === 404, `Expected 403/404, got ${r.status}`);
  });

  // Confirm to fill the seat
  await seeker.patch(`/ride-requests/${requestId}/confirm`);

  await test('Cannot book a seat on a ride with 0 available seats → 400', async () => {
    const seeker2 = await registerAndLogin(`seeker2.${Date.now()}@tcs.com`, 'RIDE_SEEKER').then(s => makeClient(s.token));
    const r = await seeker2.post('/ride-requests', { rideId: singleSeatId });
    assert(r.status === 400, `Expected 400 (no seats), got ${r.status}`);
  });

  // First cancel succeeds (CONFIRMED → CANCELLED is allowed so seeker can exit)
  await seeker.patch(`/ride-requests/${requestId}/cancel`);

  await test('Cannot cancel an already-CANCELLED request → 400', async () => {
    const r = await seeker.patch(`/ride-requests/${requestId}/cancel`);
    assert(r.status === 400, `Expected 400 (already cancelled), got ${r.status}`);
  });

  // ── Not Found ──────────────────────────────────────────────────────────────
  console.log(`\n${c.bold}${c.cyan}━━━ 🔍 Not Found ━━━${c.reset}`);

  await test('GET ride with invalid UUID → 404', async () => {
    const r = await seeker.get('/rides/00000000-0000-0000-0000-000000000000');
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });

  await test('PATCH non-existent ride publish → 404', async () => {
    const r = await giver.patch('/rides/00000000-0000-0000-0000-000000000000/publish');
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });

  await test('Approve non-existent request → 404', async () => {
    const r = await giver.patch('/ride-requests/00000000-0000-0000-0000-000000000000/approve');
    assert(r.status === 404, `Expected 404, got ${r.status}`);
  });

  // ── Suspended user ────────────────────────────────────────────────────────
  console.log(`\n${c.bold}${c.cyan}━━━ 🔒 Suspended User ━━━${c.reset}`);

  const suspendTarget = await registerAndLogin(`suspend.${Date.now()}@tcs.com`, 'RIDE_SEEKER');
  const suspendClient = makeClient(suspendTarget.token);

  // Verify they can call APIs before suspension
  await test('Unsuspended user can access their profile', async () => {
    const r = await suspendClient.get('/users/me');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
  });

  // Admin suspends
  await admin.patch(`/admin/users/${suspendTarget.userId}/suspend`);

  await test('Suspended user is blocked immediately on any API call → 401', async () => {
    // API checks isActive on every request — suspended users are blocked right away
    const r = await suspendClient.get('/users/me');
    assert(r.status === 401, `Expected 401 (suspended), got ${r.status}`);
  });

  await test('Suspended user cannot get a new access token via refresh → 401', async () => {
    const c = makeClient();
    const r = await c.post('/auth/refresh', { refreshToken: suspendTarget.refreshToken });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  // Re-activate
  await admin.patch(`/admin/users/${suspendTarget.userId}/activate`);

  await test('Re-activated user can refresh token again', async () => {
    const c = makeClient();
    const r = await c.post('/auth/refresh', { refreshToken: suspendTarget.refreshToken });
    assert(r.status === 200 && r.data.accessToken, `Expected 200 with token, got ${r.status}`);
  });

  // ── Input validation ──────────────────────────────────────────────────────
  console.log(`\n${c.bold}${c.cyan}━━━ 🧪 Input Validation ━━━${c.reset}`);

  await test('Request ride with missing rideId → 400', async () => {
    const r = await seeker.post('/ride-requests', {});
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Create ride with totalSeats = 0 → 400', async () => {
    const r = await giver.post('/rides', {
      vehicleId, originName: 'A', destinationName: 'B',
      originLat: 17.4, originLng: 78.3, destinationLat: 17.5, destinationLng: 78.4,
      departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      departureTime: '09:00', totalSeats: 0,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Create ride with negative totalSeats → 400', async () => {
    const r = await giver.post('/rides', {
      vehicleId, originName: 'A', destinationName: 'B',
      originLat: 17.4, originLng: 78.3, destinationLat: 17.5, destinationLng: 78.4,
      departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      departureTime: '09:00', totalSeats: -1,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Register with phone number < 10 digits → 400', async () => {
    const r = await makeClient().post('/auth/register', {
      phone: '12345', fullName: 'Bad User', email: 'bad@test.com',
      gender: 'MALE', companyName: 'X', employeeId: 'X-1', role: 'RIDE_SEEKER',
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Register with missing fullName → 400', async () => {
    const r = await makeClient().post('/auth/register', {
      phone: '9700000099', email: 'nofull@test.com',
      gender: 'MALE', companyName: 'X', employeeId: 'X-2', role: 'RIDE_SEEKER',
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('SOS trigger without auth → 401', async () => {
    const r = await makeClient().post('/sos', { lat: 17.4, lng: 78.3 });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  // ── Results ───────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total  = results.length;

  console.log(`\n${c.bold}${'─'.repeat(52)}${c.reset}`);
  console.log(`${c.bold}  Results: ${passed}/${total} passed${c.reset}\n`);

  if (failed > 0) {
    console.log(`${c.red}${c.bold}  Failed:${c.reset}`);
    results.filter(r => !r.passed).forEach(r =>
      console.log(`  ${c.red}✗${c.reset} ${r.name}\n    ${c.dim}${r.error}${c.reset}`)
    );
  }

  const bar = '█'.repeat(Math.round((passed / total) * 30)).padEnd(30, '░');
  const pct = Math.round((passed / total) * 100);
  const colour = pct === 100 ? c.green : pct >= 80 ? c.yellow : c.red;
  console.log(`\n  ${colour}${bar}${c.reset} ${colour}${pct}%${c.reset}\n`);

  if (failed === 0) {
    console.log(`${c.green}${c.bold}  🎉 All negative tests passed!${c.reset}\n`);
  } else {
    console.log(`${c.red}  ${failed} test(s) failed.${c.reset}\n`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`\n${c.red}Runner crashed: ${e.message}${c.reset}\n`);
  process.exit(1);
});
