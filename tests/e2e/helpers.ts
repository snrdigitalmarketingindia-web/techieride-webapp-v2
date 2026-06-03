import { Page, expect } from '@playwright/test';

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
