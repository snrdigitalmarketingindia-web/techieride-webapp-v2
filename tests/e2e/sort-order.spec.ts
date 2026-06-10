/**
 * Sort Order E2E Tests
 * Rides list (giver + seeker) must be descending — newest/latest departure first.
 * Backend already orders via orderBy: [{ departureDate: 'desc' }, { createdAt: 'desc' }].
 * These tests confirm the UI does not re-sort or reverse the API order.
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, clearActiveRides, clearSeekerRequests, apiLogin, API } from './helpers';

async function api(token: string, method: 'get' | 'post' | 'patch' | 'delete', path: string, data?: object) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx[method](`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data ? { data } : {}),
  });
  const body = await res.json();
  await ctx.dispose();
  return body;
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

test.describe('📋 Ride Sort Order', () => {
  let giverToken: string;
  let seekerToken: string;
  let vehicleId: string;
  let rideIdNear: string;  // departs sooner  (tomorrow)
  let rideIdFar: string;   // departs later   (day after tomorrow)

  test.beforeAll(async () => {
    giverToken  = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    await clearActiveRides(giverToken);
    await clearSeekerRequests(seekerToken);

    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;

    // Create two rides: "near" departs in 1 day, "far" departs in 3 days
    // The API orderBy: departureDate desc → far should appear FIRST (later date = higher)
    const near = await api(giverToken, 'post', '/rides', {
      originName: 'Kondapur, Hyderabad', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City, Hyderabad', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: daysFromNow(1), departureTime: '09:00', totalSeats: 3, vehicleId,
    });
    rideIdNear = (near.data ?? near).id;
    await api(giverToken, 'patch', `/rides/${rideIdNear}/publish`);

    const far = await api(giverToken, 'post', '/rides', {
      originName: 'Kondapur, Hyderabad', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City, Hyderabad', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: daysFromNow(3), departureTime: '09:00', totalSeats: 3, vehicleId,
    });
    rideIdFar = (far.data ?? far).id;
    await api(giverToken, 'patch', `/rides/${rideIdFar}/publish`);
  });

  // SO-01: API returns rides descending by departureDate
  test('SO-01: getGivenRides API returns rides ordered newest departure first', async ({ page }) => {
    const rides = await api(giverToken, 'get', '/rides/given');
    const list: any[] = Array.isArray(rides) ? rides : (rides.data ?? []);
    expect(list.length).toBeGreaterThanOrEqual(2);

    // Verify descending: each departureDate >= the next
    for (let i = 0; i < list.length - 1; i++) {
      const curr = new Date(list[i].departureDate).getTime();
      const next = new Date(list[i + 1].departureDate).getTime();
      expect(curr).toBeGreaterThanOrEqual(next);
    }
  });

  // SO-02: Giver's /rides page shows the far-departure ride before the near-departure ride
  test('SO-02: giver /rides page shows latest-departure ride first', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.waitForTimeout(2_000);

    // Get all departure-date text nodes visible on the page
    // The "far" ride (daysFromNow(3)) should appear before the "near" ride (daysFromNow(1))
    const farDate  = daysFromNow(3);
    const nearDate = daysFromNow(1);

    const farEl  = page.getByText(farDate).first();
    const nearEl = page.getByText(nearDate).first();

    // Both should be visible
    await expect(farEl).toBeVisible({ timeout: 8_000 });
    await expect(nearEl).toBeVisible({ timeout: 5_000 });

    // farEl should appear higher on the page (lower Y coordinate)
    const farBox  = await farEl.boundingBox();
    const nearBox = await nearEl.boundingBox();
    if (farBox && nearBox) {
      expect(farBox.y).toBeLessThan(nearBox.y);
    }
  });

  // SO-03: Seeker /requests page — newest requests appear first
  test('SO-03: getMyRequests API returns requests ordered newest first', async ({ page }) => {
    // Seeker requests both rides
    const req1 = await api(seekerToken, 'post', '/ride-requests', { rideId: rideIdNear, pickupName: 'Kondapur' });
    const req2 = await api(seekerToken, 'post', '/ride-requests', { rideId: rideIdFar,  pickupName: 'Kondapur' });

    const myReqs = await api(seekerToken, 'get', '/ride-requests/mine');
    const list: any[] = Array.isArray(myReqs) ? myReqs : (myReqs.data ?? []);
    expect(list.length).toBeGreaterThanOrEqual(2);

    // Verify descending createdAt
    for (let i = 0; i < list.length - 1; i++) {
      const curr = new Date(list[i].createdAt).getTime();
      const next = new Date(list[i + 1].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(next);
    }
  });

  test.afterAll(async () => {
    if (rideIdNear) await api(giverToken, 'patch', `/rides/${rideIdNear}/cancel`).catch(() => {});
    if (rideIdFar)  await api(giverToken, 'patch', `/rides/${rideIdFar}/cancel`).catch(() => {});
  });
});
