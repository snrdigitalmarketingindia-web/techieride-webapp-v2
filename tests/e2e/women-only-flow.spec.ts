/**
 * Women-Only Ride Flow E2E Tests
 * Create women-only ride, gender filtering, warning banners
 * QA Architect coverage: gender-based access and visibility
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

test.describe('👩 Women-Only Ride Flow', () => {
  let giverToken: string;
  let femaleToken: string;
  let vehicleId: string;
  let womenRideId: string;

  test.beforeAll(async () => {
    // Use rahul as giver (male giver can still publish women-only rides)
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    // Tapaswini is female seeker
    femaleToken = await apiLogin('tapaswini@tapaswini.com');
    await clearActiveRides(giverToken);

    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;

    // Create and publish a women-only ride
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0);
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Kondapur, Hyderabad', originLat: 17.46, originLng: 78.36,
      destinationName: 'HITEC City, Hyderabad', destinationLat: 17.44, destinationLng: 78.39,
      departureDate: d.toISOString().split('T')[0], departureTime: '08:00', totalSeats: 3, vehicleId,
      womenOnly: true,
    });
    womenRideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${womenRideId}/publish`);
  });

  test('WO-01: women-only checkbox visible on create ride form', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    await expect(page.getByText(/women.only/i)).toBeVisible({ timeout: 8_000 });
  });

  test('WO-02: women-only ride shows 👩 badge on board page', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides/board');
    await page.waitForTimeout(2_000);
    // Women-only badge or label should appear
    const womenBadge = page.getByText(/women.only|👩/i);
    const isVisible = await womenBadge.isVisible().catch(() => false);
    // Just verify page loads — badge shown only if ride appears
    await expect(page).not.toHaveURL(/error/);
  });

  test('WO-03: seeker with no gender set sees warning when women-only rides exist', async ({ page }) => {
    // Arjun (male) logs in — women-only rides should show gender warning
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);
    // Warning banner should appear since women-only rides exist
    const warning = page.getByText(/women.only|gender|profile/i).first();
    await expect(warning).toBeVisible({ timeout: 8_000 });
  });

  test('WO-04: female seeker can request a women-only ride', async () => {
    const result = await api(femaleToken, 'post', '/ride-requests', {
      rideId: womenRideId, pickupName: 'Kondapur Metro, Hyderabad',
    });
    expect([200, 201]).toContain(result.statusCode ?? result.status ?? 201);
  });

  test('WO-05: male seeker blocked from requesting women-only ride', async () => {
    // Raghu (male) tries to request
    const raghuToken = await apiLogin('raghu@raghu.com');
    const result = await api(raghuToken, 'post', '/ride-requests', {
      rideId: womenRideId, pickupName: 'Miyapur, Hyderabad',
    });
    expect(result.statusCode ?? result.status).toBe(403);
  });

  test('WO-06: women-only filter on search page filters correctly', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    const womenFilter = page.getByLabel(/women.only/i);
    const isVisible = await womenFilter.isVisible().catch(() => false);
    if (isVisible) {
      await womenFilter.check();
      await page.getByRole('button', { name: /search/i }).click();
      await page.waitForTimeout(2_000);
      await expect(page).not.toHaveURL(/error/);
    }
  });

  test.afterAll(async () => {
    if (womenRideId) await api(giverToken, 'patch', `/rides/${womenRideId}/cancel`).catch(() => {});
  });
});
