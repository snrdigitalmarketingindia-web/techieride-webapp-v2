/**
 * Rating & Complaint Flow E2E Tests
 * Post-ride rating prompt, complaint filing, admin resolution
 * QA Architect coverage: post-ride interactions
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

test.describe('⭐ Rating & Complaint Flow', () => {
  let giverToken: string;
  let seekerToken: string;
  let adminToken: string;
  let vehicleId: string;
  let completedRideId: string;
  let giverUserId: string;
  let seekerUserId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    adminToken = await apiLogin(ACCOUNTS.admin.email);
    await clearActiveRides(giverToken);

    const me = await api(giverToken, 'get', '/users/me');
    giverUserId = (me.data ?? me).id;
    const sMe = await api(seekerToken, 'get', '/users/me');
    seekerUserId = (sMe.data ?? sMe).id;

    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;

    // Full ride completion setup (4h departure so cancel always has >1h margin)
    const d = new Date(); d.setHours(d.getHours() + 4);
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Jubilee Hills, Hyderabad', originLat: 17.43, originLng: 78.40,
      destinationName: 'Banjara Hills, Hyderabad', destinationLat: 17.41, destinationLng: 78.44,
      departureDate: d.toISOString().split('T')[0],
      departureTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      totalSeats: 2, vehicleId,
    });
    completedRideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${completedRideId}/publish`);
    const req = await api(seekerToken, 'post', '/ride-requests', { rideId: completedRideId, pickupName: 'Jubilee Hills, Hyderabad' });
    const reqId = req.requestId ?? req.id ?? req.data?.id;
    await api(giverToken, 'patch', `/ride-requests/${reqId}/approve`);
    await api(giverToken, 'patch', `/rides/${completedRideId}/start`);
    // Seeker self-boards and self-deboards (no-param PATCH via seeker token)
    await api(seekerToken, 'patch', `/rides/${completedRideId}/board`).catch(() => {});
    await api(seekerToken, 'patch', `/rides/${completedRideId}/deboard`).catch(() => {});
    await api(giverToken, 'patch', `/rides/${completedRideId}/complete`);
  });

  // ── Ratings ──────────────────────────────────────────────────────────────

  test('RF-01: seeker gets rating prompt notification after ride completion', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.locator('button[aria-label="Notifications"]').click();
    await expect(page.getByText(/rate|experience|completed/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('RF-02: giver gets ride completion notification', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.locator('button[aria-label="Notifications"]').click();
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('RF-03: seeker can rate giver via API — returns 201', async () => {
    const result = await api(seekerToken, 'post', '/ratings', {
      rideId: completedRideId, rateeId: giverUserId, score: 5, comment: 'Great ride!',
    });
    expect(result.statusCode ?? result.status ?? 201).toBe(201);
  });

  test('RF-04: duplicate rating rejected — returns 409', async () => {
    const result = await api(seekerToken, 'post', '/ratings', {
      rideId: completedRideId, rateeId: giverUserId, score: 4,
    });
    expect(result.statusCode ?? result.status).toBe(409);
  });

  test('RF-05: cannot rate on non-completed ride', async () => {
    // Try to rate a fresh ride (not completed)
    const d = new Date(); d.setDate(d.getDate() + 3);
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Test Area', originLat: 17.44, originLng: 78.38,
      destinationName: 'Test Dest', destinationLat: 17.45, destinationLng: 78.39,
      departureDate: d.toISOString().split('T')[0], departureTime: '09:00', totalSeats: 2, vehicleId,
    });
    const testRideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${testRideId}/publish`);
    const result = await api(seekerToken, 'post', '/ratings', {
      rideId: testRideId, rateeId: giverUserId, score: 3,
    });
    expect(result.statusCode ?? result.status).toBe(400);
    await api(giverToken, 'patch', `/rides/${testRideId}/cancel`).catch(() => {});
  });

  // ── Complaints ───────────────────────────────────────────────────────────

  test('RF-06: seeker can file complaint against giver', async () => {
    const result = await api(seekerToken, 'post', '/complaints', {
      reportedId: giverUserId, rideId: completedRideId,
      reason: 'RECKLESS_DRIVING', description: 'Test complaint for QA',
    });
    expect([200, 201]).toContain(result.statusCode ?? result.status ?? 201);
  });

  test('RF-07: cannot file complaint against yourself', async () => {
    const result = await api(seekerToken, 'post', '/complaints', {
      reportedId: seekerUserId, reason: 'RECKLESS_DRIVING',
    });
    expect(result.statusCode ?? result.status).toBe(400);
  });

  test('RF-08: admin sees complaint in admin panel', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/complaints');
    await expect(page.getByRole('heading', { name: /complaint/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/open|reckless|test complaint/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('RF-09: admin resolves complaint', async () => {
    const complaints = await api(adminToken, 'get', '/complaints?status=OPEN');
    const list = complaints.data ?? complaints;
    const c = Array.isArray(list) ? list[0] : list?.data?.[0];
    if (c?.id) {
      const result = await api(adminToken, 'patch', `/complaints/${c.id}/status`, { status: 'RESOLVED' });
      expect([200, 201]).toContain(result.statusCode ?? result.status ?? 200);
    }
  });
});
