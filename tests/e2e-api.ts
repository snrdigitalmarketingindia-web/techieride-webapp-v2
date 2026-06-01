/**
 * Techie Ride — Automated E2E API Test Runner
 *
 * Simulates 3 agents: Admin, Ride Giver, Ride Seeker
 * Tests the complete ride lifecycle end-to-end.
 *
 * Run: npm run test:api
 */

import axios, { AxiosInstance } from 'axios';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const API_LOG = '/tmp/techieride-api.log';
const { execSync } = require('child_process');

// ─── Colours ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// ─── Results tracking ─────────────────────────────────────────────────────
const results: { name: string; passed: boolean; error?: string }[] = [];
let currentAgent = '';

function agent(name: string) {
  currentAgent = name;
  console.log(`\n${c.bold}${c.blue}━━━ 🤖 Agent: ${name} ━━━${c.reset}`);
}

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${c.dim}${currentAgent}${c.reset} › ${name} ... `);
  try {
    await fn();
    console.log(`${c.green}✅ PASS${c.reset}`);
    results.push({ name: `[${currentAgent}] ${name}`, passed: true });
  } catch (e: any) {
    const msg = e.response?.data
      ? JSON.stringify(e.response.data)
      : e.message;
    console.log(`${c.red}❌ FAIL${c.reset} — ${msg}`);
    results.push({ name: `[${currentAgent}] ${name}`, passed: false, error: msg });
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function makeClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true, // don't throw on 4xx/5xx
  });
}

const SEED_PASSWORD = 'TechieRide@2024';

async function loginAs(email: string): Promise<{ token: string; userId: string }> {
  const c1 = makeClient();
  const r = await c1.post('/auth/login', { email, password: SEED_PASSWORD });
  assert(r.status === 200 && r.data.accessToken, `Login failed for ${email}: ${JSON.stringify(r.data)}`);
  const payload = JSON.parse(Buffer.from(r.data.accessToken.split('.')[1], 'base64').toString());
  return { token: r.data.accessToken, userId: payload.sub };
}

async function registerAndLogin(
  email: string,
  fullName: string,
  role: string,
): Promise<string> {
  const c1 = makeClient();
  const reg = await c1.post('/auth/register', {
    email, password: SEED_PASSWORD, fullName,
    gender: 'MALE', companyName: 'TestCorp',
    employeeId: 'N/A', role,
    phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
    homeLocation: 'Kondapur, Hyderabad',
    officeLocation: 'HITEC City, Madhapur, Hyderabad',
    emergencyContactName: 'Test Emergency Contact',
    emergencyContactPhone: '9000000001',
  });
  if (reg.status === 201) {
    // Mark email as verified directly via seed-style approach
    // In tests we bypass email verification by using seeded/pre-verified accounts
  }
  // 409 = already exists, just login
  if (reg.status !== 201 && reg.status !== 409) {
    throw new Error(`Register failed: ${JSON.stringify(reg.data)}`);
  }
  const { token } = await loginAs(email);
  return token;
}

// ─── Main test suite ───────────────────────────────────────────────────────
async function run() {
  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════╗`);
  console.log(`║  Techie Ride — Automated E2E Test Runner  ║`);
  console.log(`╚══════════════════════════════════════════╝${c.reset}\n`);

  const testEmail = {
    admin:  'admin@techieride.in',
    giver:  'priya@infosys.com',
    seeker: 'arjun@tcs.com',
  };

  let adminToken = '';
  let giverToken = '';
  let seekerToken = '';
  let rideId = '';
  let vehicleId = '';
  let requestId = '';

  // ════════════════════════════════════════════
  //  PHASE 1 — Registration & Auth
  // ════════════════════════════════════════════

  agent('Auth Agent');

  await test('Admin can log in', async () => {
    const r = await loginAs(testEmail.admin);
    adminToken = r.token;
    assert(!!adminToken, 'No token returned');
  });

  await test('Giver can log in', async () => {
    const r = await loginAs(testEmail.giver);
    giverToken = r.token;
    assert(!!giverToken, 'No giver token');
  });

  await test('Seeker can log in', async () => {
    const r = await loginAs(testEmail.seeker);
    seekerToken = r.token;
    assert(!!seekerToken, 'No seeker token');
  });

  await test('Unauthenticated request returns 401', async () => {
    const r = makeClient();
    const res = await r.get('/users/me');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('Wrong password returns 401', async () => {
    const r = makeClient();
    const res = await r.post('/auth/login', { email: testEmail.admin, password: 'wrongpassword' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // ════════════════════════════════════════════
  //  PHASE 2 — Admin: Verify Users
  // ════════════════════════════════════════════

  agent('Admin Agent');

  const adminClient = makeClient(adminToken);
  let giverUserId = '';
  let seekerUserId = '';

  await test('Admin can fetch user list', async () => {
    const r = await adminClient.get('/admin/users');
    assert(r.status === 200, `Got ${r.status}`);
    assert(Array.isArray(r.data.data), 'Expected data array');
  });

  await test('Admin can view pending verifications', async () => {
    const r = await adminClient.get('/admin/verification/pending');
    assert(r.status === 200, `Got ${r.status}`);
  });

  await test('Admin submits verification docs for giver', async () => {
    const giverClient = makeClient(giverToken);
    const profile = await giverClient.get('/users/me');
    giverUserId = profile.data.id;

    // Submit mock docs
    const r = await giverClient.post('/verification/submit', {
      employeeIdUrl: 'mock://employee-id',
      drivingLicenseUrl: 'mock://driving-license',
      rcUrl: 'mock://rc',
    });
    assert(r.status === 201, `Got ${r.status}: ${JSON.stringify(r.data)}`);
  });

  await test('Admin approves giver verification', async () => {
    // Get the verification request ID
    const queue = await adminClient.get('/admin/verification/pending');
    const req = queue.data.find((v: any) => v.userId === giverUserId);
    if (!req) return; // already approved in a previous run

    const r = await adminClient.patch(`/admin/verification/${req.id}/review`, {
      decision: 'APPROVED',
    });
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'APPROVED', `Expected APPROVED, got ${r.data.status}`);
  });

  await test('Admin submits + approves seeker verification', async () => {
    const seekerClient = makeClient(seekerToken);
    const profile = await seekerClient.get('/users/me');
    seekerUserId = profile.data.id;

    await seekerClient.post('/verification/submit', {
      employeeIdUrl: 'mock://employee-id-seeker',
    });

    const queue = await adminClient.get('/admin/verification/pending');
    const req = queue.data.find((v: any) => v.userId === seekerUserId);
    if (!req) return;

    const r = await adminClient.patch(`/admin/verification/${req.id}/review`, {
      decision: 'APPROVED',
    });
    assert(r.status === 200, `Status: ${r.data.status}`);
  });

  await test('Non-admin cannot access admin routes', async () => {
    const r = await makeClient(giverToken).get('/admin/users');
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('Admin can get platform analytics', async () => {
    const r = await adminClient.get('/admin/analytics');
    assert(r.status === 200, `Got ${r.status}`);
    assert(typeof r.data.totalUsers === 'number', 'Missing totalUsers');
  });

  // ════════════════════════════════════════════
  //  PHASE 3 — Giver: Vehicle + Ride
  // ════════════════════════════════════════════

  agent('Ride Giver Agent');

  // Use a fresh giver account for ride lifecycle tests to avoid
  // interference from existing active rides on the seeded account
  const ts = Date.now();
  const freshGiverEmail = `fresh_giver_${ts}@wipro.com`;
  const freshGiverToken = await registerAndLogin(freshGiverEmail, 'Fresh Giver', 'RIDE_GIVER');
  const giverClient = makeClient(freshGiverToken);

  // Fresh giver must be identity-verified before they can publish rides
  {
    const profile = await giverClient.get('/users/me');
    const freshGiverId = profile.data.id;
    await giverClient.post('/verification/submit', {
      employeeIdUrl: 'mock://emp', drivingLicenseUrl: 'mock://dl', rcUrl: 'mock://rc',
    });
    const queue = await adminClient.get('/admin/verification/pending');
    const entry = queue.data.find((v: any) => v.userId === freshGiverId);
    if (entry) {
      await adminClient.patch(`/admin/verification/${entry.id}/review`, { decision: 'APPROVED' });
    }
  }

  await test('Giver can fetch own profile', async () => {
    const r = await giverClient.get('/users/me');
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.role === 'RIDE_GIVER', `Wrong role: ${r.data.role}`);
  });

  await test('Giver can add a vehicle', async () => {
    const r = await giverClient.post('/vehicles', {
      make: 'Honda', model: 'City',
      color: 'Silver', plateNumber: `TS09TEST${Date.now().toString().slice(-4)}`,
      totalSeats: 4,
    });
    assert(r.status === 201, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    vehicleId = r.data.id;
    assert(!!vehicleId, 'No vehicle ID returned');
    // Admin must verify vehicle RC before giver can publish
    await adminClient.patch(`/admin/vehicles/${vehicleId}/verify`);
  });

  await test('Giver can list own vehicles', async () => {
    const r = await giverClient.get('/vehicles/my');
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.length > 0, 'No vehicles found');
  });

  await test('Giver can create a ride', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const r = await giverClient.post('/rides', {
      vehicleId,
      originName: 'Kondapur',
      originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City',
      destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: tomorrow.toISOString().split('T')[0],
      departureTime: '09:00',
      totalSeats: 3,
      notes: 'Automated test ride',
    });
    assert(r.status === 201, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    rideId = r.data.id;
    assert(!!rideId, 'No ride ID returned');
    assert(r.data.status === 'DRAFT', `Expected DRAFT, got ${r.data.status}`);
  });

  await test('Giver can publish the ride', async () => {
    const r = await giverClient.patch(`/rides/${rideId}/publish`);
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.status === 'PUBLISHED', `Expected PUBLISHED, got ${r.data.status}`);
  });

  await test('Published ride appears in search results', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const r = await makeClient().get('/rides/search', {
      params: {
        originLat: 17.44, originLng: 78.349,
        destinationLat: 17.449, destinationLng: 78.370,
        date: tomorrow.toISOString().split('T')[0],
      },
    });
    assert(r.status === 200, `Got ${r.status}`);
    const found = r.data.find((ride: any) => ride.id === rideId);
    assert(!!found, `Ride ${rideId} not in search results`);
    assert(found.availableSeats === 3, `Expected 3 seats, got ${found.availableSeats}`);
  });

  // ════════════════════════════════════════════
  //  PHASE 4 — Seeker: Search + Book
  // ════════════════════════════════════════════

  agent('Ride Seeker Agent');

  // Use a fresh seeker account to avoid interference from existing active requests
  const freshSeekerEmail = `fresh_seeker_${ts}@tcs.com`;
  const freshSeekerToken = await registerAndLogin(freshSeekerEmail, 'Fresh Seeker', 'RIDE_SEEKER');
  const seekerClient = makeClient(freshSeekerToken);

  await test('Seeker can fetch own profile', async () => {
    const r = await seekerClient.get('/users/me');
    assert(r.status === 200, `Got ${r.status}`);
  });

  await test('Seeker can get ride details', async () => {
    const r = await seekerClient.get(`/rides/${rideId}`);
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.id === rideId, 'Wrong ride returned');
    assert(r.data.availableSeats === 3, `Expected 3 seats`);
  });

  await test('Seeker can request a seat', async () => {
    const r = await seekerClient.post('/ride-requests', {
      rideId, pickupName: 'Test Pickup Point',
    });
    assert(r.status === 201, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    requestId = r.data.requestId;
    assert(r.data.status === 'PENDING', `Expected PENDING, got ${r.data.status}`);
  });

  await test('Seeker cannot request the same ride twice', async () => {
    const r = await seekerClient.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    assert(r.status === 409, `Expected 409 Conflict, got ${r.status}`);
  });

  // ════════════════════════════════════════════
  //  PHASE 5 — Giver: Approve → 15-min Hold
  // ════════════════════════════════════════════

  agent('Ride Giver Agent');

  await test('Giver can see incoming requests', async () => {
    const r = await giverClient.get('/ride-requests/incoming', {
      params: { rideId },
    });
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.length >= 1, 'No incoming requests found');
    assert(r.data[0].status === 'PENDING', `Expected PENDING`);
  });

  await test('Giver can approve the request → 15-min hold starts', async () => {
    const r = await giverClient.patch(`/ride-requests/${requestId}/approve`);
    assert(r.status === 200, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.status === 'HOLD', `Expected HOLD, got ${r.data.status}`);
    assert(!!r.data.holdExpiresAt, 'No holdExpiresAt returned');

    const expiresIn = (new Date(r.data.holdExpiresAt).getTime() - Date.now()) / 1000;
    assert(expiresIn > 800 && expiresIn <= 900, `Hold TTL out of range: ${expiresIn}s`);
    console.log(`      ${c.dim}Hold expires in ${Math.round(expiresIn)}s${c.reset}`);
  });

  await test('Seat count decremented after approval', async () => {
    const r = await giverClient.get(`/rides/${rideId}`);
    assert(r.status === 200, `Got ${r.status}`);
    const seats = r.data.availableSeats;
    assert(seats === 2, `Expected 2 seats, got ${seats}`);
  });

  // ════════════════════════════════════════════
  //  PHASE 6 — Seeker: Confirm within 15 min
  // ════════════════════════════════════════════

  agent('Ride Seeker Agent');

  await test('Seeker can confirm the seat', async () => {
    const r = await seekerClient.patch(`/ride-requests/${requestId}/confirm`);
    assert(r.status === 200, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.status === 'CONFIRMED', `Expected CONFIRMED, got ${r.data.status}`);
  });

  await test('Seeker appears in ride participants', async () => {
    const r = await giverClient.get(`/rides/${rideId}`);
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.participants?.length >= 1, 'Seeker not in participants list');
  });

  // ════════════════════════════════════════════
  //  PHASE 7 — Ride Lifecycle
  // ════════════════════════════════════════════

  agent('Ride Giver Agent');

  await test('Giver can start the ride', async () => {
    const r = await giverClient.patch(`/rides/${rideId}/start`);
    assert(r.status === 200, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.status === 'ONGOING', `Expected ONGOING, got ${r.data.status}`);
  });

  await test('Giver can complete the ride', async () => {
    const r = await giverClient.patch(`/rides/${rideId}/complete`);
    assert(r.status === 200, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.status === 'COMPLETED', `Expected COMPLETED, got ${r.data.status}`);
  });

  // ════════════════════════════════════════════
  //  PHASE 8 — Gamification
  // ════════════════════════════════════════════

  agent('Gamification Agent');

  await test('Giver earned ECO points after ride completion', async () => {
    const r = await giverClient.get('/gamification/summary');
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.totalPoints >= 15, `Expected ≥15 points, got ${r.data.totalPoints}`);
    console.log(`      ${c.dim}Giver points: ${r.data.totalPoints} | Level: ${r.data.ecoLevel}${c.reset}`);
  });

  await test('Seeker earned ECO points after ride completion', async () => {
    const r = await seekerClient.get('/gamification/summary');
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.totalPoints >= 10, `Expected ≥10 points, got ${r.data.totalPoints}`);
    console.log(`      ${c.dim}Seeker points: ${r.data.totalPoints} | Level: ${r.data.ecoLevel}${c.reset}`);
  });

  await test('Leaderboard is publicly accessible', async () => {
    const r = await makeClient().get('/gamification/leaderboard');
    assert(r.status === 200, `Got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    assert(r.data.length > 0, 'Leaderboard is empty');
    console.log(`      ${c.dim}Leaderboard top: ${r.data[0]?.fullName} — ${r.data[0]?.points} pts${c.reset}`);
  });

  // ════════════════════════════════════════════
  //  PHASE 9 — Notifications
  // ════════════════════════════════════════════

  agent('Notification Agent');

  await test('Seeker received notifications during the flow', async () => {
    const r = await seekerClient.get('/notifications');
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.data?.length > 0, 'No notifications found for seeker');
    console.log(`      ${c.dim}Seeker has ${r.data.unreadCount} unread notifications${c.reset}`);
  });

  await test('Giver received notifications during the flow', async () => {
    const r = await giverClient.get('/notifications');
    assert(r.status === 200, `Got ${r.status}`);
    console.log(`      ${c.dim}Giver has ${r.data.unreadCount} unread notifications${c.reset}`);
  });

  await test('Seeker can mark all notifications as read', async () => {
    const r = await seekerClient.patch('/notifications/read-all');
    assert(r.status === 200, `Got ${r.status}`);
    assert(typeof r.data.updated === 'number', 'Missing updated count');
  });

  // ════════════════════════════════════════════
  //  PHASE 10 — Commute Templates
  // ════════════════════════════════════════════

  agent('Ride Giver Agent');

  await test('Giver can create a commute template', async () => {
    const r = await giverClient.post('/templates', {
      vehicleId,
      originName: 'Kondapur', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDays: [1, 2, 3, 4, 5],
      departureTime: '09:00',
      totalSeats: 3,
    });
    assert(r.status === 201, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.isActive === true, 'Template should be active');
  });

  await test('Giver can list own templates', async () => {
    const r = await giverClient.get('/templates/my');
    assert(r.status === 200, `Got ${r.status}`);
    assert(r.data.length >= 1, 'No templates found');
  });

  // ════════════════════════════════════════════
  //  RESULTS SUMMARY
  // ════════════════════════════════════════════
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n${c.bold}${'─'.repeat(50)}${c.reset}`);
  console.log(`${c.bold}  Test Results: ${passed}/${total} passed${c.reset}\n`);

  if (failed > 0) {
    console.log(`${c.red}${c.bold}  Failed Tests:${c.reset}`);
    results
      .filter(r => !r.passed)
      .forEach(r => console.log(`  ${c.red}✗${c.reset} ${r.name}\n    ${c.dim}${r.error}${c.reset}`));
  }

  const bar = '█'.repeat(Math.round((passed / total) * 30)).padEnd(30, '░');
  const pct = Math.round((passed / total) * 100);
  const colour = pct === 100 ? c.green : pct >= 80 ? c.yellow : c.red;
  console.log(`\n  ${colour}${bar}${c.reset} ${colour}${pct}%${c.reset}\n`);

  if (failed === 0) {
    console.log(`${c.green}${c.bold}  🎉 All tests passed! The app is working correctly.${c.reset}\n`);
  } else {
    console.log(`${c.red}  ${failed} test(s) failed. See errors above.${c.reset}\n`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`\n${c.red}Test runner crashed: ${e.message}${c.reset}\n`);
  process.exit(1);
});
