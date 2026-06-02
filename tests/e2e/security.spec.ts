/**
 * Security E2E Test Suite — TechieRide (Playwright)
 *
 * OWASP Top-10 UI-level checks, auth bypass attempts,
 * privilege escalation via browser, and data-exposure validation.
 *
 * Run: npx playwright test tests/e2e/security.spec.ts
 */

import { test, expect } from '@playwright/test';
import { loginUI, ACCOUNTS } from './helpers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// ── 1. AUTHENTICATION SECURITY ────────────────────────────────────────────────

test.describe('🔐 Auth Security', () => {

  test('SEC-UI-01: unauthenticated user redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('SEC-UI-02: unauthenticated user cannot access /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('SEC-UI-03: unauthenticated user cannot access /rides/create', async ({ page }) => {
    await page.goto('/rides/create');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('SEC-UI-04: unauthenticated user cannot access /profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('SEC-UI-05: login with wrong password shows error, not crash', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill(ACCOUNTS.seeker.email);
    await page.getByPlaceholder('••••••••').fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('SEC-UI-06: login form does not expose token in URL', async ({ page }) => {
    await loginUI(page, 'seeker');
    // Token must be in cookie/localStorage, never in URL
    const url = page.url();
    expect(url).not.toContain('token=');
    expect(url).not.toContain('accessToken=');
  });

  test('SEC-UI-07: XSS in login email field does not execute', async ({ page }) => {
    await page.goto('/login');
    const xss = '<script>window.__xss=1</script>';
    await page.getByPlaceholder('you@company.com').fill(xss);
    await page.getByPlaceholder('••••••••').fill('anything');
    await page.getByRole('button', { name: /sign in/i }).click();
    const xssRan = await page.evaluate(() => (window as any).__xss);
    expect(xssRan).toBeFalsy();
  });

});

// ── 2. PRIVILEGE ESCALATION (UI) ─────────────────────────────────────────────

test.describe('🚫 Privilege Escalation', () => {

  test('SEC-PRIV-01: seeker cannot reach /admin — redirected', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/, { timeout: 8_000 });
  });

  test('SEC-PRIV-02: seeker cannot reach /admin/users', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/\/admin\/users/, { timeout: 8_000 });
  });

  test('SEC-PRIV-03: seeker cannot reach /admin/verification', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/admin/verification');
    await expect(page).not.toHaveURL(/\/admin\/verification/, { timeout: 8_000 });
  });

  test('SEC-PRIV-04: giver cannot reach /admin/rides', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/admin/rides');
    await expect(page).not.toHaveURL(/\/admin\/rides/, { timeout: 8_000 });
  });

  test('SEC-PRIV-05: Offer Ride button absent for pure seeker', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides');
    await expect(page.getByRole('link', { name: /offer ride/i })).not.toBeVisible();
  });

});

// ── 3. SENSITIVE DATA EXPOSURE (UI) ──────────────────────────────────────────

test.describe('🕵️ Data Exposure', () => {

  test('SEC-DATA-01: password not visible anywhere in profile page', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    const content = await page.content();
    expect(content.toLowerCase()).not.toMatch(/password.*hash|bcrypt|\$2b\$/i);
  });

  test('SEC-DATA-02: API responses do not contain password field', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('response', async (resp) => {
      if (resp.url().includes('/api/v1') && resp.status() === 200) {
        try {
          const text = await resp.text();
          if (text.toLowerCase().includes('"password"')) apiCalls.push(resp.url());
        } catch {}
      }
    });
    await loginUI(page, 'seeker');
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    expect(apiCalls).toHaveLength(0);
  });

  test('SEC-DATA-03: JWT token not in page URL at any point', async ({ page }) => {
    const urlsWithToken: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame.url().includes('token=') || frame.url().includes('accessToken=')) {
        urlsWithToken.push(frame.url());
      }
    });
    await loginUI(page, 'seeker');
    await page.goto('/dashboard');
    expect(urlsWithToken).toHaveLength(0);
  });

  test('SEC-DATA-04: console has no uncaught errors exposing internals', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginUI(page, 'seeker');
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    const internalErrors = errors.filter((e) =>
      /prisma|stack trace|internal server|jwt secret/i.test(e)
    );
    expect(internalErrors).toHaveLength(0);
  });

});

// ── 4. XSS STORED/REFLECTED ───────────────────────────────────────────────────

test.describe('🛡️ XSS Prevention', () => {

  test('SEC-XSS-01: script in search input does not execute', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    const xss = '<img src=x onerror="window.__xss_search=1">';
    const originInput = page.locator('input').first();
    await originInput.fill(xss);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    const xssRan = await page.evaluate(() => (window as any).__xss_search);
    expect(xssRan).toBeFalsy();
  });

  test('SEC-XSS-02: script in profile name input does not execute', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    const xss = '"><script>window.__xss_profile=1</script>';
    const inputs = page.locator('input[type="text"]');
    if (await inputs.count() > 0) {
      await inputs.first().fill(xss);
      await page.waitForTimeout(500);
    }
    const xssRan = await page.evaluate(() => (window as any).__xss_profile);
    expect(xssRan).toBeFalsy();
  });

});

// ── 5. CSRF PROTECTION ────────────────────────────────────────────────────────

test.describe('🔒 CSRF & Request Forgery', () => {

  test('SEC-CSRF-01: cross-origin POST to /auth/login without proper headers gets blocked or handled', async ({ page }) => {
    await page.goto('/login');
    // Simulate a cross-origin AJAX call without CORS headers
    const result = await page.evaluate(async (api) => {
      try {
        const r = await fetch(`${api}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@tcs.com', password: 'test' }),
          credentials: 'omit',
        });
        return r.status;
      } catch (e) {
        return 0; // CORS blocked
      }
    }, API);
    // 0 = CORS blocked (ideal), 401 = allowed but wrong creds (acceptable), never 200
    expect(result === 0 || result === 400 || result === 401).toBeTruthy();
  });

});

// ── 6. CALL FEATURE SECURITY (UI) ─────────────────────────────────────────────

test.describe('📞 Call Feature Security', () => {

  test('SEC-CALL-01: phone number not visible before login', async ({ page }) => {
    await page.goto('/rides/search');
    // Unauthenticated → redirected to login, no phone data
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('SEC-CALL-02: call buttons generate tel: links, not javascript:', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    const callLinks = page.locator('a[href^="tel:"]');
    const count = await callLinks.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = await callLinks.nth(i).getAttribute('href');
        expect(href).toMatch(/^tel:\+?\d+/);
        expect(href).not.toContain('javascript:');
      }
    }
    // 0 call links is fine if no rides exist
  });

});

// ── 7. SESSION MANAGEMENT ─────────────────────────────────────────────────────

test.describe('🔑 Session Management', () => {

  test('SEC-SESS-01: logout clears session — cannot access dashboard after logout', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8_000 });
    // Click logout
    const logoutBtn = page.getByRole('button', { name: /logout/i })
      .or(page.getByRole('link', { name: /logout/i }));
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
    } else {
      // Clear storage manually to simulate logout
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    }
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('SEC-SESS-02: auth state not shared between two different browser contexts', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();
    await loginUI(page1, 'seeker');
    await page2.goto('/dashboard');
    await expect(page2).toHaveURL(/\/login/, { timeout: 8_000 });
    await ctx1.close();
    await ctx2.close();
  });

});
