'use client';

/**
 * RideMap
 *
 * Static route map shown on ride detail pages.
 * Renders origin (green) and destination (red) markers with a straight-line
 * polyline between them, using Ola Maps vector tiles via MapLibre GL JS.
 */

import { useEffect, useRef } from 'react';
import { OLA_STYLE_URL } from '@/lib/olamaps';

interface Props {
  rides?: any[];
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export default function RideMap({ rides = [], originLat, originLng, destLat, destLng }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    let cancelled = false;

    const centreLat = (originLat + destLat) / 2;
    const centreLng = (originLng + destLng) / 2;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !mapContainer.current) return;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: OLA_STYLE_URL,
        center: [centreLng, centreLat],
        zoom: 12,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        // ── Route polyline ──────────────────────────────────────────────────
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [originLng, originLat],
                [destLng,   destLat],
              ],
            },
            properties: {},
          },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#7c3aed', 'line-width': 3, 'line-dasharray': [2, 2] },
        });

        // ── Origin marker (green) ───────────────────────────────────────────
        new maplibregl.Marker({ color: '#16a34a' })
          .setLngLat([originLng, originLat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setText('🟢 Pickup'))
          .addTo(map);

        // ── Destination marker (red) ────────────────────────────────────────
        new maplibregl.Marker({ color: '#dc2626' })
          .setLngLat([destLng, destLat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setText('🔴 Destination'))
          .addTo(map);

        // ── Optional: additional ride origin markers ─────────────────────────
        rides.forEach((ride) => {
          if (ride.originLat && ride.originLng) {
            new maplibregl.Marker({ color: '#2563eb' })
              .setLngLat([ride.originLng, ride.originLat])
              .setPopup(
                new maplibregl.Popup({ offset: 25 }).setHTML(
                  `<strong>${ride.rideGiver?.user?.fullName ?? 'Ride'}</strong><br/>
                   ${ride.departureTime ?? ''} · ${ride.availableSeats ?? ''} seats<br/>
                   ${ride.originName ?? ''} → ${ride.destinationName ?? ''}`,
                ),
              )
              .addTo(map);
          }
        });

        // Fit bounds to show both markers
        const bounds = new maplibregl.LngLatBounds(
          [Math.min(originLng, destLng) - 0.01, Math.min(originLat, destLat) - 0.01],
          [Math.max(originLng, destLng) + 0.01, Math.max(originLat, destLat) + 0.01],
        );
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [originLat, originLng, destLat, destLng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />;
}
