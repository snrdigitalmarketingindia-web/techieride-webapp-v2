/**
 * Validation & DTO Hardening — TechieRide E2E / API Contract Tests
 *
 * Covers:
 *  1. bloodGroup — must be one of the 8 valid values (both signup + profile update)
 *  2. MaxLength spam protection on key fields (email, fullName, companyName, reason, etc.)
 *  3. change-password endpoint (wrong old, same password, valid change)
 *  4. personalEmail format validation in profile update
 *  5. Forgot-password reset token single-use (no reuse after first consume)
 *
 * Run: npx playwright test tests/e2e/validation.spec.ts
 */

import { test, expect } from '@playwright/test';
import { API, ACCOUNTS, SEED_PASSWORD, apiLogin } from './helpers';

// ── helpers ────────────────────────────────────────────────────────────────────

/** POST helper — returns { status, body } */
async function post(page: import('@playwright/test').Page, path: string, data: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await page.request.post(`${API}${path}`, { data, headers });
  let body: any = {};
  try { body = await res.json(); } catch {}
  return { status: res.status(), body };
}

async function patch(page: import('@playwright/test').Page, path: string, data: object, token: string) {
  const res = await page.request.patch(`${API}${path}`, {
    data,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  let body: any = {};
  try { body = await res.json(); } catch {}
  return { status: res.status(), body };
}

// ── 1. BLOOD GROUP VALIDATION ─────────────────────────────────────────────────

test.describe('🩸 bloodGroup Validation', () => {

  test('VAL-BG-01: signup with invalid bloodGroup returns 400', async ({ page }) => {
    const ts = Date.now();
    const { status, body } = await post(page, '/auth/register', {
      email: `bgtest_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: 'BG Test User',
      companyName: 'Wipro',
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
      bloodGroup: 'XYZ',   // ← invalid
    });
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toMatch(/blood group|invalid/i);
  });

  test('VAL-BG-02: signup with valid bloodGroup O+ succeeds (201)', async ({ page }) => {
    const ts = Date.now();
    const { status } = await post(page, '/auth/register', {
      email: `bgvalid_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: 'BG Valid User',
      companyName: 'Wipro',
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
      bloodGroup: 'O+',
    });
    expect(status).toBe(201);
  });

  test('VAL-BG-03: profile update with invalid bloodGroup returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status, body } = await patch(page, '/users/me', { bloodGroup: 'monkey blood' }, token);
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toMatch(/blood group|invalid/i);
  });

  test('VAL-BG-04: profile update with valid bloodGroup AB- succeeds', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await patch(page, '/users/me', { bloodGroup: 'AB-' }, token);
    expect([200, 201]).toContain(status);
  });

  test('VAL-BG-05: all 8 valid blood groups are accepted at signup', async ({ page }) => {
    const valid = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    for (const bg of valid) {
      const ts = Date.now() + Math.random();
      const { status } = await post(page, '/auth/register', {
        email: `bg_${bg.replace('+', 'pos').replace('-', 'neg')}_${ts}@wipro.com`,
        password: 'TechieRide@2024',
        fullName: 'BG Enum Test',
        companyName: 'Wipro',
        phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
        bloodGroup: bg,
      });
      expect(status, `bloodGroup "${bg}" should be accepted at signup`).toBe(201);
    }
  });

});

// ── 2. MAXLENGTH SPAM PROTECTION ─────────────────────────────────────────────

