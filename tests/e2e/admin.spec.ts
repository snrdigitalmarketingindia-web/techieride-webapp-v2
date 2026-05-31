import { test, expect } from '@playwright/test';
import { loginUI, PHONES } from './helpers';

test.describe('🛡️ Admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginUI(page, PHONES.admin);
  });

  test('admin login redirects to /admin', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/);
  });

  test('admin dashboard shows KPI cards', async ({ page }) => {
    await expect(page.getByText(/total users/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/total rides/i)).toBeVisible();
    await expect(page.getByText(/co₂ saved/i)).toBeVisible();
  });

  test('users list page loads', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible({ timeout: 8_000 });
  });

  test('verification queue page loads', async ({ page }) => {
    await page.goto('/admin/verification');
    await expect(page.getByRole('heading', { name: /verification/i })).toBeVisible({ timeout: 8_000 });
  });

  test('rides management page loads', async ({ page }) => {
    await page.goto('/admin/rides');
    await expect(page.getByRole('heading', { name: /rides/i })).toBeVisible({ timeout: 8_000 });
  });

  test('non-admin cannot access /admin', async ({ page, context }) => {
    // Fresh context logged in as seeker
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginUI(page, PHONES.seeker);
    await page.goto('/admin');
    // Should be redirected away from /admin
    await expect(page).not.toHaveURL(/^http:\/\/localhost:3000\/admin$/);
  });
});
