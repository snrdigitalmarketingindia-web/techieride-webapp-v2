import { Page, expect } from '@playwright/test';
import axios from 'axios';
import { execSync } from 'child_process';

const BASE = 'http://localhost:3001/api/v1';
const API_LOG = '/tmp/techieride-api.log';

// ── Read OTP from server console log (dev mode logs it) ───────────
function readOtp(phone: string): string {
  // Small delay to let the log flush
  execSync('sleep 0.5');
  const line = execSync(
    `grep "OTP for ${phone}" ${API_LOG} | tail -1`,
    { encoding: 'utf8' }
  ).trim();
  const match = line.match(/:\s*(\d{6})$/);
  if (!match) throw new Error(`No OTP found for ${phone} in ${API_LOG}`);
  return match[1];
}

// ── Request OTP via API then read it from log ─────────────────────
export async function requestOtp(phone: string): Promise<string> {
  await axios.post(`${BASE}/auth/login`, { phone });
  return readOtp(phone);
}

// ── Login via UI ──────────────────────────────────────────────────
export async function loginUI(page: Page, phone: string) {
  await page.goto('/login');
  await page.getByPlaceholder('9876543210').fill(phone);
  await page.getByRole('button', { name: /send otp/i }).click();

  await page.waitForTimeout(600); // let log flush
  const otp = readOtp(phone);

  await page.getByPlaceholder('• • • • • •').fill(otp);
  await page.getByRole('button', { name: /verify/i }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

// ── Seed phones from seed.ts ──────────────────────────────────────
export const PHONES = {
  admin:  '9999999999',
  giver:  '9000000001',
  seeker: '9876543210',
};
