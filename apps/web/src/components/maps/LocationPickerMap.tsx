'use client';

/**
 * LocationPickerMap
 *
 * Renders a MapLibre GL map powered by Ola Maps vector tiles.
 * Tap anywhere on the map (or drag the pin) to pick a coordinate;
 * the address is reverse-geocoded via Ola Maps.
 */

import { useEffect, useRef, useState } from 'react';
import { OLA_STYLE_URL, reverseGeocode as olaReverseGeocode } from '@/lib/olamaps';

interface Props {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export default function LocationPickerMap({ initialLat, initialLng, onLocationSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markerRef    = useRef<any>(null);

  const [pinned,  setPinned]  = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    setAddress('');
    const addr = await olaReverseGeocode(lat, lng);
    setAddress(addr);
    setLoading(false);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const defaultLat = initialLat ?? 17.4401;
    const defaultLng = initialLng ?? 78.3489;

    let map: any;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css');

      if (cancelled || !mapContainer.current) return;

      map = new maplibregl.Map({
        container: mapContainer.current,
        style: OLA_STYLE_URL,
        center: [defaultLng, defaultLat],
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-right',
      );

      mapRef.current = map;

      // Place initial marker if coordinates were supplied
      if (initialLat && initialLng) {
        markerRef.current = new maplibregl.Marker({ color: '#7c3aed', draggable: true })
          .setLngLat([initialLng, initialLat])
          .addTo(map);
        markerRef.current.on('dragend', () => {
          const { lat, lng } = markerRef.current.getLngLat();
          setPinned({ lat, lng });
          handleGeocode(lat, lng);
        });
        handleGeocode(initialLat, initialLng);
      }

      // Click anywhere to pin
      map.on('click', (e: any) => {
        const { lat, lng } = e.lngLat;
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new maplibregl.Marker({ color: '#7c3aed', draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);
          markerRef.current.on('dragend', () => {
            const pos = markerRef.current.getLngLat();
            setPinned({ lat: pos.lat, lng: pos.lng });
            handleGeocode(pos.lat, pos.lng);
          });
        }
        setPinned({ lat, lng });
        handleGeocode(lat, lng);
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current  = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseLocation = () => {
    if (!pinned || loading) return;
    onLocationSelect(pinned.lat, pinned.lng, address);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        👆 Tap anywhere on the map to drop your boarding pin
      </p>

      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 260 }}>
        <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      </div>

      {pinned ? (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-brand-600 mt-0.5">📍</span>
            <div className="flex-1 min-w-0">
              {loading ? (
                <p className="text-sm text-brand-600 animate-pulse">Getting address…</p>
              ) : (
                <p className="text-sm text-brand-800 font-medium break-words">{address}</p>
              )}
              <p className="text-xs text-brand-500 mt-0.5">
                {pinned.lat.toFixed(5)}, {pinned.lng.toFixed(5)} · Drag pin to adjust
              </p>
            </div>
          </div>
          <button
            onClick={handleUseLocation}
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            ✅ Use this location
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-gray-400 py-1">No location pinned yet</p>
      )}
    </div>
  );
}
