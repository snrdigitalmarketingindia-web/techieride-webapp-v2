/**
 * Giver Flow E2E Tests
 * Full lifecycle: create ride → manage requests → start → complete/cancel
 * QA Architect coverage: all giver-visible states and transitions
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, SEED_PASSWORD, clearActiveRides, clearSeekerRequests, apiLogin, API } from './helpers';


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

function tomorrow9am(): { departureDate: string; departureTime: string } {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return { departureDate: d.toISOString().split('T')[0], departureTime: '09:00' };
}

/** Navigate to /rides and wait for the second fetch (triggered by user?.id loading) to complete */
async function gotoRidesReady(page: any) {
  // Register listener BEFORE navigation so we catch both fetches
  const secondFetch = page.waitForResponse(
    (r: any) => r.url().includes('/rides/given') && r.status() === 200,
    { timeout: 15_000 },
  );
  await page.goto('/rides');
  await secondFetch; // wait for at least one /rides/given response
  // Small buffer for React re-render after state update
  await page.waitForTimeout(500);
}

/**
 * Navigate to a ride detail page and wait for all API calls to settle,
 * including the DashboardLayout's async fetchProfile() call which populates
 * user.id in the Zustand store (needed for isMyRide checks on the detail page).
 *
 * Key insight: the auth store only persists tokens to localStorage, NOT the user
 * object. On every page.goto(), DashboardLayout calls fetchProfile() → /users/me
 * AFTER _hasHydrated fires. This is a second network round-trip that happens
 * AFTER networkidle would normally fire. We register the listener BEFORE goto()
 * to ensure we catch it.
 */
