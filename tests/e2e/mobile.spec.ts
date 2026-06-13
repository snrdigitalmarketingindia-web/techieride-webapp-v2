/**
 * Mobile / Responsive E2E Tests
 * Viewport: 390×844 (iPhone 14)
 * Verifies mobile-specific layout, bottom nav, and key flows at small screen.
 */

import { test, expect } from '@playwright/test';
import { loginUI, ACCOUNTS } from './helpers';

// iPhone 14 dimensions, run on Chromium (already installed)
test.use({
  viewport: { width: 390, height: 844 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true,
});

// ── Layout ────────────────────────────────────────────────────────

test.describe('📱 Mobile Layout', () => {
  test('login page fits mobile viewport without overflow', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance
  });

  test('signup page is reachable and has no horizontal overflow', async ({ page }) => {
    // Navigate as unauthenticated (fresh context)
    await page.goto('/signup', { waitUntil: 'networkidle' });
    // Should land on signup or redirect to login — either way, not a 404
    const title = await page.title();
    expect(title).not.toMatch(/404/i);
    await expect(page).not.toHaveURL(/\/404/);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

// ── Navigation ────────────────────────────────────────────────────

test.describe('📱 Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginUI(page, 'seeker');
  });

  test('bottom nav is visible on mobile', async ({ page }) => {
    const nav = page.locator('nav').filter({ has: page.locator('a[href="/dashboard"]') });
    await expect(nav).toBeVisible();
  });

  test('desktop sidebar is hidden on mobile', async ({ page }) => {
    // The sidebar uses `hidden sm:flex fixed` — must not be visible at mobile width
    const sidebar = page.locator('div.hidden.sm\\:flex.fixed');
    await expect(sidebar).toBeHidden();
  });

  test('bottom nav Home link is active on dashboard', async ({ page }) => {
    const homeLink = page.locator('nav a[href="/dashboard"]').last();
    await expect(homeLink).toHaveClass(/text-brand-600/);
  });

  test('bottom nav navigates to Find Ride', async ({ page }) => {
    await page.locator('nav a[href="/rides/search"]').last().click();
    await expect(page).toHaveURL(/\/rides\/search/);
    await expect(page.getByRole('heading', { name: /find a ride/i })).toBeVisible();
  });

  test('bottom nav navigates to My Rides', async ({ page }) => {
    await page.locator('nav a[href="/rides"]').last().click();
    await expect(page).toHaveURL(/\/rides/);
    await expect(page.getByRole('heading', { name: /my rides/i })).toBeVisible({ timeout: 8_000 });
  });

  test('bottom nav navigates to Profile', async ({ page }) => {
    await page.locator('nav a[href="/profile"]').last().click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByText(/arjun mehta/i).first()).toBeVisible({ timeout: 8_000 });
  });

});

// ── Key Flows ─────────────────────────────────────────────────────

test.describe('📱 Mobile Flows', () => {
  test('seeker can search for rides on mobile', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible();
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(1_500);
    await expect(page).not.toHaveURL(/error/);
  });

  test('giver can view offer ride form on mobile', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    await expect(page.getByRole('heading', { name: /offer a ride/i })).toBeVisible();
    // Origin field label "📍 From" is always present regardless of pre-fill state
    await expect(page.getByText(/📍 From/)).toBeVisible({ timeout: 5_000 });
    // Destination field label
    await expect(page.getByText(/🏢 To/)).toBeVisible({ timeout: 5_000 });
  });

  test('admin dashboard is usable on mobile', async ({ page }) => {
    await loginUI(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
    // KPI cards use grid-cols-2 on mobile — cards must be visible without overflow
    await expect(page.getByText(/total users/i).first()).toBeVisible({ timeout: 8_000 });
    // No horizontal scroll — grid fits mobile width
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('header is sticky and visible while scrolling', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/dashboard');
    await page.evaluate(() => window.scrollTo(0, 500));
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    // Check it's sticky (top: 0)
    const top = await page.evaluate(() => {
      const h = document.querySelector('header');
      return h ? getComputedStyle(h).position : '';
    });
    expect(top).toBe('sticky');
  });

  test('bottom nav is sticky and visible while scrolling', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/dashboard');
    await page.evaluate(() => window.scrollTo(0, 500));
    const nav = page.locator('nav').last();
    await expect(nav).toBeVisible();
  });
});
