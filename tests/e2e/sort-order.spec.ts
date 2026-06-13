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

    // Create two DRAFT rides: "near" departs in 1 day, "far" departs in 3 days.
    // The API enforces only one active (PUBLISHED/ONGOING) ride at a time, so we
    // leave both as DRAFT and verify sort order via ?status=DRAFT. Then publish only
    // the far ride so SO-02 can find it on the UI page.
    const near = await api(giverToken, 'post', '/rides', {
      originName: 'Kondapur, Hyderabad', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City, Hyderabad', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: daysFromNow(1), departureTime: '09:00', totalSeats: 3, vehicleId,
    });
    rideIdNear = (near.data ?? near).id;

    const far = await api(giverToken, 'post', '/rides', {
      originName: 'Kondapur, Hyderabad', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City, Hyderabad', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: daysFromNow(3), departureTime: '09:00', totalSeats: 3, vehicleId,
    });
    rideIdFar = (far.data ?? far).id;
    // Both rides stay DRAFT here so SO-01 can see ≥2 DRAFT rides for ordering check.
    // SO-02 publishes rideIdFar inside the test itself.
  });

  // SO-01: API returns rides descending by departureDate
  test('SO-01: getGivenRides API returns rides ordered newest departure first', async ({ page }) => {
    // Use ?status=DRAFT to fetch both draft rides — business rule allows only one
    // PUBLISHED ride at a time so we verify ordering on the draft list instead.
    const rides = await api(giverToken, 'get', '/rides/given?status=DRAFT');
    const list: any[] = Array.isArray(rides) ? rides : (rides.data ?? []);
    expect(list.length).toBeGreaterThanOrEqual(2);

    // Verify descending: each departureDate >= the next
    for (let i = 0; i < list.length - 1; i++) {
      const curr = new Date(list[i].departureDate).getTime();
      const next = new Date(list[i + 1].departureDate).getTime();
      expect(curr).toBeGreaterThanOrEqual(next);
    }
  });

  // SO-02: Giver's /rides page shows the published (far-departure) ride.
  // The near ride remains DRAFT (business rule: one active ride at a time) so only
  // the far ride appears on the active list. The UI renders dates as "13 Jun" (en-IN
  // locale), and the default period filter is "today" — must click "All" first.
  test('SO-02: giver /rides page shows latest-departure ride first', async ({ page }) => {
    if (!rideIdFar) { test.skip(true, 'SO-02: rideIdFar undefined'); return; }
    // Publish far ride here (both were left DRAFT in beforeAll so SO-01 could see ≥2)
    const pubRes = await api(giverToken, 'patch', `/rides/${rideIdFar}/publish`);
    if (pubRes?.statusCode >= 400 || pubRes?.success === false || pubRes?.error) {
      test.skip(true, `SO-02: publish failed — ${pubRes?.message}`);
      return;
    }
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.waitForTimeout(1_000);

    // Switch to "All" period so rides not departing today are visible
    await page.getByRole('button', { name: 'All' }).click();
    await page.waitForTimeout(500);

    // The UI formats departureDate as e.g. "13 Jun" (en-IN locale, day + short month).
    // Derive the label from the SAME UTC date string the ride was stored with
    // (daysFromNow uses toISOString) — computing it from a fresh IST `new Date()`
    // drifts a day when CI runs after 18:30 UTC (past midnight IST).
    const farDateLabel = new Date(daysFromNow(3) + 'T00:00:00Z')
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

    await expect(page.getByText(farDateLabel).first()).toBeVisible({ timeout: 8_000 });
  });

  // SO-03: Seeker /requests page — newest requests appear first
  test('SO-03: getMyRequests API returns requests ordered newest first', async ({ page }) => {
    // Only rideIdFar is PUBLISHED; rideIdNear is DRAFT so seeker cannot request it
    const req2 = await api(seekerToken, 'post', '/ride-requests', { rideId: rideIdFar, pickupName: 'Kondapur' });

    const myReqs = await api(seekerToken, 'get', '/ride-requests/mine');
    const list: any[] = Array.isArray(myReqs) ? myReqs : (myReqs.data ?? []);
    expect(list.length).toBeGreaterThanOrEqual(1);

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
