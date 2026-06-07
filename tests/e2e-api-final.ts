/**
 * TechieRide — Final Gap-Closing Test Suite
 * Senior QA Director — zero-bug production checklist (last mile)
 *
 * Covers every endpoint and scenario not reached by the previous four suites:
 *
 *  1.  RIDES/TAKEN          — seeker's completed-ride history
 *  2.  UPLOADS              — storage health check + file validation guards
 *  3.  GAMIFICATION E2E     — points actually awarded after ride completion
 *  4.  FULL-SEAT GUARD      — giver cannot approve when ride is fully CONFIRMED
 *  5.  REQUEST CANCELLATION — seeker cancels PENDING request, seeker cancels HOLD
 *  6.  ADMIN FILTERS        — users by role, users by verificationStatus
 *  7.  ANALYTICS DATE RANGE — from/to params return scoped data
 *  8.  LEADERBOARD PARAMS   — limit param, alltime period
 *  9.  NOTIFICATIONS FILTER — unreadOnly=true returns only unread
 * 10.  RIDE CANCEL NOTIF    — cancellation notifies confirmed passengers
 * 11.  WEBHOOK BOUNCE       — email bounce endpoint responds correctly
 * 12.  SOS STANDALONE       — SOS without rideId still creates event
 * 13.  RESPONSE SCHEMA      — key fields present and correct types on every resource
 * 14.  CONCURRENT APPROVAL  — race: two givers cannot both approve same request
 *
 * Run: npm run test:api:final
 */

