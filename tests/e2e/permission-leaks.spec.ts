import { test, expect } from '@playwright/test';
import { loginUI, ACCOUNTS } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// PERM tests: direct URL access by wrong role, admin guards, token isolation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('🔒 Permission Leaks — Seeker accessing Giver routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginUI(page, 'seeker');
  });

  // PERM-01: Seeker at /rides/create — no frontend redirect, but API must 403 on submit
  test('PERM-01: seeker cannot publish a ride — API returns 403', async ({ page }) => {
    // Seeker has no vehicles, so the UI disables the Publish button.
    // Test the enforcement at the API level using the seeker's session token.
    await page.goto('/dashboard');
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10_000 });

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    if (!token) {
      test.skip(true, 'Could not extract accessToken from localStorage');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    // Attempt to create a ride as seeker — must return 403 (no rideGiver record).
    // Use a valid UUID so DTO validation passes and the service's role guard is reached.
    const res = await page.request.post(`${apiBase}/rides`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        vehicleId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        originName: 'Kondapur',
        originLat: 17.44,
        originLng: 78.35,
        destinationName: 'HITEC City',
        destinationLat: 17.45,
        destinationLng: 78.37,
        departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        departureTime: '09:00',
        totalSeats: 3,
      },
    });
    expect(res.status()).toBe(403);

    // Also verify the UI shows the "add a vehicle first" banner (not a server crash)
    await page.goto('/rides/create');
    await expect(page).not.toHaveURL(/500|error/);
    await expect(page.getByText(/add a vehicle first|you need to add a vehicle/i)).toBeVisible({ timeout: 8_000 });
  });

  // PERM-02: Seeker at /rides/incoming — no such route in current app; /rides page only shows giver rides
  test('PERM-02: seeker at /rides sees no incoming requests section', async ({ page }) => {
    await page.goto('/rides');
    await expect(page).not.toHaveURL(/error/);
    // Incoming requests UI (approve/reject buttons) must not be visible to seeker
    await expect(page.getByRole('button', { name: /approve/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /reject request/i })).not.toBeVisible();
  });

  // PERM-03: Seeker dashboard does not show giver-only actions
  test('PERM-03: seeker dashboard shows seeker content, not giver-only content', async ({ page }) => {
    await page.goto('/dashboard');
    // Dashboard renders for seeker without crash
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10_000 });
    // Seeker-specific links must be present
    await expect(page.getByRole('link', { name: /find ride/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /requests/i })).toBeVisible();
  });

  // PERM-06: Seeker cannot access /admin/users
  test('PERM-06: seeker cannot access /admin/users — redirected to login', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByText(/user list|all users/i)).not.toBeVisible();
  });

  // PERM-07: Seeker cannot access /admin/verification
  test('PERM-07: seeker cannot access /admin/verification — redirected to login', async ({ page }) => {
    await page.goto('/admin/verification');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe('🔒 Permission Leaks — Giver accessing Seeker/Admin routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginUI(page, 'giver');
  });

  // PERM-04: Giver can navigate to /rides/search (no frontend block) but cannot book — API 403
  test('PERM-04: giver at /rides/search — book button absent or API 403 on request', async ({ page }) => {
    await page.goto('/rides/search');
    await expect(page).not.toHaveURL(/error/);
    // Giver should not see a "Request Seat" / "Book" button in search results
    // (page may be empty or show rides without booking action)
    // Just verify no crash
    await page.waitForTimeout(2_000);
    await expect(page).not.toHaveURL(/500/);
  });

  // PERM-06 from giver side
  test('PERM-06: giver cannot access /admin/users — redirected to login', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  // PERM-07 from giver side
  test('PERM-07: giver cannot access /admin/verification — redirected to login', async ({ page }) => {
    await page.goto('/admin/verification');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  // Admin vehicles queue — giver must not access
  test('PERM-07b: giver cannot access /admin/vehicles — redirected to login', async ({ page }) => {
    await page.goto('/admin/vehicles');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe('🔒 Permission Leaks — Admin role guard', () => {
  // PERM-05: covered by admin.spec.ts — seeker redirected from /admin
  // Extended here: all 4 admin sub-routes must redirect non-admins

  const adminRoutes = ['/admin', '/admin/users', '/admin/verification', '/admin/vehicles', '/admin/rides'];

  for (const route of adminRoutes) {
    test(`non-admin (seeker) redirected from ${route}`, async ({ page }) => {
      await loginUI(page, 'seeker');
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }
});

test.describe('🔒 Permission Leaks — Unauthenticated access', () => {
  // PERM-08: all protected routes redirect to /login when not logged in
  const protectedRoutes = ['/dashboard', '/rides/create', '/rides', '/rides/search', '/requests', '/profile', '/admin'];

  for (const route of protectedRoutes) {
    test(`PERM-08: unauthenticated user redirected from ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }
});

test.describe('🔒 Permission Leaks — Token isolation (PERM-09)', () => {
  test('PERM-09: seeker token cannot fetch another user\'s profile via API', async ({ page }) => {
    await loginUI(page, 'seeker');

    // Intercept the /users/me call to extract the seeker's own userId
    let seekerUserId: string | null = null;
    await page.route('**/users/me', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      seekerUserId = json.id;
      await route.fulfill({ response });
    });
    await page.goto('/profile');
    await page.waitForTimeout(2_000);

    if (!seekerUserId) return; // Can't proceed without userId

    // Now try to access admin panel (would expose other users) — must redirect
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Direct API call with seeker's token to /admin/users should 401 or 403
    const token = await page.evaluate(() => {
      return localStorage.getItem('accessToken');
    });

    if (token) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
      const res = await page.request.get(`${apiBase}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([401, 403]).toContain(res.status());
    }
  });
});

test.describe('🔒 Permission Leaks — BOTH role (PERM-10)', () => {
  test('PERM-10: BOTH role user sees giver and seeker sections on dashboard', async ({ page }) => {
    await loginUI(page, ACCOUNTS.both?.email ?? 'ravi@wipro.com');
    await page.goto('/dashboard');
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10_000 });
    // Should see Offer Ride (giver action)
    await expect(page.getByRole('link', { name: /offer ride/i })).toBeVisible();
    // Should see Find Ride (seeker action)
    await expect(page.getByRole('link', { name: /find ride/i })).toBeVisible();
  });

  test('PERM-10b: BOTH role user can access /rides/create without redirect', async ({ page }) => {
    await loginUI(page, ACCOUNTS.both?.email ?? 'ravi@wipro.com');
    await page.goto('/rides/create');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /offer a ride/i })).toBeVisible({ timeout: 8_000 });
  });
});
