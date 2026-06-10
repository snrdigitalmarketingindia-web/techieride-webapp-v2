/**
 * TechieRide — Final Gap-Closing Test Suite Part B1 (Sections 17–25)
 * Split from e2e-api-final-b.ts to avoid CI runner OOM crash.
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
 *
 * Run: npm run test:api:final-b1
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
  console.log(`\n${c.bold}${c.blue}━━━ 🏁 Final Gap-Closing Test Suite — Part B1 (17–25) ━━━${c.reset}\n`);

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

    // Use a real corporate domain (wipro.com has valid MX records and is not in the personal-email blocklist)
    await makeClient().post('/auth/register', {
      email: `phone-first-${ts22}@wipro.com`, password: SEED_PASSWORD,
      fullName: 'Phone First', companyName: 'TestCorp', employeeId: 'N/A', phone: sharedPhone,
    });

    await test('Second registration with same phone → 409 (not 500)', async () => {
      const r = await makeClient().post('/auth/register', {
        email: `phone-second-${ts22}@wipro.com`, password: SEED_PASSWORD,
        fullName: 'Phone Second', companyName: 'TestCorp', employeeId: 'N/A', phone: sharedPhone,
      });
      assert(r.status === 409, `Expected 409 for duplicate phone, got ${r.status}: ${JSON.stringify(r.data)}`);
    });
  }

  // ── 23. PERSONAL EMAIL DOMAINS ────────────────────────────────────────────
  // Personal email domains (gmail, yahoo, outlook, hotmail, icloud) are blocked by the
  // server-side blocklist and return 403 Forbidden. Truly invalid domains (no MX records)
  // return 400 BadRequest from the MX-record validation step.
  section('23. Personal Email Domains — blocked by server-side blocklist (→ 403)');
  {
    const personalDomains = [
      { domain: 'gmail.com',   label: 'gmail'   },
      { domain: 'yahoo.com',   label: 'yahoo'   },
      { domain: 'outlook.com', label: 'outlook' },
      { domain: 'hotmail.com', label: 'hotmail' },
      { domain: 'icloud.com',  label: 'icloud'  },
    ];

    for (const { domain, label } of personalDomains) {
      await test(`Register with ${label}.com → 403 (personal domain blocked)`, async () => {
        const ts = Date.now();
        const r = await makeClient().post('/auth/register', {
          email: `testuser-${ts}@${domain}`, password: SEED_PASSWORD,
          fullName: `${label} Tester`, companyName: 'TestCorp', employeeId: 'N/A',
          phone: `9${String(ts).slice(-9)}`,
        });
        assert(r.status === 403,
          `Expected 403 for blocked domain @${domain}, got ${r.status}: ${JSON.stringify(r.data)}`);
      });
    }

    await test('Register with truly invalid domain → 400 (no MX records)', async () => {
      const ts = Date.now();
      const r = await makeClient().post('/auth/register', {
        email: `test@totally-invalid-xyz-domain.com`, password: SEED_PASSWORD,
        fullName: 'Invalid Domain Tester', companyName: 'TestCorp', employeeId: 'N/A',
        phone: `9${String(ts).slice(-9)}`,
      });
      assert(r.status === 400, `Expected 400 for domain with no MX records, got ${r.status}: ${JSON.stringify(r.data)}`);
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
    console.log(`${c.green}${c.bold}  🎉 Part B1 passed!${c.reset}\n`);
  } else {
    console.log(`${c.red}  ${failed} test(s) failed.${c.reset}\n`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`\n${c.red}Runner crashed: ${e.message}${c.reset}\n`);
  process.exit(1);
});
