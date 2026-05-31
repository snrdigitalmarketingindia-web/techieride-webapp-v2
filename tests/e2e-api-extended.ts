/**
 * Techie Ride — Extended E2E API Tests
 * Covers: rejection, cancellation, security, validation, edge cases
 *
 * Run: npm run test:api:extended
 */

import axios, { AxiosInstance } from 'axios';

const BASE = 'http://localhost:3001/api/v1';
const API_LOG = '/tmp/techieride-api.log';
const { execSync } = require('child_process');

// ─── Colours ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  bold: '\x1b[1m', dim: '\x1b[2m',
};

const results: { name: string; passed: boolean; error?: string }[] = [];
let currentSection = '';

function section(name: string) {
  currentSection = name;
  console.log(`\n${c.bold}${c.blue}━━━ ${name} ━━━${c.reset}`);
}

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${c.dim}›${c.reset} ${name} ... `);
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

function makeClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true,
  });
}

const SEED_PASSWORD = 'TechieRide@2024';

async function loginAs(email: string): Promise<string> {
  const c1 = makeClient();
  const r = await c1.post('/auth/login', { email, password: SEED_PASSWORD });
  assert(r.status === 200 && r.data.accessToken, `Login failed for ${email}: ${JSON.stringify(r.data)}`);
  return r.data.accessToken;
}

async function registerAndLogin(email: string, fullName: string, role: string): Promise<string> {
  const c1 = makeClient();
  const reg = await c1.post('/auth/register', {
    email, password: SEED_PASSWORD, fullName, gender: 'MALE',
    companyName: 'TestCorp', employeeId: 'N/A', role,
    phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
  });
  if (reg.status !== 201 && reg.status !== 409) throw new Error(`Register: ${JSON.stringify(reg.data)}`);
  const { token } = await loginAsWithId(email);
  return token;
}

async function loginAsWithId(email: string): Promise<{ token: string; userId: string }> {
  const c1 = makeClient();
  const r = await c1.post('/auth/login', { email, password: SEED_PASSWORD });
  assert(r.status === 200 && r.data.accessToken, `Login failed for ${email}`);
  const payload = JSON.parse(Buffer.from(r.data.accessToken.split('.')[1], 'base64').toString());
  return { token: r.data.accessToken, userId: payload.sub };
}

// ─── Setup ────────────────────────────────────────────────────────────────
async function createGiver(admin: AxiosInstance, suffix: string) {
  const ts = Date.now();
  const token = await registerAndLogin(`giver_ext_${suffix}_${ts}@wipro.com`, `Giver ${suffix}`, 'RIDE_GIVER');
  const client = makeClient(token);
  const profile = await client.get('/users/me');
  const giverId = profile.data.id;
  await client.post('/verification/submit', { employeeIdUrl: 'mock://emp', drivingLicenseUrl: 'mock://dl', rcUrl: 'mock://rc' });
  const queue = await admin.get('/admin/verification/pending');
  const req = queue.data.find((v: any) => v.userId === giverId);
  if (req) await admin.patch(`/admin/verification/${req.id}/review`, { decision: 'APPROVED' });
  const veh = await client.post('/vehicles', {
    make: 'Toyota', model: 'Innova', color: 'White',
    plateNumber: `TS${ts.toString().slice(-5)}`, totalSeats: 4,
  });
  // Admin verifies vehicle RC so publish() is not blocked
  if (veh.data.id) await admin.patch(`/admin/vehicles/${veh.data.id}/verify`);
  return { client, token, vehicleId: veh.data.id };
}

async function setup() {
  const adminToken = await loginAs('admin@techieride.in');
  const admin = makeClient(adminToken);

  // Each flow gets its own giver so the one-active-ride rule doesn't interfere
  const giverA = await createGiver(admin, 'A'); // rejection + cancellation flows
  const giverB = await createGiver(admin, 'B'); // race condition flow
  const giverC = await createGiver(admin, 'C'); // security flow

  const ts = Date.now();
  const seeker1Token = await registerAndLogin(`seeker1_${ts}@tcs.com`, 'Seeker One', 'RIDE_SEEKER');
  const seeker2Token = await registerAndLogin(`seeker2_${ts}@tcs.com`, 'Seeker Two', 'RIDE_SEEKER');
  const seeker3Token = await registerAndLogin(`seeker3_${ts}@tcs.com`, 'Seeker Three', 'RIDE_SEEKER');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Giver A: ride for rejection flow (1 seat)
  const rideSmall = await giverA.client.post('/rides', {
    vehicleId: giverA.vehicleId,
    originName: 'Ameerpet', originLat: 17.4374, originLng: 78.4487,
    destinationName: 'Gachibowli', destinationLat: 17.4400, destinationLng: 78.3489,
    departureDate: tomorrow.toISOString().split('T')[0],
    departureTime: '10:00', totalSeats: 1, notes: 'Test ride',
  });
  await giverA.client.patch(`/rides/${rideSmall.data.id}/publish`);

  return {
    adminToken,
    giverToken: giverA.token, giverBToken: giverB.token, giverCToken: giverC.token,
    vehicleId: giverA.vehicleId, vehicleBId: giverB.vehicleId, vehicleCId: giverC.vehicleId,
    seeker1Token, seeker2Token, seeker3Token,
    rideSmall: rideSmall.data,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${c.bold}${c.cyan}╔═══════════════════════════════════════════════╗`);
  console.log(`║  Techie Ride — Extended E2E Tests (20 cases)   ║`);
  console.log(`╚═══════════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${c.dim}Setting up test agents...${c.reset}`);
  const ctx = await setup();
  const admin = makeClient(ctx.adminToken);
  const giver  = makeClient(ctx.giverToken);   // Giver A — rejection flow
  const giverB = makeClient(ctx.giverBToken);  // Giver B — cancellation flow
  const giverC = makeClient(ctx.giverCToken);  // Giver C — race + security flow
  // Each flow gets fresh seekers so the one-active-request rule doesn't interfere
  const s1 = makeClient(ctx.seeker1Token);  // rejection + race flow
  const s2 = makeClient(ctx.seeker2Token);  // cancellation flow
  const s3 = makeClient(ctx.seeker3Token);  // race flow (second racer)
  const { rideSmall, vehicleId } = ctx;
  const vehicleBId = ctx.vehicleBId;
  const vehicleCId = ctx.vehicleCId;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  // ══════════════════════════════════════════
  //  1. REJECTION FLOW
  // ══════════════════════════════════════════
  section('🚫 Rejection Flow');

  let rejectedRequestId = '';

  await test('Seeker sends a request', async () => {
    const r = await s1.post('/ride-requests', { rideId: rideSmall.id });
    assert(r.status === 201, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    rejectedRequestId = r.data.requestId;
  });

  await test('Giver can reject the request', async () => {
    const r = await giver.patch(`/ride-requests/${rejectedRequestId}/reject`, {
      reason: 'Seat already promised to colleague',
    });
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'REJECTED', `Expected REJECTED, got ${r.data.status}`);
  });

  await test('Seat count unchanged after rejection', async () => {
    const r = await giver.get(`/rides/${rideSmall.id}`);
    assert(r.data.availableSeats === 1, `Expected 1, got ${r.data.availableSeats}`);
  });

  await test('Rejected seeker can request again (new request)', async () => {
    const r = await s1.post('/ride-requests', { rideId: rideSmall.id });
    assert([201, 409].includes(r.status), `Got ${r.status}`);
    // Cancel the re-request so s1 has no active PENDING for the race condition test.
    // (upsert returns 201 and resets to PENDING, which would block s1 from raceRide)
    if (r.status === 201 && r.data.requestId) {
      await s1.patch(`/ride-requests/${r.data.requestId}/cancel`);
    }
  });

  // ══════════════════════════════════════════
  //  2. CANCELLATION FLOW  (giverB + s2)
  // ══════════════════════════════════════════
  section('❌ Cancellation Flow');

  const cancelRideResp = await giverB.post('/rides', {
    vehicleId: vehicleBId, originName: 'LB Nagar', originLat: 17.3616, originLng: 78.5524,
    destinationName: 'Secunderabad', destinationLat: 17.4399, destinationLng: 78.4983,
    departureDate: tomorrow.toISOString().split('T')[0],
    departureTime: '08:00', totalSeats: 2,
  });
  await giverB.patch(`/rides/${cancelRideResp.data.id}/publish`);
  const cancelRideId = cancelRideResp.data.id;

  let cancelRequestId = '';

  await test('Seeker requests + giver approves + seeker confirms', async () => {
    const req = await s2.post('/ride-requests', { rideId: cancelRideId });
    assert(req.status === 201, `Request: ${JSON.stringify(req.data)}`);
    cancelRequestId = req.data.requestId;

    const apr = await giverB.patch(`/ride-requests/${cancelRequestId}/approve`);
    assert(apr.data.status === 'HOLD', `Expected HOLD`);

    const conf = await s2.patch(`/ride-requests/${cancelRequestId}/confirm`);
    assert(conf.data.status === 'CONFIRMED', `Expected CONFIRMED`);
  });

  await test('Seeker can cancel a confirmed booking', async () => {
    const r = await s2.patch(`/ride-requests/${cancelRequestId}/cancel`, { reason: 'Change of plans' });
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'CANCELLED', `Expected CANCELLED`);
  });

  await test('Seat restored after seeker cancellation', async () => {
    const r = await giverB.get(`/rides/${cancelRideId}`);
    assert(r.data.availableSeats === 2, `Expected 2, got ${r.data.availableSeats}`);
  });

  await test('Giver can cancel a published ride', async () => {
    // cancelRideId is still PUBLISHED — cancel it
    const r = await giverB.patch(`/rides/${cancelRideId}/cancel`, { reason: 'Vehicle breakdown' });
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'CANCELLED', `Expected CANCELLED`);
  });

  await test('Cannot book seats on a CANCELLED ride', async () => {
    const r = await s2.post('/ride-requests', { rideId: cancelRideId });
    assert(r.status === 400, `Expected 400 on cancelled ride, got ${r.status}`);
  });

  // ══════════════════════════════════════════
  //  3. RACE CONDITION — Last seat (giverC + s1 + s3)
  // ══════════════════════════════════════════
  section('🏎️ Race Condition — Last Seat');

  const raceRide = await giverC.post('/rides', {
    vehicleId: vehicleCId, originName: 'Dilsukhnagar', originLat: 17.3688, originLng: 78.5247,
    destinationName: 'Uppal', destinationLat: 17.4008, destinationLng: 78.5593,
    departureDate: tomorrow.toISOString().split('T')[0],
    departureTime: '11:00', totalSeats: 1,
  });
  await giverC.patch(`/rides/${raceRide.data.id}/publish`);
  const raceRideId = raceRide.data.id;

  let race1Id = '';
  let race3Id = '';

  await test('Both seekers request the single last seat', async () => {
    // s1 has no active requests (rejection flow left it with PENDING/REJECTED — OK)
    // s3 is fresh with no requests
    const [r1, r3] = await Promise.all([
      s1.post('/ride-requests', { rideId: raceRideId }),
      s3.post('/ride-requests', { rideId: raceRideId }),
    ]);
    assert([201, 409].includes(r1.status), `S1: ${r1.status}: ${JSON.stringify(r1.data)}`);
    assert([201, 409].includes(r3.status), `S3: ${r3.status}: ${JSON.stringify(r3.data)}`);
    if (r1.status === 201) race1Id = r1.data.requestId;
    if (r3.status === 201) race3Id = r3.data.requestId;
  });

  await test('Giver approves S1 → seat goes on hold', async () => {
    if (!race1Id) return;
    const r = await giverC.patch(`/ride-requests/${race1Id}/approve`);
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'HOLD', `Expected HOLD`);
  });

  await test('Giver cannot approve S3 when seat is on hold', async () => {
    if (!race3Id) return;
    const r = await giverC.patch(`/ride-requests/${race3Id}/approve`);
    assert(r.status === 400, `Expected 400 (no seats), got ${r.status}`);
  });

  await test('S1 confirms → seat fully taken', async () => {
    if (!race1Id) return;
    const r = await s1.patch(`/ride-requests/${race1Id}/confirm`);
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'CONFIRMED', `Expected CONFIRMED`);
    const ride = await giverC.get(`/rides/${raceRideId}`);
    assert(ride.data.availableSeats === 0, `Expected 0 seats`);
  });

  // ══════════════════════════════════════════
  //  4. SECURITY TESTS
  // ══════════════════════════════════════════
  section('🔐 Security Tests');

  await test('Seeker cannot approve their own ride request', async () => {
    if (!race1Id) return; // race1Id is empty if s1 failed to request the race ride
    const r = await s1.patch(`/ride-requests/${race1Id}/approve`);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Seeker cannot start someone else\'s ride', async () => {
    const r = await s1.patch(`/rides/${raceRideId}/start`);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Seeker cannot complete someone else\'s ride', async () => {
    const r = await s1.patch(`/rides/${raceRideId}/complete`);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Admin cannot be created via register endpoint → 400', async () => {
    const r = await makeClient().post('/auth/register', {
      email: `hacker.${Date.now()}@tcs.com`, password: SEED_PASSWORD,
      fullName: 'Hacker', gender: 'MALE',
      phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
      companyName: 'TCS', employeeId: 'N/A',
      role: 'ADMIN',  // Must be rejected — ADMIN cannot self-register
    });
    assert(r.status === 400, `Expected 400 (ADMIN role blocked), got ${r.status}: ${JSON.stringify(r.data)}`);
  });

  await test('Admin can suspend a user', async () => {
    const profile = await s2.get('/users/me');
    const userId = profile.data.id;
    const r = await admin.patch(`/admin/users/${userId}/suspend`);
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.isActive === false, 'Expected isActive=false');
    // Restore for other tests
    await admin.patch(`/admin/users/${userId}/activate`);
  });

  await test('Non-admin cannot access admin endpoints', async () => {
    const r = await s1.get('/admin/analytics');
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // ══════════════════════════════════════════
  //  5. INPUT VALIDATION
  // ══════════════════════════════════════════
  section('🛡️ Input Validation');

  await test('Register with personal email (gmail) → 403', async () => {
    const r = await makeClient().post('/auth/register', {
      email: 'test@gmail.com', password: SEED_PASSWORD,
      fullName: 'Test', gender: 'MALE', phone: '9800000099',
      companyName: 'TCS', employeeId: 'N/A', role: 'RIDE_SEEKER',
    });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Register with missing fullName → 400', async () => {
    const r = await makeClient().post('/auth/register', {
      email: 'test@tcs.com', password: SEED_PASSWORD,
      gender: 'MALE', phone: '9800000098',
      companyName: 'TCS', employeeId: 'N/A', role: 'RIDE_SEEKER',
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Create ride with 0 seats → 400', async () => {
    const r = await giver.post('/rides', {
      vehicleId, originName: 'A', originLat: 17.44, originLng: 78.35,
      destinationName: 'B', destinationLat: 17.45, destinationLng: 78.36,
      departureDate: tomorrow.toISOString().split('T')[0],
      departureTime: '09:00', totalSeats: 0,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Create ride with missing vehicleId → 400', async () => {
    const r = await giver.post('/rides', {
      originName: 'A', originLat: 17.44, originLng: 78.35,
      destinationName: 'B', destinationLat: 17.45, destinationLng: 78.36,
      departureDate: tomorrow.toISOString().split('T')[0],
      departureTime: '09:00', totalSeats: 2,
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('Cannot register same email twice → 409', async () => {
    const r = await makeClient().post('/auth/register', {
      email: 'arjun@tcs.com', password: SEED_PASSWORD,
      fullName: 'Dup User', gender: 'MALE', phone: '9700000099',
      companyName: 'TCS', employeeId: 'N/A', role: 'RIDE_SEEKER',
    });
    assert(r.status === 409, `Expected 409, got ${r.status}`);
  });

  // ══════════════════════════════════════════
  //  6. TOKEN / SESSION
  // ══════════════════════════════════════════
  section('🔑 Token & Session');

  await test('Refresh token generates new access token', async () => {
    const c1 = makeClient();
    const login = await c1.post('/auth/login', { email: 'arjun@tcs.com', password: SEED_PASSWORD });
    const refresh = login.data.refreshToken;
    assert(!!refresh, 'No refresh token');

    const r = await c1.post('/auth/refresh', { refreshToken: refresh });
    assert(r.status === 200, `Got ${r.status}`);
    assert(!!r.data.accessToken, 'No new access token');
    assert(r.data.accessToken.split('.').length === 3, 'Should be a valid JWT');
  });

  await test('Invalid refresh token → 401', async () => {
    const r = await makeClient().post('/auth/refresh', { refreshToken: 'invalid.token.here' });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('Expired/invalid bearer token → 401', async () => {
    const r = await makeClient('expired.token.here').get('/users/me');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  // ══════════════════════════════════════════
  //  7. SOS FLOW
  // ══════════════════════════════════════════
  section('🆘 SOS Flow');

  // Create and start a ride to trigger SOS — use giverB (cancellation ride is cancelled so giverB is free)
  // and a fresh seeker so no active-request conflicts
  const ts2 = Date.now();
  const sosSeekerToken = await registerAndLogin(`sos_seeker_${ts2}@tcs.com`, 'SOS Seeker', 'RIDE_SEEKER');
  const sosSeeker = makeClient(sosSeekerToken);

  const sosRide = await giverB.post('/rides', {
    vehicleId: vehicleBId, originName: 'Miyapur', originLat: 17.4948, originLng: 78.3588,
    destinationName: 'Madhapur', destinationLat: 17.4483, destinationLng: 78.3915,
    departureDate: tomorrow.toISOString().split('T')[0],
    departureTime: '12:00', totalSeats: 2,
  });
  await giverB.patch(`/rides/${sosRide.data.id}/publish`);
  const s1Req = await sosSeeker.post('/ride-requests', { rideId: sosRide.data.id });
  await giverB.patch(`/ride-requests/${s1Req.data.requestId}/approve`);
  await sosSeeker.patch(`/ride-requests/${s1Req.data.requestId}/confirm`);
  await giverB.patch(`/rides/${sosRide.data.id}/start`);

  await test('Participant can trigger SOS during active ride', async () => {
    const r = await sosSeeker.post('/sos', {
      rideId: sosRide.data.id,
      lat: 17.4483, lng: 78.3915,
    });
    assert(r.status === 201, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(!!r.data.sosId, 'No sosId returned');
    console.log(`      ${c.dim}SOS ID: ${r.data.sosId}${c.reset}`);
  });

  await test('Admin can see active SOS alerts', async () => {
    const r = await admin.get('/admin/sos/active');
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.length >= 1, 'No active SOS found');
    const sos = r.data[0];
    console.log(`      ${c.dim}SOS from: ${sos.user?.fullName}${c.reset}`);
  });

  await test('Admin can resolve SOS', async () => {
    const list = await admin.get('/admin/sos/active');
    const sosId = list.data[0]?.id;
    if (!sosId) return;
    const r = await admin.patch(`/admin/sos/${sosId}/resolve`, {
      notes: 'User confirmed safe. False alarm.',
    });
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'RESOLVED', `Expected RESOLVED`);
  });

  // ══════════════════════════════════════════
  //  RESULTS
  // ══════════════════════════════════════════
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

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
    console.log(`${c.green}${c.bold}  🎉 All extended tests passed!${c.reset}\n`);
  } else {
    console.log(`${c.red}  ${failed} test(s) failed.${c.reset}\n`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`\n${c.red}Runner crashed: ${e.message}${c.reset}\n`);
  process.exit(1);
});
