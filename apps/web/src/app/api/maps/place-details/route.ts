import { NextRequest, NextResponse } from 'next/server';
import { getMaplsToken } from '@/lib/mappls-token';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId') ?? '';
  if (!placeId) return NextResponse.json({ lat: null, lng: null });

  const token = await getMaplsToken();
  if (!token) return NextResponse.json({ lat: null, lng: null });

  try {
    const res  = await fetch(
      `https://atlas.mappls.com/api/places/place-details/json?placeId=${encodeURIComponent(placeId)}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } },
    );
    const data = await res.json();
    console.log('[place-details] status:', res.status, JSON.stringify(data).slice(0, 200));

    const r   = data.pageInfo ?? data.placeInfo ?? data;
    const lat = parseFloat(r.latitude  ?? r.lat  ?? '');
    const lng = parseFloat(r.longitude ?? r.lng  ?? '');
    if (!isNaN(lat) && !isNaN(lng)) return NextResponse.json({ lat, lng });
    return NextResponse.json({ lat: null, lng: null });
  } catch (err) {
    console.error('[place-details]', err);
    return NextResponse.json({ lat: null, lng: null });
  }
}
