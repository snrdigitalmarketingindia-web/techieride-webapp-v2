/**
 * Ola Maps API utility
 *
 * Base URL : https://api.olamaps.io  (also accessible via https://maps.olakrutrim.com)
 * Auth     : ?api_key=<NEXT_PUBLIC_OLA_MAPS_API_KEY> on every request
 *
 * Docs: https://maps.olakrutrim.com/docs
 *
 * FALLBACK: When NEXT_PUBLIC_OLA_MAPS_API_KEY is not set, the map tiles fall
 * back to OpenStreetMap raster tiles and Nominatim reverse-geocoding so the
 * app stays fully functional while you wait for your Ola Maps key.
 */

export const OLA_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY ?? '';

/** True when an Ola Maps API key is configured */
export const hasOlaKey = OLA_KEY.length > 0;

/**
 * MapLibre GL style URL.
 * - With Ola key  → Ola Maps vector tiles (crisp, India-optimised)
 * - Without key   → OSM raster tiles via a plain-JSON MapLibre style (fallback)
 */
export const OLA_STYLE_URL: string | object = hasOlaKey
  ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_KEY}`
  : {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    };

const OLA_BASE = 'https://api.olamaps.io';

/** Reverse geocode (lat, lng) → formatted address string */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // ── Ola Maps ──────────────────────────────────────────────────────────────
  if (hasOlaKey) {
    try {
      const res = await fetch(
        `${OLA_BASE}/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_KEY}`,
      );
      const data = await res.json();
      const addr = data.results?.[0]?.formatted_address;
      if (addr) return addr;
    } catch { /* fall through to Nominatim */ }
  }

  // ── Nominatim fallback ────────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    return (
      data.display_name?.split(',').slice(0, 4).join(', ') ??
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export interface OlaPrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

/**
 * Address autocomplete — returns up to 5 predictions.
 * Falls back to empty array (no autocomplete) when no Ola key is set.
 */
export async function autocomplete(input: string): Promise<OlaPrediction[]> {
  if (!input || input.length < 3 || !hasOlaKey) return [];
  try {
    const res = await fetch(
      `${OLA_BASE}/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${OLA_KEY}`,
    );
    const data = await res.json();
    return (data.predictions ?? []).slice(0, 5) as OlaPrediction[];
  } catch {
    return [];
  }
}

/**
 * Fetch lat/lng from a place_id (used after user selects an autocomplete result).
 * Returns null when no Ola key is configured.
 */
export async function placeDetails(
  placeId: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!hasOlaKey) return null;
  try {
    const res = await fetch(
      `${OLA_BASE}/places/v1/details?place_id=${encodeURIComponent(placeId)}&api_key=${OLA_KEY}`,
    );
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    if (loc?.lat != null && loc?.lng != null) return { lat: loc.lat, lng: loc.lng };
    return null;
  } catch {
    return null;
  }
}
