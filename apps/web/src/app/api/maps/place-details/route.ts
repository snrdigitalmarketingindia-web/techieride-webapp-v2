/**
 * GET /api/maps/place-details?placeId=abc123
 *
 * Server-side proxy to Mappls place details — avoids CORS.
 */
import { NextRequest, NextResponse } from 'next/server';

const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? '';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId') ?? '';
  if (!placeId) return NextResponse.json({ lat: null, lng: null });

  try {
    const url =
      `https://atlas.mappls.com/api/places/place-details/json` +
      `?placeId=${encodeURIComponent(placeId)}&access_token=${MAPPLS_KEY}`;

    const res  = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    const r    = data.pageInfo ?? data.placeInfo ?? data;
    const lat  = parseFloat(r.latitude  ?? r.lat  ?? '');
    const lng  = parseFloat(r.longitude ?? r.lng  ?? '');
    if (!isNaN(lat) && !isNaN(lng)) return NextResponse.json({ lat, lng });
    return NextResponse.json({ lat: null, lng: null });
  } catch (err) {
    console.error('[maps/place-details]', err);
    return NextResponse.json({ lat: null, lng: null });
  }
}
