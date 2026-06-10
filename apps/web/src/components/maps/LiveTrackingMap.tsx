'use client';

/**
 * LiveTrackingMap
 *
 * Real-time GPS tracking map powered by Ola Maps vector tiles (MapLibre GL JS).
 * - Giver: watches device GPS and broadcasts via WebSocket.
 * - Seeker: receives GPS updates and moves the car marker in real-time.
 */

import { useEffect, useRef, useState } from 'react';
import { OLA_STYLE_URL } from '@/lib/olamaps';
import { connectSocket, joinRideRoom, leaveRideRoom, sendGpsUpdate, WsEvents } from '@/lib/socket';

interface Props {
  rideId: string;
  isGiver: boolean;
  initialLat?: number;
  initialLng?: number;
}

export default function LiveTrackingMap({
  rideId,
  isGiver,
  initialLat = 17.44,
  initialLng = 78.35,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markerRef    = useRef<any>(null);
  const watchRef     = useRef<number | null>(null);

  const [hasPosition, setHasPosition] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !mapContainer.current) return;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: OLA_STYLE_URL,
        center: [initialLng, initialLat],
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      mapRef.current = map;

      // ── WebSocket: join room & listen for GPS updates ────────────────────
      const socket = connectSocket();
      joinRideRoom(rideId);

      socket.on(WsEvents.GPS_UPDATE, (payload: any) => {
        if (payload.rideId !== rideId) return;
        const { lat, lng } = payload;
        setHasPosition(true);

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new maplibregl.Marker({ color: '#2563eb' })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 25 }).setText('🚗 Giver\'s current location'))
            .addTo(map);
        }
        map.easeTo({ center: [lng, lat], duration: 500 });
      });

      // ── Giver: broadcast own GPS position ────────────────────────────────
      if (isGiver && 'geolocation' in navigator) {
        watchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            sendGpsUpdate({
              rideId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speed: pos.coords.speed ?? undefined,
            });
          },
          undefined,
          { enableHighAccuracy: true, maximumAge: 5000 },
        );
      }
    })();

    return () => {
      cancelled = true;
      leaveRideRoom(rideId);
      const socket = connectSocket();
      socket.off(WsEvents.GPS_UPDATE);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      mapRef.current?.remove();
      mapRef.current  = null;
      markerRef.current = null;
    };
  }, [rideId, isGiver]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      {!hasPosition && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-500 text-sm pointer-events-none">
          {isGiver ? 'Starting location broadcast…' : '⏳ Waiting for giver location…'}
        </div>
      )}
    </div>
  );
}
