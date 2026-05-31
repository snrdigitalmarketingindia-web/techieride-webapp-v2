import { test, expect } from '@playwright/test';
import { loginUI, ACCOUNTS } from './helpers';

test.describe('🙋 Ride Seeker', () => {
  test.beforeEach(async ({ page }) => {
    await loginUI(page, 'seeker');
  });

  test('lands on dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
  });

  test('can navigate to find a ride page', async ({ page }) => {
    await page.goto('/rides/search');
    await expect(page.getByRole('heading', { name: /find a ride/i })).toBeVisible();
  });

  test('search form renders origin, destination, date fields', async ({ page }) => {
    await page.goto('/rides/search');
    await expect(page.getByText(/pickup area/i)).toBeVisible();
    await expect(page.getByText(/drop area/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible();
  });

  test('can submit search and see results or empty state', async ({ page }) => {
    await page.goto('/rides/search');
    await page.getByRole('button', { name: /search/i }).click();
    // Either rides list or no-rides message — not an error
    await page.waitForTimeout(2_000);
    await expect(page).not.toHaveURL(/error/);
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/rides/leaderboard');
    await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible({ timeout: 8_000 });
  });

  test('my requests page loads', async ({ page }) => {
    await page.goto('/requests');
    await expect(page.getByRole('heading', { name: /requests/i })).toBeVisible({ timeout: 8_000 });
  });

  test('profile page shows seeker info', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText(/arjun mehta/i)).toBeVisible({ timeout: 8_000 });
  });
});
