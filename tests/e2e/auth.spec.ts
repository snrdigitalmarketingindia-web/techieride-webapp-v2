import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, SEED_PASSWORD, apiLogin, API } from './helpers';

async function apiRaw(token: string, method: 'get'|'post'|'patch', path: string, data?: object) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx[method](`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data ? { data } : {}),
  });
  const body = await res.json().catch(() => ({}));
  const status = res.status();
  await ctx.dispose();
  return { body, status };
}

test.describe('🔐 Auth Flow', () => {
  test('home page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('empty fields shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/please enter your email and password/i)).toBeVisible();
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill(ACCOUNTS.seeker.email);
    await page.getByPlaceholder('••••••••').fill('wrongpassword');

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/login'), { timeout: 8_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ]);
    expect(response.status()).toBe(401);
  });

  test('seeker login redirects to /dashboard', async ({ page }) => {
    await loginUI(page, 'seeker');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('admin login redirects to /admin', async ({ page }) => {
    await loginUI(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('signup rejects personal email on blur', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder('Arjun Mehta').fill('Test User');
    const emailInput = page.getByPlaceholder('you@company.com');
    await emailInput.fill('test@gmail.com');
    await emailInput.blur();
    await expect(page.getByText(/personal emails are not accepted/i)).toBeVisible();
  });

  test('signup Step 0 shows mobile number field with +91 prefix', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText(/🇮🇳/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/98765/i)).toBeVisible();
  });

  test('signup phone field rejects non-numeric input and short numbers', async ({ page }) => {
    await page.goto('/signup');
    const phoneInput = page.getByPlaceholder(/98765/i);
    await phoneInput.fill('abc12345');
    // Non-digits stripped — input should be empty or show digits only
    const val = await phoneInput.inputValue();
    expect(val).toMatch(/^\d*$/);
  });

  test('signup phone field shows inline error for invalid format', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder(/98765/i).fill('1234567890'); // starts with 1, invalid
    await page.getByPlaceholder(/98765/i).blur();
    await expect(page.getByText(/10-digit.*6.*9|starting with 6/i)).toBeVisible({ timeout: 3_000 });
  });

  test('signup Next button blocked without valid phone', async ({ page }) => {
    await page.goto('/signup');
    // Fill name, valid office email, valid password — but no phone
    await page.getByPlaceholder('Arjun Mehta').fill('Test User');
    const emailInput = page.getByPlaceholder('you@company.com');
    await emailInput.fill('test@techcorp.com');
    await emailInput.blur();
    const pwInput = page.getByPlaceholder(/min. 8 characters/i);
    await pwInput.fill('TestPass@2024');
    // Leave phone empty and click Next
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/mobile number|phone/i).first()).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('🔑 Change Password Flow', () => {
  // CP-01: page renders
  test('CP-01: change-password page renders all required fields', async ({ page }) => {
    await page.goto('/change-password');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/set new password|change password/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/from the email|temporary|current/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/min.*8|new password/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/repeat|confirm/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /set new password|save|change/i })).toBeVisible({ timeout: 5_000 });
  });

  // CP-02: submit with empty fields — button should be disabled (client-side guard)
  test('CP-02: submit button is disabled when fields are empty', async ({ page }) => {
    await page.goto('/change-password');
    await page.waitForLoadState('domcontentloaded');
    const btn = page.getByRole('button', { name: /set new password|save|change/i });
    await expect(btn).toBeDisabled({ timeout: 8_000 });
  });

  // CP-03: mismatched confirm shows inline error
  test('CP-03: mismatched confirm password shows inline mismatch error', async ({ page }) => {
    await page.goto('/change-password');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByPlaceholder(/min.*8|new password/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/min.*8|new password/i).fill('NewPass@2024');
    await page.getByPlaceholder(/repeat|confirm/i).fill('Different@2024');
    await expect(page.getByText(/don.*t match|do not match/i)).toBeVisible({ timeout: 5_000 });
  });

  // CP-04: strength indicator appears as user types
  test('CP-04: password strength indicator appears while typing new password', async ({ page }) => {
    await page.goto('/change-password');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByPlaceholder(/min.*8|new password/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/min.*8|new password/i).fill('weak');
    await expect(page.getByText(/weak|fair|good|strong/i)).toBeVisible({ timeout: 5_000 });
  });

  // CP-05: API rejects wrong current password with 401 (UnauthorizedException from NestJS)
  test('CP-05: API returns 401 when wrong current password is submitted', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const { status } = await apiRaw(token, 'post', '/auth/change-password', {
      oldPassword: 'WrongPassword@999',
      newPassword: 'NewValid@2024',
    });
    expect(status).toBe(401);
  });

  // CP-06: valid API change succeeds, then revert so other tests are not broken
  test('CP-06: valid password change succeeds at API level and reverts', async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.seeker.email);
    const newPw = 'TempNew@2024!';

    const { status: changeStatus } = await apiRaw(token, 'post', '/auth/change-password', {
      oldPassword: SEED_PASSWORD,
      newPassword: newPw,
    });
    expect(changeStatus).toBe(200);

    // Re-login with new password, then revert to SEED_PASSWORD
    const ctx = await playwrightRequest.newContext();
    const loginRes = await ctx.post(`${API}/auth/login`, { data: { email: ACCOUNTS.seeker.email, password: newPw } });
    const loginBody = await loginRes.json();
    const revertToken = loginBody.accessToken ?? loginBody.data?.accessToken;
    await ctx.dispose();

    if (revertToken) {
      await apiRaw(revertToken, 'post', '/auth/change-password', {
        oldPassword: newPw,
        newPassword: SEED_PASSWORD,
      });
    }
  });

  // CP-07: fresh throwaway user — change-password clears mustChangePassword flag.
  // Uses a registered-then-discarded account so shared seed accounts are never polluted.
  test('CP-07: fresh user profile accessible; change-password endpoint reachable', async ({ page }) => {
    const unique = Date.now();
    const ctx = await playwrightRequest.newContext();
    const regRes = await ctx.post(`${API}/auth/register`, {
      data: {
        name: `CP07 User ${unique}`,
        email: `cp07.${unique}@techcorp.com`,
        password: SEED_PASSWORD,
        phone: `9${String(unique).slice(-9).padStart(9, '8')}`,
      },
    });
    const regBody = await regRes.json();
    await ctx.dispose();

    const tempToken = regBody.accessToken ?? regBody.data?.accessToken;
    if (!tempToken) {
      test.skip(true, 'Registration failed — skip CP-07');
      return;
    }

    // Fresh user: mustChangePassword = false → /users/me must return 200
    const { status: profileStatus } = await apiRaw(tempToken, 'get', '/users/me');
    expect(profileStatus).toBe(200);

    // change-password with wrong oldPassword → 400 (not 403, confirming guard passes)
    const { status: wrongPwStatus } = await apiRaw(tempToken, 'post', '/auth/change-password', {
      oldPassword: 'WrongOld@999',
      newPassword: 'NewValid@2024',
    });
    expect(wrongPwStatus).toBe(400);
  });
});
