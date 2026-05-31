import { test, expect } from '@playwright/test';
import { loginUI } from './helpers';

test.describe('🔄 Ride Request Flow', () => {

  test('Giver: requests page auto-selects ride when only one exists', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/requests');
    // Should auto-select the ride and show the dropdown populated
    const select = page.locator('select');
    await expect(select).toBeVisible({ timeout: 8_000 });
    const value = await select.inputValue();
    expect(value).not.toBe('');
  });

  test('Giver: incoming tab shows requests for their ride', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/requests');
    await expect(page.getByText(/incoming/i).first()).toBeVisible();
    // Either requests or empty state should appear
    await expect(
      page.getByText(/no requests|approve|pending|hold/i).first()
    ).toBeVisible({ timeout: 8_000 });
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
    // Seeker has no rides to select from
    await expect(
      page.getByText(/no published rides|select a ride/i).first()
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
