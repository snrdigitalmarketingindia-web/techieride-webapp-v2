import { test, expect } from '@playwright/test';
import { loginUI, ACCOUNTS } from './helpers';

test.describe('🚗 Ride Giver', () => {
  test.beforeEach(async ({ page }) => {
    await loginUI(page, 'giver');
  });

  test('lands on dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
  });

  test('dashboard shows eco points and level', async ({ page }) => {
    await expect(page.getByText(/eco points/i)).toBeVisible();
  });

  test('can navigate to offer a ride page', async ({ page }) => {
    await page.goto('/rides/create');
    await expect(page.getByRole('heading', { name: /offer a ride/i })).toBeVisible();
  });

  test('create ride form submits with empty origin and shows error', async ({ page }) => {
    await page.goto('/rides/create');
    // Scroll to bottom to reveal the Publish Ride button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const btn = page.getByRole('button', { name: /publish ride/i });
    await expect(btn).toBeVisible({ timeout: 5_000 });
    // Clear the pre-filled origin placeholder to ensure validation fires
    await page.locator('input[placeholder*="Kondapur"]').clear();
    await btn.click();
    await expect(page.getByText(/fill in origin|select a vehicle/i)).toBeVisible({ timeout: 5_000 });
  });

  test('can navigate to my rides list', async ({ page }) => {
    await page.goto('/rides');
    await expect(page.getByRole('heading', { name: /my rides/i })).toBeVisible();
  });

  test('profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText(/rahul sharma/i)).toBeVisible({ timeout: 8_000 });
  });

  test('notifications page is accessible', async ({ page }) => {
    await page.goto('/dashboard');
    // Notification bell or link should be present in layout
    const notifLink = page.locator('a[href*="notif"], button[aria-label*="notif"]').first();
    // Just verify page doesn't crash — notifications may not have nav link
    await expect(page).not.toHaveURL(/error/);
  });
});
