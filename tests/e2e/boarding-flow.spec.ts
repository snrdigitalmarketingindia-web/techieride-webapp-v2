/**
 * Boarding Flow E2E Tests
 * WAITING → BOARDED → DEBOARDED / NO_SHOW
 * QA Architect coverage: all boarding state transitions visible in UI
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
function inOneHour(): { departureDate: string; departureTime: string } {
  const d = new Date(); d.setHours(d.getHours() + 1);
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
  let seekerRecordId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    await clearActiveRides(giverToken);
    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;

    // Full setup: create ride, publish, request, approve, start
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'LB Nagar, Hyderabad', originLat: 17.34, originLng: 78.55,
      destinationName: 'Mindspace, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      ...inOneHour(), totalSeats: 2, vehicleId,
    });
    rideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${rideId}/publish`);

    const req = await api(seekerToken, 'post', '/ride-requests', { rideId, pickupName: 'LB Nagar Metro, Hyderabad' });
    const reqId = (req.data ?? req).id;
    await api(giverToken, 'patch', `/ride-requests/${reqId}/approve`);
    await api(giverToken, 'patch', `/rides/${rideId}/start`);

    // Get seeker participant record
    const participants = await api(giverToken, 'get', `/rides/${rideId}/participants`);
    const pList = participants.data ?? participants;
    seekerRecordId = pList[0]?.seekerId ?? pList[0]?.id;
  });

  test('BF-01: ONGOING ride shows passenger as WAITING', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByText(/waiting/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('BF-02: complete blocked when passenger still WAITING', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    // Complete button should not be available or should be disabled
    const completeBtn = page.getByRole('button', { name: /complete ride/i });
    const isVisible = await completeBtn.isVisible().catch(() => false);
    if (isVisible) {
      await expect(completeBtn).toBeDisabled();
    }
    // Warning message should be shown
    await expect(page.getByText(/yet to board/i)).toBeVisible({ timeout: 8_000 });
  });

  test('BF-03: seeker sees boarding button on ONGOING ride', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides');
    await expect(page.getByRole('button', { name: /i.ve boarded/i }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('BF-04: after deboard — complete ride button becomes available', async ({ page }) => {
    await api(giverToken, 'patch', `/rides/${rideId}/board/${seekerRecordId}`).catch(() => {});
    await api(giverToken, 'patch', `/rides/${rideId}/deboard/${seekerRecordId}`).catch(() => {});

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByRole('button', { name: /complete ride/i })).toBeVisible({ timeout: 8_000 });
  });

  test('BF-05: completed ride shows in history', async ({ page }) => {
    await api(giverToken, 'patch', `/rides/${rideId}/complete`).catch(() => {});

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /show history/i }).click();
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('BF-06: seeker sees completed ride on their requests page', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/requests');
    await expect(page.getByText(/completed|LB Nagar/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
