import { Page, expect, request as playwrightRequest } from '@playwright/test';

export const SEED_PASSWORD = 'TechieRide@2024';

// ── Seed accounts from seed.ts ────────────────────────────────────
export const ACCOUNTS = {
  admin:  { email: 'admin@techieride.in',  password: SEED_PASSWORD },
  giver:  { email: 'rahul@rahul.com',    password: SEED_PASSWORD },
  giver2: { email: 'raju@raju.com',        password: SEED_PASSWORD },
  seeker: { email: 'arjun@tcs.com',        password: SEED_PASSWORD },
  both:   { email: 'rahul@rahul.com',       password: SEED_PASSWORD },
};

// Keep PHONES for any legacy references
export const PHONES = {
  admin:  'admin@techieride.in',
  giver:  'rahul@rahul.com',
  seeker: 'arjun@tcs.com',
};

export const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://techieride-webapp-v2.onrender.com/api/v1';

/** Logs in via API and returns the access token. Throws with full response body on failure. */
export async function apiLogin(email: string): Promise<string> {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.post(`${API}/auth/login`, {
    data: { email, password: SEED_PASSWORD },
  });
  const body = await res.json();
  await ctx.dispose();
  const token = body.data?.accessToken ?? body.accessToken;
  if (!token) {
    throw new Error(
      `apiLogin(${email}) failed — HTTP ${res.status()} — ${JSON.stringify(body)}`
    );
  }
  return token;
}

/**
 * Cancel all PUBLISHED rides and complete all ONGOING rides for the giver.
 * Call at the start of any beforeAll that needs a clean slate for the giver account.
 */
export async function clearActiveRides(giverToken: string) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.get(`${API}/rides/given`, {
    headers: { Authorization: `Bearer ${giverToken}` },
  });
  const body = await res.json();
  const rides: any[] = body.data ?? body;
  if (!Array.isArray(rides)) { await ctx.dispose(); return; }

  for (const ride of rides) {
    if (ride.status === 'PUBLISHED') {
      await ctx.patch(`${API}/rides/${ride.id}/cancel`, {
        headers: { Authorization: `Bearer ${giverToken}` },
      }).catch(() => {});
    } else if (ride.status === 'ONGOING') {
      // Mark all WAITING/BOARDED participants as no-show so complete is unblocked
      const participants: any[] = ride.participants ?? [];
      for (const p of participants) {
        if (p.boardingStatus === 'WAITING' || p.boardingStatus === 'BOARDED') {
          // no-show endpoint takes seekerId (RideSeeker.id), not the participant record id
          await ctx.patch(`${API}/rides/${ride.id}/no-show/${p.seekerId}`, {
            headers: { Authorization: `Bearer ${giverToken}` },
          }).catch(() => {});
        }
      }
      await ctx.patch(`${API}/rides/${ride.id}/complete`, {
        headers: { Authorization: `Bearer ${giverToken}` },
      }).catch(() => {});
    }
  }
  await ctx.dispose();
}

/**
 * Cancel all active (PENDING or CONFIRMED) ride requests for a seeker.
 * Call after clearActiveRides in any beforeAll that uses the seeker account,
 * to prevent leftover CONFIRMED requests from blocking new request creation (409).
 */
export async function clearSeekerRequests(seekerToken: string) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.get(`${API}/ride-requests/mine`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  const body = await res.json();
  const requests: any[] = body.data ?? body;
  if (!Array.isArray(requests)) { await ctx.dispose(); return; }
  for (const req of requests) {
    if (req.status === 'PENDING' || req.status === 'CONFIRMED') {
      await ctx.patch(`${API}/ride-requests/${req.id}/cancel`, {
        headers: { Authorization: `Bearer ${seekerToken}` },
      }).catch(() => {});
    }
  }
  await ctx.dispose();
}

// ── Login via UI (email + password) ──────────────────────────────
export async function loginUI(page: Page, emailOrKey: string) {
  // Accept either a key ('admin', 'giver', 'seeker') or a direct email
  const account = ACCOUNTS[emailOrKey as keyof typeof ACCOUNTS]
    ?? { email: emailOrKey, password: SEED_PASSWORD };

  await page.goto('/login');
  await page.getByPlaceholder('you@company.com').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}