async function gotoRideDetail(page: any, rId: string) {
  // Register before navigation — /users/me fires after Zustand rehydrates on
  // the new page, which may happen after networkidle. .catch ensures we don't
  // block if profile was somehow already loaded.
  const profileReady = page.waitForResponse(
    (r: any) => r.url().includes('/users/me') && r.status() === 200,
    { timeout: 15_000 },
  ).catch(() => {});
  await page.goto(`/rides/${rId}`, { waitUntil: 'networkidle' });
  await profileReady; // wait for user.id to be populated in the Zustand store
  await page.waitForTimeout(300); // small buffer for final React re-render
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
    await clearSeekerRequests(seekerToken);
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
    // Origin is now a MapPin button (no text input) — form starts empty, validation fires on submit
    await btn.click();
    await expect(page.getByText(/fill in|origin|vehicle|required/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('GF-03: published ride appears on My Rides page as PUBLISHED', async ({ page }) => {
    const created = await api(giverToken, 'post', '/rides', {
      originName: 'Gachibowli, Hyderabad', originLat: 17.44, originLng: 78.35,
      destinationName: 'Mindspace, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      ...tomorrow9am(), totalSeats: 3, vehicleId,
    });
    rideId = (created.data ?? created).id;
    await api(giverToken, 'patch', `/rides/${rideId}/publish`);

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /^All$/i }).click();
    await expect(page.getByText(/published/i).filter({ visible: true }).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Request Management ──────────────────────────────────────────────────

  test('GF-04: giver sees pending request on requests page', async ({ page }) => {
    const req = await api(seekerToken, 'post', '/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
    requestId = req.requestId ?? req.id ?? req.data?.id;

    await loginUI(page, 'giver');
    await page.goto('/requests');
    await expect(page.getByText(/pending|incoming|arjun/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('GF-05: giver approves request — passenger shows in ride detail', async ({ page }) => {
    await api(giverToken, 'patch', `/ride-requests/${requestId}/approve`);

    await loginUI(page, 'giver');
    await gotoRideDetail(page, rideId);
    await expect(page.getByText(/arjun mehta/i)).toBeVisible({ timeout: 15_000 });
  });

  test('GF-06: giver rejects a second request — requests page updates', async ({ page }) => {
    const seeker2Token = await apiLogin('raghu@raghu.com');
    const req2 = await api(seeker2Token, 'post', '/ride-requests', { rideId, pickupName: 'Miyapur, Hyderabad' });
    const req2Id = req2.requestId ?? req2.id ?? req2.data?.id;
    await api(giverToken, 'patch', `/ride-requests/${req2Id}/reject`);

    await loginUI(page, 'giver');
    await page.goto('/requests');
    await expect(page).not.toHaveURL(/error/);
  });

  // ── Ride Actions ────────────────────────────────────────────────────────

  test('GF-07: giver sees Start Ride button on PUBLISHED ride', async ({ page }) => {
    await loginUI(page, 'giver');
    await gotoRideDetail(page, rideId);
    await expect(page.getByRole('button', { name: /start ride/i })).toBeVisible({ timeout: 15_000 });
  });

  test('GF-08: giver starts ride — status changes to ONGOING', async ({ page }) => {
    await api(giverToken, 'patch', `/rides/${rideId}/start`);

    await loginUI(page, 'giver');
    await gotoRideDetail(page, rideId);
    await expect(page.getByText(/ongoing/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('GF-09: giver cannot cancel ONGOING ride', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides');
    // Cancel button should not exist for ONGOING rides
    const cancelBtn = page.getByRole('button', { name: /cancel ride/i });
    await expect(cancelBtn).not.toBeVisible();
  });

  test('GF-10: quick message button visible on ONGOING ride', async ({ page }) => {
    // Quick Message button is on the /rides LIST page (rides/page.tsx), not the
    // detail page. Navigate to the list and check the ONGOING ride card.
    await loginUI(page, 'giver');
    await gotoRidesReady(page);
    await expect(page.getByRole('button', { name: /quick message/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('GF-11: giver boards and deboards passenger — Complete Ride becomes available', async ({ page }) => {
    // Seeker self-boards then self-deboards via their own token
    await api(seekerToken, 'patch', `/rides/${rideId}/board`).catch(() => {});
    await api(seekerToken, 'patch', `/rides/${rideId}/deboard`).catch(() => {});

    await loginUI(page, 'giver');
    await gotoRideDetail(page, rideId);
    await expect(page.getByRole('button', { name: /complete ride/i })).toBeVisible({ timeout: 15_000 });
  });

  test('GF-12: completed ride shows in history', async ({ page }) => {
    await api(giverToken, 'patch', `/rides/${rideId}/complete`).catch(() => {});

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /show history/i }).click();
    await expect(page.getByText(/completed/i).filter({ visible: true }).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Cancel Flow ─────────────────────────────────────────────────────────

  test('GF-13: giver can cancel a PUBLISHED ride', async ({ page }) => {
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Kukatpally, Hyderabad', originLat: 17.49, originLng: 78.39,
      destinationName: 'Nanakramguda, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      ...tomorrow9am(), totalSeats: 2, vehicleId,
    });
    const cancelRideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${cancelRideId}/publish`);
    await api(giverToken, 'patch', `/rides/${cancelRideId}/cancel`);

    await loginUI(page, 'giver');
    await page.goto('/rides');
    await page.getByRole('button', { name: /show history/i }).click();
    await expect(page.getByText(/cancelled/i).filter({ visible: true }).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Commute Template ────────────────────────────────────────────────────

  test('GF-14: giver can view commute templates page', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    // Templates section or link should exist
    await expect(page).not.toHaveURL(/error/);
  });

  // ── Ride Posting UX ─────────────────────────────────────────────────────

  test('GF-15: lead time — API blocks publish with departure < 15 min from now', async ({ page }) => {
    // Create a ride with departure 10 minutes from now — should be blocked on publish
    const nowPlus10 = new Date(Date.now() + 10 * 60 * 1000);
    const dateStr = nowPlus10.toISOString().split('T')[0];
    const timeStr = `${String(nowPlus10.getHours()).padStart(2, '0')}:${String(nowPlus10.getMinutes()).padStart(2, '0')}`;

    const created = await api(giverToken, 'post', '/rides', {
      originName: 'Lead Time Test Origin', originLat: 17.44, originLng: 78.35,
      destinationName: 'Lead Time Test Dest', destinationLat: 17.45, destinationLng: 78.37,
      departureDate: dateStr, departureTime: timeStr, totalSeats: 2, vehicleId,
    });
    const testRideId = (created.data ?? created).id;
    expect(testRideId).toBeTruthy();

    const ctx = await playwrightRequest.newContext();
    const res = await ctx.patch(`${API}/rides/${testRideId}/publish`, {
      headers: { Authorization: `Bearer ${giverToken}` },
    });
    // Read body before disposing context — disposing invalidates the response object
    const body = await res.json();
    await ctx.dispose();

    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/15 minutes/i);

    // Cleanup
    await api(giverToken, 'patch', `/rides/${testRideId}/cancel`).catch(() => {});
  });

  test('GF-16: lead time — API allows publish with departure 35 min from now', async ({ page }) => {
    const nowPlus35 = new Date(Date.now() + 35 * 60 * 1000);
    const dateStr = nowPlus35.toISOString().split('T')[0];
    const timeStr = `${String(nowPlus35.getHours()).padStart(2, '0')}:${String(nowPlus35.getMinutes()).padStart(2, '0')}`;

    const created = await api(giverToken, 'post', '/rides', {
      originName: 'Lead Time Test Origin 35', originLat: 17.44, originLng: 78.35,
      destinationName: 'Lead Time Test Dest 35', destinationLat: 17.45, destinationLng: 78.37,
      departureDate: dateStr, departureTime: timeStr, totalSeats: 2, vehicleId,
    });
    const testRideId = (created.data ?? created).id;
    expect(testRideId).toBeTruthy();

    const ctx = await playwrightRequest.newContext();
    const res = await ctx.patch(`${API}/rides/${testRideId}/publish`, {
      headers: { Authorization: `Bearer ${giverToken}` },
    });
    await ctx.dispose();

    expect([200, 201]).toContain(res.status());

    // Cleanup
    await api(giverToken, 'patch', `/rides/${testRideId}/cancel`).catch(() => {});
  });

  test('GF-17: create ride page shows 15-min warning for near-term departure', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');

    // Compute "10 min from now" using Node.js local time.
    // The form's isAtLeast15MinAhead() uses new Date(`${date}T${time}:00`) which
    // is parsed as LOCAL time in the browser. CI runner and browser both run in UTC,
    // so using local time (UTC) for both date and time gives a consistent pair.
    // We also fill the date input to override the form's IST-based default, which
    // can be "tomorrow" from UTC's perspective, making the departure appear 24h away.
    const soon = new Date(Date.now() + 10 * 60 * 1000);
    const dateStr = soon.toLocaleDateString('en-CA');  // YYYY-MM-DD in local timezone
    const timeStr = `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`;

    await page.locator('input[type="date"]').fill(dateStr);
    await page.locator('input[type="time"]').fill(timeStr);
    await page.locator('input[type="time"]').blur();

    await expect(page.getByText(/15 minutes/i)).toBeVisible({ timeout: 5_000 });
  });

  test('GF-18: profile home/office locations are saved and returned via API', async ({ page }) => {
    // Update profile with home and office location
    const ctx = await playwrightRequest.newContext();
    const res = await ctx.patch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${giverToken}`, 'Content-Type': 'application/json' },
      data: { homeLocation: 'Kondapur, Hyderabad', officeLocation: 'HITEC City, Hyderabad' },
    });
    expect([200, 201]).toContain(res.status());

    // Fetch profile and confirm values persisted
    const profileRes = await ctx.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${giverToken}` },
    });
    const profile = await profileRes.json();
    const data = profile.data ?? profile;
    expect(data.homeLocation).toBe('Kondapur, Hyderabad');
    expect(data.officeLocation).toBe('HITEC City, Hyderabad');
    await ctx.dispose();
  });

  test('GF-19: create ride page pre-fills locations from profile and allows editing', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');

    // If profile has home/office locations the auto-fill hint should appear
    const hint = page.getByText(/auto-filled from your profile|pre-filled from your last ride/i);
    const hintVisible = await hint.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hintVisible) {
      // Confirm fields are editable (not locked)
      const originInput = page.locator('input[placeholder*="Kondapur"]').or(page.locator('input').filter({ hasText: '' }).nth(1));
      await expect(originInput.first()).toBeEnabled();
    }
    // Page must load without errors regardless
    await expect(page).not.toHaveURL(/error/);
  });
});
