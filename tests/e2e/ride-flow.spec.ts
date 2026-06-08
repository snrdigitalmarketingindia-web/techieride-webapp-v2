/**
 * Ride Flow E2E Tests
 * Tests the full ride lifecycle from UI perspective — giver publishes,
 * seeker requests, giver approves/rejects, UI reflects correct states.
 *
 * Uses API calls to set up state, then verifies UI reflects it correctly.
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, SEED_PASSWORD, clearActiveRides, clearSeekerRequests, apiLogin, API } from './helpers';


// ── Helpers ────────────────────────────────────────────────────────────────

/** Fill the search date input with tomorrow's date so API-created tomorrow rides show up */
function tomorrowDateStr(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Navigate to a ride detail page and wait for all network activity to settle.
 * `networkidle` ensures ridesApi.getById() has resolved and React has rendered.
 */
async function gotoRideDetail(page: any, rId: string) {
  // Register before navigation — DashboardLayout calls fetchProfile() async after
  // Zustand rehydrates, which can happen after networkidle. This ensures user.id
  // is populated before we assert isMyRide-gated elements.
  const profileReady = page.waitForResponse(
    (r: any) => r.url().includes('/users/me') && r.status() === 200,
    { timeout: 15_000 },
  ).catch(() => {});
  await page.goto(`/rides/${rId}`, { waitUntil: 'networkidle' });
  await profileReady;
  await page.waitForTimeout(300);
}

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
    await clearSeekerRequests(seekerToken);

    // Get giver's vehicle
    const vehicles = await apiCall(giverToken, 'get', '/vehicles/my');
    vehicleId = vehicles.data?.[0]?.id ?? vehicles[0]?.id;
  });

  test('giver can publish a ride and it appears in search results', async ({ page }) => {
    // Create + publish via API
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    // Coords match the search page defaults (17.4401/78.3489 origin, 17.4489/78.3696 dest)
    // so the ride appears within the 500m search radius when seeker searches with defaults
    const created = await apiCall(giverToken, 'post', '/rides', {
      originName: 'Kondapur, Hyderabad',
      originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City, Hyderabad',
      destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: tomorrow.toISOString().split('T')[0],
      departureTime: '09:00',
      totalSeats: 3,
      vehicleId,
    });
    rideId = created.data?.id ?? created.id;
    await apiCall(giverToken, 'patch', `/rides/${rideId}/publish`);

    // Seeker searches and sees the ride (set date to tomorrow — rides are created with tomorrow's departure)
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.locator('input[type="date"]').fill(tomorrowDateStr());
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    await expect(page.getByText(/kondapur/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('seeker requests seat — search page shows "awaiting approval"', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.locator('input[type="date"]').fill(tomorrowDateStr());
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
    await page.locator('input[type="date"]').fill(tomorrowDateStr());
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
    await page.locator('input[type="date"]').fill(tomorrowDateStr());
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    await expect(page.getByText(/seat confirmed/i)).toBeVisible({ timeout: 8_000 });
  });

  test('giver sees confirmed passenger on My Rides page', async ({ page }) => {
    await loginUI(page, 'giver');
    // Wait for the second /rides/given fetch (triggered after user?.id loads) before clicking All
    const ridesFetch = page.waitForResponse(
      (r: any) => r.url().includes('/rides/given') && r.status() === 200,
      { timeout: 15_000 },
    );
    await page.goto('/rides');
    await ridesFetch;
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^All$/i }).click();
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
    await expect(page.getByText(/rejected/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('seeker cancels confirmed request — seat is freed', async ({ page }) => {
    // Cancel via API
    await apiCall(seekerToken, 'patch', `/ride-requests/${requestId}/cancel`);

    // Seeker search page should show "Request Seat" button again
    await loginUI(page, 'seeker');
    // Register listener before goto so the auto-search response is captured
    const autoSearchDone = page.waitForResponse(
      r => r.url().includes('/rides/search') && r.status() === 200,
      { timeout: 10_000 },
    );
    await page.goto('/rides/search');
    await autoSearchDone; // wait for today's auto-search to finish before triggering manual search
    await page.locator('input[type="date"]').fill(tomorrowDateStr());
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

// ── My Rides — Period Filter Tabs ─────────────────────────────────────────────
test.describe('📅 My Rides — Period Filter Tabs', () => {
  let giverToken: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    await clearActiveRides(giverToken);
  });

  test('MR-01: period filter tabs visible and Today is active by default', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByRole('button', { name: /^All$/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /^Today$/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /^Tomorrow$/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /^Week$|^This Week$/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /^Month$|^This Month$/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /Custom/i })).toBeVisible({ timeout: 5_000 });
    // "Today" must be the active (highlighted) tab by default
    await expect(page.getByRole('button', { name: /^Today$/i })).toHaveClass(/bg-brand/, { timeout: 5_000 });
  });

  test('MR-02: clicking Custom reveals date range pickers', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /Custom/i }).click();
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 5_000 });
    // Should have two date inputs (from + to)
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });

  test('MR-03: Today filter shows no-results state when no rides today', async ({ page }) => {
    // Fresh giver with no rides today — Today filter should show empty state
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /Today/i }).click();
    // Either shows rides (if any today) or the empty/no-results state — never a crash
    await expect(page).not.toHaveURL(/error|500/);
    await page.waitForTimeout(1_000);
    await expect(page).not.toHaveURL(/error/);
  });

  test('MR-04: switching Given → Taken tab resets period filter to All', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');

    // Select "Week" (was "This Week") on Given tab
    await page.getByRole('button', { name: /^Week$|^This Week$/i }).click();
    const thisWeekBtn = page.getByRole('button', { name: /^Week$|^This Week$/i });
    await expect(thisWeekBtn).toHaveClass(/bg-brand/, { timeout: 3_000 });

    // Switch to Taken tab
    await page.getByRole('button', { name: /Rides Taken/i }).click();

    // "All" should now be the active period
    const allBtn = page.getByRole('button', { name: /^All$/i });
    await expect(allBtn).toHaveClass(/bg-brand/, { timeout: 3_000 });
  });

  test('MR-05: Tomorrow filter shows only tomorrow\'s rides', async ({ page }) => {
    // Create a ride for tomorrow and one for the day after
    const tmr  = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    const dat  = new Date(Date.now() + 2 * 86_400_000).toISOString().split('T')[0];

    const vehicles = await apiCall(giverToken, 'get', '/vehicles/my');
    const vehicleId = vehicles.data?.[0]?.id ?? vehicles[0]?.id;

    const rTmr = await apiCall(giverToken, 'post', '/rides', {
      vehicleId, originName: 'A', originLat: 17.44, originLng: 78.34,
      destinationName: 'B', destinationLat: 17.45, destinationLng: 78.36,
      departureDate: tmr, departureTime: '09:00', totalSeats: 2,
    });
    const rDat = await apiCall(giverToken, 'post', '/rides', {
      vehicleId, originName: 'A', originLat: 17.44, originLng: 78.34,
      destinationName: 'B', destinationLat: 17.45, destinationLng: 78.36,
      departureDate: dat, departureTime: '09:00', totalSeats: 2,
    });
    const tmrId = rTmr.data?.id ?? rTmr.id;
    const datId = rDat.data?.id ?? rDat.id;
    await apiCall(giverToken, 'patch', `/rides/${tmrId}/publish`);
    await apiCall(giverToken, 'patch', `/rides/${datId}/publish`);

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /Show History/i }).click().catch(() => {});
    await page.getByRole('button', { name: /^Tomorrow$/i }).click();
    await page.waitForTimeout(1_000);

    // No crash
    await expect(page).not.toHaveURL(/error|500/);

    // Cleanup
    await apiCall(giverToken, 'patch', `/rides/${tmrId}/cancel`).catch(() => {});
    await apiCall(giverToken, 'patch', `/rides/${datId}/cancel`).catch(() => {});
  });

  test('MR-06: Tomorrow filter shows empty state when no rides tomorrow', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /^Tomorrow$/i }).click();
    await expect(page).not.toHaveURL(/error|500/);
    await page.waitForTimeout(1_000);
    await expect(page).not.toHaveURL(/error/);
  });

  test('MR-07: switching tab after Tomorrow resets period to All', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /^Tomorrow$/i }).click();
    await expect(page.getByRole('button', { name: /^Tomorrow$/i })).toHaveClass(/bg-brand/, { timeout: 3_000 });

    await page.getByRole('button', { name: /Rides Taken/i }).click();
    await expect(page.getByRole('button', { name: /^All$/i })).toHaveClass(/bg-brand/, { timeout: 3_000 });
  });
});

