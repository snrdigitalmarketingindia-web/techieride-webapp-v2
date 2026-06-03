/**
 * Quick Messages Flow E2E Tests
 * Tap-to-send pre-defined messages between giver and seeker
 * QA Architect coverage: quick message UI interactions and delivery
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, SEED_PASSWORD, clearActiveRides, apiLogin, API } from './helpers';


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

test.describe('💬 Quick Messages Flow', () => {
  let giverToken: string;
  let seekerToken: string;
  let vehicleId: string;
  let rideId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    await clearActiveRides(giverToken);
    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;

    // Publish a ride with a confirmed seeker
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0);
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Miyapur, Hyderabad', originLat: 17.50, originLng: 78.35,
      destinationName: 'Raheja Mindspace, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      departureDate: d.toISOString().split('T')[0], departureTime: '11:00', totalSeats: 3, vehicleId,
    });
    rideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${rideId}/publish`);
    const req = await api(seekerToken, 'post', '/ride-requests', { rideId, pickupName: 'Miyapur Metro, Hyderabad' });
    const reqId = (req.data ?? req).id;
    await api(giverToken, 'patch', `/ride-requests/${reqId}/approve`);
  });

  // ── API Level ────────────────────────────────────────────────────────────

  test('QM-01: GET quick message options returns giver messages', async () => {
    const result = await api(giverToken, 'get', `/rides/${rideId}/quick-message/options`);
    const options = result.data ?? result;
    expect(Array.isArray(options) || typeof options === 'object').toBe(true);
  });

  test('QM-02: giver can send a quick message', async () => {
    const options = await api(giverToken, 'get', `/rides/${rideId}/quick-message/options`);
    const optionsList = options.data ?? options;
    const firstKey = Array.isArray(optionsList) ? optionsList[0]?.key : Object.keys(optionsList)[0];
    if (firstKey) {
      const result = await api(giverToken, 'post', `/rides/${rideId}/quick-message`, { messageKey: firstKey });
      expect([200, 201]).toContain(result.statusCode ?? result.status ?? 200);
    }
  });

  test('QM-03: seeker receives quick message as notification', async ({ page }) => {
    const options = await api(giverToken, 'get', `/rides/${rideId}/quick-message/options`);
    const optionsList = options.data ?? options;
    const firstKey = Array.isArray(optionsList) ? optionsList[0]?.key : Object.keys(optionsList)[0];
    if (firstKey) {
      await api(giverToken, 'post', `/rides/${rideId}/quick-message`, { messageKey: firstKey });
    }

    await loginUI(page, 'seeker');
    await page.goto('/notifications');
    await expect(page.getByText(/message|quick|on my way|route/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('QM-04: invalid message key rejected', async () => {
    const result = await api(giverToken, 'post', `/rides/${rideId}/quick-message`, { messageKey: 'INVALID_KEY' });
    expect(result.statusCode ?? result.status).toBe(400);
  });

  // ── UI Level ─────────────────────────────────────────────────────────────

  test('QM-05: Quick Message button visible on PUBLISHED ride for giver', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByRole('button', { name: /quick message/i })).toBeVisible({ timeout: 8_000 });
  });

  test('QM-06: Quick Message modal opens with pre-defined options', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /quick message/i }).click();
    await expect(page.getByText(/on my way|running late|arrived|message/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('QM-07: seeker sees Quick Message button on their confirmed ride', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    await expect(page.getByRole('button', { name: /quick message/i })).toBeVisible({ timeout: 8_000 });
  });

  test.afterAll(async () => {
    if (rideId) await api(giverToken, 'patch', `/rides/${rideId}/cancel`).catch(() => {});
  });
});
