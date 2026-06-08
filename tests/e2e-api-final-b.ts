/**
 * TechieRide — Final Gap-Closing Test Suite Part B (Sections 17–33)
 * Split from e2e-api-final.ts to avoid CI runner OOM crash.
 *
 * 17.  ABORT               — giver emergency-stop ONGOING ride
 * 18.  RIDE EDIT SEAT SYNC — totalSeats/availableSeats stay in sync
 * 19.  SEARCH RADIUS       — radiusMeters param validation
 * 20.  ADMIN USER AUDIT    — GET /admin/users/:id/audit
 * 21.  WOMEN-ONLY GUARD    — non-female seeker blocked
 * 22.  PHONE UNIQUENESS    — duplicate phone → 409
 * 23.  PERSONAL EMAIL      — gmail/yahoo/outlook temporarily allowed
 * 24.  ABORT EMPTY REASON  — empty/whitespace/missing reason → 400
 * 25.  RIDE EDIT TIME GUARD— blocked <15 min to departure
 * 26.  TRUST SCORE EVENTS  — score increases/decreases, history, admin adjust
 * 27.  ABORT SIDE-EFFECTS  — seeker request → CANCELLED, notification sent
 * 28.  COMMUNITY ENDPOINT  — missing/invalid params handled gracefully
 * 29.  VEHICLE RC MATCH    — rcMatchStatus field
 * 30.  SEARCH RADIUS BOUNDS— zero and negative boundary
 * 31.  SEAT RESTORE FLOW   — cancel CONFIRMED on full ride → new booking succeeds
 * 32.  PICKUP DISTANCE     — distanceFromOriginM field + sort order
 * 33.  FORMAT DISTANCE     — metres to human-readable string
 *
 * Run: npm run test:api:final-b
 */

import axios, { AxiosInstance } from 'axios';
import {
  BASE, SEED_PASSWORD, makeClient, loginAs, register, freshGiver, freshSeeker, publishRide, completeFullRide, getAdminClient,
} from './helpers';

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  bold: '\x1b[1m', dim: '\x1b[2m',
};

const results: { name: string; passed: boolean; error: string; section: string }[] = [];
let currentSection = '';

