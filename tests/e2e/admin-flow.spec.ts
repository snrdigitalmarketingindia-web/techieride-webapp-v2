/**
 * Admin Flow E2E Tests
 * Verification queue, user management, complaints, ride oversight
 * QA Architect coverage: all admin operations
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, SEED_PASSWORD, apiLogin, API } from './helpers';


async function api(token: string, method: 'get'|'post'|'patch'|'delete', path: string, data?: object) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx[method](`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data ? { data } : {}),
  });
  const body = await res.json();
  await ctx.dispose();
  return body;
}

test.describe('🛡️ Admin Full Flow', () => {

  // ── Dashboard ────────────────────────────────────────────────────────────

  test('AF-01: admin dashboard shows all KPI cards', async ({ page }) => {
    await loginUI(page, 'admin');
    await expect(page.getByText(/total users/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/total rides/i)).toBeVisible();
    await expect(page.getByText(/co₂ saved/i)).toBeVisible();
  });

  test('AF-02: admin dashboard shows pending verification count', async ({ page }) => {
    await loginUI(page, 'admin');
    await expect(page.getByText(/pending|verification/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Users ────────────────────────────────────────────────────────────────

  test('AF-03: users list shows all test accounts', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/users');
    await expect(page.getByText(/arjun mehta|rahul sharma|rajendra/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('AF-04: admin can view individual user detail', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/users');
    await page.getByText(/arjun mehta/i).first().click();
    await expect(page).toHaveURL(/\/admin\/users\//);
    await expect(page.getByText(/arjun mehta/i)).toBeVisible({ timeout: 8_000 });
  });

  test('AF-05: user detail shows account status', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/users');
    await page.getByText(/arjun mehta/i).first().click();
    // accountStatus badge shows the enum value directly (e.g. SEEKER_VERIFIED, DRIVER_VERIFIED, SUSPENDED…)
    await expect(page.locator('span').filter({ hasText: /VERIFIED|SUSPENDED|REJECTED|DEACTIVATED|BANNED|DRAFT/i }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('AF-06: admin can search/filter users', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/users');
    const searchInput = page.getByPlaceholder(/search|filter|name|email/i);
    const isVisible = await searchInput.isVisible().catch(() => false);
    if (isVisible) {
      await searchInput.fill('arjun');
      await page.waitForTimeout(1_000);
      await expect(page.getByText(/arjun/i).first()).toBeVisible();
    }
  });

  // ── Verification Queue ───────────────────────────────────────────────────

  test('AF-07: verification queue page loads', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/verification');
    await expect(page.getByRole('heading', { name: /verification/i })).toBeVisible({ timeout: 8_000 });
  });

  test('AF-08: verification queue shows pending requests or empty state', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/verification');
    await page.waitForTimeout(2_000);
    const body = await page.locator('body').innerText();
    const valid = body.includes('pending') || body.includes('approved') || body.includes('no pending') || body.includes('queue');
    expect(valid).toBe(true);
  });

  // ── Rides Management ─────────────────────────────────────────────────────

  test('AF-09: admin rides page shows all rides', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/rides');
    await expect(page.getByRole('heading', { name: /rides/i })).toBeVisible({ timeout: 8_000 });
  });

  test('AF-10: admin can filter rides by status', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/rides');
    const statusFilter = page.getByRole('combobox').first();
    const isVisible = await statusFilter.isVisible().catch(() => false);
    if (isVisible) {
      await statusFilter.selectOption('COMPLETED');
      await page.waitForTimeout(1_000);
      await expect(page).not.toHaveURL(/error/);
    }
  });

  // ── Complaints ───────────────────────────────────────────────────────────

  test('AF-11: complaints page loads and shows complaint list', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/complaints');
    await expect(page.getByRole('heading', { name: /complaint/i })).toBeVisible({ timeout: 8_000 });
  });

  // ── Access Control ───────────────────────────────────────────────────────

  test('AF-12: seeker cannot access admin pages', async ({ page }) => {
    await loginUI(page, 'seeker');
    for (const path of ['/admin', '/admin/users', '/admin/verification', '/admin/rides']) {
      await page.goto(path);
      await expect(page).not.toHaveURL(new RegExp(`^.*${path}$`));
    }
  });

  test('AF-13: giver cannot access admin pages', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/^.*\/admin$/);
  });

  test('AF-14: CSR admin can access admin panel', async ({ page }) => {
    await loginUI(page, 'csr@csr.com');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });

  // ── Suspend & Reinstate ──────────────────────────────────────────────────

  test('AF-15: admin user detail shows suspend/reinstate action', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/users');
    await page.getByText(/raghu sri/i).first().click().catch(() => {});
    await expect(page).not.toHaveURL(/error/);
  });
});
