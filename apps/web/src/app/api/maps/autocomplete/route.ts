/**
 * GET /api/maps/autocomplete?input=kondapur
 *
 * Server-side proxy to Mappls autosuggest — avoids CORS and keeps the
 * static key off the browser.
 */
import { NextRequest, NextResponse } from 'next/server';

const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? '';

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input') ?? '';
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const url =
      `https://atlas.mappls.com/api/places/search/json` +
      `?query=${encodeURIComponent(input)}&itemCount=5&access_token=${MAPPLS_KEY}`;

    const res  = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    // Normalise to the OlaPrediction shape the rest of the app expects
    const suggestions: any[] = data.suggestedLocations ?? data.suggestions ?? [];
    const predictions = suggestions.slice(0, 5).map((s: any) => ({
      place_id: s.eLoc ?? s.placeId ?? '',
      description: s.placeAddress ?? s.placeName ?? '',
      structured_formatting: {
        main_text:      s.placeName    ?? '',
        secondary_text: s.placeAddress ?? '',
      },
      lat: s.latitude  ? parseFloat(s.latitude)  : undefined,
      lng: s.longitude ? parseFloat(s.longitude) : undefined,
    }));

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error('[maps/autocomplete]', err);
    return NextResponse.json({ predictions: [] });
  }
}
