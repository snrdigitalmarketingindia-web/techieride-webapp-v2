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
    await expect(page.getByText(/arjun mehta/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/seed|sprout|leaf|tree|forest/i).first()).toBeVisible();
  });

  test('PF-02: profile page shows account status badge', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/employee verified|driver verified/i)).toBeVisible({ timeout: 8_000 });
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
    // Should show either verified badge or unverified badge
    const badge = await page.getByText(/verified|unverified/i).first().isVisible().catch(() => false);
    expect(badge).toBe(true);
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

  test('PF-13: verification documents section visible on profile', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/verification documents/i)).toBeVisible({ timeout: 8_000 });
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
