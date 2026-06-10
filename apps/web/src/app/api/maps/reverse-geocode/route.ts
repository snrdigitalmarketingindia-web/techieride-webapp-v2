import { NextRequest, NextResponse } from 'next/server';

const KEY     = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');
  if (!lat || !lng) return NextResponse.json({ address: '' });

  // ── 1. Mappls reverse geocode (if key configured) ─────────────────────────
  if (KEY) {
    for (const base of ['https://apis.mappls.com', 'https://apis.mapmyindia.com']) {
      try {
        const res = await fetch(
          `${base}/advancedmaps/v1/${KEY}/rev_geocode?lat=${lat}&lng=${lng}`,
          { headers: { Referer: APP_URL, Origin: APP_URL }, next: { revalidate: 0 } },
        );
        if (res.ok) {
          const data = await res.json();
          const addr = data.results?.[0]?.formattedAddress ?? '';
          if (addr) return NextResponse.json({ address: addr });
        }
      } catch { /* try next */ }
    }
  }

  // ── 2. Nominatim fallback ─────────────────────────────────────────────────
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TechieRide/2.0 (techieride.in)',
        },
        next: { revalidate: 0 },
      },
    );
    const data = await res.json();
    const addr = data.display_name?.split(',').slice(0, 4).join(', ') ?? '';
    if (addr) return NextResponse.json({ address: addr });
  } catch { /* fall through */ }

  return NextResponse.json({ address: '' });
}
