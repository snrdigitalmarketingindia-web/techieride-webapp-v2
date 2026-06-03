/**
 * Ride Flow E2E Tests
 * Tests the full ride lifecycle from UI perspective — giver publishes,
 * seeker requests, giver approves/rejects, UI reflects correct states.
 *
 * Uses API calls to set up state, then verifies UI reflects it correctly.
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, SEED_PASSWORD, clearActiveRides, apiLogin, API } from './helpers';


// ── API helpers ────────────────────────────────────────────────────────────

async function apiCall(token: string, method: 'get' | 'post' | 'patch' | 'delete', path: string, data?: object) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx[method](`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data ? { data } : {}),
  });
  const body = await res.json();
  await ctx.dispose();
  return body;
}

// ── Tests ──────────────────────────────────────────────────────────────────
test.describe('🚗 Ride Flow — Giver publishes, Seeker requests', () => {
  let giverToken: string;
  let seekerToken: string;
  let rideId: string;
  let requestId: string;
  let vehicleId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    await clearActiveRides(giverToken);

    // Get giver's vehicle
    const vehicles = await apiCall(giverToken, 'get', '/vehicles/my');
    vehicleId = vehicles.data?.[0]?.id ?? vehicles[0]?.id;
  });

  test('giver can publish a ride and it appears in search results', async ({ page }) => {
    // Create + publish via API
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const created = await apiCall(giverToken, 'post', '/rides', {
      originName: 'Kondapur, Hyderabad',
      originLat: 17.4639, originLng: 78.3674,
      destinationName: 'HITEC City, Hyderabad',
      destinationLat: 17.4486, destinationLng: 78.3908,
      departureDate: tomorrow.toISOString().split('T')[0],
      departureTime: '09:00',
      totalSeats: 3,
      vehicleId,
    });
    rideId = created.data?.id ?? created.id;
    await apiCall(giverToken, 'patch', `/rides/${rideId}/publish`);

    // Seeker searches and sees the ride
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    await expect(page.getByText(/kondapur/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('seeker requests seat — search page shows "awaiting approval"', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    // Submit request via API
    const req = await apiCall(seekerToken, 'post', '/ride-requests', {
      rideId,
      pickupName: 'Kondapur Metro, Hyderabad',
    });
    requestId = req.requestId ?? req.id ?? req.data?.id;

    // Refresh and verify pending state shown
    await page.reload();
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    await expect(page.getByText(/awaiting giver/i)).toBeVisible({ timeout: 8_000 });
  });

  test('giver approves — seeker search page shows "Seat Confirmed"', async ({ page }) => {
    // Approve via API
    await apiCall(giverToken, 'patch', `/ride-requests/${requestId}/approve`);

    // Seeker refreshes search page
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    await expect(page.getByText(/seat confirmed/i)).toBeVisible({ timeout: 8_000 });
  });

  test('giver sees confirmed passenger on My Rides page', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByText(/arjun mehta/i)).toBeVisible({ timeout: 8_000 });
  });

  test('giver rejects a request — seeker sees rejected state on requests page', async ({ page }) => {
    // Create a second request from seeker2 (raghu)
    const seeker2Token = await apiLogin('raghu@raghu.com');
    const req2 = await apiCall(seeker2Token, 'post', '/ride-requests', {
      rideId,
      pickupName: 'Miyapur, Hyderabad',
    });
    const req2Id = req2.requestId ?? req2.id ?? req2.data?.id;

    // Giver rejects
    await apiCall(giverToken, 'patch', `/ride-requests/${req2Id}/reject`);

    // Raghu checks requests page
    await loginUI(page, 'raghu@raghu.com');
    await page.goto('/requests');
    await expect(page.getByText(/rejected/i)).toBeVisible({ timeout: 8_000 });
  });

  test('seeker cancels confirmed request — seat is freed', async ({ page }) => {
    // Cancel via API
    await apiCall(seekerToken, 'patch', `/ride-requests/${requestId}/cancel`);

    // Seeker search page should show "Request Seat" button again
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    await expect(page.getByRole('button', { name: /request seat/i })).toBeVisible({ timeout: 8_000 });
  });

  test.afterAll(async () => {
    // Cleanup — cancel the ride
    if (rideId) {
      await apiCall(giverToken, 'patch', `/rides/${rideId}/cancel`).catch(() => {});
    }
  });
});
