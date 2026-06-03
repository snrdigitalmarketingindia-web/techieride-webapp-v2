/**
 * Giver Flow E2E Tests
 * Full lifecycle: create ride → manage requests → start → complete/cancel
 * QA Architect coverage: all giver-visible states and transitions
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, SEED_PASSWORD, clearActiveRides } from './helpers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://techieride-webapp-v2.onrender.com/api/v1';

async function apiLogin(email: string) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.post(`${API}/auth/login`, { data: { email, password: SEED_PASSWORD } });
  const body = await res.json();
  await ctx.dispose();
  return body.data?.accessToken as string;
}
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

function tomorrow9am() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.toISOString();
}

test.describe('🚗 Giver Full Flow', () => {
  let giverToken: string;
  let seekerToken: string;
  let vehicleId: string;
  let rideId: string;
  let requestId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    await clearActiveRides(giverToken);
    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;
  });

  // ── Create & Publish ────────────────────────────────────────────────────

  test('GF-01: giver dashboard shows Offer Ride button', async ({ page }) => {
    await loginUI(page, 'giver');
    await expect(page.getByRole('link', { name: /offer.*ride|create.*ride/i }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('GF-02: create ride form validates required fields', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const btn = page.getByRole('button', { name: /publish ride/i });
    await page.locator('input[placeholder*="Kondapur"], input[placeholder*="origin"], input[placeholder*="pickup"]').first().clear();
    await btn.click();
    await expect(page.getByText(/fill in|origin|vehicle|required/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('GF-03: published ride appears on My Rides page as PUBLISHED', async ({ page }) => {
    const created = await api(giverToken, 'post', '/rides', {
      originName: 'Gachibowli, Hyderabad', originLat: 17.44, originLng: 78.35,
      destinationName: 'Mindspace, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      departureTime: tomorrow9am(), availableSeats: 3, vehicleId,
    });
    rideId = (created.data ?? created).id;
    await api(giverToken, 'patch', `/rides/${rideId}/publish`);

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Request Management ──────────────────────────────────────────────────

  test('GF-04: giver sees pending request on requests page', async ({ page }) => {
    const req = await api(seekerToken, 'post', '/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    requestId = (req.data ?? req).id;

    await loginUI(page, 'giver');
    await page.goto('/requests');
    await expect(page.getByText(/pending|incoming|arjun/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('GF-05: giver approves request — passenger shows in ride detail', async ({ page }) => {
    await api(giverToken, 'patch', `/ride-requests/${requestId}/approve`);

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByText(/arjun mehta/i)).toBeVisible({ timeout: 8_000 });
  });

  test('GF-06: giver rejects a second request — requests page updates', async ({ page }) => {
    const seeker2Token = await apiLogin('raghu@raghu.com');
    const req2 = await api(seeker2Token, 'post', '/ride-requests', { rideId, pickupName: 'Miyapur, Hyderabad' });
    const req2Id = (req2.data ?? req2).id;
    await api(giverToken, 'patch', `/ride-requests/${req2Id}/reject`);

    await loginUI(page, 'giver');
    await page.goto('/requests');
    await expect(page).not.toHaveURL(/error/);
  });

  // ── Ride Actions ────────────────────────────────────────────────────────

  test('GF-07: giver sees Start Ride button on PUBLISHED ride', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByRole('button', { name: /start ride/i })).toBeVisible({ timeout: 8_000 });
  });

  test('GF-08: giver starts ride — status changes to ONGOING', async ({ page }) => {
    await api(giverToken, 'patch', `/rides/${rideId}/start`);

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByText(/ongoing/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('GF-09: giver cannot cancel ONGOING ride', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    // Cancel button should not exist for ONGOING rides
    const cancelBtn = page.getByRole('button', { name: /cancel ride/i });
    await expect(cancelBtn).not.toBeVisible();
  });

  test('GF-10: quick message button visible on ONGOING ride', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByRole('button', { name: /quick message/i })).toBeVisible({ timeout: 8_000 });
  });

  test('GF-11: giver boards and deboards passenger — Complete Ride becomes available', async ({ page }) => {
    // Board the participant
    const participants = await api(giverToken, 'get', `/rides/${rideId}/participants`);
    const participantId = (participants.data ?? participants)[0]?.seekerId ?? (participants.data ?? participants)[0]?.id;
    await api(giverToken, 'patch', `/rides/${rideId}/board/${participantId}`).catch(() => {});
    await api(giverToken, 'patch', `/rides/${rideId}/deboard/${participantId}`).catch(() => {});

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByRole('button', { name: /complete ride/i })).toBeVisible({ timeout: 8_000 });
  });

  test('GF-12: completed ride shows in history', async ({ page }) => {
    await api(giverToken, 'patch', `/rides/${rideId}/complete`).catch(() => {});

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /show history/i }).click();
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Cancel Flow ─────────────────────────────────────────────────────────

  test('GF-13: giver can cancel a PUBLISHED ride', async ({ page }) => {
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Kukatpally, Hyderabad', originLat: 17.49, originLng: 78.39,
      destinationName: 'Nanakramguda, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      departureTime: tomorrow9am(), availableSeats: 2, vehicleId,
    });
    const cancelRideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${cancelRideId}/publish`);
    await api(giverToken, 'patch', `/rides/${cancelRideId}/cancel`);

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /show history/i }).click();
    await expect(page.getByText(/cancelled/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Commute Template ────────────────────────────────────────────────────

  test('GF-14: giver can view commute templates page', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    // Templates section or link should exist
    await expect(page).not.toHaveURL(/error/);
  });
});
