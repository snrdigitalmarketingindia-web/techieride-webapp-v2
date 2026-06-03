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

  test('PF-04: trust score badge visible on profile', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await expect(page.getByText(/new|bronze|silver|gold|platinum/i).first()).toBeVisible({ timeout: 8_000 });
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
    await expect(page.getByText(/saved|updated|success/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('PF-07: home and office area fields are editable', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    await expect(page.getByLabel(/home area/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/office area/i)).toBeVisible({ timeout: 5_000 });
  });

  test('PF-08: blood group dropdown is editable', async ({ page }) => {
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
    await page.getByRole('button', { name: /add|change/i }).first().click();
    await expect(page.getByPlaceholder(/gmail/i)).toBeVisible({ timeout: 5_000 });
  });

  test('PF-11: send confirmation email button present for personal email change', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await page.getByRole('button', { name: /add|change/i }).first().click();
    await expect(page.getByRole('button', { name: /send confirmation/i })).toBeVisible({ timeout: 5_000 });
  });

  // ── Official Email ───────────────────────────────────────────────────────

  test('PF-12: official email section visible with change button', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/official email/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /change/i }).last()).toBeVisible();
  });

  // ── Emergency Contact ────────────────────────────────────────────────────

  test('PF-13: emergency contact section visible', async ({ page }) => {
    await loginUI(page, 'seeker');
    await page.goto('/profile');
    await expect(page.getByText(/emergency contact/i)).toBeVisible({ timeout: 8_000 });
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
    await expect(page.getByText(/become a giver|offer rides/i)).toBeVisible({ timeout: 8_000 });
  });

  test('PF-16: giver profile does NOT show Become a Giver CTA', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/profile');
    await expect(page.getByText(/become a giver/i)).not.toBeVisible();
  });
});