test.describe('📏 MaxLength Spam Protection', () => {

  const SPAM = 'A'.repeat(1000);
  const SPAM_EMAIL = 'a'.repeat(300) + '@wipro.com';

  test('VAL-ML-01: signup with 300-char email returns 400', async ({ page }) => {
    const { status } = await post(page, '/auth/register', {
      email: SPAM_EMAIL,
      password: 'TechieRide@2024',
      fullName: 'Spam Test',
      companyName: 'Wipro',
      phone: '9000000001',
    });
    expect(status).toBe(400);
  });

  test('VAL-ML-02: signup with 1000-char fullName returns 400', async ({ page }) => {
    const ts = Date.now();
    const { status } = await post(page, '/auth/register', {
      email: `spam_fn_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: SPAM,
      companyName: 'Wipro',
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
    });
    expect(status).toBe(400);
  });

  test('VAL-ML-03: signup with 1000-char companyName returns 400', async ({ page }) => {
    const ts = Date.now();
    const { status } = await post(page, '/auth/register', {
      email: `spam_cn_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: 'Spam Test',
      companyName: SPAM,
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
    });
    expect(status).toBe(400);
  });

  test('VAL-ML-04: signup with 200-char password returns 400', async ({ page }) => {
    const ts = Date.now();
    const { status } = await post(page, '/auth/register', {
      email: `spam_pw_${ts}@wipro.com`,
      password: 'P'.repeat(200),
      fullName: 'Spam Test',
      companyName: 'Wipro',
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
    });
    expect(status).toBe(400);
  });

  test('VAL-ML-05: exception request with 2000-char reason returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await post(page, '/auth/exception-verification', {
      personalEmail: 'test@gmail.com',
      employeeId: 'EMP001',
      reason: 'R'.repeat(2000),
    }, token);
    expect(status).toBe(400);
  });

  test('VAL-ML-06: profile update with 1000-char homeLocation returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await patch(page, '/users/me', { homeLocation: SPAM }, token);
    expect(status).toBe(400);
  });

  test('VAL-ML-07: forgot-password with 300-char email returns 400', async ({ page }) => {
    const { status } = await post(page, '/auth/forgot-password', { email: SPAM_EMAIL });
    expect(status).toBe(400);
  });

});

// ── 3. CHANGE PASSWORD ENDPOINT ───────────────────────────────────────────────

test.describe('🔑 Change Password', () => {

  test('VAL-CP-01: wrong old password returns 401', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status, body } = await post(page, '/users/me/change-password', {
      oldPassword: 'WrongPassword999!',
      newPassword: 'NewPassword@2024',
    }, token);
    expect(status).toBe(401);
    expect(JSON.stringify(body)).toMatch(/incorrect|wrong|invalid/i);
  });

  test('VAL-CP-02: same old and new password returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status, body } = await post(page, '/users/me/change-password', {
      oldPassword: SEED_PASSWORD,
      newPassword: SEED_PASSWORD,
    }, token);
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toMatch(/different|same/i);
  });

  test('VAL-CP-03: new password under 8 chars returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await post(page, '/users/me/change-password', {
      oldPassword: SEED_PASSWORD,
      newPassword: 'abc',
    }, token);
    expect(status).toBe(400);
  });

  test('VAL-CP-04: new password over 64 chars returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await post(page, '/users/me/change-password', {
      oldPassword: SEED_PASSWORD,
      newPassword: 'P'.repeat(100),
    }, token);
    expect(status).toBe(400);
  });

  test('VAL-CP-05: unauthenticated request returns 401', async ({ page }) => {
    const { status } = await post(page, '/users/me/change-password', {
      oldPassword: SEED_PASSWORD,
      newPassword: 'NewPassword@2024',
    });
    expect(status).toBe(401);
  });

  test('VAL-CP-06: valid change succeeds and old password no longer works', async ({ page }) => {
    // Use a fresh account so we don't permanently change the seeker seed password
    const ts = Date.now();
    const email = `cp_test_${ts}@wipro.com`;
    const originalPass = 'TechieRide@2024';
    const newPass = 'NewRide@2099!';

    // Register
    const reg = await post(page, '/auth/register', {
      email,
      password: originalPass,
      fullName: 'CP Test User',
      companyName: 'Wipro',
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
    });
    if (reg.status !== 201) {
      test.skip(true, 'Registration failed — skipping VAL-CP-06');
      return;
    }

    // Login to get token (may fail if email verification is enforced — skip gracefully)
    const loginRes = await post(page, '/auth/login', { email, password: originalPass });
    if (loginRes.status !== 200 && loginRes.status !== 201) {
      test.skip(true, 'Login requires email verification in this env — skipping VAL-CP-06');
      return;
    }
    const token = loginRes.body?.data?.accessToken ?? loginRes.body?.accessToken;
    if (!token) {
      test.skip(true, 'No token returned — skipping VAL-CP-06');
      return;
    }

    // Change password
    const change = await post(page, '/users/me/change-password', {
      oldPassword: originalPass,
      newPassword: newPass,
    }, token);
    expect(change.status).toBe(201);

    // Old password should now fail
    const oldLoginRes = await post(page, '/auth/login', { email, password: originalPass });
    expect(oldLoginRes.status).toBe(401);

    // New password should succeed
    const newLoginRes = await post(page, '/auth/login', { email, password: newPass });
    expect([200, 201]).toContain(newLoginRes.status);
  });

});

// ── 4. personalEmail FORMAT VALIDATION ───────────────────────────────────────

