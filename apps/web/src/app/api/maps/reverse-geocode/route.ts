/**
 * GET /api/maps/reverse-geocode?lat=17.44&lng=78.35
 *
 * Server-side proxy to Mappls reverse geocoding — avoids CORS.
 */
import { NextRequest, NextResponse } from 'next/server';

const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? '';

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');
  if (!lat || !lng) {
    return NextResponse.json({ address: '' });
  }

  try {
    const url =
      `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/rev_geocode` +
      `?lat=${lat}&lng=${lng}`;

    const res  = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    const addr = data.results?.[0]?.formattedAddress ?? '';
    return NextResponse.json({ address: addr });
  } catch (err) {
    console.error('[maps/reverse-geocode]', err);
    return NextResponse.json({ address: '' });
  }
}
