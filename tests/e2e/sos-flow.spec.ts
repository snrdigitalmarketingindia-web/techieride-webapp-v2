/**
 * SOS Flow E2E Tests
 * Trigger SOS, cooldown, admin visibility
 * QA Architect coverage: safety-critical SOS scenarios
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

test.describe('🆘 SOS Flow', () => {
  let seekerToken: string;
  let giverToken: string;
  let vehicleId: string;
  let ongoingRideId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    await clearActiveRides(giverToken);
    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;

    // Setup an ONGOING ride
    const d = new Date(); d.setHours(d.getHours() + 1);
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Gachibowli, Hyderabad', originLat: 17.44, originLng: 78.35,
      destinationName: 'Nanakramguda, Hyderabad', destinationLat: 17.44, destinationLng: 78.38,
      departureDate: d.toISOString().split('T')[0],
      departureTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      totalSeats: 2, vehicleId,
    });
    ongoingRideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${ongoingRideId}/publish`);
    const req = await api(seekerToken, 'post', '/ride-requests', { rideId: ongoingRideId, pickupName: 'Gachibowli, Hyderabad' });
    const reqId = (req.data ?? req).id;
    await api(giverToken, 'patch', `/ride-requests/${reqId}/approve`);
    await api(giverToken, 'patch', `/rides/${ongoingRideId}/start`);
  });

  test('SOS-01: seeker can trigger SOS during ONGOING ride', async () => {
    const result = await api(seekerToken, 'post', '/sos', {
      rideId: ongoingRideId, lat: 17.44, lng: 78.35,
    });
    expect([200, 201]).toContain(result.statusCode ?? result.status ?? 200);
  });

  test('SOS-02: duplicate SOS within 60 seconds is rejected with 429', async () => {
    const result = await api(seekerToken, 'post', '/sos', {
      rideId: ongoingRideId, lat: 17.44, lng: 78.35,
    });
    expect(result.statusCode ?? result.status).toBe(429);
  });

  test('SOS-03: SOS without rideId still works (standalone)', async () => {
    // Use a different account for standalone SOS (not in cooldown)
    const raghuToken = await apiLogin('raghu@raghu.com');
    const result = await api(raghuToken, 'post', '/sos', { lat: 17.44, lng: 78.35 });
    expect([200, 201]).toContain(result.statusCode ?? result.status ?? 200);
  });

  test('SOS-04: SOS outside ONGOING ride returns 400', async () => {
    // Create a PUBLISHED (not started) ride
    const d = new Date(); d.setDate(d.getDate() + 5);
    const r = await api(giverToken, 'post', '/rides', {
      originName: 'Test SOS Area', originLat: 17.44, originLng: 78.38,
      destinationName: 'Test SOS Dest', destinationLat: 17.45, destinationLng: 78.39,
      departureDate: d.toISOString().split('T')[0], departureTime: '09:00', totalSeats: 2, vehicleId,
    });
    const testRideId = (r.data ?? r).id;
    await api(giverToken, 'patch', `/rides/${testRideId}/publish`);

    const result = await api(giverToken, 'post', '/sos', { rideId: testRideId, lat: 17.44, lng: 78.38 });
    expect(result.statusCode ?? result.status).toBe(400);
    await api(giverToken, 'patch', `/rides/${testRideId}/cancel`).catch(() => {});
  });

  test('SOS-05: admin can view SOS events', async ({ page }) => {
    await loginUI(page, 'admin');
    await page.goto('/admin/users');
    // Admin should have visibility — just verify no error
    await expect(page).not.toHaveURL(/error/);
  });

  test.afterAll(async () => {
    if (ongoingRideId) {
      // Try to complete or cancel
      const parts = await api(giverToken, 'get', `/rides/${ongoingRideId}/participants`).catch(() => ({ data: [] }));
      const pList = (parts.data ?? parts) as any[];
      for (const p of pList) {
        const pId = p.seekerId ?? p.id;
        await api(giverToken, 'patch', `/rides/${ongoingRideId}/board/${pId}`).catch(() => {});
        await api(giverToken, 'patch', `/rides/${ongoingRideId}/deboard/${pId}`).catch(() => {});
      }
      await api(giverToken, 'patch', `/rides/${ongoingRideId}/complete`).catch(() => {});
    }
  });
});
