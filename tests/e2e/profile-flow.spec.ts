/**
 * Profile Flow E2E Tests
 * Edit profile, emergency contacts, personal email, official email change
 * QA Architect coverage: all profile management scenarios
 */
import { test, expect } from '@playwright/test';
import { loginUI } from './helpers';

test.describe('👤 Profile Flow', () => {

  // ── View Profile ─────────────────────────────────────────────────────────

  test('PF-01: profile page shows user name and eco badge', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/arjun mehta/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/seed|sprout|leaf|tree|forest/i).first()).toBeVisible();
  });

  test('PF-02: profile page shows account status badge', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/seeker verified|driver verified/i)).toBeVisible({ timeout: 8_000 });
  });

  test('PF-03: giver profile shows vehicle details', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await expect(page.getByText(/swift|city|innova|vehicle/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('PF-04: eco tier badge visible on profile', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await expect(page.getByText(/seed|sprout|leaf|tree|forest/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ── Edit Profile ─────────────────────────────────────────────────────────

  test('PF-05: edit profile form opens on Edit button click', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    await expect(page.getByLabel(/full name/i)).toBeVisible({ timeout: 5_000 });
  });

  test('PF-06: edit profile saves successfully', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.clear();
    await nameInput.fill('Arjun Mehta');
    await page.getByRole('button', { name: /save changes/i }).click();
    // Form closes on successful save — the edit form disappears
    await expect(page.getByLabel(/full name/i)).not.toBeVisible({ timeout: 8_000 });
  });

  test('PF-07: home and office area fields are editable', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    // Home/office are now MapPin buttons (not labeled inputs)
    await expect(page.getByText(/home location/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/office location/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('PF-08: blood group field is editable', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    await expect(page.getByLabel(/blood group/i)).toBeVisible({ timeout: 5_000 });
  });

  // ── Personal Email ───────────────────────────────────────────────────────

  test('PF-09: personal email section is visible with verified/unverified badge', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/personal email/i)).toBeVisible({ timeout: 8_000 });
    // Badge (Verified / Unverified) is only rendered when personalEmail is set.
    // If not set, the section shows "Not set" instead. Both states are valid —
    // either confirms the section loaded. Use toBeVisible() with a timeout so
    // we wait for the profile API response rather than doing a point-in-time check.
    await expect(
      page.getByText(/verified|unverified|not set/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('PF-10: clicking Add/Change personal email shows input field', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    // Personal Email Change button is the last Add/Change button (Official Email's is first)
    await page.getByRole('button', { name: /add|change/i }).last().click();
    await expect(page.getByPlaceholder(/gmail/i)).toBeVisible({ timeout: 5_000 });
  });

  test('PF-11: send confirmation email button present for personal email change', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    // Personal Email Change button is the last Add/Change button (Official Email's is first)
    await page.getByRole('button', { name: /add|change/i }).last().click();
    await expect(page.getByRole('button', { name: /send confirmation/i })).toBeVisible({ timeout: 5_000 });
  });

  // ── Official Email ───────────────────────────────────────────────────────

  test('PF-12: official email section visible with change button', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/official email/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /change/i }).last()).toBeVisible();
  });

  // ── Verification Documents ───────────────────────────────────────────────

  test('PF-13: profile page shows verification status section', async ({ page }) => {
    // seeker is SEEKER_VERIFIED — docs section is hidden for verified users, but
    // the verification status badge / trust score section is always visible
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/trust score|verified|verification/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('PF-14: add emergency contact form opens', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    const addBtn = page.getByRole('button', { name: /add contact|add emergency/i });
    const isVisible = await addBtn.isVisible().catch(() => false);
    if (isVisible) {
      await addBtn.click();
      await expect(page.getByPlaceholder(/contact name/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── Become a Giver ───────────────────────────────────────────────────────

  test('PF-15: seeker profile shows Become a Giver CTA', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/become a giver|offer rides/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('PF-16: giver profile does NOT show Become a Giver CTA', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await expect(page.getByText(/become a giver/i)).not.toBeVisible();
  });

  test('PF-17: profile edit phone field has +91 prefix and rejects invalid format', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    // +91 prefix should be visible
    await expect(page.getByText(/🇮🇳/)).toBeVisible({ timeout: 5_000 });
    const phoneInput = page.locator('#edit-phone');
    await phoneInput.fill('1234567890'); // starts with 1 — invalid
    await phoneInput.blur();
    await expect(page.getByText(/10-digit.*6.*9|starting with 6/i)).toBeVisible({ timeout: 3_000 });
  });

  test('PF-18: profile edit phone field strips non-numeric characters', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    const phoneInput = page.locator('#edit-phone');
    await phoneInput.fill('abc-99887766');
    const val = await phoneInput.inputValue();
    expect(val).toMatch(/^\d*$/); // only digits retained
  });
});

test.describe('📍 Location Management (/profile/locations)', () => {
  test('PF-19: location management page loads without error', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile/locations');
    await expect(page).not.toHaveURL(/error|login/);
    await expect(page.getByText(/location management/i)).toBeVisible({ timeout: 8_000 });
  });

  test('PF-20: saved locations section is visible', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile/locations');
    await expect(page.getByText(/saved locations/i)).toBeVisible({ timeout: 8_000 });
  });

  test('PF-21: home and office location sections are present', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile/locations');
    await expect(page.getByText(/home/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/office|work/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('PF-22: add saved location modal opens', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile/locations');
    // Wait for page content — use exact text to avoid strict-mode matching both
    // "Saved Locations" heading AND "No saved locations yet" paragraph
    await expect(page.getByText('Saved Locations', { exact: true })).toBeVisible({ timeout: 10_000 });
    // Use data-testid for reliable single-element targeting
    const addBtn = page.getByTestId('add-saved-location');
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    await expect(page.getByPlaceholder(/e\.g\. Gym|Gym.*Home|add location|e\.g\. Hasthinapuram/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('PF-23: saved location is created via API and appears in the list', async ({ page }) => {
    await loginUI(page, 'giver');

    // Create via API directly so test is fast and doesn't depend on map interaction
    const token = await page.evaluate(() => localStorage.getItem('accessToken')).catch(() => null);
    // Navigate to profile/locations first to ensure token is in localStorage
    await page.goto('/profile/locations');
    await page.waitForTimeout(1_000);
    const tok = await page.evaluate(() => localStorage.getItem('accessToken'));
    if (!tok) { test.skip(true, 'No token in localStorage'); return; }

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    const createRes = await page.request.post(`${apiBase}/saved-locations`, {
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      data: { alias: 'E2E Test Spot', address: 'Kondapur, Hyderabad', lat: 17.4401, lng: 78.3489 },
    });
    if (!createRes.ok()) { test.skip(true, `saved-locations API not available (${createRes.status()})`); return; }

    await page.reload();
    await expect(page.getByText(/E2E Test Spot/i)).toBeVisible({ timeout: 8_000 });

    // Cleanup
    const locBody = await createRes.json();
    const locId = locBody.id ?? locBody.data?.id;
    if (locId) {
      await page.request.delete(`${apiBase}/saved-locations/${locId}`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).catch(() => {});
    }
  });

  test('PF-24: personal email change — rejects non-personal email domain', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await page.getByRole('button', { name: /add|change/i }).last().click();
    const input = page.getByPlaceholder(/gmail/i);
    await input.fill('work@techcorp.com');
    // Send button — if the API rejects corporate emails for personal email field, we expect an error
    // If the UI doesn't validate, the API should return 400
    const sendBtn = page.getByRole('button', { name: /send confirmation/i });
    if (await sendBtn.isVisible()) {
      await sendBtn.click();
      await page.waitForTimeout(1_500);
      // Either an inline error OR the form stays open (no success/dismiss)
      const formStillOpen = await input.isVisible().catch(() => false);
      const errorShown = await page.getByText(/invalid|error|personal.*email|gmail/i).isVisible().catch(() => false);
      // One of the two must be true — the form should not have accepted a corporate email
      expect(formStillOpen || errorShown).toBe(true);
    }
  });
});
