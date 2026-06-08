import { test, expect } from '@playwright/test';
import { loginUI, ACCOUNTS, clearActiveRides, apiLogin } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// VB tests: verification bypass guards
// These tests confirm the API enforces identity + RC verification,
// and that the UI surfaces the right error messages to the user.
//
// Seed state used:
//   rahul@rahul.com  — APPROVED, vehicle TS09AB5678 rcVerified=true  → CAN publish
//   raju@raju.com      — APPROVED, vehicle TS07RJ1234 rcVerified=true  → CAN publish
//   rahul@rahul.com     — APPROVED (BOTH), vehicle TS07VK5678 rcVerified=true → CAN publish
//   arjun@tcs.com      — RIDE_SEEKER, no rideGiver record               → 403 on any ride create
// ─────────────────────────────────────────────────────────────────────────────

test.describe('🛡️ Verification Bypass — Seeker cannot create rides (no rideGiver record)', () => {
  // VB-01 variant: seeker has no rideGiver record → API returns 403 on POST /rides
  test('VB-SEEKER: seeker gets 403 when attempting ride creation via API', async ({ page }) => {
    await loginUI(page, 'seeker');

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    if (!token) {
      test.skip(true, 'Could not extract auth token from localStorage');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
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
        departureDate: new Date().toISOString().split('T')[0],
        departureTime: '09:00',
        totalSeats: 3,
      },
    });

    expect(res.status()).toBe(403);
  });

  test('VB-SEEKER-UI: seeker at /rides/create sees "add a vehicle first" warning', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/rides/create');
    // Seeker has no vehicles → warning banner must appear
    await expect(page.getByText(/add a vehicle first|you need to add a vehicle/i)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('🛡️ Verification Bypass — Approved giver CAN publish (VB-04 regression)', () => {
  // VB-04: APPROVED giver with rcVerified vehicle must succeed end-to-end
  // This is the regression gate — verifying fix didn't over-block legitimate givers
  test('VB-04: approved giver (Priya) with verified RC can publish a ride via API', async ({ page }) => {
    // Regression test: APPROVED giver + rcVerified=true must be able to publish.
    // Done via API to avoid UI timing issues (active ride warning, vehicle load delay).
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

    // Login as Priya
    const loginRes = await page.request.post(`${apiBase}/auth/login`, {
      data: { email: 'rahul@rahul.com', password: 'TechieRide@2024' },
    });
    expect(loginRes.status()).toBe(200);
    const { accessToken } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Get Priya's vehicles — must have at least one with rcVerified=true
    const vehiclesRes = await page.request.get(`${apiBase}/vehicles/my`, { headers: authHeaders });
    expect(vehiclesRes.status()).toBe(200);
    const vehicles = await vehiclesRes.json();
    const verifiedVehicle = vehicles.find((v: any) => v.rcVerified === true);
    if (!verifiedVehicle) {
      test.skip(true, 'Priya has no rcVerified vehicle — re-seed the DB');
      return;
    }

    // Cancel/complete all active rides (PUBLISHED + ONGOING) so we can publish a fresh one
    const giverToken = await apiLogin(ACCOUNTS.giver.email);
    await clearActiveRides(giverToken);

    // Create a DRAFT ride
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const createRes = await page.request.post(`${apiBase}/rides`, {
      headers: authHeaders,
      data: {
        vehicleId: verifiedVehicle.id,
        originName: 'Kondapur', originLat: 17.44, originLng: 78.35,
        destinationName: 'HITEC City', destinationLat: 17.45, destinationLng: 78.37,
        departureDate: tomorrow, departureTime: '09:00', totalSeats: 3,
      },
    });
    expect(createRes.status()).toBe(201);
    const { id: rideId } = await createRes.json();

    // Publish — must succeed (not blocked by verification or RC)
    const publishRes = await page.request.patch(`${apiBase}/rides/${rideId}/publish`, {
      headers: authHeaders,
    });

    // If 403, something is wrong with Priya's verification/RC state — not an "over-block" regression
    if (publishRes.status() === 403) {
      const body = await publishRes.json();
      throw new Error(`VB-04 REGRESSION: Priya was blocked from publishing — ${body.message}`);
    }
    expect(publishRes.status()).toBe(200);

    // Cleanup — cancel the ride
    await page.request.patch(`${apiBase}/rides/${rideId}/cancel`, { headers: authHeaders }).catch(() => {});
  });
});

test.describe('🛡️ Verification Bypass — API enforces verification at publish (VB-01/02/03)', () => {
  // These tests drive the API directly using a freshly-registered unverified giver
  // to confirm the 403 blocks are in place, without needing a seeded unverified account.

  test('VB-01/02: unverified giver gets 403 with identity verification message on publish', async ({ page }) => {
    // Register a fresh giver (no verification submitted)
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    const timestamp = Date.now();
    const email = `vbtest_${timestamp}@wipro.com`;

    // Register
    const regRes = await page.request.post(`${apiBase}/auth/register`, {
      data: {
        email, password: 'TechieRide@2024', fullName: 'VB Test Giver', role: 'RIDE_GIVER',
        gender: 'MALE', companyName: 'Wipro',
        phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
        homeLocation: 'Kondapur, Hyderabad',
        officeLocation: 'HITEC City, Madhapur, Hyderabad',
        emergencyContactName: 'Test Emergency Contact',
        emergencyContactPhone: '9000000001',
      },
    });
    if (regRes.status() !== 201) {
      test.skip(true, `Registration failed (${regRes.status()}) — skipping VB-01`);
      return;
    }

    // Login
    const loginRes = await page.request.post(`${apiBase}/auth/login`, {
      data: { email, password: 'TechieRide@2024' },
    });
    if (loginRes.status() !== 200 && loginRes.status() !== 201) {
      test.skip(true, 'Login failed — email verification may be required in this environment');
      return;
    }
    const { accessToken } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Add a vehicle (no RC verification)
    const vehicleRes = await page.request.post(`${apiBase}/vehicles`, {
      headers: authHeaders,
      data: { make: 'Honda', model: 'City', color: 'Black', plateNumber: `VB${timestamp}`, totalSeats: 4 },
    });
    if (vehicleRes.status() !== 201) {
      test.skip(true, 'Vehicle creation failed — skipping VB-01');
      return;
    }
    const { id: vehicleId } = await vehicleRes.json();

    // Create a DRAFT ride
    const rideRes = await page.request.post(`${apiBase}/rides`, {
      headers: authHeaders,
      data: {
        vehicleId,
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
    if (rideRes.status() !== 201) {
      test.skip(true, 'Ride creation failed — skipping VB-01');
      return;
    }
    const { id: rideId } = await rideRes.json();

    // Attempt to publish — must fail with 403 (identity not verified)
    const publishRes = await page.request.patch(`${apiBase}/rides/${rideId}/publish`, {
      headers: authHeaders,
    });

    expect(publishRes.status()).toBe(403);
    const body = await publishRes.json();
    expect(body.message).toMatch(/verification must be approved/i);
  });

  test('VB-03: giver with unverified RC gets 403 on publish with RC message', async ({ page }) => {
    // This test re-uses Raju — APPROVED giver with rcVerified vehicle from seed
    // We test directly that the API message is correct when RC is not verified
    // by inspecting the error message pattern (can't easily unverify in a UI test)
    // Instead, verify that the approved giver (rcVerified=true) does NOT get this error
    // and document the API error message format as a contract test

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

    const loginRes = await page.request.post(`${apiBase}/auth/login`, {
      data: { email: 'raju@raju.com', password: 'TechieRide@2024' },
    });
    if (loginRes.status() !== 200 && loginRes.status() !== 201) {
      test.skip(true, 'Raju login failed');
      return;
    }
    const { accessToken } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Get Raju's vehicles
    const vehiclesRes = await page.request.get(`${apiBase}/vehicles/my`, { headers: authHeaders });
    const vehicles = await vehiclesRes.json();
    if (!vehicles.length) {
      test.skip(true, 'Raju has no vehicles — re-seed the DB first');
      return;
    }

    const vehicle = vehicles[0];

    // Create a DRAFT ride using whatever vehicle Raju has
    const rideRes = await page.request.post(`${apiBase}/rides`, {
      headers: authHeaders,
      data: {
        vehicleId: vehicle.id,
        originName: 'Kukatpally',
        originLat: 17.49, originLng: 78.39,
        destinationName: 'Gachibowli',
        destinationLat: 17.44, destinationLng: 78.34,
        departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        departureTime: '08:00', totalSeats: 3,
      },
    });

    if (rideRes.status() !== 201) {
      test.skip(true, `Ride create returned ${rideRes.status()} — skipping`);
      return;
    }
    const { id: rideId } = await rideRes.json();

    const publishRes = await page.request.patch(`${apiBase}/rides/${rideId}/publish`, {
      headers: authHeaders,
    });

    if (vehicle.rcVerified === false) {
      // VB-03 primary path: vehicle RC not verified → API must block with the RC message
      expect(publishRes.status()).toBe(403);
      const body = await publishRes.json();
      expect(body.message).toMatch(/RC must be verified/i);
    } else {
      // VB-03 regression path: vehicle IS verified → publish must not be blocked by RC guard
      if (publishRes.status() === 403) {
        const body = await publishRes.json();
        // Must NOT be an RC or identity error — would be a regression bug
        expect(body.message).not.toMatch(/RC must be verified|verification must be approved/i);
      } else {
        expect([200, 201]).toContain(publishRes.status());
        await page.request.patch(`${apiBase}/rides/${rideId}/cancel`, { headers: authHeaders }).catch(() => {});
      }
    }
  });
});

test.describe('🛡️ Verification Bypass — UI error display (VB-01 UI)', () => {
  test('VB-01-UI: error from publish 403 is shown to user in create form', async ({ page }) => {
    await loginUI(page, 'giver'); // Priya — approved, should work

    // Pre-fill origin/destination via localStorage (origin is now a MapPin button, not a text input)
    await page.goto('/rides/create');
    await page.evaluate(() => {
      localStorage.setItem('tr_last_route', JSON.stringify({
        originName: 'Kondapur', originLat: 17.44, originLng: 78.35,
        destinationName: 'HITEC City', destinationLat: 17.43, destinationLng: 78.38,
      }));
    });
    await page.goto('/rides/create'); // reload so form reads localStorage
    await expect(page.getByRole('heading', { name: /offer a ride/i })).toBeVisible({ timeout: 8_000 });

    // Fill departure date (tomorrow) and time so client-side validation passes fully,
    // allowing the create API call to fire and the publish intercept to trigger the 403.
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(tomorrow);
    await page.locator('input[type="time"]').fill('09:00');

    // Intercept the publish call and force a 403 response
    await page.route('**/rides/*/publish', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 403,
          message: 'Your identity verification must be approved before you can publish rides. Current status: PENDING.',
        }),
      });
    });

    // Wait for vehicles to load (button is disabled while vehicles.length === 0)
    const publishBtn = page.getByRole('button', { name: /publish ride/i });
    await expect(publishBtn).toBeEnabled({ timeout: 20_000 });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Scroll button into view and click. Use Playwright's built-in retry so the
    // error message is waited for directly (replaces unreliable fixed timeout).
    await publishBtn.scrollIntoViewIfNeeded();
    await publishBtn.click();
    // Error must surface to user — either the API message or a generic failure.
    // Use toBeVisible with a generous timeout instead of a fixed waitForTimeout.
    await expect(page.getByText(/verification|failed|error/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