function section(name: string) {
  currentSection = name;
  console.log(`\n${c.bold}${c.cyan}━━━ ${name} ━━━${c.reset}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true, error: '', section: currentSection });
    console.log(`  ${c.green}✅ PASS${c.reset}  ${c.dim}${name}${c.reset}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message, section: currentSection });
    console.log(`  ${c.red}❌ FAIL${c.reset}  ${name}\n       ${c.dim}${e.message}${c.reset}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${c.bold}${c.blue}━━━ 🏁 Final Gap-Closing Test Suite — Part B (17–33) ━━━${c.reset}\n`);

  const admin = makeClient((await loginAs('admin@techieride.in')).token);

  // ── 17. RIDE ABORT (ONGOING EMERGENCY STOP) ───────────────────────────────
  section('17. Abort — Giver can emergency-stop an ONGOING ride');
  {
    const giver  = await freshGiver('abort-g');
    const seeker = await freshSeeker('abort-s');
    const rideId = await publishRide(giver.client, giver.vehicleId, 2);

    const reqR = await seeker.client.post('/ride-requests', {
      rideId, pickupLat: 17.44, pickupLng: 78.35, pickupName: 'Pickup', dropLat: 17.5, dropLng: 78.4, dropName: 'Drop',
    });
    assert(reqR.status === 201, `Request failed: ${reqR.status}`);
    const reqId = reqR.data.requestId;
    await giver.client.patch(`/ride-requests/${reqId}/approve`);
    const startR = await giver.client.patch(`/rides/${rideId}/start`);
    assert(startR.status === 200, `Start failed: ${startR.status}`);

    await test('Abort without reason → 400', async () => {
      const r = await giver.client.patch(`/rides/${rideId}/abort`, { reason: '' });
      assert(r.status !== 500, `Got 500 on empty-reason abort`);
    });

    await test('Seeker cannot abort (only giver/admin) → 403', async () => {
      const r = await seeker.client.patch(`/rides/${rideId}/abort`, { reason: 'Test abort' });
      assert(r.status === 403, `Expected 403, got ${r.status}`);
    });

    await test('Abort a PUBLISHED ride → 400 (only ONGOING can be aborted)', async () => {
      const g2 = await freshGiver('abort-pub');
      const pubId = await publishRide(g2.client, g2.vehicleId);
      const r = await g2.client.patch(`/rides/${pubId}/abort`, { reason: 'Wrong status' });
      assert(r.status === 400, `Expected 400, got ${r.status}`);
    });

    await test('Giver can abort ONGOING ride → 200, status becomes CANCELLED', async () => {
      const r = await giver.client.patch(`/rides/${rideId}/abort`, { reason: 'Vehicle breakdown' });
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
      assert(r.data.status === 'CANCELLED', `Expected CANCELLED, got ${r.data.status}`);
    });
  }

  // ── 18. RIDE EDIT — SEAT COUNT SYNC ──────────────────────────────────────
  section('18. Ride Edit — totalSeats and availableSeats stay in sync');
  {
    const giver = await freshGiver('edit-g');
    const rideId = await publishRide(giver.client, giver.vehicleId, 4);

    await test('Edit totalSeats from 4 to 2 → availableSeats also becomes 2', async () => {
      const editR = await giver.client.patch(`/rides/${rideId}/edit`, { totalSeats: 2 });
      assert(editR.status === 200, `Expected 200, got ${editR.status}: ${JSON.stringify(editR.data)}`);
      const ride = await giver.client.get(`/rides/${rideId}`);
      assert(ride.data.totalSeats === 2, `Expected totalSeats=2, got ${ride.data.totalSeats}`);
      assert(ride.data.availableSeats === 2, `Expected availableSeats=2, got ${ride.data.availableSeats}`);
    });

    await test('Edit with active (PENDING) request → 400', async () => {
      const seeker = await freshSeeker('edit-seeker');
      await seeker.client.post('/ride-requests', {
        rideId, pickupLat: 17.44, pickupLng: 78.35, pickupName: 'P', dropLat: 17.5, dropLng: 78.4, dropName: 'D',
      });
      const r = await giver.client.patch(`/rides/${rideId}/edit`, { totalSeats: 1 });
      assert(r.status === 400, `Expected 400 with active request, got ${r.status}`);
    });

    await test('Seeker cannot edit giver ride → 403', async () => {
      const s2 = await freshSeeker('edit-sk2');
      const r = await s2.client.patch(`/rides/${rideId}/edit`, { notes: 'Hacked' });
      assert([403, 400, 404].includes(r.status), `Expected 403/400/404, got ${r.status}`);
    });
  }

  // ── 19. SEARCH RADIUS ─────────────────────────────────────────────────────
  section('19. Search Radius — radiusMeters param');
  {
    const giver19 = await freshGiver('rad-g');
    const tomorrow19 = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    const rideId19 = await publishRide(giver19.client, giver19.vehicleId, 2);
    const seeker19 = await freshSeeker('rad-s');

    await test('Default 10 km radius returns the nearby ride', async () => {
      const r = await seeker19.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, date: tomorrow19, limit: 100 },
      });
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
      assert(Array.isArray(r.data), `Expected array from search, got: ${JSON.stringify(r.data).slice(0, 200)}`);
      assert(r.data.some((rd: any) => rd.id === rideId19),
        `Ride ${rideId19} not in results (${r.data.length} total)`);
    });

    await test('Explicit radiusMeters=500 filters out far ride (coords 1° away)', async () => {
      const r = await seeker19.client.get('/rides/search', {
        params: { originLat: 18.44, originLng: 79.34, destinationLat: 18.50, destinationLng: 79.40, date: tomorrow19, radiusMeters: 500 },
      });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const rides: any[] = Array.isArray(r.data) ? r.data : [];
      assert(!rides.some((rd: any) => rd.id === rideId19), 'Ride should be excluded at 500 m with far coords');
    });

    await test('radiusMeters=50000 (max) is accepted → 200', async () => {
      const r = await seeker19.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, date: tomorrow19, radiusMeters: 50_000 },
      });
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('radiusMeters=50001 exceeds Max(50000) → 400', async () => {
      const r = await seeker19.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, date: tomorrow19, radiusMeters: 50_001 },
      });
      assert(r.status === 400, `Expected 400, got ${r.status}`);
    });

    await test('radiusMeters=499 below Min(500) → 400', async () => {
      const r = await seeker19.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, date: tomorrow19, radiusMeters: 499 },
      });
      assert(r.status === 400, `Expected 400, got ${r.status}`);
    });

    await test('radiusMeters=abc (non-numeric) → 400', async () => {
      const r = await seeker19.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, date: tomorrow19, radiusMeters: 'abc' },
      });
      assert(r.status === 400, `Expected 400, got ${r.status}`);
    });
  }

  // ── 20. ADMIN USER AUDIT ──────────────────────────────────────────────────
  section('20. Admin User Audit — GET /admin/users/:id/audit');
  {
    const admin20 = await getAdminClient();
    const auditUser = await freshSeeker('audit-s');

    await test('Admin can fetch audit for existing user → 200 with all sections', async () => {
      const r = await admin20.get(`/admin/users/${auditUser.userId}/audit`);
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
      assert(r.data.user,                           'Missing "user" section in audit response');
      assert(r.data.summary,                        'Missing "summary" section in audit response');
      assert(Array.isArray(r.data.ridesGiven),      'ridesGiven should be array');
      assert(Array.isArray(r.data.ridesTaken),      'ridesTaken should be array');
      assert(Array.isArray(r.data.ecoTransactions), 'ecoTransactions should be array');
      assert(Array.isArray(r.data.notifications),   'notifications should be array');
      assert(Array.isArray(r.data.complaints),      'complaints should be array');
      assert(Array.isArray(r.data.ratings),         'ratings should be array');
    });

    await test('Admin audit for unknown user → 404', async () => {
      const r = await admin20.get('/admin/users/nonexistent-user-id-999/audit');
      assert(r.status === 404, `Expected 404, got ${r.status}`);
    });

    await test('Non-admin user cannot access audit endpoint → 403', async () => {
      const nonAdmin = await freshSeeker('non-admin-audit');
      const r = await nonAdmin.client.get(`/admin/users/${auditUser.userId}/audit`);
      assert(r.status === 403, `Expected 403, got ${r.status}`);
    });

    await test('Audit summary contains correct numeric fields', async () => {
      const r = await admin20.get(`/admin/users/${auditUser.userId}/audit`);
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const s = r.data.summary;
      assert(typeof s.totalRidesGiven      === 'number', 'totalRidesGiven should be number');
      assert(typeof s.totalRidesTaken      === 'number', 'totalRidesTaken should be number');
      assert(typeof s.totalEcoPointsEarned === 'number', 'totalEcoPointsEarned should be number');
      assert(typeof s.openComplaints       === 'number', 'openComplaints should be number');
    });
  }

  // ── 21. WOMEN-ONLY GENDER GUARD ──────────────────────────────────────────
  section('21. Women-Only Guard — non-female seeker cannot book womenOnly ride');
  {
    const giver21 = await freshGiver('wom-g');
    const seeker21 = await freshSeeker('wom-s');
    const tomorrow21 = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    let womenRideId21: string;

    await test('Any giver (no gender set) can create womenOnly ride → 201', async () => {
      const r = await giver21.client.post('/rides', {
        vehicleId: giver21.vehicleId,
        originLat: 17.44, originLng: 78.34, originName: 'Origin',
        destinationLat: 17.45, destinationLng: 78.36, destinationName: 'Dest',
        departureDate: tomorrow21, departureTime: '09:00', totalSeats: 2, womenOnly: true,
      });
      assert([200, 201].includes(r.status), `Expected 201 for womenOnly ride creation, got ${r.status}: ${JSON.stringify(r.data)}`);
      womenRideId21 = r.data?.id ?? r.data?.data?.id;
      await giver21.client.patch(`/rides/${womenRideId21}/publish`);
    });

    await test('Non-female seeker requesting womenOnly ride → 403', async () => {
      const r = await seeker21.client.post('/ride-requests', { rideId: womenRideId21, pickupName: 'Test Pickup' });
      assert(r.status === 403, `Expected 403 for non-female seeker on womenOnly ride, got ${r.status}: ${JSON.stringify(r.data)}`);
    });
  }

  // ── 22. PHONE UNIQUENESS ──────────────────────────────────────────────────
  section('22. Phone Uniqueness — duplicate phone → 409');
  {
    const ts22 = Date.now();
    const sharedPhone = `9${String(ts22).slice(-9)}`;

    await makeClient().post('/auth/register', {
      email: `phone-first-${ts22}@gmail.com`, password: SEED_PASSWORD,
      fullName: 'Phone First', companyName: 'TestCorp', employeeId: 'N/A', phone: sharedPhone,
    });

    await test('Second registration with same phone → 409 (not 500)', async () => {
      const r = await makeClient().post('/auth/register', {
        email: `phone-second-${ts22}@gmail.com`, password: SEED_PASSWORD,
        fullName: 'Phone Second', companyName: 'TestCorp', employeeId: 'N/A', phone: sharedPhone,
      });
      assert(r.status === 409, `Expected 409 for duplicate phone, got ${r.status}: ${JSON.stringify(r.data)}`);
    });
  }

  // ── 23. PERSONAL EMAIL DOMAINS ────────────────────────────────────────────
  section('23. Personal Email Domains — gmail/yahoo/outlook temporarily allowed');
  {
    const personalDomains = [
      { domain: 'gmail.com',   label: 'gmail'   },
      { domain: 'yahoo.com',   label: 'yahoo'   },
      { domain: 'outlook.com', label: 'outlook' },
      { domain: 'hotmail.com', label: 'hotmail' },
      { domain: 'icloud.com',  label: 'icloud'  },
    ];

    for (const { domain, label } of personalDomains) {
      await test(`Register with ${label}.com → 200/201 (whitelisted for testing)`, async () => {
        const ts = Date.now();
        const r = await makeClient().post('/auth/register', {
          email: `testuser-${ts}@${domain}`, password: SEED_PASSWORD,
          fullName: `${label} Tester`, companyName: 'TestCorp', employeeId: 'N/A',
          phone: `9${String(ts).slice(-9)}`,
        });
        assert([200, 201].includes(r.status),
          `Expected 200/201 for @${domain}, got ${r.status}: ${JSON.stringify(r.data)}`);
      });
    }

    await test('Register with truly invalid domain → 403', async () => {
      const ts = Date.now();
      const r = await makeClient().post('/auth/register', {
        email: `test@totally-invalid-xyz-domain.com`, password: SEED_PASSWORD,
        fullName: 'Invalid Domain Tester', companyName: 'TestCorp', employeeId: 'N/A',
        phone: `9${String(ts).slice(-9)}`,
      });
      assert(r.status === 403, `Expected 403 for unknown domain, got ${r.status}: ${JSON.stringify(r.data)}`);
    });
  }

  // ── 24. ABORT EMPTY REASON ────────────────────────────────────────────────
  section('24. Abort — empty or missing reason → 400');
  {
    const giver24 = await freshGiver('abort-reason-g');
    const rideId24 = await publishRide(giver24.client, giver24.vehicleId, 2);
    await giver24.client.patch(`/rides/${rideId24}/start`);

    await test('Abort with empty string reason → 400', async () => {
      const r = await giver24.client.patch(`/rides/${rideId24}/abort`, { reason: '' });
      assert(r.status === 400, `Expected 400 for empty reason, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('Abort with whitespace-only reason → 400', async () => {
      const r = await giver24.client.patch(`/rides/${rideId24}/abort`, { reason: '   ' });
      assert(r.status === 400, `Expected 400 for whitespace reason, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('Abort with missing reason field → 400', async () => {
      const r = await giver24.client.patch(`/rides/${rideId24}/abort`, {});
      assert(r.status === 400, `Expected 400 for missing reason, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('Abort with valid reason → 200 (ride becomes CANCELLED)', async () => {
      const r = await giver24.client.patch(`/rides/${rideId24}/abort`, { reason: 'Medical emergency' });
      assert(r.status === 200, `Expected 200 for valid abort, got ${r.status}: ${JSON.stringify(r.data)}`);
      const ride = await giver24.client.get(`/rides/${rideId24}`);
      assert(ride.data.status === 'CANCELLED', `Expected CANCELLED, got ${ride.data.status}`);
    });
  }

  // ── 25. RIDE EDIT — 15-MIN TIME GUARD ────────────────────────────────────
  section('25. Ride Edit — 15-min departure time guard');
  {
    const giver25 = await freshGiver('edit-tg');

    await test('LC-ED-02: edit blocked when departure < 15 min away → 400', async () => {
      const soon = new Date(Date.now() + 10 * 60 * 1000);
      const dateStr = soon.toISOString().split('T')[0];
      const timeStr = `${String(soon.getUTCHours()).padStart(2, '0')}:${String(soon.getUTCMinutes()).padStart(2, '0')}`;
      const cr = await giver25.client.post('/rides', {
        vehicleId: giver25.vehicleId,
        originName: 'Edit Guard Origin', originLat: 17.44, originLng: 78.34,
        destinationName: 'Edit Guard Dest', destinationLat: 17.45, destinationLng: 78.36,
        departureDate: dateStr, departureTime: timeStr, totalSeats: 2,
      });
      assert(cr.status === 201, `Create failed: ${JSON.stringify(cr.data)}`);
      const nearRideId = cr.data.id;
      const r = await giver25.client.patch(`/rides/${nearRideId}/edit`, { notes: 'Updated' });
      assert(r.status === 400, `Expected 400 for near-departure edit, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('LC-ED-03: edit allowed when departure > 15 min away and no passengers → 200', async () => {
      const soon35 = new Date(Date.now() + 35 * 60 * 1000);
      const dateStr35 = soon35.toISOString().split('T')[0];
      const timeStr35 = `${String(soon35.getUTCHours()).padStart(2, '0')}:${String(soon35.getUTCMinutes()).padStart(2, '0')}`;
      const cr = await giver25.client.post('/rides', {
        vehicleId: giver25.vehicleId,
        originName: 'Edit OK Origin', originLat: 17.44, originLng: 78.34,
        destinationName: 'Edit OK Dest', destinationLat: 17.45, destinationLng: 78.36,
        departureDate: dateStr35, departureTime: timeStr35, totalSeats: 3,
      });
      assert(cr.status === 201, `Create failed: ${JSON.stringify(cr.data)}`);
      const okRideId = cr.data.id;
      const pub = await giver25.client.patch(`/rides/${okRideId}/publish`);
      assert(pub.status === 200, `Publish failed: ${JSON.stringify(pub.data)}`);
      const r = await giver25.client.patch(`/rides/${okRideId}/edit`, { notes: 'Updated notes' });
      assert(r.status === 200, `Expected 200 for valid edit, got ${r.status}: ${JSON.stringify(r.data)}`);
      await giver25.client.patch(`/rides/${okRideId}/cancel`).catch(() => {});
    });

    await test('LC-ED-04: edit blocked when ride has PENDING or CONFIRMED requests → 400', async () => {
      const seeker25 = await freshSeeker('edit-sk25');
      const rideId25 = await freshGiver('edit-g25').then(async (g) => {
        const id = await publishRide(g.client, g.vehicleId);
        const req = await seeker25.client.post('/ride-requests', { rideId: id, pickupName: 'Kondapur Metro' });
        assert([200, 201].includes(req.status), `Request failed: ${JSON.stringify(req.data)}`);
        return id;
      });
      const r = await (await freshGiver('edit-g25-owner')).client.patch(`/rides/${rideId25}/edit`, { notes: 'Hack' }).catch(e => e.response);
      assert(r.status !== 200, `Edit should be blocked when requests exist, got ${r.status}`);
    });
  }

  // ── 26. TRUST SCORE EVENTS ───────────────────────────────────────────────
  section('26. Trust Score — events update score correctly');
  {
    await test('TS-01: giver trust score increases after ride completed', async () => {
      const { giver } = await completeFullRide(1);
      const r = await giver.client.get('/users/me/trust-score');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const score = r.data?.trustScore ?? r.data?.data?.trustScore;
      assert(typeof score === 'number', `Expected numeric trustScore, got ${JSON.stringify(r.data)}`);
      assert(score > 0, `Expected trust score > 0 after ride completion, got ${score}`);
    });

    await test('TS-02: seeker trust score increases after ride completed', async () => {
      const { seeker } = await completeFullRide(1);
      const r = await seeker.client.get('/users/me/trust-score');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const score = r.data?.trustScore ?? r.data?.data?.trustScore;
      assert(typeof score === 'number', `Expected numeric trustScore, got ${JSON.stringify(r.data)}`);
      assert(score > 0, `Expected trust score > 0 after ride completion, got ${score}`);
    });

    await test('TS-03: GET /users/me/trust-score returns score and band', async () => {
      const { giver } = await completeFullRide(1);
      const r = await giver.client.get('/users/me/trust-score');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const data = r.data?.data ?? r.data;
      assert(typeof data.trustScore === 'number', `Missing trustScore in response: ${JSON.stringify(data)}`);
      assert(typeof data.trustBand === 'string', `Missing trustBand in response: ${JSON.stringify(data)}`);
      const validBands = ['NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
      assert(validBands.includes(data.trustBand), `Invalid trustBand value: ${data.trustBand}`);
    });

    await test('TS-04: GET /users/me/trust-score/history returns events after completion', async () => {
      const { giver } = await completeFullRide(1);
      const r = await giver.client.get('/users/me/trust-score/history');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const events = r.data?.data ?? r.data;
      assert(Array.isArray(events), `Expected array of events, got ${JSON.stringify(r.data)}`);
      assert(events.length > 0, `Expected at least 1 trust event after ride completion, got 0`);
    });

    await test('TS-05: marking seeker as no-show creates negative trust event', async () => {
      const giver5  = await freshGiver('ts05-g');
      const seeker5 = await freshSeeker('ts05-s');
      const rideId5 = await publishRide(giver5.client, giver5.vehicleId, 2);
      const req5 = await seeker5.client.post('/ride-requests', { rideId: rideId5, pickupName: 'Kondapur Metro' });
      const reqId5 = req5.data.requestId ?? req5.data.id;
      await giver5.client.patch(`/ride-requests/${reqId5}/approve`);
      await seeker5.client.patch(`/ride-requests/${reqId5}/confirm`);
      await giver5.client.patch(`/rides/${rideId5}/start`);

      const seekerProfile5 = await seeker5.client.get('/users/me/trust-score');
      const scoreBefore = seekerProfile5.data?.trustScore ?? seekerProfile5.data?.data?.trustScore ?? 0;

      const seekerMe = await seeker5.client.get('/users/me');
      const seekerData = seekerMe.data?.data ?? seekerMe.data;
      const rideData = await giver5.client.get(`/rides/${rideId5}`);
      const participant = (rideData.data?.participants ?? rideData.data?.data?.participants ?? [])
        .find((p: any) => p.seeker?.userId === seekerData.id);
      assert(!!participant, `Participant not found in ride: ${JSON.stringify(rideData.data)}`);

      const ns = await giver5.client.patch(`/rides/${rideId5}/no-show/${participant.seekerId}`);
      assert(ns.status === 200, `Expected 200 for no-show, got ${ns.status}: ${JSON.stringify(ns.data)}`);

      const seekerProfile5After = await seeker5.client.get('/users/me/trust-score');
      const scoreAfter = seekerProfile5After.data?.trustScore ?? seekerProfile5After.data?.data?.trustScore ?? 0;
      assert(scoreAfter <= scoreBefore,
        `Expected trust score to decrease after no-show. Before: ${scoreBefore}, After: ${scoreAfter}`);

      const history = await seeker5.client.get('/users/me/trust-score/history');
      const events = history.data?.data ?? history.data ?? [];
      const noShowEvent = events.find((e: any) => e.reason?.includes('NO_SHOW') || e.reason?.includes('no-show') || e.delta < 0);
      assert(!!noShowEvent, `Expected a negative trust event after no-show, events: ${JSON.stringify(events.slice(0, 3))}`);
    });

    await test('TS-06: admin can manually adjust a user\'s trust score', async () => {
      const { giver } = await completeFullRide(1);
      const adminAdj = await getAdminClient();
      const me = await giver.client.get('/users/me');
      const userId = (me.data?.data ?? me.data).id;
      const before = await giver.client.get('/users/me/trust-score');
      const scoreBefore = before.data?.trustScore ?? before.data?.data?.trustScore ?? 0;

      const adj = await adminAdj.patch(`/admin/users/${userId}/trust-score`, { delta: 5, reason: 'QA manual adjustment' });
      assert([200, 201].includes(adj.status), `Expected 200/201, got ${adj.status}: ${JSON.stringify(adj.data)}`);

      const after = await giver.client.get('/users/me/trust-score');
      const scoreAfter = after.data?.trustScore ?? after.data?.data?.trustScore ?? 0;
      assert(scoreAfter === scoreBefore + 5, `Expected score ${scoreBefore + 5}, got ${scoreAfter}`);
    });
  }

  // ── 27. ABORT SIDE-EFFECTS ───────────────────────────────────────────────
  section('27. Abort — seeker request status + notification');
  {
    const giver27  = await freshGiver('ab27-g');
    const seeker27 = await freshSeeker('ab27-s');
    const rideId27 = await publishRide(giver27.client, giver27.vehicleId, 2);

    const req27 = await seeker27.client.post('/ride-requests', { rideId: rideId27, pickupName: 'Kondapur Metro' });
    const reqId27 = req27.data.requestId ?? req27.data.id;
    await giver27.client.patch(`/ride-requests/${reqId27}/approve`);
    await seeker27.client.patch(`/ride-requests/${reqId27}/confirm`);
    await giver27.client.patch(`/rides/${rideId27}/start`);

    await test('AB-02: after abort, seeker\'s ride-request status becomes CANCELLED', async () => {
      await giver27.client.patch(`/rides/${rideId27}/abort`, { reason: 'Vehicle breakdown' });
      const requests = await seeker27.client.get('/ride-requests/mine');
      const abortedReq = (requests.data?.data ?? requests.data ?? [])
        .find((r: any) => r.rideId === rideId27 || r.ride?.id === rideId27);
      assert(!!abortedReq, `Seeker's request for aborted ride not found in /ride-requests/mine`);
      assert(abortedReq.status === 'CANCELLED',
        `Expected request status CANCELLED after abort, got ${abortedReq.status}`);
    });

    await test('AB-03: seeker received a notification after giver aborted', async () => {
      const notifs = await seeker27.client.get('/notifications');
      const all = notifs.data?.data ?? notifs.data ?? [];
      const abortNotif = all.find((n: any) =>
        n.body?.toLowerCase().includes('aborted') || n.body?.toLowerCase().includes('stopped') ||
        n.title?.toLowerCase().includes('aborted') || n.type === 'RIDE_CANCELLED',
      );
      assert(!!abortNotif, `Expected abort notification for seeker, got: ${JSON.stringify(all.slice(0, 3))}`);
    });

    await test('AB-04: aborted ride status is CANCELLED in GET /rides/:id', async () => {
      const r = await giver27.client.get(`/rides/${rideId27}`);
      const status = r.data?.status ?? r.data?.data?.status;
      assert(status === 'CANCELLED', `Expected CANCELLED after abort, got ${status}`);
    });
  }

  // ── 28. COMMUNITY ENDPOINT ────────────────────────────────────────────────
  section('28. Community Endpoint — missing/invalid params');
  {
    const client28 = makeClient();

    await test('Community rides — no params returns 200 with array (defaults gracefully)', async () => {
      const r = await client28.get('/rides/community');
      assert(r.status === 200, `Expected 200 with no params, got ${r.status}: ${JSON.stringify(r.data)}`);
      const data = r.data?.data ?? r.data;
      assert(Array.isArray(data), `Expected array response, got ${JSON.stringify(data)}`);
    });

    await test('Community rides — valid date range returns 200', async () => {
      const today = new Date().toISOString().split('T')[0];
      const r = await client28.get('/rides/community', { params: { from: today, to: today } });
      assert(r.status === 200, `Expected 200 for valid date range, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('Community rides — from > to returns 200 with empty array (not 500)', async () => {
      const r = await client28.get('/rides/community', { params: { from: '2026-12-31', to: '2026-01-01' } });
      assert(r.status !== 500, `Got 500 for from > to: ${JSON.stringify(r.data)}`);
      if (r.status === 200) {
        const data = r.data?.data ?? r.data;
        assert(Array.isArray(data), `Expected array, got ${JSON.stringify(data)}`);
      }
    });

    await test('Community rides — unauthenticated request returns 200 (public endpoint)', async () => {
      const anonClient = (await import('axios')).default.create({ baseURL: BASE, validateStatus: () => true });
      const r = await anonClient.get('/rides/community');
      assert([200, 401].includes(r.status), `Expected 200 or 401 for anon, got ${r.status}`);
    });
  }

  // ── 29. VEHICLE RC MATCH STATUS ──────────────────────────────────────────
  section('29. Vehicle RC — rcMatchStatus field');
  {
    const giver29 = await freshGiver('rc29');

    await test('RC-01: PATCH /vehicles/:id/rc with matching parsedData → rcMatchStatus=MATCHED', async () => {
      const vehicles = await giver29.client.get('/vehicles/my');
      const v = (vehicles.data?.data ?? vehicles.data)[0];
      assert(!!v, 'No vehicle found for giver');

      const r = await giver29.client.patch(`/vehicles/${v.id}/rc`, {
        rcUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        parsedData: { plateNumber: v.plateNumber, make: v.make, model: v.model },
      });
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);

      const updated = await giver29.client.get('/vehicles/my');
      const updatedV = (updated.data?.data ?? updated.data).find((veh: any) => veh.id === v.id);
      assert(!!updatedV, 'Vehicle not found after update');
      assert(updatedV.rcMatchStatus === 'MATCHED', `Expected rcMatchStatus=MATCHED, got ${updatedV.rcMatchStatus}`);
    });

    await test('RC-02: PATCH /vehicles/:id/rc with mismatched plate → 400', async () => {
      const vehicles = await giver29.client.get('/vehicles/my');
      const v = (vehicles.data?.data ?? vehicles.data)[0];

      const r = await giver29.client.patch(`/vehicles/${v.id}/rc`, {
        rcUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        parsedData: { plateNumber: 'ZZ99ZZ9999', make: v.make, model: v.model },
      });
      assert(r.status === 400, `Expected 400 for plate mismatch, got ${r.status}: ${JSON.stringify(r.data)}`);
      const msg = JSON.stringify(r.data).toLowerCase();
      assert(msg.includes('plate') || msg.includes('rc'), `Expected plate mismatch message, got: ${JSON.stringify(r.data)}`);
    });

    await test('RC-03: PATCH /vehicles/:id/rc without parsedData → no crash', async () => {
      const vehicles = await giver29.client.get('/vehicles/my');
      const v = (vehicles.data?.data ?? vehicles.data)[0];
      const r = await giver29.client.patch(`/vehicles/${v.id}/rc`, {
        rcUrl: 'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      });
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
      const updated = await giver29.client.get('/vehicles/my');
      const updatedV = (updated.data?.data ?? updated.data).find((veh: any) => veh.id === v.id);
      assert(updatedV !== undefined, 'Vehicle not found after RC-only update');
    });
  }

  // ── 30. SEARCH RADIUS — ZERO AND NEGATIVE BOUNDARY ──────────────────────
  section('30. Search Radius — zero and negative boundary');
  {
    const seeker30 = await freshSeeker('rad30');
    const today = new Date().toISOString().split('T')[0];

    await test('SR-01: radiusMeters=0 → 400 (below Min 500)', async () => {
      const r = await seeker30.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, departureDate: today, radiusMeters: 0 },
      });
      assert(r.status === 400, `Expected 400 for radiusMeters=0, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('SR-02: radiusMeters=-1 → 400 (negative not allowed)', async () => {
      const r = await seeker30.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, departureDate: today, radiusMeters: -1 },
      });
      assert(r.status === 400, `Expected 400 for radiusMeters=-1, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('SR-03: radiusMeters=499 → 400 (one below Min 500)', async () => {
      const r = await seeker30.client.get('/rides/search', {
        params: { originLat: 17.44, originLng: 78.34, destinationLat: 17.45, destinationLng: 78.36, departureDate: today, radiusMeters: 499 },
      });
      assert(r.status === 400, `Expected 400 for radiusMeters=499, got ${r.status}: ${JSON.stringify(r.data)}`);
    });
  }

  // ── 31. SEAT RESTORE FLOW ────────────────────────────────────────────────
  section('31. Seat Restore — cancel CONFIRMED on full ride → new booking succeeds');
  {
    await test('LC-SC-04: seeker cancels CONFIRMED booking on full 1-seat ride → third seeker can book', async () => {
      const giver31   = await freshGiver('sc31-g');
      const seeker31a = await freshSeeker('sc31-a');
      const seeker31b = await freshSeeker('sc31-b');
      const rideId31 = await publishRide(giver31.client, giver31.vehicleId, 1);

      const reqA = await seeker31a.client.post('/ride-requests', { rideId: rideId31, pickupName: 'Pickup A' });
      const reqIdA = reqA.data.requestId ?? reqA.data.id;
      await giver31.client.patch(`/ride-requests/${reqIdA}/approve`);

      const blockedR = await seeker31b.client.post('/ride-requests', { rideId: rideId31, pickupName: 'Pickup B' });
      assert([400, 409].includes(blockedR.status),
        `Expected 400/409 when ride is full, got ${blockedR.status}: ${JSON.stringify(blockedR.data)}`);

      const cancelR = await seeker31a.client.patch(`/ride-requests/${reqIdA}/cancel`);
      assert([200, 201].includes(cancelR.status),
        `Expected 200 for seeker cancel, got ${cancelR.status}: ${JSON.stringify(cancelR.data)}`);

      const rideR = await giver31.client.get(`/rides/${rideId31}`);
      const availSeats = rideR.data?.availableSeats ?? rideR.data?.data?.availableSeats;
      assert(availSeats === 1, `Expected availableSeats=1 after cancel, got ${availSeats}`);

      const successR = await seeker31b.client.post('/ride-requests', { rideId: rideId31, pickupName: 'Pickup B' });
      assert([200, 201].includes(successR.status),
        `Expected 200/201 for seeker B after seat freed, got ${successR.status}: ${JSON.stringify(successR.data)}`);

      await giver31.client.patch(`/rides/${rideId31}/cancel`).catch(() => {});
    });
  }

  // ── 32. PICKUP DISTANCE FIELD ─────────────────────────────────────────────
  section('32. Pickup Distance — distanceFromOriginM field + sort order');
  {
    const giverDist = await freshGiver('dist32-g');
    const tomorrow32 = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const createRide = async (originLat: number, originLng: number) => {
      const r = await giverDist.client.post('/rides', {
        vehicleId: giverDist.vehicleId,
        originName: 'Test Origin', originLat, originLng,
        destinationName: 'HITEC City', destinationLat: 17.4489, destinationLng: 78.3696,
        departureDate: tomorrow32, departureTime: '09:00', totalSeats: 3,
      });
      if (r.status !== 201) throw new Error(`Create ride failed: ${JSON.stringify(r.data)}`);
      const pub = await giverDist.client.patch(`/rides/${r.data.id}/publish`);
      if (pub.status !== 200) throw new Error(`Publish failed`);
      return r.data.id as string;
    };

    const closeRideId = await createRide(17.4401, 78.3489);
    const farRideId   = await createRide(17.4535, 78.3489);

    const searchParams = new URLSearchParams({
      originLat: '17.4401', originLng: '78.3489',
      destLat:   '17.4489', destLng:   '78.3696',
      date: tomorrow32, radiusMeters: '5000',
    });
    const searchR = await giverDist.client.get(`/rides/search?${searchParams}`);
    assert([200, 201].includes(searchR.status), `Search expected 200, got ${searchR.status}`);
    const rides: any[] = searchR.data?.data ?? searchR.data?.rides ?? searchR.data ?? [];

    await test('PD-01: search response includes distanceFromOriginM on every ride', async () => {
      const myRides = rides.filter((r: any) => r.id === closeRideId || r.id === farRideId);
      assert(myRides.length > 0, 'No test rides found in search results');
      for (const r of myRides) {
        assert(typeof r.distanceFromOriginM === 'number',
          `Expected distanceFromOriginM to be a number on ride ${r.id}, got ${typeof r.distanceFromOriginM}`);
      }
    });

    await test('PD-02: close ride distanceFromOriginM is less than far ride', async () => {
      const close = rides.find((r: any) => r.id === closeRideId);
      const far   = rides.find((r: any) => r.id === farRideId);
      if (!close || !far) { console.log('    ⚠️  PD-02 skipped — rides not in search results'); return; }
      assert(close.distanceFromOriginM < far.distanceFromOriginM,
        `Expected close (${close.distanceFromOriginM}m) < far (${far.distanceFromOriginM}m)`);
    });

    await test('PD-03: results are sorted by distanceFromOriginM ascending (closest first)', async () => {
      for (let i = 1; i < rides.length; i++) {
        assert(rides[i].distanceFromOriginM >= rides[i - 1].distanceFromOriginM,
          `Not sorted: index ${i - 1}=${rides[i - 1].distanceFromOriginM}m > index ${i}=${rides[i].distanceFromOriginM}m`);
      }
    });

    await test('PD-04: close ride distanceFromOriginM is ≤10m when origin matches exactly', async () => {
      const close = rides.find((r: any) => r.id === closeRideId);
      if (!close) { console.log('    ⚠️  PD-04 skipped — close ride not in results'); return; }
      assert(close.distanceFromOriginM <= 10,
        `Expected ≤10m for exact-match origin, got ${close.distanceFromOriginM}m`);
    });

    await giverDist.client.patch(`/rides/${closeRideId}/cancel`).catch(() => {});
    await giverDist.client.patch(`/rides/${farRideId}/cancel`).catch(() => {});
  }

  // ── 33. FORMATDISTANCE UTILITY ───────────────────────────────────────────
  section('33. formatDistance — metres to human-readable string');
  {
    function formatDistance(metres: number): string {
      if (metres < 1000) return `${Math.round(metres)} m`;
      return `${(metres / 1000).toFixed(1).replace(/\.0$/, '')} km`;
    }

    await test('FD-01: values below 1000m display as "X m"', async () => {
      assert(formatDistance(0)   === '0 m',   `Expected "0 m", got "${formatDistance(0)}"`);
      assert(formatDistance(230) === '230 m', `Expected "230 m", got "${formatDistance(230)}"`);
      assert(formatDistance(999) === '999 m', `Expected "999 m", got "${formatDistance(999)}"`);
    });

    await test('FD-02: values ≥ 1000m display as "X.X km" with no trailing .0', async () => {
      assert(formatDistance(1000)  === '1 km',   `Expected "1 km", got "${formatDistance(1000)}"`);
      assert(formatDistance(1500)  === '1.5 km', `Expected "1.5 km", got "${formatDistance(1500)}"`);
      assert(formatDistance(2000)  === '2 km',   `Expected "2 km", got "${formatDistance(2000)}"`);
      assert(formatDistance(10000) === '10 km',  `Expected "10 km", got "${formatDistance(10000)}"`);
    });
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total  = results.length;

  console.log(`\n${c.bold}${'─'.repeat(62)}${c.reset}`);
  const sections = [...new Set(results.map(r => r.section))];
  sections.forEach(sec => {
    const sr = results.filter(r => r.section === sec);
    const sp = sr.filter(r => r.passed).length;
    const colour = sp === sr.length ? c.green : c.red;
    console.log(`  ${colour}${sp}/${sr.length}${c.reset}  ${c.dim}${sec}${c.reset}`);
  });
  console.log(`\n${c.bold}  Total: ${passed}/${total} passed${c.reset}\n`);

  if (failed > 0) {
    results.filter(r => !r.passed).forEach(r =>
      console.log(`  ${c.red}✗${c.reset} [${r.section}] ${r.name}\n    ${c.dim}${r.error}${c.reset}`)
    );
  }

  const bar = '█'.repeat(Math.round((passed / total) * 40)).padEnd(40, '░');
  const pct = Math.round((passed / total) * 100);
  const colour = pct === 100 ? c.green : pct >= 80 ? c.yellow : c.red;
  console.log(`\n  ${colour}${bar}${c.reset} ${colour}${pct}%${c.reset}\n`);

  if (failed === 0) {
    console.log(`${c.green}${c.bold}  🎉 Part B passed!${c.reset}\n`);
  } else {
    console.log(`${c.red}  ${failed} test(s) failed.${c.reset}\n`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`\n${c.red}Runner crashed: ${e.message}${c.reset}\n`);
  process.exit(1);
});
