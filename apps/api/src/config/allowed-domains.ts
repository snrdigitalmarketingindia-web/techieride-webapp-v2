/**
 * Allowed office email domains for TechieRide registration.
 * Only employees with a verified corporate email from this list can sign up.
 * Add/remove domains as needed.
 */
export const ALLOWED_DOMAINS: Set<string> = new Set([
  // ── Tier 1 Indian IT Giants ──────────────────────────────────────────
  'tcs.com',
  'infosys.com',
  'wipro.com',
  'hcltech.com',
  'hcl.com',
  'techmahindra.com',
  'ltimindtree.com',
  'mphasis.com',
  'hexaware.com',
  'niit.com',
  'niittech.com',
  'cyient.com',

  // ── Global IT / Consulting ───────────────────────────────────────────
  'accenture.com',
  'cognizant.com',
  'capgemini.com',
  'ibm.com',
  'oracle.com',
  'sap.com',
  'atos.net',
  'dxc.com',
  'unisys.com',
  'cgi.com',
  'nttdata.com',

  // ── Product Companies (India offices) ───────────────────────────────
  'microsoft.com',
  'amazon.com',
  'google.com',
  'meta.com',
  'apple.com',
  'salesforce.com',
  'adobe.com',
  'servicenow.com',
  'workday.com',
  'vmware.com',
  'dell.com',
  'hp.com',
  'hpe.com',
  'cisco.com',
  'qualcomm.com',
  'intel.com',

  // ── Hyderabad / Telangana IT Companies ──────────────────────────────
  'valuelabs.com',
  'infotech.com',
  'zensar.com',
  'persistent.com',
  'kpit.com',
  'sonata-software.com',
  'ramcoystems.com',
  'coforge.com',
  'mastech.com',
  'igate.com',
  'inforeliance.com',
  'sstech.us',
  'gspann.com',
  'tietoevry.com',

  // ── BFSI / Fintech IT ────────────────────────────────────────────────
  'deloitte.com',
  'ey.com',
  'kpmg.com',
  'pwc.com',
  'genpact.com',
  'wns.com',
  'firstsource.com',
  'exlservice.com',

  // ── Telecom / Infrastructure ─────────────────────────────────────────
  'airtel.com',
  'jio.com',
  'bsnl.co.in',
  'tatacomm.com',

  // ── Government / PSU IT (Hyderabad) ─────────────────────────────────
  'cdac.in',
  'ecil.co.in',
  'bhel.in',
  'drdo.gov.in',
  'isro.gov.in',
  'nic.in',

  // ── Temporarily allowed for testing — remove before restricting to corporate only ──
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
]);

/**
 * Returns true if the email domain is in the approved corporate list.
 */
export function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_DOMAINS.has(domain);
}

/**
 * Returns the domain from an email address.
 */
export function getDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}