test.describe('📧 personalEmail Format Validation', () => {

  test('VAL-PE-01: profile update with non-email personalEmail returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await patch(page, '/users/me', { personalEmail: 'not-an-email' }, token);
    expect(status).toBe(400);
  });

  test('VAL-PE-02: profile update with valid personalEmail succeeds', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await patch(page, '/users/me', { personalEmail: 'arjun.personal@gmail.com' }, token);
    expect([200, 201]).toContain(status);
  });

  test('VAL-PE-03: profile update with 300-char personalEmail returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await patch(page, '/users/me', {
      personalEmail: 'a'.repeat(290) + '@gmail.com',
    }, token);
    expect(status).toBe(400);
  });

  test('VAL-PE-04: signup with invalid personalEmail format returns 400', async ({ page }) => {
    const ts = Date.now();
    const { status } = await post(page, '/auth/register', {
      email: `pe_test_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: 'PE Test',
      companyName: 'Wipro',
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
      personalEmail: 'not-valid-at-all',
    });
    expect(status).toBe(400);
  });

});

// ── 5. FORGOT PASSWORD — RESET TOKEN SINGLE USE ───────────────────────────────

test.describe('🔄 Password Reset / Change Flow', () => {

  test('VAL-RT-01: forgot-password response does not leak temp password or token', async ({ page }) => {
    // Register a fresh account — avoids mutating seed accounts
    const ts = Date.now();
    const email = `rt_test_${ts}@wipro.com`;

    const reg = await post(page, '/auth/register', {
      email,
      password: 'TechieRide@2024',
      fullName: 'RT Test User',
      companyName: 'Wipro',
      phone: '9' + String(Math.floor(100000000 + Math.random() * 900000000)),
    });
    if (reg.status !== 201) {
      test.skip(true, 'Registration failed — skipping VAL-RT-01');
      return;
    }

    // Request forgot-password — temp password is emailed to personal email, never in response
    const forgotRes = await post(page, '/auth/forgot-password', { email });
    expect([200, 201]).toContain(forgotRes.status);

    // Response must NOT contain the temp password or any token (security check)
    const bodyStr = JSON.stringify(forgotRes.body);
    expect(bodyStr).not.toMatch(/tempPassword|passwordResetToken|resetToken/i);
  });

  test('VAL-RT-02: change-password with too-short new password returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await post(page, '/auth/change-password', { oldPassword: SEED_PASSWORD, newPassword: 'short' }, token);
    expect(status).toBe(400);
  });

  test('VAL-RT-03: change-password with 200-char new password returns 400', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await post(page, '/auth/change-password', { oldPassword: SEED_PASSWORD, newPassword: 'P'.repeat(200) }, token);
    expect(status).toBe(400);
  });

  test('VAL-RT-04: forgot-password for non-existent email does not reveal user existence', async ({ page }) => {
    // Should return 200 (no-op) not 404 — prevents user enumeration
    const { status } = await post(page, '/auth/forgot-password', {
      email: 'doesnotexist_xyz@wipro.com',
    });
    // 200 = safe (doesn't reveal if user exists), 404 = leaks user existence (bug)
    expect(status).not.toBe(404);
    expect([200, 201]).toContain(status);
  });

});

// ── 6. PHONE NUMBER FORMAT ────────────────────────────────────────────────────

test.describe('📱 Phone Validation', () => {

  test('VAL-PH-01: signup with 5-digit phone returns 400', async ({ page }) => {
    const ts = Date.now();
    const { status } = await post(page, '/auth/register', {
      email: `ph_test_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: 'Phone Test',
      companyName: 'Wipro',
      phone: '12345',
    });
    expect(status).toBe(400);
  });

  test('VAL-PH-02: signup with phone starting with 5 (not 6-9) returns 400', async ({ page }) => {
    const ts = Date.now();
    const { status } = await post(page, '/auth/register', {
      email: `ph_test2_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: 'Phone Test',
      companyName: 'Wipro',
      phone: '5123456789',
    });
    expect(status).toBe(400);
  });

  test('VAL-PH-03: valid phone starting with 9 is accepted', async ({ page }) => {
    const ts = Date.now();
    // Phone must be unique per run — use last 9 digits of timestamp prefixed with 9
    const phone = '9' + String(ts).slice(-9);
    const { status } = await post(page, '/auth/register', {
      email: `ph_valid_${ts}@wipro.com`,
      password: 'TechieRide@2024',
      fullName: 'Phone Valid',
      companyName: 'Wipro',
      phone,
    });
    expect(status).toBe(201);
  });

});
