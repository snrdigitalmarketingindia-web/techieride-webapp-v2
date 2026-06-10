/**
 * Maps utility — supports three providers in priority order:
 *
 *  1. Ola Maps   (NEXT_PUBLIC_OLA_MAPS_API_KEY)   — India-optimised, vector tiles
 *  2. Mappls     (NEXT_PUBLIC_MAPPLS_KEY)          — MapMyIndia, best India data
 *  3. OSM        (fallback, no key needed)         — raster tiles + Nominatim
 *
 * Set whichever key you have in .env.local; the rest is automatic.
 */

// ─── Keys ────────────────────────────────────────────────────────────────────

export const OLA_KEY    = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY ?? '';
export const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? '';

export const hasOlaKey    = OLA_KEY.length > 0;
export const hasMaplsKey  = MAPPLS_KEY.length > 0;

// ─── Active provider ─────────────────────────────────────────────────────────

export type MapProvider = 'ola' | 'mappls' | 'osm';

export const MAP_PROVIDER: MapProvider = hasOlaKey
  ? 'ola'
  : hasMaplsKey
  ? 'mappls'
  : 'osm';

// ─── MapLibre GL Style URL ───────────────────────────────────────────────────

/**
 * Passed directly to `new maplibregl.Map({ style: OLA_STYLE_URL })`.
 * MapLibre accepts both a string URL and an inline style object.
 */
export const OLA_STYLE_URL: string | object =
  hasOlaKey
    ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_KEY}`
    : hasMaplsKey
    ? `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/map_style`
    : // OSM raster tile fallback — no key required
      {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      };

// ─── Reverse Geocoding ───────────────────────────────────────────────────────

/** Convert (lat, lng) → human-readable address string */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // ── Ola Maps ────────────────────────────────────────────────────────────────
  if (hasOlaKey) {
    try {
      const res  = await fetch(
        `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_KEY}`,
      );
      const data = await res.json();
      const addr = data.results?.[0]?.formatted_address;
      if (addr) return addr;
    } catch { /* fall through */ }
  }

  // ── Mappls (via Next.js proxy — avoids CORS/401) ───────────────────────────
  if (hasMaplsKey) {
    try {
      const res  = await fetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.address) return data.address;
    } catch { /* fall through */ }
  }

  // ── Nominatim fallback ──────────────────────────────────────────────────────
  try {
    const res  = await fetch(
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

// ─── Autocomplete ────────────────────────────────────────────────────────────

export interface OlaPrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
  /** lat/lng pre-filled for Mappls results (avoids a second Place Details call) */
  lat?: number;
  lng?: number;
}

/** Address autocomplete — returns up to 5 predictions */
export async function autocomplete(input: string): Promise<OlaPrediction[]> {
  if (!input || input.length < 3) return [];

  // ── Ola Maps ────────────────────────────────────────────────────────────────
  if (hasOlaKey) {
    try {
      const res  = await fetch(
        `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${OLA_KEY}`,
      );
      const data = await res.json();
      return ((data.predictions ?? []) as any[]).slice(0, 5).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      }));
    } catch { /* fall through */ }
  }

  // ── Mappls autosuggest (via Next.js proxy — avoids CORS/401) ───────────────
  if (hasMaplsKey) {
    try {
      const res  = await fetch(
        `/api/maps/autocomplete?input=${encodeURIComponent(input)}`,
      );
      const data = await res.json();
      if (data.predictions?.length) return data.predictions as OlaPrediction[];
    } catch { /* fall through */ }
  }

  return [];
}

// ─── Place Details ────────────────────────────────────────────────────────────

/** Resolve lat/lng from a place_id. Returns null on failure. */
export async function placeDetails(
  placeId: string,
  prefilled?: { lat?: number; lng?: number },
): Promise<{ lat: number; lng: number } | null> {
  // If Mappls already embedded coords in the autocomplete result, use them
  if (prefilled?.lat != null && prefilled?.lng != null) {
    return { lat: prefilled.lat, lng: prefilled.lng };
  }

  // ── Ola Maps ────────────────────────────────────────────────────────────────
  if (hasOlaKey) {
    try {
      const res  = await fetch(
        `https://api.olamaps.io/places/v1/details?place_id=${encodeURIComponent(placeId)}&api_key=${OLA_KEY}`,
      );
      const data = await res.json();
      const loc  = data.result?.geometry?.location;
      if (loc?.lat != null && loc?.lng != null) return { lat: loc.lat, lng: loc.lng };
    } catch { /* fall through */ }
  }

  // ── Mappls place details (via Next.js proxy — avoids CORS/401) ─────────────
  if (hasMaplsKey) {
    try {
      const res  = await fetch(`/api/maps/place-details?placeId=${encodeURIComponent(placeId)}`);
      const data = await res.json();
      if (data.lat != null && data.lng != null) return { lat: data.lat, lng: data.lng };
    } catch { /* fall through */ }
  }

  return null;
}
