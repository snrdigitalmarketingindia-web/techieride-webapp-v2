/**
 * Blocklist of personal / consumer email domains.
 * ANY email domain NOT in this list is accepted as a valid office email.
 * Add domains here to block them from registering.
 */
export const BLOCKED_DOMAINS: Set<string> = new Set([
  // ── Google ───────────────────────────────────────────────────────────
  'gmail.com',
  'googlemail.com',

  // ── Microsoft / Outlook ──────────────────────────────────────────────
  'outlook.com',
  'hotmail.com',
  'hotmail.co.in',
  'hotmail.co.uk',
  'live.com',
  'live.in',
  'msn.com',
  'passport.com',

  // ── Yahoo ────────────────────────────────────────────────────────────
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'ymail.com',
  'rocketmail.com',

  // ── Apple ────────────────────────────────────────────────────────────
  'icloud.com',
  'me.com',
  'mac.com',

  // ── Indian personal providers ─────────────────────────────────────────
  'rediffmail.com',
  'rediff.com',
  'indiatimes.com',
  'sify.com',
  'dataone.in',

  // ── Other global consumer providers ──────────────────────────────────
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'tutamail.com',
  'zohomail.com',   // zoho.com is a company so allow that; zohomail.com is personal
  'aol.com',
  'aim.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'fastmail.com',
  'fastmail.fm',
  'hushmail.com',
  'inbox.com',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
]);

/**
 * Returns true if the email domain is a known personal/consumer provider.
 * A false return means it's treated as a valid office email.
 */
export function isBlockedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true; // no domain = invalid
  return BLOCKED_DOMAINS.has(domain);
}

/**
 * Legacy alias — now delegates to blocklist logic.
 * Returns true if the domain is ALLOWED (i.e. not blocked).
 */
export function isAllowedDomain(email: string): boolean {
  return !isBlockedDomain(email);
}

/**
 * Returns the domain from an email address.
 */
export function getDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}
