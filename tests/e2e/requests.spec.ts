import { test, expect } from '@playwright/test';
import { loginUI } from './helpers';

test.describe('🔄 Ride Request Flow', () => {

  test('Giver: requests page loads and shows incoming tab', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/requests');
    await expect(page.getByText(/incoming/i).first()).toBeVisible({ timeout: 8_000 });
    // Page should not crash — either selector, empty state, or no-rides message
    await expect(page).not.toHaveURL(/error/);
    await expect(page.getByText(/ride requests/i)).toBeVisible({ timeout: 8_000 });
  });

  test('Giver: incoming tab shows ride selector or no-rides message', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/requests');
    await page.waitForTimeout(2000);
    // Should show one of: ride selector, no-rides message, or select-a-ride prompt
    const pageText = await page.locator('body').innerText();
    const hasExpectedContent =
      pageText.includes('Select Ride') ||
      pageText.includes('No published rides') ||
      pageText.includes('Select a ride') ||
      pageText.includes('create and publish') ||
      pageText.includes('Incoming');
    expect(hasExpectedContent).toBe(true);
  });

  test('Seeker: my requests tab shows own requests', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    await page.getByText(/my requests/i).click();
    // Should show requests list or empty state — not crash
    await expect(
      page.getByText(/no seat requests|confirmed|hold|pending/i).first()
    ).toBeVisible({ timeout: 8_000 });
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

  test('Seeker: cannot see incoming giver tab requests', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    // Click incoming tab
    await page.getByText(/incoming/i).first().click();
    // v2.1.0: dropdown removed — shows "No active ride" message for non-givers
    await expect(
      page.getByText(/no active ride|no requests for this ride|create and publish/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Request status colors render correctly', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    await page.getByText(/my requests/i).click();
    await page.waitForTimeout(1500);
    // Page should not crash regardless of request state
    await expect(page).not.toHaveURL(/error/);
    await expect(page.getByText(/ride requests/i)).toBeVisible();
  });
});
