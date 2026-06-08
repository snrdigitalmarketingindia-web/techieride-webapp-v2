/**
 * Smoke / Fast-Feedback Playwright config
 *
 * Runs only the high-risk spec files — the ones that cover core user journeys
 * or have historically been the source of CI failures.
 *
 * Rules for adding a file here:
 *  • Each spec file must be self-contained (own beforeAll / afterAll, no
 *    cross-file state) — this is always true in this repo.
 *  • The ENTIRE file is included, never individual tests, so that beforeAll
 *    always runs and every intra-file dependency is satisfied.
 *
 * Usage:
 *   npx playwright test --config=playwright.smoke.config.ts
 *
 * Expected runtime: ~8–12 min (vs ~20–25 min for the full suite).
 */

import { defineConfig, devices } from '@playwright/test';

// ── Smoke spec files ──────────────────────────────────────────────────────────
// Core user journeys + all files that have produced CI failures recently.
// Expand this list when a new spec file is created for a feature that touches
// critical paths (auth, rides, requests, boarding, permissions).
const SMOKE_SPECS = [
  // Auth & onboarding
  'tests/e2e/auth.spec.ts',

  // Giver lifecycle (create → publish → approve → start → complete)
  'tests/e2e/giver.spec.ts',
  'tests/e2e/giver-flow.spec.ts',

  // Seeker lifecycle (search → request → confirm → board)
  'tests/e2e/seeker.spec.ts',
  'tests/e2e/seeker-flow.spec.ts',

  // Ride lifecycle & boarding badges
  'tests/e2e/ride-flow.spec.ts',

  // Profile management
  'tests/e2e/profile-flow.spec.ts',

  // Quick messages
  'tests/e2e/quick-messages-flow.spec.ts',

  // Permissions / role guards (historically flaky)
  'tests/e2e/permission-leaks.spec.ts',

  // Verification & publish gate
  'tests/e2e/verification-bypass.spec.ts',

  // Mobile layout
  'tests/e2e/mobile.spec.ts',

  // Input validation
  'tests/e2e/validation.spec.ts',
];

export default defineConfig({
  // Only run the curated smoke files
  testMatch: SMOKE_SPECS,

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/report-smoke' }]],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
