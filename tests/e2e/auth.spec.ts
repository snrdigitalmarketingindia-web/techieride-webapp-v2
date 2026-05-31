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
});