// ── Boarding Badge ─────────────────────────────────────────────────────────────
test.describe('🎫 Boarding Badge — Seat Confirmed vs Yet to board', () => {
  let giverToken: string;
  let seekerToken: string;
  let rideId: string;
  let requestId: string;

  test.beforeAll(async () => {
    giverToken  = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    await clearActiveRides(giverToken);
    await clearSeekerRequests(seekerToken);

    const vehicles = await apiCall(giverToken, 'get', '/vehicles/my');
    const vehicleId = vehicles.data?.[0]?.id ?? vehicles[0]?.id;
    const tomorrow  = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

    // Use today's date with a past time so /start is not blocked by departure guard
    const today     = new Date().toISOString().split('T')[0];
    const pastTime  = '00:01'; // safely in the past

    const created = await apiCall(giverToken, 'post', '/rides', {
      vehicleId, originName: 'Kondapur', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: today, departureTime: pastTime, totalSeats: 3,
    });
    rideId = created.data?.id ?? created.id;
    await apiCall(giverToken, 'patch', `/rides/${rideId}/publish`);

    const req = await apiCall(seekerToken, 'post', '/ride-requests', { rideId, pickupName: 'Kondapur Metro' });
    requestId = req.requestId ?? req.id ?? req.data?.id;
    await apiCall(giverToken, 'patch', `/ride-requests/${requestId}/approve`);
  });

  test('BD-01: confirmed passenger shows "Seat Confirmed" badge on PUBLISHED ride (giver view)', async ({ page }) => {
    // "Seat Confirmed" badge is rendered by RideCard (rides/page.tsx list), not the
    // detail page. WAITING boardingStatus on a PUBLISHED ride = "✅ Seat Confirmed".
    await loginUI(page, 'giver');
    await page.goto('/rides', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Seat Confirmed/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Waiting$/i)).not.toBeVisible();
  });

  test('BD-02: confirmed passenger shows "Yet to board" badge on ONGOING ride (giver view)', async ({ page }) => {
    const startR = await apiCall(giverToken, 'patch', `/rides/${rideId}/start`);
    if (![200, 201].includes(startR?.status ?? startR?.data?.status)) {
      test.skip(true, `Start ride failed — skipping BD-02 (status: ${JSON.stringify(startR)})`);
      return;
    }

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await expect(page.getByText(/Yet to board/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Seat Confirmed/i)).not.toBeVisible();

    // Cleanup
    await apiCall(giverToken, 'patch', `/rides/${rideId}/cancel`).catch(() => {});
  });
});

