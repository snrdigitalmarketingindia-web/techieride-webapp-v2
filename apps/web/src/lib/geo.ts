/**
 * Shared geo utilities — distance calculation and formatting.
 * Used across ride search, ride detail, My Rides, and dashboard pages.
 *
 * TODO [v2.3]: estimatePickupTime — replace haversine-based estimate with
 * Google Distance Matrix API (real traffic). Speed constant (AVG_CITY_SPEED_KMH)
 * may be removed once real ETA is available.
 */

const AVG_CITY_SPEED_KMH = 20;

/** Haversine distance in metres between two lat/lng points */
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format metres → "230 m" or "1.5 km" (no trailing .0) */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1).replace(/\.0$/, '')} km`;
}

/**
 * Estimate pickup time for a seeker.
 * departureTime: "HH:mm" string
 * Returns "8:14 AM" style string, or null if inputs are missing.
 */
export function estimatePickupTime(
  departureTime: string | undefined,
  originLat: number | undefined, originLng: number | undefined,
  pickupLat: number | undefined, pickupLng: number | undefined,
): string | null {
  if (!departureTime || !originLat || !originLng || !pickupLat || !pickupLng) return null;
  const [hStr, mStr] = departureTime.split(':');
  const baseMinutes = parseInt(hStr) * 60 + parseInt(mStr);
  const distM = haversineMeters(originLat, originLng, pickupLat, pickupLng);
  const travelMins = Math.round((distM / 1000) / AVG_CITY_SPEED_KMH * 60);
  const total = baseMinutes + travelMins;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
