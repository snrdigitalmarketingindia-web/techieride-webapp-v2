/**
 * Feature flags — controlled via NEXT_PUBLIC_FEATURE_* env vars on Vercel.
 * Values are inlined at build time; a redeploy is required to change them.
 *
 * Defaults are the source of truth when the env var is unset.
 */
function flag(envValue: string | undefined, defaultValue: boolean): boolean {
  if (envValue === undefined || envValue === '') return defaultValue;
  return envValue === 'true' || envValue === '1';
}

export const FEATURES = {
  /** Boarded / Deboarded / No-Show attendance tracking — parked, not in current release */
  ATTENDANCE_TRACKING_ENABLED: flag(process.env.NEXT_PUBLIC_FEATURE_ATTENDANCE_TRACKING, false),

  /** Interactive maps (pin pickers, route display, live tracking, commute board) */
  MAPS_ENABLED: flag(process.env.NEXT_PUBLIC_FEATURE_MAPS, true),
} as const;