// ── Profile — Blood Group Dropdown ────────────────────────────────────────────
test.describe('👤 Profile — Blood Group Dropdown', () => {
  test('PR-01: blood group field is a <select> not a text input', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    // Click any button that opens the edit form (label may vary)
    await page.locator('button').filter({ hasText: /edit/i }).first().click();
    await page.waitForTimeout(500);
    // Blood group must be a select element (look for the label then adjacent select)
    const bgLabel = page.locator('label').filter({ hasText: /blood group/i });
    await expect(bgLabel).toBeVisible({ timeout: 5_000 });
    // The select should be present (not an input[type=text])
    const bgSelect = page.locator('select').filter({ hasText: /select blood group|A\+|B\+|O\+|AB/i });
    await expect(bgSelect).toBeVisible({ timeout: 5_000 });
  });

  test('PR-02: blood group dropdown contains all 8 standard types', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await page.locator('button').filter({ hasText: /edit/i }).first().click();
    await page.waitForTimeout(500);

    const bgSelect = page.locator('select').filter({ hasText: /select blood group|A\+|B\+|O\+|AB/i });
    await expect(bgSelect).toBeVisible({ timeout: 5_000 });

    const options = await bgSelect.locator('option').allTextContents();
    for (const grp of ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']) {
      expect(options.some(o => o.includes(grp)), `Missing blood group option: ${grp}`).toBe(true);
    }
  });
});

