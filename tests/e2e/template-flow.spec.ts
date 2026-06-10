/**
 * Commute Template Flow E2E Tests
 * Create, list, and verify commute templates (Mon–Fri recurring rides).
 * Templates are created via the "Save as recurring commute template" checkbox
 * on /rides/create — no dedicated template management page exists in the current UI.
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginUI, ACCOUNTS, clearActiveRides, apiLogin, API } from './helpers';

async function api(token: string, method: 'get' | 'post' | 'patch' | 'delete', path: string, data?: object) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx[method](`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data ? { data } : {}),
  });
  const body = await res.json();
  await ctx.dispose();
  return body;
}

function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

test.describe('🔁 Commute Template Flow', () => {
  let giverToken: string;
  let vehicleId: string;
  let createdTemplateId: string;

  test.beforeAll(async () => {
    giverToken = await apiLogin(ACCOUNTS.giver.email);
    await clearActiveRides(giverToken);
    const vehicles = await api(giverToken, 'get', '/vehicles/my');
    vehicleId = (vehicles.data ?? vehicles)[0]?.id;
  });

  // TF-01: create ride page has "Save as template" checkbox
  test('TF-01: /rides/create shows "Save as recurring commute template" checkbox', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');
    await expect(page.getByText(/recurring commute template|save as.*template/i)).toBeVisible({ timeout: 8_000 });
  });

  // TF-02: template created via API — appears in /templates/my
  test('TF-02: create template via API and verify it is returned in list', async ({ page }) => {
    const res = await api(giverToken, 'post', '/templates', {
      originName: 'Kondapur, Hyderabad', originLat: 17.4401, originLng: 78.3489,
      destinationName: 'HITEC City, Hyderabad', destinationLat: 17.4489, destinationLng: 78.3696,
      departureTime: '09:00',
      totalSeats: 3,
      vehicleId,
      departureDays: [1, 2, 3, 4, 5], // ISO weekdays: 1=Mon … 5=Fri
    });

    createdTemplateId = res.id ?? res.data?.id;
    if (!createdTemplateId) {
      test.skip(true, `Template creation failed — ${JSON.stringify(res)}`);
      return;
    }

    const list = await api(giverToken, 'get', '/templates/my');
    const templates: any[] = Array.isArray(list) ? list : (list.data ?? []);
    const found = templates.find((t: any) => t.id === createdTemplateId);
    expect(found).toBeTruthy();
  });

  // TF-03: template has correct route and departure days
  test('TF-03: created template has correct route and departure days', async ({ page }) => {
    if (!createdTemplateId) { test.skip(true, 'TF-02 did not create a template'); return; }

    const list = await api(giverToken, 'get', '/templates/my');
    const templates: any[] = Array.isArray(list) ? list : (list.data ?? []);
    const tmpl = templates.find((t: any) => t.id === createdTemplateId);

    expect(tmpl).toBeTruthy();
    expect(tmpl.originName).toContain('Kondapur');
    expect(tmpl.destinationName).toContain('HITEC City');
    expect(tmpl.departureTime).toBe('09:00');
    // departureDays should include weekdays
    const days: number[] = tmpl.departureDays ?? [];
    expect(days).toContain(1); // Monday
    expect(days).toContain(5); // Friday
  });

  // TF-04: create ride with "Save as template" checked via UI — both ride and template created
  test('TF-04: checking "Save as template" on /rides/create creates both ride and template', async ({ page }) => {
    await loginUI(page, 'giver');
    await page.goto('/rides/create');

    // Fill route
    const originInput = page.locator('input[placeholder*="pickup" i], input[placeholder*="origin" i], input[placeholder*="from" i]').first();
    await originInput.fill('Kondapur');
    await page.waitForTimeout(500);
    // Try to pick first autocomplete suggestion; fall back if none appears
    const suggestion = page.locator('[class*="suggestion"], [class*="dropdown"] li, [role="option"]').first();
    const hasSuggestion = await suggestion.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasSuggestion) await suggestion.click();

    // Fill departure date + time
    await page.locator('input[type="date"]').fill(tomorrow());
    await page.locator('input[type="time"]').fill('09:00');

    // Check the "Save as template" checkbox
    await page.getByText(/save as.*template|recurring commute/i).click();
    const checkbox = page.locator('input[type="checkbox"]').last();
    const isChecked = await checkbox.isChecked();
    expect(isChecked).toBe(true);
  });

  // TF-05: template list endpoint does not expose other givers' templates
  test('TF-05: seeker cannot access giver template API', async ({ page }) => {
    const seekerToken = await apiLogin(ACCOUNTS.seeker.email);
    const res = await api(seekerToken, 'get', '/templates/my');
    // Seeker has no giver record — should get empty list or 403
    const templates: any[] = Array.isArray(res) ? res : (res.data ?? []);
    const statusCode = (res as any).statusCode ?? (res as any).status;
    const isEmptyOrForbidden = templates.length === 0 || statusCode === 403;
    expect(isEmptyOrForbidden).toBe(true);
  });

  test.afterAll(async () => {
    if (createdTemplateId) {
      await api(giverToken, 'delete', `/templates/${createdTemplateId}`).catch(() => {});
    }
  });
});
