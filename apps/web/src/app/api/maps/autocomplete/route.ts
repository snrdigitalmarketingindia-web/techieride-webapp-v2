import { NextRequest, NextResponse } from 'next/server';

const KEY     = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input') ?? '';
  if (!input || input.length < 3) return NextResponse.json({ predictions: [] });

  // ── 1. Mappls autosuggest (if key configured) ─────────────────────────────
  if (KEY) {
    const q = encodeURIComponent(input);
    const maplsUrls = [
      `https://apis.mappls.com/advancedmaps/v1/${KEY}/auto_suggest?query=${q}&region=IND&itemCount=5`,
      `https://apis.mapmyindia.com/advancedmaps/v1/${KEY}/auto_suggest?query=${q}&region=IND&itemCount=5`,
    ];
    for (const url of maplsUrls) {
      try {
        const res  = await fetch(url, {
          headers: { Referer: APP_URL, Origin: APP_URL },
          redirect: 'follow',
          next: { revalidate: 0 },
        });
        const text = await res.text();
        if (res.ok && text) {
          const data        = JSON.parse(text);
          const suggestions = data.suggestedLocations ?? data.suggestions ?? [];
          if (suggestions.length > 0) {
            return NextResponse.json({
              predictions: suggestions.slice(0, 5).map((s: any) => ({
                place_id: s.eLoc ?? '',
                description: [s.placeName, s.placeAddress].filter(Boolean).join(', '),
                structured_formatting: {
                  main_text:      s.placeName    ?? '',
                  secondary_text: s.placeAddress ?? '',
                },
                lat: s.latitude  ? parseFloat(s.latitude)  : undefined,
                lng: s.longitude ? parseFloat(s.longitude) : undefined,
              })),
            });
          }
        }
      } catch { /* try next */ }
    }
  }

  // ── 2. Nominatim (OpenStreetMap) fallback — no key, no domain restriction ──
  // Viewbox biases results toward Greater Hyderabad area
  const HYDERABAD_VIEWBOX = '78.20,17.65,78.65,17.20'; // minLon,maxLat,maxLon,minLat
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input + ' Hyderabad')}&format=json&countrycodes=in&addressdetails=1&limit=8&viewbox=${HYDERABAD_VIEWBOX}&bounded=0`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TechieRide/2.0 (techieride.in)',
        },
        next: { revalidate: 0 },
      },
    );
    const results: any[] = await res.json();
    if (results.length > 0) {
      const predictions = results.map((r: any) => {
        // Build a short main label from the display_name
        const parts      = (r.display_name as string).split(',').map((s: string) => s.trim());
        const main_text  = parts[0] ?? r.display_name;
        const secondary  = parts.slice(1, 4).join(', ');
        return {
          place_id:    r.place_id?.toString() ?? '',
          description: r.display_name,
          structured_formatting: { main_text, secondary_text: secondary },
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        };
      });
      console.log('[autocomplete] Nominatim returned', predictions.length, 'results');
      return NextResponse.json({ predictions });
    }
  } catch (err: any) {
    console.error('[autocomplete] Nominatim error:', err.message);
  }

  return NextResponse.json({ predictions: [] });
}