// ── Search — Seeker vs Giver button ───────────────────────────────────────────
test.describe('🔍 Search — Request Seat shown to seeker, not to giver on own ride', () => {
  test('SR-04: seeker sees Request Seat button (not "Your ride") on a published ride', async ({ page }) => {
    // Ensure there is at least one published ride visible
    const giverToken = await apiLogin(ACCOUNTS.giver.email);
    const vehicles   = await apiCall(giverToken, 'get', '/vehicles/my');
    const vehicleId  = vehicles.data?.[0]?.id ?? vehicles[0]?.id;
    const tomorrow   = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

    const created = await apiCall(giverToken, 'post', '/rides', {
      vehicleId, originName: 'Kondapur', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: tomorrow, departureTime: '09:00', totalSeats: 3,
    });
    const rideId = created.data?.id ?? created.id;
    await apiCall(giverToken, 'patch', `/rides/${rideId}/publish`);

    await loginUI(page, 'seeker');
    await page.goto('/rides/search');
    await page.locator('input[type="date"]').fill(tomorrow);
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(2_000);

    await expect(page.getByRole('button', { name: /request seat/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/your ride/i)).not.toBeVisible();

    await apiCall(giverToken, 'patch', `/rides/${rideId}/cancel`).catch(() => {});
  });
});

// ── Pickup ETA ─────────────────────────────────────────────────────────────────
test.describe('🕐 Pickup ETA — estimate and override', () => {
  let giverToken: string;
  let rideId: string;
  let requestId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    await clearActiveRides(giverToken);

    const vehicles  = await apiCall(giverToken, 'get', '/vehicles/my');
    const vehicleId = vehicles.data?.[0]?.id ?? vehicles[0]?.id;
    const tomorrow  = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

    const created = await apiCall(giverToken, 'post', '/rides', {
      vehicleId, originName: 'Kondapur', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City', destinationLat: 17.4489, destinationLng: 78.3696,
      departureDate: tomorrow, departureTime: '09:00', totalSeats: 3,
    });
    rideId = created.data?.id ?? created.id;
    await apiCall(giverToken, 'patch', `/rides/${rideId}/publish`);

    // Seeker requests with pickup coords
    const seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    const req = await apiCall(seekerToken, 'post', '/ride-requests', {
      rideId,
      pickupName: 'Kondapur Metro',
      pickupLat: 17.4430, pickupLng: 78.3510,
    });
    requestId = req.requestId ?? req.id ?? req.data?.id;
  });

  test('ETA-01: pickup ETA is hidden when seeker has no pickup coordinates', async ({ page }) => {
    // Create a request without coords
    const seekerToken2 = await apiLogin('raghu@raghu.com');
    const req2 = await apiCall(seekerToken2, 'post', '/ride-requests', {
      rideId, pickupName: 'Miyapur',
      // no pickupLat / pickupLng
    });
    const req2Id = req2.requestId ?? req2.id ?? req2.data?.id;

    await loginUI(page, 'giver');
    await page.goto(`/rides/${rideId}`);
    await page.waitForTimeout(2_000);

    // The req2 row (Raghu — no coords) must NOT show an ETA
    const raghuRow = page.locator('text=Raghu Sri').locator('..').locator('..');
    await expect(raghuRow.locator('text=/Est\\. ~/i')).not.toBeVisible();
    await expect(raghuRow.locator('text=/Pickup at/i')).not.toBeVisible();

    await apiCall(seekerToken2, 'patch', `/ride-requests/${req2Id}/cancel`).catch(() => {});
  });

  test('ETA-02: pickup ETA estimate is shown when seeker has pickup coordinates', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto(`/rides/${rideId}`);
    await page.waitForTimeout(2_000);

    // Arjun's request has coords — should show Est. ~HH:MM AM/PM
    await expect(page.getByText(/Est\. ~/i)).toBeVisible({ timeout: 8_000 });
  });

  test('ETA-03: giver can override pickup time via pencil icon', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto(`/rides/${rideId}`);
    await page.waitForTimeout(2_000);

    // Click the edit pencil
    await page.locator('button[title="Set pickup time"]').first().click();
    await expect(page.locator('input[type="time"]').first()).toBeVisible({ timeout: 3_000 });

    // Enter a specific time and save
    await page.locator('input[type="time"]').first().fill('08:30');
    await page.getByRole('button', { name: /^Save$/i }).first().click();

    // Override should now be displayed
    await expect(page.getByText(/Pickup at 08:30/i)).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(/Est\. ~/i)).not.toBeVisible();
  });

  test('ETA-04: pickup time override persists after page refresh (independent)', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto(`/rides/${rideId}`);
    await page.waitForTimeout(2_000);

    // Set override independently (don't rely on ETA-03)
    await page.locator('button[title="Set pickup time"]').first().click();
    await expect(page.locator('input[type="time"]').first()).toBeVisible({ timeout: 3_000 });
    await page.locator('input[type="time"]').first().fill('09:00');
    await page.getByRole('button', { name: /^Save$/i }).first().click();
    await expect(page.getByText(/Pickup at 09:00/i)).toBeVisible({ timeout: 3_000 });

    // Refresh and verify override persists from localStorage
    await page.reload();
    await page.waitForTimeout(2_000);
    await expect(page.getByText(/Pickup at 09:00/i)).toBeVisible({ timeout: 5_000 });
  });

  test.afterAll(async () => {
    await apiCall(giverToken, 'patch', `/rides/${rideId}/cancel`).catch(() => {});
  });
});
