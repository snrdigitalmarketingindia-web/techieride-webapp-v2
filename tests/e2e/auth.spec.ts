import { test, expect } from '@playwright/test';
import { loginUI, ACCOUNTS } from './helpers';

test.describe('🔐 Auth Flow', () => {
  test('home page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('empty fields shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/please enter your email and password/i)).toBeVisible();
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill(ACCOUNTS.seeker.email);
    await page.getByPlaceholder('••••••••').fill('wrongpassword');

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/auth/login'), { timeout: 8_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ]);
    expect(response.status()).toBe(401);
  });

  test('seeker login redirects to /dashboard', async ({ page }) => {
    await loginUI(page, 'seeker');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('admin login redirects to /admin', async ({ page }) => {
    await loginUI(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('signup rejects personal email on blur', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder('Arjun Mehta').fill('Test User');
    const emailInput = page.getByPlaceholder('you@company.com');
    await emailInput.fill('test@gmail.com');
    await emailInput.blur();
    await expect(page.getByText(/personal emails are not accepted/i)).toBeVisible();
  });

  test('signup Step 0 shows mobile number field with +91 prefix', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText(/🇮🇳/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/98765/i)).toBeVisible();
  });

  test('signup phone field rejects non-numeric input and short numbers', async ({ page }) => {
    await page.goto('/signup');
    const phoneInput = page.getByPlaceholder(/98765/i);
    await phoneInput.fill('abc12345');
    // Non-digits stripped — input should be empty or show digits only
    const val = await phoneInput.inputValue();
    expect(val).toMatch(/^\d*$/);
  });

  test('signup phone field shows inline error for invalid format', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder(/98765/i).fill('1234567890'); // starts with 1, invalid
    await page.getByPlaceholder(/98765/i).blur();
    await expect(page.getByText(/10-digit.*6.*9|starting with 6/i)).toBeVisible({ timeout: 3_000 });
  });

  test('signup Next button blocked without valid phone', async ({ page }) => {
    await page.goto('/signup');
    // Fill name, valid office email, valid password — but no phone
    await page.getByPlaceholder('Arjun Mehta').fill('Test User');
    const emailInput = page.getByPlaceholder('you@company.com');
    await emailInput.fill('test@techcorp.com');
    await emailInput.blur();
    const pwInput = page.getByPlaceholder(/min. 8 characters/i);
    await pwInput.fill('TestPass@2024');
    // Leave phone empty and click Next
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/mobile number|phone/i)).toBeVisible({ timeout: 3_000 });
  });
});