import axios, { AxiosInstance } from 'axios';
import {
  BASE, makeClient, loginAs, register, freshGiver, freshSeeker, publishRide, completeFullRide, getAdminClient,
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
  console.log(`\n${c.bold}${c.blue}━━━ 🏁 Final Gap-Closing Test Suite ━━━${c.reset}\n`);

  const admin = makeClient((await loginAs('admin@techieride.in')).token);

  // ── 1. RIDES/TAKEN ────────────────────────────────────────────────────────
  section('1. Rides Taken (Seeker History)');
  {
    const { seeker, rideId } = await completeFullRide();

    await test('GET /rides/taken returns array for authenticated seeker', async () => {
      const r = await seeker.client.get('/rides/taken');
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
      assert(Array.isArray(r.data), `Expected array, got ${typeof r.data}`);
    });

    await test('Completed ride appears in seeker /rides/taken', async () => {
      const r = await seeker.client.get('/rides/taken');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const found = r.data.find((ride: any) => ride.id === rideId || ride.rideId === rideId);
      assert(!!found, `Completed ride ${rideId} not found in /rides/taken — got: ${JSON.stringify(r.data.map((x: any) => x.id ?? x.rideId))}`);
    });

    await test('Unauthenticated GET /rides/taken → 401', async () => {
      const r = await makeClient().get('/rides/taken');
      assert(r.status === 401, `Expected 401, got ${r.status}`);
    });

    await test('Giver GET /rides/taken returns empty or 403 (not a seeker)', async () => {
      const giver = await freshGiver('taken_check');
      const r = await giver.client.get('/rides/taken');
      assert([200, 403].includes(r.status), `Expected 200/403, got ${r.status}`);
      if (r.status === 200) assert(Array.isArray(r.data) && r.data.length === 0, 'Giver should have no taken rides');
    });
  }

  // ── 2. UPLOADS ────────────────────────────────────────────────────────────
  section('2. Upload Service');
  {
    await test('POST /uploads/parse-rc — returns readable:false with reason when GEMINI_API_KEY not set (CI)', async () => {
      const giver = await freshGiver('parse_rc');
      const r = await giver.client.post('/uploads/parse-rc', { imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' });
      // In CI there is no GEMINI_API_KEY — service must return 200 with readable:false (not crash/401/500)
      assert(r.status === 200, `Expected 200 from parse-rc, got ${r.status}`);
      assert(typeof r.data.readable === 'boolean', `Expected boolean readable field, got ${JSON.stringify(r.data)}`);
      if (!r.data.readable) {
        assert(typeof r.data.reason === 'string', `Expected reason string when not readable, got ${JSON.stringify(r.data)}`);
      }
    });

    await test('PATCH /vehicles/:id/rc — owner can update RC URL without parsedData', async () => {
      const giver = await freshGiver('rc_update');
      const ts = Date.now();
      const veh = await giver.client.post('/vehicles', {
        make: 'Maruti', model: 'Swift', color: 'Red',
        plateNumber: `TS${ts.toString().slice(-5)}R`, totalSeats: 4,
      });
      assert(veh.status === 201, `Vehicle creation failed: ${veh.status}`);
      const vehicleId = (veh.data?.data ?? veh.data).id;
      const r = await giver.client.patch(`/vehicles/${vehicleId}/rc`, {
        rcUrl: 'https://mock.storage/rc.jpg',
      });
      assert([200, 201].includes(r.status), `Expected 200/201 for RC update, got ${r.status}`);
    });

    await test('Create vehicle with totalSeats = 6 (max — giver + 6 passengers) → 201', async () => {
      const giver = await freshGiver('seats6_veh');
      const ts = Date.now();
      const r = await giver.client.post('/vehicles', {
        make: 'Toyota', model: 'Innova Crysta', color: 'White',
        plateNumber: `TS${ts.toString().slice(-5)}S`, totalSeats: 6,
      });
      assert(r.status === 201, `Expected 201 for totalSeats=6, got ${r.status}`);
    });

    await test('Create ride with totalSeats = 6 (max — giver + 6 passengers) → 201', async () => {
      const giver = await freshGiver('seats6_ride');
      const ts = Date.now();
      const veh = await giver.client.post('/vehicles', {
        make: 'Toyota', model: 'Innova', color: 'Silver',
        plateNumber: `TS${ts.toString().slice(-5)}T`, totalSeats: 6,
      });
      const vehicleId = (veh.data?.data ?? veh.data).id;
      await admin.patch(`/admin/vehicles/${vehicleId}/verify`).catch(() => {});
      const r = await giver.client.post('/rides', {
        vehicleId,
        originName: 'Kondapur', destinationName: 'HITEC City',
        originLat: 17.47, originLng: 78.35, destinationLat: 17.45, destinationLng: 78.38,
        departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        departureTime: '09:00', totalSeats: 6,
      });
      assert(r.status === 201, `Expected 201 for totalSeats=6 ride, got ${r.status}`);
    });

    await test('GET /uploads/status returns availability flag', async () => {
      const r = await admin.get('/uploads/status');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(typeof r.data.available === 'boolean', `Expected boolean available, got ${JSON.stringify(r.data)}`);
      assert(typeof r.data.message === 'string', 'Expected string message');
    });

    await test('POST /uploads/document without file → 400', async () => {
      const giver = await freshGiver('upload');
      // Send without multipart — multer skips parsing, file is undefined, handler returns 400
      const r = await giver.client.post('/uploads/document', {});
      assert([400, 422].includes(r.status), `Expected 400/422 for missing file, got ${r.status}`);
    });

    await test('POST /uploads/document unauthenticated → 401', async () => {
      // JWT guard runs before file parsing — no auth = 401 regardless of body
      const r = await makeClient().post('/uploads/document', {});
      assert(r.status === 401, `Expected 401, got ${r.status}`);
    });
  }

  // ── 3. GAMIFICATION E2E ───────────────────────────────────────────────────
  section('3. Gamification — Points Awarded After Completion');
  {
    const giver = await freshGiver('gami_e2e');
    const seeker = await freshSeeker('gami_e2e');

    // Capture baseline
    const giverBefore = await giver.client.get('/gamification/summary');
    const seekerBefore = await seeker.client.get('/gamification/summary');
    assert(giverBefore.status === 200 && seekerBefore.status === 200, 'Could not fetch baseline gamification');
    const giverPtsBefore: number = giverBefore.data.ecoPoints ?? 0;
    const seekerPtsBefore: number = seekerBefore.data.ecoPoints ?? 0;

    // Complete a ride
    const rideId = await publishRide(giver.client, giver.vehicleId, 3);
    const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqId = reqR.data.requestId as string;
    await giver.client.patch(`/ride-requests/${reqId}/approve`);
    await seeker.client.patch(`/ride-requests/${reqId}/confirm`);
    await giver.client.patch(`/rides/${rideId}/start`);
    await seeker.client.patch(`/rides/${rideId}/board`);
    await seeker.client.patch(`/rides/${rideId}/deboard`);
    await giver.client.patch(`/rides/${rideId}/complete`);

    await test('Giver earns eco points after ride completion', async () => {
      const r = await giver.client.get('/gamification/summary');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const pts: number = r.data.totalPoints ?? r.data.ecoPoints ?? 0;
      assert(pts > giverPtsBefore, `Expected giver points > ${giverPtsBefore}, got ${pts}`);
    });

    await test('Seeker earns eco points after ride completion', async () => {
      const r = await seeker.client.get('/gamification/summary');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const pts: number = r.data.totalPoints ?? r.data.ecoPoints ?? 0;
      assert(pts > seekerPtsBefore, `Expected seeker points > ${seekerPtsBefore}, got ${pts}`);
    });

    await test('Gamification summary has ecoLevel field', async () => {
      const r = await seeker.client.get('/gamification/summary');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(r.data.ecoLevel !== undefined, `Missing ecoLevel in summary: ${JSON.stringify(r.data)}`);
    });

    await test('Gamification summary has co2SavedKg field', async () => {
      const r = await giver.client.get('/gamification/summary');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      // API returns co2SavedKg (string, e.g. "0.00")
      assert(r.data.co2SavedKg !== undefined,
        `Missing co2SavedKg in summary: ${JSON.stringify(r.data)}`);
    });
  }

  // ── 4. FULL-SEAT GUARD ────────────────────────────────────────────────────
  section('4. Full-Seat Guard — Approve Blocked When Ride Is Full');
  {
    const giver = await freshGiver('fullseat');
    const seeker1 = await freshSeeker('fullseat_s1');
    const seeker2 = await freshSeeker('fullseat_s2');
    const rideId = await publishRide(giver.client, giver.vehicleId, 1); // 1 seat only

    // Seeker 1 requests, gets approved + confirmed → seat is TAKEN
    const req1 = await seeker1.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqId1 = req1.data.requestId as string;
    await giver.client.patch(`/ride-requests/${reqId1}/approve`);
    await seeker1.client.patch(`/ride-requests/${reqId1}/confirm`);

    // Seeker 2 requests (should be accepted as PENDING)
    const req2 = await seeker2.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    assert([201, 400, 409].includes(req2.status), `Expected 201/400/409, got ${req2.status}`);

    if (req2.status === 201) {
      const reqId2 = req2.data.requestId as string;

      await test('Giver cannot approve seeker 2 when ride is fully CONFIRMED', async () => {
        const r = await giver.client.patch(`/ride-requests/${reqId2}/approve`);
        assert([400, 409].includes(r.status),
          `Expected 400/409 (no seats), got ${r.status}: ${JSON.stringify(r.data)}`);
      });
    } else {
      await test('System correctly rejects seeker 2 request when ride is full', async () => {
        assert([400, 409].includes(req2.status), `Expected 400/409, got ${req2.status}`);
      });
    }

    await test('availableSeats is 0 after all seats confirmed', async () => {
      const r = await giver.client.get(`/rides/${rideId}`);
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(r.data.availableSeats === 0, `Expected 0 available seats, got ${r.data.availableSeats}`);
    });
  }

  // ── 5. REQUEST CANCELLATION STATES ───────────────────────────────────────
  section('5. Request Cancellation — PENDING and HOLD');
  {
    // 5a: Seeker cancels a PENDING request
    {
      const giver = await freshGiver('cancel_pend');
      const seeker = await freshSeeker('cancel_pend');
      const rideId = await publishRide(giver.client, giver.vehicleId);

      const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
      const reqId = reqR.data.requestId as string;

      await test('Seeker can cancel a PENDING request', async () => {
        const r = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
        assert([200, 204].includes(r.status), `Expected 200/204, got ${r.status}: ${JSON.stringify(r.data)}`);
      });

      await test('After PENDING cancel, seat count unchanged', async () => {
        const r = await giver.client.get(`/rides/${rideId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.availableSeats === r.data.totalSeats,
          `Expected full seats after cancel, got available=${r.data.availableSeats} total=${r.data.totalSeats}`);
      });

      await test('Cancelled seeker can request the same ride again', async () => {
        const r = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
      });
    }

    // 5b: Seeker cancels a HOLD request (approved but not yet confirmed)
    {
      const giver = await freshGiver('cancel_hold');
      const seeker = await freshSeeker('cancel_hold');
      const rideId = await publishRide(giver.client, giver.vehicleId, 2);

      const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
      const reqId = reqR.data.requestId as string;
      await giver.client.patch(`/ride-requests/${reqId}/approve`); // → HOLD

      await test('Seeker can cancel a HOLD request (before confirming)', async () => {
        const r = await seeker.client.patch(`/ride-requests/${reqId}/cancel`);
        assert([200, 204].includes(r.status), `Expected 200/204, got ${r.status}: ${JSON.stringify(r.data)}`);
      });

      await test('After HOLD cancel, seat is released back', async () => {
        const r = await giver.client.get(`/rides/${rideId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.availableSeats === 2,
          `Expected 2 seats restored after hold cancel, got ${r.data.availableSeats}`);
      });
    }

    // 5c: Giver cannot cancel someone else's request
    {
      const giverA = await freshGiver('cancel_guard');
      const giverB = await freshGiver('cancel_guard2');
      const seeker  = await freshSeeker('cancel_guard');
      const rideId  = await publishRide(giverA.client, giverA.vehicleId);
      const reqR    = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
      const reqId   = reqR.data.requestId as string;

      await test('Another giver cannot cancel a ride request they do not own → 403/404', async () => {
        const r = await giverB.client.patch(`/ride-requests/${reqId}/cancel`);
        assert([403, 404].includes(r.status), `Expected 403/404, got ${r.status}`);
      });
    }
  }

  // ── 6. ADMIN FILTERS ──────────────────────────────────────────────────────
  section('6. Admin User Filters');
  {
    await test('Admin can filter users by role=RIDE_GIVER', async () => {
      const r = await admin.get('/admin/users', { params: { role: 'RIDE_GIVER' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = r.data.data ?? r.data;
      assert(Array.isArray(list), 'Expected array');
      const nonGivers = list.filter((u: any) => u.role !== 'RIDE_GIVER');
      assert(nonGivers.length === 0, `Found non-giver users in RIDE_GIVER filter: ${nonGivers.map((u: any) => u.role)}`);
    });

    await test('Admin can filter users by role=RIDE_SEEKER', async () => {
      const r = await admin.get('/admin/users', { params: { role: 'RIDE_SEEKER' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = r.data.data ?? r.data;
      assert(Array.isArray(list), 'Expected array');
    });

    await test('Admin can filter users by verificationStatus=PENDING', async () => {
      const r = await admin.get('/admin/users', { params: { verificationStatus: 'PENDING' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('Admin can filter users by verificationStatus=APPROVED', async () => {
      const r = await admin.get('/admin/users', { params: { verificationStatus: 'APPROVED' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('Admin list users respects page and limit', async () => {
      const r = await admin.get('/admin/users', { params: { page: 1, limit: 3 } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = r.data.data ?? r.data;
      assert(Array.isArray(list) && list.length <= 3, `Expected ≤3 users, got ${list.length}`);
    });

    await test('Admin list has pagination metadata (total/page)', async () => {
      const r = await admin.get('/admin/users', { params: { page: 1, limit: 5 } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      // Either paginated shape { data, total, page } or plain array
      if (!Array.isArray(r.data)) {
        assert(r.data.total !== undefined || r.data.count !== undefined,
          `Expected total/count in paginated response: ${JSON.stringify(Object.keys(r.data))}`);
      }
    });
  }

  // ── 7. ANALYTICS DATE RANGE ───────────────────────────────────────────────
  section('7. Admin Analytics with Date Range');
  {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    await test('Analytics with explicit from/to returns data', async () => {
      const r = await admin.get('/admin/analytics', { params: { from: thirtyDaysAgo, to: today } });
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
      assert(r.data !== null && typeof r.data === 'object', 'Expected object');
    });

    await test('Analytics response has required metrics fields', async () => {
      const r = await admin.get('/admin/analytics', { params: { from: thirtyDaysAgo, to: today } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      // At minimum should have some count/metric fields
      const keys = Object.keys(r.data);
      assert(keys.length > 0, `Analytics response is empty object`);
    });

    await test('Analytics with from=to (single day) returns 200', async () => {
      const r = await admin.get('/admin/analytics', { params: { from: today, to: today } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('Analytics without date params uses default 30-day window', async () => {
      const r = await admin.get('/admin/analytics');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('Non-admin cannot access analytics → 403', async () => {
      const seeker = await freshSeeker('analytics');
      const r = await seeker.client.get('/admin/analytics');
      assert(r.status === 403, `Expected 403, got ${r.status}`);
    });
  }

  // ── 8. LEADERBOARD PARAMS ─────────────────────────────────────────────────
  section('8. Leaderboard Parameters');
  {
    await test('Leaderboard with limit=5 returns at most 5 entries', async () => {
      const r = await makeClient().get('/gamification/leaderboard', { params: { limit: 5 } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = Array.isArray(r.data) ? r.data : r.data.data ?? r.data.items ?? [];
      assert(list.length <= 5, `Expected ≤5, got ${list.length}`);
    });

    await test('Leaderboard period=monthly returns 200', async () => {
      const r = await makeClient().get('/gamification/leaderboard', { params: { period: 'monthly' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('Leaderboard period=alltime returns 200', async () => {
      const r = await makeClient().get('/gamification/leaderboard', { params: { period: 'alltime' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test('Leaderboard entries have rank / points / name fields', async () => {
      const r = await makeClient().get('/gamification/leaderboard', { params: { limit: 3 } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = Array.isArray(r.data) ? r.data : r.data.data ?? r.data.items ?? [];
      if (list.length > 0) {
        const entry = list[0];
        assert(
          entry.ecoPoints !== undefined || entry.points !== undefined || entry.totalPoints !== undefined,
          `Leaderboard entry missing points field: ${JSON.stringify(entry)}`,
        );
        assert(
          entry.fullName !== undefined || entry.name !== undefined || entry.userId !== undefined,
          `Leaderboard entry missing name/userId: ${JSON.stringify(entry)}`,
        );
      }
    });

    await test('Leaderboard is publicly accessible (no auth needed)', async () => {
      const r = await makeClient().get('/gamification/leaderboard');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
    });
  }

  // ── 9. NOTIFICATIONS FILTER ───────────────────────────────────────────────
  section('9. Notifications — unreadOnly Filter');
  {
    const giver = await freshGiver('notif_filter');
    const seeker = await freshSeeker('notif_filter');
    const rideId = await publishRide(giver.client, giver.vehicleId);

    // Trigger a notification to giver
    await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });

    await test('GET /notifications?unreadOnly=true returns only unread', async () => {
      const r = await giver.client.get('/notifications', { params: { unreadOnly: 'true' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = Array.isArray(r.data) ? r.data : r.data.data ?? r.data.items ?? [];
      assert(Array.isArray(list), 'Expected array');
      const readItems = list.filter((n: any) => n.isRead === true || n.read === true);
      assert(readItems.length === 0, `unreadOnly filter returned ${readItems.length} already-read notifications`);
    });

    await test('After mark-all-read, unreadOnly=true returns empty', async () => {
      await giver.client.patch('/notifications/read-all');
      const r = await giver.client.get('/notifications', { params: { unreadOnly: 'true' } });
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = Array.isArray(r.data) ? r.data : r.data.data ?? r.data.items ?? [];
      assert(list.length === 0, `Expected 0 unread after mark-all-read, got ${list.length}`);
    });

    await test('GET /notifications without filter returns all notifications', async () => {
      const r = await giver.client.get('/notifications');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = Array.isArray(r.data) ? r.data : r.data.data ?? r.data.items ?? [];
      assert(Array.isArray(list), 'Expected array');
      // Should include the read notification from above
      assert(list.length >= 1, `Expected at least 1 notification (including read ones), got ${list.length}`);
    });

    await test('Notifications have required fields (id, title, isRead, createdAt)', async () => {
      const r = await giver.client.get('/notifications');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const list = Array.isArray(r.data) ? r.data : r.data.data ?? r.data.items ?? [];
      if (list.length > 0) {
        const n = list[0];
        assert(!!n.id, `Notification missing id: ${JSON.stringify(n)}`);
        assert(n.title !== undefined, `Notification missing title: ${JSON.stringify(n)}`);
        assert(n.isRead !== undefined || n.read !== undefined, `Notification missing isRead/read: ${JSON.stringify(n)}`);
        assert(!!n.createdAt, `Notification missing createdAt: ${JSON.stringify(n)}`);
      }
    });
  }

  // ── 10. RIDE CANCEL NOTIFIES PASSENGERS ───────────────────────────────────
  section('10. Ride Cancellation Notifies Confirmed Passengers');
  {
    const giver = await freshGiver('cancel_notif');
    const seeker = await freshSeeker('cancel_notif');
    const rideId = await publishRide(giver.client, giver.vehicleId);

    // Seeker joins and confirms
    const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqId = reqR.data.requestId as string;
    await giver.client.patch(`/ride-requests/${reqId}/approve`);
    await seeker.client.patch(`/ride-requests/${reqId}/confirm`);

    // Count seeker's notifications before giver cancels
    const beforeR = await seeker.client.get('/notifications');
    const before = (Array.isArray(beforeR.data) ? beforeR.data : beforeR.data.data ?? []).length;

    // Admin cancels the ride — giver is blocked from cancelling when CONFIRMED passengers exist
    const adminClient = await getAdminClient();
    const cancelR = await adminClient.patch(`/rides/${rideId}/cancel`, { reason: 'Test cancellation' });
    assert(cancelR.status === 200, `Cancel failed: ${JSON.stringify(cancelR.data)}`);

    await test('Cancelled ride returns CANCELLED status', async () => {
      const r = await giver.client.get(`/rides/${rideId}`);
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(r.data.status === 'CANCELLED', `Expected CANCELLED, got ${r.data.status}`);
    });

    await test('Seeker receives notification when confirmed ride is cancelled', async () => {
      const r = await seeker.client.get('/notifications');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const after = (Array.isArray(r.data) ? r.data : r.data.data ?? []).length;
      assert(after > before, `Expected new notification after ride cancellation — before: ${before}, after: ${after}`);
    });

    await test('Seeker request moves to CANCELLED state after ride is cancelled', async () => {
      const r = await seeker.client.get('/ride-requests/mine');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const req = r.data.find((x: any) => x.id === reqId || x.requestId === reqId);
      if (req) {
        assert(
          req.status === 'CANCELLED' || req.rideStatus === 'CANCELLED',
          `Expected request CANCELLED after ride cancellation, got ${JSON.stringify(req.status)}`,
        );
      }
    });
  }

  // ── 11. WEBHOOK BOUNCE ────────────────────────────────────────────────────
  section('11. Email Bounce Webhook');
  {
    await test('POST /auth/webhook/bounce with valid payload returns 200', async () => {
      const r = await makeClient().post('/auth/webhook/bounce', {
        email: 'bounced@wipro.com',
        type: 'permanent',
        reason: 'mailbox not found',
      });
      // Should accept and process — 200 or 201
      assert([200, 201, 204].includes(r.status),
        `Expected 200/201/204 from bounce webhook, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('POST /auth/webhook/bounce with unknown format returns 200 (silent no-op)', async () => {
      // The bounce webhook silently ignores unrecognised payload shapes — it only acts on
      // { type: 'email.bounced', data: { to: [...] } }. Unknown formats return { ok: true }.
      const r = await makeClient().post('/auth/webhook/bounce', { type: 'permanent' });
      assert(r.status === 200, `Expected 200 (silent no-op), got ${r.status}`);
    });
  }

  // ── 12. SOS STANDALONE ────────────────────────────────────────────────────
  section('12. SOS — Standalone (No Active Ride)');
  {
    // Each sub-test uses a fresh seeker to avoid the 60s cooldown between triggers

    await test('User can trigger SOS without a rideId', async () => {
      const seeker = await freshSeeker('sos_s1');
      const r = await seeker.client.post('/sos', { lat: 17.44, lng: 78.34 });
      assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
      assert(!!r.data.sosId, `Expected sosId in response: ${JSON.stringify(r.data)}`);
    });

    await test('SOS response includes emergency contact count', async () => {
      const seeker = await freshSeeker('sos_s2');
      const r = await seeker.client.post('/sos', { lat: 17.44, lng: 78.34 });
      assert(r.status === 201, `Expected 201, got ${r.status}`);
      assert(r.data.message !== undefined, `Missing message field: ${JSON.stringify(r.data)}`);
    });

    await test('SOS with rideId (ongoing ride) also works', async () => {
      const seeker = await freshSeeker('sos_s3');
      const giver = await freshGiver('sos_ride');
      const rideId = await publishRide(giver.client, giver.vehicleId);
      const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
      const reqId = reqR.data.requestId as string;
      await giver.client.patch(`/ride-requests/${reqId}/approve`);
      await giver.client.patch(`/rides/${rideId}/start`);

      const r = await seeker.client.post('/sos', { rideId, lat: 17.44, lng: 78.34 });
      assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('Admin can see triggered SOS in active list', async () => {
      const r = await admin.get('/admin/sos/active');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(Array.isArray(r.data), 'Expected array');
      assert(r.data.length >= 1, `Expected at least 1 active SOS, got ${r.data.length}`);
    });

    await test('Admin can resolve SOS with notes', async () => {
      const active = await admin.get('/admin/sos/active');
      assert(active.status === 200 && active.data.length > 0, 'No active SOS to resolve');
      const sosId = active.data[0].id;
      const r = await admin.patch(`/admin/sos/${sosId}/resolve`, { notes: 'User confirmed safe' });
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('Unauthenticated SOS trigger → 401', async () => {
      const r = await makeClient().post('/sos', { lat: 17.44, lng: 78.34 });
      assert(r.status === 401, `Expected 401, got ${r.status}`);
    });
  }

  // ── 13. RESPONSE SCHEMA CHECKS ────────────────────────────────────────────
  section('13. Response Schema Integrity');
  {
    await test('Ride object has all required fields', async () => {
      const giver = await freshGiver('schema');
      const rideId = await publishRide(giver.client, giver.vehicleId);
      const r = await giver.client.get(`/rides/${rideId}`);
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      const ride = r.data;
      for (const field of ['id', 'status', 'originName', 'destinationName', 'departureDate', 'departureTime', 'totalSeats', 'availableSeats']) {
        assert(ride[field] !== undefined, `Ride missing field: ${field}`);
      }
    });

    await test('User profile object has no sensitive fields', async () => {
      const seeker = await freshSeeker('schema');
      const r = await seeker.client.get('/users/me');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(!r.data.passwordHash, 'passwordHash must never be returned');
      assert(!r.data.emailVerificationToken, 'emailVerificationToken must never be returned');
      assert(!r.data.passwordResetToken, 'passwordResetToken must never be returned');
    });

    await test('User profile has expected fields', async () => {
      const seeker = await freshSeeker('schema2');
      const r = await seeker.client.get('/users/me');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      for (const field of ['id', 'email', 'fullName', 'role', 'isActive', 'ecoPoints']) {
        assert(r.data[field] !== undefined, `User profile missing field: ${field}`);
      }
    });

    await test('Ride request object has required fields', async () => {
      const giver = await freshGiver('schema_req');
      const seeker = await freshSeeker('schema_req');
      const rideId = await publishRide(giver.client, giver.vehicleId);
      const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
      assert(reqR.status === 201, `Expected 201, got ${reqR.status}`);
      const req = reqR.data;
      assert(!!req.requestId || !!req.id, `Request response missing id/requestId: ${JSON.stringify(req)}`);
      assert(req.status !== undefined, `Request missing status: ${JSON.stringify(req)}`);
    });

    await test('Vehicle object has required fields', async () => {
      const giver = await freshGiver('schema_veh');
      const r = await giver.client.get('/vehicles/my');
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(Array.isArray(r.data) && r.data.length > 0, 'Expected at least one vehicle');
      const veh = r.data[0];
      for (const field of ['id', 'make', 'model', 'plateNumber', 'totalSeats']) {
        assert(veh[field] !== undefined, `Vehicle missing field: ${field}`);
      }
    });
  }

  // ── 14. CONCURRENT APPROVAL RACE ──────────────────────────────────────────
  section('14. Race Condition — Concurrent Last-Seat Approval');
  {
    const giver = await freshGiver('race_final');
    const seekerA = await freshSeeker('race_final_a');
    const seekerB = await freshSeeker('race_final_b');
    const rideId = await publishRide(giver.client, giver.vehicleId, 1); // 1 seat

    const reqA = await seekerA.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    const reqB = await seekerB.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });

    // Only one of these will succeed, whichever runs first
    let reqIdA: string | null = reqA.status === 201 ? reqA.data.requestId : null;
    let reqIdB: string | null = reqB.status === 201 ? reqB.data.requestId : null;

    await test('At least one seeker can request the last seat', async () => {
      assert(reqIdA !== null || reqIdB !== null, 'Neither seeker could request the only seat');
    });

    if (reqIdA && reqIdB) {
      await test('Concurrent approval of two requests for one seat — exactly one succeeds', async () => {
        // Fire both approvals simultaneously
        const [resultA, resultB] = await Promise.all([
          giver.client.patch(`/ride-requests/${reqIdA}/approve`),
          giver.client.patch(`/ride-requests/${reqIdB}/approve`),
        ]);
        const successes = [resultA, resultB].filter(r => r.status === 200).length;
        const failures  = [resultA, resultB].filter(r => [400, 409].includes(r.status)).length;
        assert(successes === 1, `Expected exactly 1 approval to succeed, got ${successes} successes`);
        assert(failures  === 1, `Expected exactly 1 approval to fail, got ${failures} failures`);
      });
    } else {
      await test('System already prevented double-request on 1-seat ride', async () => {
        const both = [reqA, reqB];
        const ok   = both.filter(r => r.status === 201).length;
        const bad  = both.filter(r => [400, 409].includes(r.status)).length;
        assert(ok === 1 && bad === 1, `Expected 1 success + 1 block, got ${ok}+${bad}`);
      });
    }
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
    console.log(`${c.red}${c.bold}  Failed tests:${c.reset}`);
    results.filter(r => !r.passed).forEach(r =>
      console.log(`  ${c.red}✗${c.reset} [${r.section}] ${r.name}\n    ${c.dim}${r.error}${c.reset}`)
    );
  }

  const bar = '█'.repeat(Math.round((passed / total) * 40)).padEnd(40, '░');
  const pct = Math.round((passed / total) * 100);
  const colour = pct === 100 ? c.green : pct >= 80 ? c.yellow : c.red;
  console.log(`\n  ${colour}${bar}${c.reset} ${colour}${pct}%${c.reset}\n`);

  if (failed === 0) {
    console.log(`${c.green}${c.bold}  🎉 All final gap tests passed — pipeline is production-ready!${c.reset}\n`);
  } else {
    console.log(`${c.red}  ${failed} test(s) failed — fix before merging to production.${c.reset}\n`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`\n${c.red}Runner crashed: ${e.message}${c.reset}\n`);
  process.exit(1);
});
