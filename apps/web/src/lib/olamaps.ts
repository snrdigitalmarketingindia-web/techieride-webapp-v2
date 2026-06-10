/**
 * Ola Maps API utility
 *
 * Base URL : https://api.olamaps.io
 * Auth     : ?api_key=<NEXT_PUBLIC_OLA_MAPS_API_KEY> on every request
 *
 * Docs / Postman: https://developers.olamaps.io
 */

export const OLA_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY ?? '';

/** MapLibre GL style URL for Ola Maps vector tiles (light theme) */
export const OLA_STYLE_URL = `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_KEY}`;

const BASE = 'https://api.olamaps.io';

/** Reverse geocode (lat, lng) → formatted address string */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `${BASE}/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_KEY}`,
    );
    const data = await res.json();
    return (
      data.results?.[0]?.formatted_address ??
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

/** Address autocomplete — returns up to 5 predictions */
export async function autocomplete(input: string): Promise<OlaPrediction[]> {
  if (!input || input.length < 3) return [];
  try {
    const res = await fetch(
      `${BASE}/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${OLA_KEY}`,
    );
    const data = await res.json();
    return (data.predictions ?? []).slice(0, 5) as OlaPrediction[];
  } catch {
    return [];
  }
}

/** Fetch lat/lng from a place_id (used after user selects an autocomplete result) */
export async function placeDetails(
  placeId: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `${BASE}/places/v1/details?place_id=${encodeURIComponent(placeId)}&api_key=${OLA_KEY}`,
    );
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    if (loc?.lat != null && loc?.lng != null) return { lat: loc.lat, lng: loc.lng };
    return null;
  } catch {
    return null;
  }
}
