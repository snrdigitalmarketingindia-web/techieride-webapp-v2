/**
 * Boarding Flow E2E Tests
 * WAITING → BOARDED → DEBOARDED / NO_SHOW
 * QA Architect coverage: all boarding state transitions visible in UI
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
function inFourHours(): { departureDate: string; departureTime: string } {
  // Use 4 hours from now so cancel (requires >1h before departure) always has margin
  const d = new Date(); d.setHours(d.getHours() + 4);
  return {
    departureDate: d.toISOString().split('T')[0],
    departureTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

test.describe('🚏 Boarding Flow', () => {
  let giverToken: string;
  let seekerToken: string;
  let vehicleId: string;
  let rideId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    if (!giverToken) throw new Error('BF beforeAll: failed to get giverToken');
    if (!seekerToken) throw new Error('BF beforeAll: failed to get seekerToken');

    await clearActiveRides(giverToken);

    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = Array.isArray(vehicles) ? vehicles[0]?.id : vehicles.data?.[0]?.id;
    if (!vehicleId) throw new Error(`BF beforeAll: no vehicle found — ${JSON.stringify(vehicles)}`);

    // Full setup: create ride, publish, request, approve, start
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'LB Nagar, Hyderabad', originLat: 17.34, originLng: 78.55,
      destinationName: 'Mindspace, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      ...inFourHours(), totalSeats: 2, vehicleId,
    });
    rideId = r.id ?? r.data?.id;
    if (!rideId) throw new Error(`BF beforeAll: ride creation failed — ${JSON.stringify(r)}`);

    const pub = await api(giverToken, 'patch', `/rides/${rideId}/publish`);
    if (pub.statusCode >= 400) throw new Error(`BF beforeAll: publish failed — ${JSON.stringify(pub)}`);

    const req = await api(seekerToken, 'post', '/ride-requests', { rideId, pickupName: 'LB Nagar Metro, Hyderabad' });
    const reqId = req.requestId ?? req.id ?? req.data?.id;
    if (!reqId) throw new Error(`BF beforeAll: request failed — ${JSON.stringify(req)}`);

    const appr = await api(giverToken, 'patch', `/ride-requests/${reqId}/approve`);
    if (appr.statusCode >= 400) throw new Error(`BF beforeAll: approve failed — ${JSON.stringify(appr)}`);

    const started = await api(giverToken, 'patch', `/rides/${rideId}/start`);
    if (started.statusCode >= 400) throw new Error(`BF beforeAll: start failed — ${JSON.stringify(started)}`);
    // seekerRecordId not needed — seeker self-boards via their own token
  });

  test('BF-01: ONGOING ride shows passenger as WAITING', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    // inFourHours() can cross midnight in CI (UTC) → ride appears as "tomorrow" →
    // hidden by the default 'today' period filter. Click 'All' to show all rides.
    await page.getByRole('button', { name: /^All$/i }).click();
    await expect(page.getByText(/waiting/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('BF-02: complete blocked when passenger still WAITING', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    // Click 'All' to bypass the default 'today' period filter (ride may be for tomorrow)
    await page.getByRole('button', { name: /^All$/i }).click();
    // Complete button should not be available or should be disabled
    const completeBtn = page.getByRole('button', { name: /complete ride/i });
    const isVisible = await completeBtn.isVisible().catch(() => false);
    if (isVisible) {
      await expect(completeBtn).toBeDisabled();
    }
    // Warning message should be shown
    await expect(page.getByText(/yet to board|still waiting/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('BF-03: seeker sees boarding button on ONGOING ride', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides');
    // Click 'All' to bypass the default 'today' period filter (ride may be for tomorrow)
    await page.getByRole('button', { name: /^All$/i }).click();
    await expect(page.getByRole('button', { name: /i.ve boarded/i }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('BF-04: after deboard — complete ride button becomes available', async ({ page }) => {
    // Seeker self-boards then self-deboards via their own token
    await api(seekerToken, 'patch', `/rides/${rideId}/board`).catch(() => {});
    await api(seekerToken, 'patch', `/rides/${rideId}/deboard`).catch(() => {});

    await loginUI(page, 'giver');
    await page.goto('/rides');
    // Click 'All' to bypass the default 'today' period filter (ride may be for tomorrow)
    await page.getByRole('button', { name: /^All$/i }).click();
    await expect(page.getByRole('button', { name: /complete ride/i })).toBeVisible({ timeout: 8_000 });
  });

  test('BF-05: completed ride shows in history', async ({ page }) => {
    await api(giverToken, 'patch', `/rides/${rideId}/complete`).catch(() => {});

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /show history/i }).click();
    await expect(page.getByText(/completed/i).filter({ visible: true }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('BF-06: seeker sees completed ride on their requests page', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    await expect(page.getByText(/completed|LB Nagar/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test.afterAll(async () => {
    // Safety net: if BF-05 failed to complete the ride (e.g. seeker still WAITING),
    // clearActiveRides no-shows all WAITING passengers then completes, preventing an
    // ONGOING ride from leaking into permission-leaks.spec.ts and quick-messages-flow.spec.ts.
    if (giverToken) await clearActiveRides(giverToken).catch(() => {});
  });
});
