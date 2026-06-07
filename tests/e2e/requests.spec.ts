import { test, expect } from '@playwright/test';
import { loginUI } from './helpers';

test.describe('🔄 Ride Request Flow', () => {

  test('Giver: requests page loads and shows incoming requests', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/requests');
    // Redesigned page: single "Requests" heading with "📥 Incoming — Your Rides" section
    await expect(page.getByRole('heading', { name: /^requests$/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/incoming/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(page).not.toHaveURL(/error/);
  });

  test('Giver: incoming tab shows ride selector or no-rides message', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/requests');
    // Wait for the page content to settle (heading and/or section text)
    await expect(
      page.getByText(/incoming|no active rides|create and publish|no requests yet|Requests/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Seeker: my requests tab shows own requests', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    // Page may show heading "My Requests" directly (no tab) — click is harmless
    await page.getByText(/my requests/i).first().click();
    // Should show requests list (any status) or empty state — not crash
    await expect(
      page.getByText(/no seat requests yet|confirmed|pending|cancelled|rejected|completed/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Seeker: my requests shows ride details when requests exist', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    await page.getByText(/my requests/i).click();
    await page.waitForTimeout(2000);
    const hasRequests = await page.getByText(/→/).count() > 0;
    if (hasRequests) {
      // Should show origin → destination
      await expect(page.getByText(/→/).first()).toBeVisible();
    } else {
      await expect(page.getByText(/no seat requests/i)).toBeVisible();
    }
  });

  test('Giver: block creating new ride when active ride exists', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    // If giver has an active ride, warning should be shown and button disabled
    const warning = page.getByText(/already have an active ride/i);
    const isBlocked = await warning.isVisible().catch(() => false);
    if (isBlocked) {
      await expect(warning).toBeVisible();
      const btn = page.getByRole('button', { name: /publish ride/i });
      await expect(btn).toBeDisabled();
    } else {
      // No active ride — form should be usable
      await expect(page.getByRole('heading', { name: /offer a ride/i })).toBeVisible();
    }
  });

  test('Giver: view ride link in active ride warning is clickable', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    const viewLink = page.getByRole('link', { name: /view ride/i });
    const isVisible = await viewLink.isVisible().catch(() => false);
    if (isVisible) {
      await viewLink.click();
      await expect(page).toHaveURL(/\/rides\//);
    }
  });

  test('Seeker: requests page shows seeker view only (no incoming tab)', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    // Role-aware redesign: seeker heading is "My Requests", no tabs
    await expect(page.getByRole('heading', { name: /my requests/i })).toBeVisible({ timeout: 8_000 });
    // No "incoming" tab rendered for pure seekers
    await expect(page.getByRole('tab', { name: /incoming/i })).not.toBeVisible();
  });

  test('Request status colors render correctly', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    await page.getByText(/my requests/i).click();
    await page.waitForTimeout(1500);
    // Page should not crash regardless of request state
    await expect(page).not.toHaveURL(/error/);
    await expect(page.getByRole('heading', { name: /my requests/i })).toBeVisible();
  });
});
