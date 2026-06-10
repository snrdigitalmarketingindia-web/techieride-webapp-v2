/**
 * Shared geo utilities — distance calculation, formatting, and reverse-geocode cache.
 */

const GEOCACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const GEOCACHE_PREFIX = 'tr_rgc_';

/** Cached reverse geocode — avoids repeat API calls for the same coordinates. */
export async function reverseGeocodeWithCache(lat: number, lng: number): Promise<string> {
  const key = `${GEOCACHE_PREFIX}${lat.toFixed(4)},${lng.toFixed(4)}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { address, ts } = JSON.parse(cached);
      if (Date.now() - ts < GEOCACHE_TTL_MS) return address;
    }
  } catch { /* ignore */ }

  const res = await fetch(
    `/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`,
    { next: { revalidate: 0 } } as any,
  );
  const data = await res.json();
  const address = data.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  try {
    localStorage.setItem(key, JSON.stringify({ address, ts: Date.now() }));
  } catch { /* storage full — ignore */ }

  return address;
}

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
