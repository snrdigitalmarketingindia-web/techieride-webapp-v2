import { test, expect } from '@playwright/test';
import { loginUI, PHONES } from './helpers';

test.describe('🔐 Auth Flow', () => {
  test('home page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders phone input step', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('9876543210')).toBeVisible();
    await expect(page.getByRole('button', { name: /send otp/i })).toBeVisible();
  });

  test('invalid phone shows error without sending OTP', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('9876543210').fill('12345');
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page.getByText(/valid 10-digit/i)).toBeVisible();
  });

  test('valid phone advances to OTP step', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('9876543210').fill(PHONES.seeker);
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page.getByPlaceholder('• • • • • •')).toBeVisible();
  });

  test('wrong OTP is rejected by the API (401)', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('9876543210').fill(PHONES.seeker);
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page.getByPlaceholder('• • • • • •')).toBeVisible({ timeout: 5_000 });

    // Intercept the verify-otp API call and assert it returns 401
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('verify-otp'), { timeout: 8_000 }),
      page.getByPlaceholder('• • • • • •').fill('000001').then(() =>
        page.getByRole('button', { name: /verify/i }).click()
      ),
    ]);
    expect(response.status()).toBe(401);
  });

  test('seeker login redirects to /dashboard', async ({ page }) => {
    await loginUI(page, PHONES.seeker);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('admin login redirects to /admin', async ({ page }) => {
    await loginUI(page, PHONES.admin);
    await expect(page).toHaveURL(/\/admin/);
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });
});
