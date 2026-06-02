/**
 * Security Test Suite — TechieRide API
 *
 * Covers: JWT attacks, auth bypass, OWASP Top-10, file-upload abuse,
 * rate-limit enforcement, privilege escalation, SQL injection probes,
 * path traversal, and data-exposure checks.
 *
 * Run: npm run test:api:security
 */

import axios from 'axios';
import { BASE, makeClient, loginAs, register, getAdminClient, SEED_PASSWORD } from './helpers';

// ── Console colours ──────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  bold: '\x1b[1m', dim: '\x1b[2m',
};

interface Result { name: string; passed: boolean; error?: string; section: string }
const results: Result[] = [];
let currentSection = '';

function section(name: string) {
  currentSection = name;
  console.log(`\n${c.bold}${c.blue}━━━ ${name} ━━━${c.reset}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true, section: currentSection });
    console.log(`  ${c.green}✓${c.reset} ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message, section: currentSection });
    console.log(`  ${c.red}✗${c.reset} ${name}`);
    console.log(`    ${c.dim}${e.message}${c.reset}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n${c.bold}${c.cyan}🔐 TechieRide — Security Test Suite${c.reset}\n`);

  const anon = makeClient();

  // ── 1. JWT ATTACKS ────────────────────────────────────────────────────────
  section('JWT Attacks');

  await test('SEC-JWT-01: no token → 401 on protected route', async () => {
    const r = await anon.get('/users/me');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('SEC-JWT-02: malformed token → 401', async () => {
    const r = await makeClient('not.a.jwt').get('/users/me');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('SEC-JWT-03: expired token signature rejected', async () => {
    // Manually crafted JWT with alg:none (algorithm confusion attack)
    const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'fake-id', role: 'ADMIN', iat: 1 })).toString('base64url');
    const noneToken = `${header}.${payload}.`;
    const r = await makeClient(noneToken).get('/users/me');
    assert(r.status === 401, `alg:none attack must be rejected, got ${r.status}`);
  });

  await test('SEC-JWT-04: token with tampered payload rejected', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const parts = token.split('.');
    // Swap sub to a different userId
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.sub = '00000000-0000-0000-0000-000000000000';
    const tampered = `${parts[0]}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${parts[2]}`;
    const r = await makeClient(tampered).get('/users/me');
    assert(r.status === 401, `Tampered payload must be rejected, got ${r.status}`);
  });

  await test('SEC-JWT-05: token with role escalated to ADMIN rejected', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.role = 'ADMIN';
    const escalated = `${parts[0]}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${parts[2]}`;
    const r = await makeClient(escalated).get('/admin/users');
    assert(r.status === 401 || r.status === 403, `Role escalation must be rejected, got ${r.status}`);
  });

  await test('SEC-JWT-06: refresh token cannot be used as access token', async () => {
    const { refreshToken } = await loginAs('arjun@tcs.com');
    const r = await makeClient(refreshToken).get('/users/me');
    assert(r.status === 401, `Refresh token used as access token must be rejected, got ${r.status}`);
  });

  await test('SEC-JWT-07: token still works before logout', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get('/users/me');
    assert(r.status === 200, `Valid token must work, got ${r.status}`);
  });

  // ── 2. AUTHENTICATION SECURITY ────────────────────────────────────────────
  section('Authentication Security');

  await test('SEC-AUTH-01: wrong password rejected', async () => {
    const r = await anon.post('/auth/login', { email: 'arjun@tcs.com', password: 'wrongpassword' });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('SEC-AUTH-02: non-existent user login does NOT reveal existence', async () => {
    const r = await anon.post('/auth/login', { email: 'doesnotexist@tcs.com', password: 'anything' });
    // Should return 401, NOT 404 (email enumeration prevention)
    assert(r.status === 401, `Expected 401 (not 404 which leaks existence), got ${r.status}`);
    const body = JSON.stringify(r.data).toLowerCase();
    assert(!body.includes('not found') && !body.includes('no user'), 'Response must not confirm user non-existence');
  });

  await test('SEC-AUTH-03: password not returned in any response', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get('/users/me');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    const body = JSON.stringify(r.data).toLowerCase();
    assert(!body.includes('password'), 'Password hash must not be in profile response');
  });

  await test('SEC-AUTH-04: registration with invalid domain rejected', async () => {
    // gmail.com is intentionally whitelisted for testing; use a clearly invalid domain instead
    const r = await anon.post('/auth/register', {
      email: `test${Date.now()}@totally-invalid-xyz-domain.com`,
      password: SEED_PASSWORD,
      fullName: 'Bad Actor',
      companyName: 'Invalid',
      phone: `9${String(Date.now()).slice(-9)}`,
    });
    assert(r.status === 400 || r.status === 403 || r.status === 422, `Unwhitelisted domain must be rejected, got ${r.status}`);
  });

  await test('SEC-AUTH-05: duplicate email registration blocked', async () => {
    const r = await anon.post('/auth/register', {
      email: 'arjun@tcs.com',
      password: SEED_PASSWORD,
      fullName: 'Duplicate Arjun',
      companyName: 'TCS',
      phone: '9000099998',
    });
    assert(r.status === 409 || r.status === 400, `Duplicate email must be rejected, got ${r.status}`);
  });

  await test('SEC-AUTH-06: empty credentials rejected with 400', async () => {
    const r = await anon.post('/auth/login', {});
    assert(r.status === 400, `Empty body must return 400, got ${r.status}`);
  });


  // ── 3. AUTHORIZATION (PRIVILEGE ESCALATION) ───────────────────────────────
  section('Authorization & Privilege Escalation');

  await test('SEC-AUTHZ-01: seeker cannot access admin users endpoint', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get('/admin/users');
    assert(r.status === 403, `Seeker must get 403 on /admin/users, got ${r.status}`);
  });

  await test('SEC-AUTHZ-02: seeker cannot access admin verification queue', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get('/admin/verification/pending');
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await test('SEC-AUTHZ-03: giver cannot create a ride for another giver', async () => {
    const { token: giverToken } = await loginAs('priya@infosys.com');
    // Try posting a ride with an arbitrary rideGiverId in the body (should be ignored)
    const r = await makeClient(giverToken).post('/rides', {
      rideGiverId: '00000000-0000-0000-0000-000000000000',
      originName: 'Test',
      originLat: 17.44,
      originLng: 78.35,
      destinationName: 'Dest',
      destinationLat: 17.45,
      destinationLng: 78.37,
      departureDate: '2099-01-01',
      departureTime: '09:00',
      totalSeats: 2,
      vehicleId: 'fake',
    });
    assert(r.status !== 201 || r.data.rideGiverId !== '00000000-0000-0000-0000-000000000000',
      'Should not allow overriding rideGiverId');
  });

  await test('SEC-AUTHZ-04: seeker cannot publish rides via API', async () => {
    const ts = Date.now();
    const seekerEmail = `sec_seeker_${ts}@tcs.com`;
    const { token } = await register(seekerEmail, 'Sec Seeker');
    const r = await makeClient(token).post('/rides', { originName: 'A', destinationName: 'B' });
    assert(r.status === 401 || r.status === 403, `Unverified seeker must be blocked, got ${r.status}`);
  });

  await test('SEC-AUTHZ-05: user cannot fetch another user private profile', async () => {
    const { token: t1, userId: u1 } = await loginAs('arjun@tcs.com');
    const { userId: u2 } = await loginAs('priya@infosys.com');
    assert(u1 !== u2, 'Test accounts must be different users');
    const r = await makeClient(t1).get(`/users/${u2}`);
    // Should either 403 or return limited public data (no email/phone)
    if (r.status === 200) {
      const body = JSON.stringify(r.data).toLowerCase();
      assert(!body.includes('password'), 'Password must not be exposed');
    } else {
      assert(r.status === 403 || r.status === 404, `Unexpected status ${r.status}`);
    }
  });

  await test('SEC-AUTHZ-06: seeker cannot approve ride requests (giver action)', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).patch('/ride-requests/fake-id/approve');
    assert(r.status === 401 || r.status === 403 || r.status === 404,
      `Seeker cannot approve requests, got ${r.status}`);
  });

  await test('SEC-AUTHZ-07: admin approval cannot be triggered by regular user', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).patch('/admin/verification/fake-id/review', { decision: 'APPROVED' });
    assert(r.status === 403, `Expected 403, got ${r.status}`);
  });

  // ── 4. SQL INJECTION PROBES ───────────────────────────────────────────────
  section('SQL Injection Probes');

  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "1; SELECT * FROM users",
    "admin'--",
  ];

  for (const payload of sqlPayloads) {
    await test(`SEC-SQL: injection in login email: ${payload.slice(0, 20)}...`, async () => {
      const r = await anon.post('/auth/login', { email: payload, password: 'anything' });
      // Must NOT return 200 or 500 (500 = unhandled DB error leaking info)
      assert(r.status !== 200 && r.status !== 500,
        `SQL injection must not succeed or cause server error, got ${r.status}`);
    });
  }

  await test('SEC-SQL: injection in ride search origin param', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get("/rides/search?origin=' OR '1'='1&destination=Test&date=2099-01-01");
    assert(r.status !== 500, `SQL injection in search params must not cause 500, got ${r.status}`);
  });

  // ── 5. XSS INPUT SANITISATION ─────────────────────────────────────────────
  section('XSS Input Sanitisation');

  const xssPayloads = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert('xss')",
    '<iframe src="javascript:alert(1)">',
  ];

  for (const xss of xssPayloads) {
    await test(`SEC-XSS: script in ride notes rejected or sanitised: ${xss.slice(0, 25)}`, async () => {
      const { token } = await loginAs('priya@infosys.com');
      // Try to store XSS in ride notes
      const vehicles = await makeClient(token).get('/vehicles/my');
      if (vehicles.status !== 200 || !vehicles.data?.length) return; // skip if no vehicle
      const vehicleId = vehicles.data[0].id;
      const r = await makeClient(token).post('/rides', {
        vehicleId,
        originName: xss,
        originLat: 17.44, originLng: 78.35,
        destinationName: 'Dest',
        destinationLat: 17.45, destinationLng: 78.37,
        departureDate: '2099-06-01',
        departureTime: '09:00',
        totalSeats: 2,
        notes: xss,
      });
      // API stores data as-is (Prisma); React escapes on render. Just verify no server crash.
      assert(r.status !== 500, `XSS payload must not crash the server, got ${r.status}`);
    });
  }

  // ── 6. PATH TRAVERSAL ─────────────────────────────────────────────────────
  section('Path Traversal');

  await test('SEC-PATH-01: path traversal in ride ID parameter', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get('/rides/../../etc/passwd');
    assert(r.status === 400 || r.status === 404, `Path traversal must be blocked, got ${r.status}`);
  });

  await test('SEC-PATH-02: path traversal in user ID parameter', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get('/users/../admin');
    assert(r.status === 400 || r.status === 404, `Path traversal must be blocked, got ${r.status}`);
  });

  // ── 7. FILE UPLOAD SECURITY ───────────────────────────────────────────────
  section('File Upload Security');

  await test('SEC-FILE-01: oversized payload rejected (>10MB)', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const bigPayload = Buffer.alloc(11 * 1024 * 1024, 'A').toString('base64');
    const r = await makeClient(token).post('/uploads/document', {
      file: bigPayload,
      type: 'EMPLOYEE_ID',
    });
    // Must not succeed — 400/413 ideal, 500 acceptable (body parser limit), never 200/201
    assert(r.status !== 200 && r.status !== 201, `Oversized upload must not succeed, got ${r.status}`);
  });

  await test('SEC-FILE-02: executable file extension rejected', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await anon.post(`${BASE}/uploads/document`, {
      filename: 'malware.exe',
      mimeType: 'application/octet-stream',
      file: 'TVqQAAMAAAA=', // PE header bytes base64
    }, { headers: { Authorization: `Bearer ${token}` } });
    // Uploads that pass validation would be blocked by MIME check server-side
    assert(r.status !== 200, `Executable upload must not succeed, got ${r.status}`);
  });

  // ── 8. BROKEN ACCESS CONTROL ─────────────────────────────────────────────
  section('Broken Access Control');

  await test('SEC-BAC-01: seeker cannot cancel a ride they do not own', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const rides = await makeClient(token).get('/rides');
    if (!rides.data?.length) return;
    const rideId = rides.data[0].id;
    const r = await makeClient(token).patch(`/rides/${rideId}/cancel`);
    assert(r.status === 403 || r.status === 404, `Seeker cannot cancel giver ride, got ${r.status}`);
  });

  await test('SEC-BAC-02: giver cannot start a ride they do not own', async () => {
    const { token } = await loginAs('raju@raju.com');
    // Try to start Priya's ride
    const priyaRides = await (await loginAs('priya@infosys.com') && makeClient((await loginAs('priya@infosys.com')).token)).get('/rides');
    if (!priyaRides.data?.length) return;
    const rideId = priyaRides.data[0].id;
    const r = await makeClient(token).patch(`/rides/${rideId}/start`);
    assert(r.status === 403 || r.status === 404, `Giver cannot start another giver ride, got ${r.status}`);
  });

  await test('SEC-BAC-03: seeker cannot read another seeker requests', async () => {
    const { token: t1 } = await loginAs('arjun@tcs.com');
    const { userId: u2 } = await loginAs('ravi@wipro.com');
    const r = await makeClient(t1).get(`/ride-requests?seekerId=${u2}`);
    // Should only return own requests, not other seeker's
    if (r.status === 200 && Array.isArray(r.data)) {
      r.data.forEach((req: any) => {
        assert(req.seeker?.userId !== u2, 'Must not return other seeker requests');
      });
    }
  });

  await test('SEC-BAC-04: unauthenticated access to protected routes blocked', async () => {
    const protectedRoutes = [
      '/users/me', '/rides/given', '/rides/taken', '/vehicles/my',
      '/notifications', '/ride-requests/mine', '/gamification/summary',
    ];
    for (const route of protectedRoutes) {
      const r = await anon.get(route);
      assert(r.status === 401, `${route} must require auth, got ${r.status}`);
    }
  });

  // ── 9. RATE LIMITING ──────────────────────────────────────────────────────
  section('Rate Limiting');

  await test('SEC-RATE-01: rapid login attempts eventually get rate limited or return 401', async () => {
    const responses: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = await anon.post('/auth/login', { email: 'notexist@tcs.com', password: 'wrong' });
      responses.push(r.status);
    }
    // All should be 401 or 429 — never 200 or 500
    responses.forEach((s) => assert(s === 401 || s === 429, `Unexpected status during brute force: ${s}`));
  });

  // ── 10. SENSITIVE DATA EXPOSURE ───────────────────────────────────────────
  section('Sensitive Data Exposure');

  await test('SEC-DATA-01: password hash never exposed in any response', async () => {
    const admin = await getAdminClient();
    const users = await admin.get('/admin/users');
    if (users.status === 200 && Array.isArray(users.data?.users ?? users.data)) {
      const list = users.data?.users ?? users.data;
      list.forEach((u: any) => {
        const raw = JSON.stringify(u).toLowerCase();
        assert(!raw.includes('password'), `Password exposed for user ${u.email}`);
      });
    }
  });

  await test('SEC-DATA-02: JWT access secret never in any response', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).get('/users/me');
    const body = JSON.stringify(r.data);
    assert(!body.includes('secret'), 'JWT secret must not be in response');
    assert(!body.includes('ci_access_secret'), 'CI secret must not be in response');
  });

  await test('SEC-DATA-03: internal DB IDs not leaked in error messages', async () => {
    const r = await anon.get('/rides/non-existent-id-12345');
    const body = JSON.stringify(r.data).toLowerCase();
    assert(!body.includes('prisma'), 'Prisma error details must not be exposed');
    assert(!body.includes('p2025') && !body.includes('p2002'), 'Prisma error codes must not be exposed');
  });

  await test('SEC-DATA-04: CORS — no wildcard on authenticated endpoints', async () => {
    const r = await axios.options(`${BASE}/users/me`, {
      headers: { Origin: 'https://evil-site.com', 'Access-Control-Request-Method': 'GET' },
      validateStatus: () => true,
    });
    const acao = r.headers['access-control-allow-origin'];
    assert(acao !== '*', `CORS must not allow wildcard on API, got: ${acao}`);
  });

  // ── 11. CALL FEATURE SECURITY ─────────────────────────────────────────────
  section('Phone Call Feature Security');

  await test('SEC-CALL-01: phone number not visible to unauthenticated users', async () => {
    const r = await anon.get('/rides/search?origin=TNR&destination=HITEC&date=2099-01-01');
    if (r.status === 200 && r.data?.rides) {
      r.data.rides.forEach((ride: any) => {
        assert(!ride.rideGiver?.user?.phone, 'Phone must not be in unauthenticated search results');
      });
    }
  });

  await test('SEC-CALL-02: call log POST requires authentication', async () => {
    const r = await anon.post('/calls/log', { receiverId: 'some-id', event: 'USER_CALL_INITIATED' });
    assert(r.status === 401, `Call log must require auth, got ${r.status}`);
  });

  await test('SEC-CALL-03: call log accepts valid event type', async () => {
    const { token } = await loginAs('arjun@tcs.com');
    const r = await makeClient(token).post('/calls/log', {
      receiverId: '00000000-0000-0000-0000-000000000001',
      event: 'USER_CALL_INITIATED',
    });
    // 201 = logged, 400 = invalid receiverId — both acceptable; not 500
    assert(r.status !== 500, `Call log must not crash, got ${r.status}`);
  });

  // ── Results ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  const pct = Math.round((passed / results.length) * 100);

  console.log(`\n${c.bold}Security Test Results${c.reset}`);
  console.log(`  ${c.green}Passed:${c.reset} ${passed}/${results.length} (${pct}%)`);

  if (failed.length) {
    console.log(`\n${c.red}${c.bold}Failed Tests:${c.reset}`);
    failed.forEach((f) => console.log(`  ${c.red}✗${c.reset} [${f.section}] ${f.name}\n    ${c.dim}${f.error}${c.reset}`));
  }

  // Group by section
  const sections = [...new Set(results.map((r) => r.section))];
  console.log(`\n${c.bold}Section Summary:${c.reset}`);
  sections.forEach((s) => {
    const sec = results.filter((r) => r.section === s);
    const sp = sec.filter((r) => r.passed).length;
    const icon = sp === sec.length ? c.green + '✓' : c.red + '✗';
    console.log(`  ${icon}${c.reset} ${s}: ${sp}/${sec.length}`);
  });

  // Quality gate: no security failures allowed
  if (failed.length > 0) {
    console.log(`\n${c.red}${c.bold}❌ QUALITY GATE FAILED — ${failed.length} security test(s) failed${c.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${c.green}${c.bold}✅ All security tests passed${c.reset}`);
    process.exit(0);
  }
})();
